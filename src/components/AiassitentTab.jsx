import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";


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

const API_BASE         = import.meta.env.VITE_API_URL || "http://localhost:8080";
const TABS             = ["Notes", "Resources", "Tasks", "Chat", "AI Assistant"];
const getToken         = () => localStorage.getItem("token");
const getCurrentUserId = () => localStorage.getItem("userId");
const getCurrentEmail  = () => localStorage.getItem("email");


function AIAssistantTab() {
  const [query, setQuery]       = useState("");
  const [messages, setMessages] = useState([{ role:"ai", text:"Hi! I'm your AI study assistant 🤖 Ask me anything!" }]);
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const ask = async () => {
    if (!query.trim() || loading) return;
    const userMsg = query.trim();
    setMessages(prev => [...prev, { role:"user", text:userMsg }]);
    setQuery(""); setLoading(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role:"ai", text:`Connect this to your AI backend to get real answers about "${userMsg}".` }]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%" }}>
      <div style={{ padding:"16px 24px",borderBottom:`1px solid ${theme.colors.border}`,background:"linear-gradient(135deg,#F3F0FF 0%,#FCE7F3 100%)",display:"flex",alignItems:"center",gap:12 }}>
        <div style={{ width:40,height:40,borderRadius:12,background:theme.colors.primaryGradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>🤖</div>
        <div>
          <p style={{ margin:0,fontWeight:700,fontSize:14,color:theme.colors.textPrimary }}>Study Copilot AI</p>
          <p style={{ margin:0,fontSize:12,color:theme.colors.textMuted }}>Powered by Claude · Always ready to help</p>
        </div>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:14 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:"flex",flexDirection:msg.role==="user"?"row-reverse":"row",gap:10,alignItems:"flex-start" }}>
            {msg.role==="ai" && <div style={{ width:32,height:32,borderRadius:10,flexShrink:0,background:theme.colors.primaryGradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>🤖</div>}
            <div style={{ maxWidth:"72%",padding:"12px 16px",borderRadius:msg.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:msg.role==="user"?theme.colors.primaryGradient:"#F3F0FF",color:msg.role==="user"?"#fff":theme.colors.textPrimary,fontSize:14,lineHeight:1.6,whiteSpace:"pre-wrap" }}>{msg.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex",gap:10 }}>
            <div style={{ width:32,height:32,borderRadius:10,background:theme.colors.primaryGradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>🤖</div>
            <div style={{ padding:"12px 16px",borderRadius:"16px 16px 16px 4px",background:"#F3F0FF",color:theme.colors.textMuted,fontSize:14 }}>Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding:"12px 20px",borderTop:`1px solid ${theme.colors.border}`,display:"flex",gap:10,background:"#fff" }}>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key==="Enter" && ask()} placeholder="Ask anything…"
          style={{ flex:1,padding:"10px 16px",borderRadius:24,border:`1.5px solid ${theme.colors.border}`,fontSize:14,outline:"none",background:"#FDFAFF",fontFamily:"inherit",color:theme.colors.textPrimary }}
          onFocus={e => e.target.style.borderColor=theme.colors.primary}
          onBlur={e => e.target.style.borderColor=theme.colors.border}
        />
        <button onClick={ask} style={{ width:42,height:42,borderRadius:"50%",border:"none",background:loading?"#C4B5FD":theme.colors.primaryGradient,color:"#fff",fontSize:18,cursor:loading?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✦</button>
      </div>
    </div>
  );
}

export default AIAssistantTab;