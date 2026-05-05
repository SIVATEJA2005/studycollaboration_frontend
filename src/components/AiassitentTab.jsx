import React, { useState, useEffect, useRef } from "react";

const theme = {
  colors: {
    primary: "#6C63FF",
    primaryGradient: "linear-gradient(135deg,#6C63FF 0%,#A78BFA 100%)",
    primaryLight: "#F3F0FF",
    border: "#EDE9FF",
    bgPage: "#F8F6FF",
    textPrimary: "#1E1B4B",
    textSecondary: "#4B4880",
    textMuted: "#9CA3AF",
  },
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
const getToken = () => localStorage.getItem("token");

export default function AIAssistantTab({ roomId }) {
  const [activeMode, setActiveMode]   = useState("chat");    // chat | summarize | quiz
  const [query, setQuery]             = useState("");
  const [messages, setMessages]       = useState([
    { role: "ai", text: "Hi! I'm your AI study assistant 🤖 Ask me anything about your uploaded study materials!" }
  ]);
  const [loading, setLoading]         = useState(false);
  const [resources, setResources]     = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);
  const [result, setResult]           = useState(null);
  const bottomRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, result]);

  // Fetch PDF resources for summarize/quiz
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/resources/room/${roomId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          const pdfs = data.filter((r) => r.type === "PDF");
          setResources(pdfs);
          if (pdfs.length > 0) setSelectedFile(pdfs[0]);
        }
      } catch (err) {
        console.error("Failed to load resources:", err);
      }
    };
    fetchResources();
  }, [roomId]);

  // ── RAG Chat ──────────────────────────────────────────────────────────────
  const askQuestion = async () => {
    if (!query.trim() || loading) return;
    const userMsg = query.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ question: userMsg, roomId: String(roomId) }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "ai", text: data.answer }]);
      } else {
        setMessages((prev) => [...prev, { role: "ai", text: "❌ Failed to get answer. Please try again." }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: "❌ Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Summarize ─────────────────────────────────────────────────────────────
  const summarize = async () => {
    if (!selectedFile || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const fileName = selectedFile.url.split("/").pop();
      const res = await fetch(
        `${API_BASE}/api/ai/summarize?roomId=${roomId}&fileName=${encodeURIComponent(fileName)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setResult({ type: "summary", content: data.summary, fileName: selectedFile.title });
      } else {
        setResult({ type: "error", content: "Failed to summarize. Please try again." });
      }
    } catch (err) {
      setResult({ type: "error", content: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // ── Quiz ──────────────────────────────────────────────────────────────────
  const generateQuiz = async () => {
    if (!selectedFile || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const fileName = selectedFile.url.split("/").pop();
      const res = await fetch(
        `${API_BASE}/api/ai/quiz?roomId=${roomId}&fileName=${encodeURIComponent(fileName)}&numQuestions=${numQuestions}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setResult({ type: "quiz", content: data.quiz, fileName: selectedFile.title });
      } else {
        setResult({ type: "error", content: "Failed to generate quiz. Please try again." });
      }
    } catch (err) {
      setResult({ type: "error", content: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${theme.colors.border}`, background: "linear-gradient(135deg,#F3F0FF 0%,#FCE7F3 100%)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: theme.colors.primaryGradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: theme.colors.textPrimary }}>Study Copilot AI</p>
          <p style={{ margin: 0, fontSize: 12, color: theme.colors.textMuted }}>Powered by Gemini · Based on your study materials</p>
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${theme.colors.border}`, background: "#fff", padding: "0 24px" }}>
        {[
          { key: "chat",      label: "💬 Ask AI",   desc: "RAG Chat" },
          { key: "summarize", label: "📝 Summarize", desc: "Summarize PDF" },
          { key: "quiz",      label: "🧪 Quiz",      desc: "Generate Quiz" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => { setActiveMode(m.key); setResult(null); }}
            style={{
              padding: "12px 20px", border: "none", background: "transparent", cursor: "pointer",
              fontSize: 13, fontWeight: activeMode === m.key ? 700 : 400,
              color: activeMode === m.key ? theme.colors.primary : theme.colors.textMuted,
              borderBottom: activeMode === m.key ? `2.5px solid ${theme.colors.primary}` : "2.5px solid transparent",
              marginBottom: -1, transition: "all 0.15s",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* ── CHAT MODE ── */}
      {activeMode === "chat" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: 10, alignItems: "flex-start" }}>
                {msg.role === "ai" && (
                  <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0, background: theme.colors.primaryGradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
                )}
                <div style={{
                  maxWidth: "72%", padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user" ? theme.colors.primaryGradient : "#F3F0FF",
                  color: msg.role === "user" ? "#fff" : theme.colors.textPrimary,
                  fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap",
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: theme.colors.primaryGradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
                <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 4px", background: "#F3F0FF", color: theme.colors.textMuted, fontSize: 14 }}>Thinking…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${theme.colors.border}`, display: "flex", gap: 10, background: "#fff" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askQuestion()}
              placeholder="Ask anything about your study materials…"
              style={{ flex: 1, padding: "10px 16px", borderRadius: 24, border: `1.5px solid ${theme.colors.border}`, fontSize: 14, outline: "none", background: "#FDFAFF", fontFamily: "inherit", color: theme.colors.textPrimary }}
              onFocus={(e) => (e.target.style.borderColor = theme.colors.primary)}
              onBlur={(e) => (e.target.style.borderColor = theme.colors.border)}
            />
            <button
              onClick={askQuestion}
              disabled={loading || !query.trim()}
              style={{ width: 42, height: 42, borderRadius: "50%", border: "none", background: loading ? "#C4B5FD" : theme.colors.primaryGradient, color: "#fff", fontSize: 18, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >✦</button>
          </div>
        </>
      )}

      {/* ── SUMMARIZE & QUIZ MODE ── */}
      {(activeMode === "summarize" || activeMode === "quiz") && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

          {/* File selector */}
          {resources.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: theme.colors.textMuted }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: theme.colors.textSecondary }}>No PDFs uploaded yet</p>
              <p style={{ fontSize: 13 }}>Upload a PDF in the Resources tab first</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Select PDF</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {resources.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedFile(r)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                        borderRadius: 10, cursor: "pointer",
                        border: `1.5px solid ${selectedFile?.id === r.id ? theme.colors.primary : theme.colors.border}`,
                        background: selectedFile?.id === r.id ? theme.colors.primaryLight : "#fff",
                      }}
                    >
                      <span style={{ fontSize: 24 }}>📄</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: theme.colors.textPrimary }}>{r.title}</p>
                        <p style={{ margin: 0, fontSize: 11, color: theme.colors.textMuted }}>{r.originalFileName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quiz number selector */}
              {activeMode === "quiz" && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: theme.colors.textMuted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Number of Questions</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[3, 5, 10, 15].map((n) => (
                      <button
                        key={n}
                        onClick={() => setNumQuestions(n)}
                        style={{
                          padding: "8px 18px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                          background: numQuestions === n ? theme.colors.primaryGradient : "#F3F0FF",
                          color: numQuestions === n ? "#fff" : theme.colors.primary,
                        }}
                      >{n}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Action button */}
              <button
                onClick={activeMode === "summarize" ? summarize : generateQuiz}
                disabled={loading || !selectedFile}
                style={{
                  width: "100%", padding: "13px", borderRadius: 12, border: "none", marginBottom: 24,
                  background: loading ? "#C4B5FD" : theme.colors.primaryGradient,
                  color: "#fff", fontWeight: 700, fontSize: 15,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading
                  ? (activeMode === "summarize" ? "Summarizing…" : "Generating Quiz…")
                  : (activeMode === "summarize" ? "📝 Summarize This PDF" : `🧪 Generate ${numQuestions} Questions`)}
              </button>

              {/* Result */}
              {result && (
                <div style={{
                  background: result.type === "error" ? "#FEF2F2" : "#fff",
                  border: `1.5px solid ${result.type === "error" ? "#FECACA" : theme.colors.border}`,
                  borderRadius: 12, padding: "20px",
                }}>
                  {result.type !== "error" && (
                    <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 13, color: theme.colors.textMuted }}>
                      {result.type === "summary" ? "📝 Summary" : "🧪 Quiz"} — {result.fileName}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.8, color: result.type === "error" ? "#DC2626" : theme.colors.textPrimary, whiteSpace: "pre-wrap" }}>
                    {result.content}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
