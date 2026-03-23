import React, { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const theme = {
  colors: {
    primary: "#6C63FF",
    primaryGradient: "linear-gradient(135deg,#6C63FF 0%,#A78BFA 100%)",
    primaryLight: "#F3F0FF",
    border: "#EDE9FF",
    textPrimary: "#1E1B4B",
    textSecondary: "#4B4880",
    textMuted: "#9CA3AF",
  },
};

const API_BASE  = import.meta.env.VITE_API_URL || "http://localhost:8080";
const AVATAR_BG = ["#C4B5FD", "#FCA5A5", "#6EE7B7", "#FDE68A", "#93C5FD"];

export default function ChatTab({ roomId }) {

  // ── FIXED: was "username" (lowercase), must be "userName" (camelCase)
  // This was the root cause — isMe() always returned false
  const currentUsername = localStorage.getItem("userName");
  const currentUserId   = localStorage.getItem("userId");
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [connected, setConnected] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const stompClientRef            = useRef(null);
  const bottomRef                 = useRef(null);
  // ── 1. Fetch existing messages ─────────────────────────────────────────────
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/messages/room/${roomId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (res.ok) setMessages(await res.json());
        else console.error("Fetch messages failed:", res.status);
      } catch (err) { console.error("Fetch messages error:", err); }
      finally { setLoading(false); }
    };
    fetchMessages();
  }, [roomId]);
  // ── 2. Connect WebSocket ───────────────────────────────────────────────────
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
      connectHeaders: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/room${roomId}`, (msg) => {
          setMessages((prev) => [...prev, JSON.parse(msg.body)]);
        });
      },
      onDisconnect:    () => setConnected(false),
      onStompError:    ()  => setConnected(false),
      reconnectDelay:  5000,
    });
    client.activate();
    stompClientRef.current = client;
    return () => stompClientRef.current?.deactivate();
  }, [roomId]);
  // ── 3. Auto scroll ────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  // ── 4. Send message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    if (!input.trim() || !stompClientRef.current?.connected) return;
    stompClientRef.current.publish({
      destination: `/app/chat/${roomId}`,
      body: JSON.stringify({ content: input.trim(), senderId: currentUserId }),
    });
    setInput("");
  }, [input, roomId, currentUserId]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  // Checks both userId AND userName — handles any DTO shape from backend
  const isMe = (msg) =>
    (currentUserId  && String(msg.senderId)       === String(currentUserId)) ||
    (currentUsername && msg.senderName            === currentUsername)       ||
    (currentUsername && msg.senderUsername        === currentUsername);

  const getAvatarColor = (name = "") =>
    AVATAR_BG[name.charCodeAt(0) % AVATAR_BG.length];

  const formatTime = (ts) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>

      {/* Connection status */}
      <div style={{
        padding:"6px 20px", display:"flex", alignItems:"center", gap:6,
        background: connected ? "#ECFDF5" : "#FEF2F2",
        borderBottom: `1px solid ${connected ? "#6EE7B7" : "#FECACA"}`,
        fontSize:12, color: connected ? "#059669" : "#DC2626",
      }}>
        <div style={{ width:7, height:7, borderRadius:"50%", background: connected ? "#10B981" : "#EF4444" }} />
        {connected ? `Connected · ${currentUsername || "..."}` : "Connecting..."}
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", display:"flex", flexDirection:"column", gap:12 }}>
        {loading && (
          <p style={{ textAlign:"center", color:theme.colors.textMuted, fontSize:13 }}>Loading messages…</p>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign:"center", marginTop:60, color:theme.colors.textMuted }}>
            <div style={{ fontSize:40 }}>💬</div>
            <p style={{ fontSize:14, marginTop:10 }}>No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const mine       = isMe(msg);
          const senderName = msg.senderName || msg.senderUsername || "Unknown";
          const time       = formatTime(msg.timestamp || msg.createdAt || msg.sentAt);

          return (
            <div key={msg.id || i} style={{
              display:"flex",
              // mine → right side, others → left side
              flexDirection: mine ? "row-reverse" : "row",
              gap:10,
              alignItems:"flex-end",
            }}>
              {/* Avatar — only for others (left side) */}
              {!mine && (
                <div style={{
                  width:34, height:34, borderRadius:"50%", flexShrink:0,
                  background: getAvatarColor(senderName),
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:13, fontWeight:700, color:"#fff",
                }}>
                  {senderName[0]?.toUpperCase()}
                </div>
              )}

              <div style={{ maxWidth:"65%", display:"flex", flexDirection:"column", alignItems: mine ? "flex-end" : "flex-start" }}>
                {/* Sender name — only for others */}
                {!mine && (
                  <p style={{ margin:"0 0 4px 2px", fontSize:11, color:theme.colors.textMuted, fontWeight:600 }}>
                    {senderName}
                  </p>
                )}

                {/* Bubble */}
                <div style={{
                  padding:"10px 14px",
                  borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  // mine → purple gradient, others → light purple bg
                  background: mine ? theme.colors.primaryGradient : "#F3F0FF",
                  color: mine ? "#fff" : theme.colors.textPrimary,
                  fontSize:14, lineHeight:1.5, wordBreak:"break-word",
                }}>
                  {msg.content}
                </div>

                {/* Time */}
                <p style={{ margin:"4px 4px 0", fontSize:11, color:theme.colors.textMuted }}>
                  {time}
                </p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        padding:"12px 20px", borderTop:`1px solid ${theme.colors.border}`,
        display:"flex", gap:10, alignItems:"center", background:"#fff",
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder={connected ? "Type a message… (Enter to send)" : "Connecting…"}
          disabled={!connected}
          style={{
            flex:1, padding:"10px 16px", borderRadius:24,
            border:`1.5px solid ${theme.colors.border}`,
            fontSize:14, outline:"none",
            background: connected ? "#FDFAFF" : "#F8F8F8",
            fontFamily:"inherit", color:theme.colors.textPrimary,
          }}
          onFocus={(e) => e.target.style.borderColor = theme.colors.primary}
          onBlur={(e)  => e.target.style.borderColor = theme.colors.border}
        />
        <button
          onClick={sendMessage}
          disabled={!connected || !input.trim()}
          style={{
            width:42, height:42, borderRadius:"50%", border:"none",
            background: connected && input.trim() ? theme.colors.primaryGradient : "#E2D9F3",
            color:"#fff", fontSize:18,
            cursor: connected && input.trim() ? "pointer" : "not-allowed",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
