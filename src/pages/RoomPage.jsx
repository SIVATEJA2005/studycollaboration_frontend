import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import ChatTab from "../components/ChatTab";
import NotesTab from "../components/Notes";
import TasksTab from "../components/TaskTab";
import ResourcesTab from "../components/ResourcesTab";
import AIAssistantTab from "../components/AiassitentTab";
import MembersDrawer from "../components/MemberDrawer";
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

// ══════════════════════════════════════════════════════════════════════════════
// MEMBERS DRAWER
// ══════════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════════
// NOTES TAB
// ══════════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════════
// TASKS TAB
// ══════════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════════
// RESOURCES TAB
// ══════════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════════
// AI ASSISTANT TAB
// ══════════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════════
// MAIN ROOM PAGE
// Gets room from React Router location.state (passed by Dashboard navigate)
// Refreshes room data via GET /room/{id} to get live memberCount
// ══════════════════════════════════════════════════════════════════════════════
export default function RoomPage() {
  const location    = useLocation();
  const navigate    = useNavigate();
  const onBack      = () => navigate("/dashboard");

  // Room comes from router state when Dashboard navigates here
  const initialRoom = location.state?.room;

  const [activeTab,    setActiveTab]    = useState("Notes");
  const [membersOpen,  setMembersOpen]  = useState(false);
  const [room,         setRoom]         = useState(initialRoom);

  // Re-fetch room from GET /room/{id} to get fresh memberCount
  const refreshRoom = useCallback(async () => {
    const id = initialRoom?.id || room?.id;
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/room/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setRoom(await res.json());
    } catch (err) { console.error("Refresh room failed:", err); }
  }, [initialRoom?.id, room?.id]);

  useEffect(() => { refreshRoom(); }, []);

  // memberCount comes directly from RoomResponseDTO field
  const memberCount = room?.memberCount ?? 0;
  const userName    = localStorage.getItem("userName") || "A";

  if (!room) {
    return (
      <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:16,color:theme.colors.textMuted }}>
        <div style={{ fontSize:40 }}>😕</div>
        <p style={{ fontSize:16 }}>Room not found.</p>
        <button onClick={onBack} style={{ padding:"10px 24px",borderRadius:10,border:"none",background:theme.colors.primaryGradient,color:"#fff",fontWeight:700,cursor:"pointer" }}>← Back to Dashboard</button>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "Notes":        return <NotesTab roomId={room.id} />;
      case "Resources":    return <ResourcesTab roomId={room.id} />;
      case "Tasks":        return <TasksTab roomId={room.id} />;
      case "Chat":         return room.id ? <ChatTab roomId={room.id} /> : <p>Loading chat…</p>;
      case "AI Assistant": return <AIAssistantTab />;
      default:             return null;
    }
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",background:theme.colors.bgPage,color:theme.colors.textPrimary }}>

      {/* Top bar */}
      <header style={{ height:60,display:"flex",alignItems:"center",padding:"0 24px",borderBottom:`1px solid ${theme.colors.border}`,background:"#fff",gap:14,flexShrink:0 }}>
        <button onClick={onBack} style={{ width:34,height:34,borderRadius:10,border:`1.5px solid ${theme.colors.border}`,background:"#fff",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",color:theme.colors.textSecondary }}>←</button>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:36,height:36,borderRadius:10,background:theme.colors.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>{room.icon||"👥"}</div>
          <div>
            <p style={{ margin:0,fontWeight:700,fontSize:15,color:theme.colors.textPrimary }}>{room.name}</p>
            <p style={{ margin:0,fontSize:11,color:theme.colors.textMuted }}>
              {memberCount} member{memberCount!==1?"s":""}{room.tag?` · ${room.tag}`:""}
            </p>
          </div>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:10 }}>
          <button onClick={() => setMembersOpen(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,border:`1.5px solid ${theme.colors.border}`,background:"#fff",color:theme.colors.primary,fontSize:13,fontWeight:600,cursor:"pointer" }}>
            👥 Members ({memberCount})
          </button>
          <button style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 14px",borderRadius:8,border:"none",background:theme.colors.primaryGradient,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer" }}>📹 Start Call</button>
          <span style={{ fontSize:20,cursor:"pointer" }}>🔔</span>
          <div style={{ width:34,height:34,borderRadius:"50%",background:"#FDA4AF",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#fff",fontSize:13,cursor:"pointer" }}>
            {userName[0].toUpperCase()}
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div style={{ display:"flex",alignItems:"center",gap:2,padding:"0 24px",borderBottom:`1px solid ${theme.colors.border}`,background:"#fff",flexShrink:0 }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding:"14px 18px",border:"none",background:"transparent",cursor:"pointer",fontSize:14,fontWeight:isActive?700:400,color:isActive?theme.colors.primary:theme.colors.textSecondary,borderBottom:isActive?`2.5px solid ${theme.colors.primary}`:"2.5px solid transparent",transition:"all 0.15s",marginBottom:-1 }}>
              {tab==="AI Assistant" ? "✦ "+tab : tab}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ flex:1,overflow:"hidden",display:"flex",flexDirection:"column" }}>
        {renderTab()}
      </div>

      {/* Members Drawer */}
      <MembersDrawer
        isOpen={membersOpen}
        onClose={() => setMembersOpen(false)}
        room={room}
        onMembershipChange={refreshRoom}
      />
    </div>
  );
}
