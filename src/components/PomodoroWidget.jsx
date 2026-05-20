import React, { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
const getToken = () => localStorage.getItem("token");

const PHASE_CONFIG = {
  FOCUS:       { label: "Focus",       color: "#6C63FF", bg: "#F3F0FF", emoji: "🍅", minutes: 25 },
  SHORT_BREAK: { label: "Short Break", color: "#059669", bg: "#ECFDF5", emoji: "☕", minutes: 5  },
  LONG_BREAK:  { label: "Long Break",  color: "#0891B2", bg: "#ECFEFF", emoji: "🌿", minutes: 15 },
};

export default function PomodoroWidget({ roomId }) {
  const [session,   setSession]   = useState(null);   // active session from server
  const [timeLeft,  setTimeLeft]  = useState(0);      // seconds remaining (client-computed)
  const [expanded,  setExpanded]  = useState(false);
  const [phase,     setPhase]     = useState("FOCUS");
  const [loading,   setLoading]   = useState(false);
  const [connected, setConnected] = useState(false);

  const stompRef   = useRef(null);
  const tickRef    = useRef(null);

  // ── Compute remaining seconds from server startedAt ─────────────────────
  const computeTimeLeft = (sess) => {
    if (!sess || sess.status === "FINISHED") return 0;
    if (sess.status === "PAUSED") return sess.durationSeconds; // stored remainder
    const elapsed = Math.floor(
      (Date.now() - new Date(sess.startedAt).getTime()) / 1000
    );
    return Math.max(0, sess.durationSeconds - elapsed);
  };

  // ── Start client tick ────────────────────────────────────────────────────
  const startTick = (sess) => {
    clearInterval(tickRef.current);
    if (!sess || sess.status !== "RUNNING") return;
    tickRef.current = setInterval(() => {
      const left = computeTimeLeft(sess);
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(tickRef.current);
        handleAutoFinish(sess);
      }
    }, 1000);
  };

  const handleAutoFinish = async (sess) => {
    try {
      await fetch(`${API_BASE}/api/pomodoro/${sess.id}/finish`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {}
  };

  // ── Fetch active session on mount ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pomodoro/room/${roomId}/active`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setSession(data);
            setTimeLeft(computeTimeLeft(data));
            startTick(data);
          }
        }
      } catch {}
    };
    load();
    return () => clearInterval(tickRef.current);
  }, [roomId]);

  // ── WebSocket ────────────────────────────────────────────────────────────
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
      connectHeaders:   { Authorization: `Bearer ${getToken()}` },
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/room/${roomId}/pomodoro`, (msg) => {
          const sess = JSON.parse(msg.body);
          setSession(sess);
          const left = computeTimeLeft(sess);
          setTimeLeft(left);
          startTick(sess);
        });
      },
      onDisconnect:   () => setConnected(false),
      reconnectDelay: 5000,
    });
    client.activate();
    stompRef.current = client;
    return () => {
      stompRef.current?.deactivate();
      clearInterval(tickRef.current);
    };
  }, [roomId]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const startSession = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/pomodoro/room/${roomId}/start?phase=${phase}`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } finally { setLoading(false); }
  };

  const togglePause = async () => {
    if (!session) return;
    try {
      await fetch(`${API_BASE}/api/pomodoro/${session.id}/toggle`, {
        method:  "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {}
  };

  const stopSession = async () => {
    if (!session) return;
    try {
      await fetch(`${API_BASE}/api/pomodoro/${session.id}/finish`, {
        method:  "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {}
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmt = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const isActive   = session && session.status !== "FINISHED";
  const isRunning  = session?.status === "RUNNING";
  const isPaused   = session?.status === "PAUSED";
  const cfg        = PHASE_CONFIG[session?.phase || phase];
  const totalSecs  = session ? session.durationSeconds : PHASE_CONFIG[phase].minutes * 60;
  const progress   = isActive ? Math.max(0, Math.min(1, 1 - timeLeft / totalSecs)) : 0;
  const pomCount   = session?.pomodoroCount ?? 0;

  // Stroke for circular progress ring
  const R          = 28;
  const CIRC       = 2 * Math.PI * R;
  const dash       = CIRC * progress;

  return (
    <div style={{
      position:   "fixed",
      bottom:     24,
      right:      24,
      zIndex:     1000,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>

      {/* ── Expanded card ── */}
      {expanded && (
        <div style={{
          background:   "#fff",
          borderRadius: 20,
          boxShadow:    "0 8px 32px rgba(108,99,255,0.18)",
          border:       `1.5px solid ${cfg.color}33`,
          padding:      "20px 22px",
          marginBottom: 12,
          width:        280,
          animation:    "pomSlideUp 0.2s ease",
        }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <span style={{ fontSize:15, fontWeight:700, color:"#1E1B4B" }}>
              {cfg.emoji} {cfg.label}
            </span>
            <div style={{ display:"flex", gap:4 }}>
              {Array.from({ length: Math.min(pomCount, 8) }).map((_, i) => (
                <span key={i} style={{ fontSize:12 }}>🍅</span>
              ))}
              {pomCount === 0 && <span style={{ fontSize:11, color:"#9CA3AF" }}>0 today</span>}
            </div>
          </div>

          {/* Circular timer */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:20 }}>
            <svg width={80} height={80} style={{ transform:"rotate(-90deg)" }}>
              <circle cx={40} cy={40} r={R} fill="none" stroke="#EDE9FF" strokeWidth={5}/>
              <circle
                cx={40} cy={40} r={R}
                fill="none"
                stroke={cfg.color}
                strokeWidth={5}
                strokeDasharray={`${dash} ${CIRC}`}
                strokeLinecap="round"
                style={{ transition:"stroke-dasharray 1s linear" }}
              />
            </svg>
            <div style={{
              marginTop:  -56,
              fontSize:   22,
              fontWeight: 800,
              color:      cfg.color,
              fontVariantNumeric: "tabular-nums",
              transform:  "rotate(0deg)",
            }}>
              {isActive ? fmt(timeLeft) : fmt(PHASE_CONFIG[phase].minutes * 60)}
            </div>
            <div style={{ marginTop:48, fontSize:11, color:"#9CA3AF" }}>
              {isRunning ? "Focus time" : isPaused ? "Paused" : "Ready"}
            </div>
          </div>

          {/* Phase selector (only when no active session) */}
          {!isActive && (
            <div style={{ display:"flex", gap:6, marginBottom:16 }}>
              {Object.entries(PHASE_CONFIG).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setPhase(key)}
                  style={{
                    flex:         1,
                    padding:      "6px 4px",
                    borderRadius: 8,
                    border:       `1.5px solid ${phase === key ? val.color : "#EDE9FF"}`,
                    background:   phase === key ? val.bg : "#FDFAFF",
                    color:        phase === key ? val.color : "#9CA3AF",
                    fontSize:     10,
                    fontWeight:   phase === key ? 700 : 400,
                    cursor:       "pointer",
                  }}
                >
                  {val.emoji} {val.label}
                </button>
              ))}
            </div>
          )}

          {/* Controls */}
          <div style={{ display:"flex", gap:8 }}>
            {!isActive ? (
              <button
                onClick={startSession}
                disabled={loading}
                style={{
                  flex:         1,
                  padding:      "10px",
                  borderRadius: 10,
                  border:       "none",
                  background:   `linear-gradient(135deg, ${cfg.color}, #A78BFA)`,
                  color:        "#fff",
                  fontWeight:   700,
                  fontSize:     14,
                  cursor:       loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Starting…" : "▶ Start"}
              </button>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  style={{
                    flex:         1,
                    padding:      "10px",
                    borderRadius: 10,
                    border:       "none",
                    background:   isRunning ? "#FEF3C7" : cfg.bg,
                    color:        isRunning ? "#D97706" : cfg.color,
                    fontWeight:   700,
                    fontSize:     14,
                    cursor:       "pointer",
                  }}
                >
                  {isRunning ? "⏸ Pause" : "▶ Resume"}
                </button>
                <button
                  onClick={stopSession}
                  style={{
                    padding:      "10px 14px",
                    borderRadius: 10,
                    border:       "1.5px solid #FECACA",
                    background:   "#FEF2F2",
                    color:        "#DC2626",
                    fontWeight:   700,
                    fontSize:     14,
                    cursor:       "pointer",
                  }}
                >
                  ■
                </button>
              </>
            )}
          </div>

          {/* Started by */}
          {session?.startedByName && (
            <p style={{ margin:"12px 0 0", fontSize:11, color:"#9CA3AF", textAlign:"center" }}>
              Started by {session.startedByName}
            </p>
          )}
        </div>
      )}

      {/* ── Floating pill (always visible) ── */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          10,
          padding:      "10px 18px",
          borderRadius: 50,
          background:   isRunning ? cfg.color : "#fff",
          border:       `2px solid ${cfg.color}`,
          boxShadow:    `0 4px 20px ${cfg.color}44`,
          cursor:       "pointer",
          userSelect:   "none",
          transition:   "all 0.2s",
          minWidth:     170,
        }}
      >
        {/* Pulsing dot when running */}
        <span style={{
          width:        10,
          height:       10,
          borderRadius: "50%",
          background:   isRunning ? "#fff" : cfg.color,
          flexShrink:   0,
          animation:    isRunning ? "pomPulse 1.5s ease-in-out infinite" : "none",
        }}/>

        <span style={{
          fontSize:   13,
          fontWeight: 700,
          color:      isRunning ? "#fff" : cfg.color,
          flex:       1,
        }}>
          {isRunning
            ? `${cfg.emoji} ${fmt(timeLeft)}`
            : isPaused
            ? `⏸ Paused · ${fmt(timeLeft)}`
            : `${cfg.emoji} Start session`}
        </span>

        <span style={{
          fontSize: 11,
          color:    isRunning ? "rgba(255,255,255,0.75)" : "#9CA3AF",
        }}>
          {expanded ? "▼" : "▲"}
        </span>
      </div>

      <style>{`
        @keyframes pomPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(1.3); }
        }
        @keyframes pomSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}