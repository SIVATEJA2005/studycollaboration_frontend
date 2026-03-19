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


function MembersDrawer({ isOpen, onClose, room, onMembershipChange }) {
  const [visible,      setVisible]      = useState(false);
  const [drawerTab,    setDrawerTab]    = useState("members");
  const [allUsers,     setAllUsers]     = useState([]);
  const [query,        setQuery]        = useState("");
  const [joining,      setJoining]      = useState(false);
  const [leaving,      setLeaving]      = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const members             = room?.members || [];
  const currentEmail        = getCurrentEmail();
  const isCurrentUserMember = members.some(
    (m) => m.email === currentEmail || String(m.id) === String(getCurrentUserId())
  );

  useEffect(() => {
    if (isOpen) setTimeout(() => setVisible(true), 10);
    else { setVisible(false); setTimeout(() => { setQuery(""); setDrawerTab("members"); }, 350); }
  }, [isOpen]);

  const fetchAllUsers = useCallback(async () => {
    if (allUsers.length > 0) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/getAllUsers`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setAllUsers(await res.json());
    } catch (err) { console.error("Fetch users failed:", err); }
    finally { setLoadingUsers(false); }
  }, [allUsers.length]);

  useEffect(() => {
    if (isOpen && drawerTab === "add") fetchAllUsers();
  }, [isOpen, drawerTab, fetchAllUsers]);

  const handleJoinRoom = async () => {
    setJoining(true);
    try {
      await fetch(`${API_BASE}/room/join/${room.id}`, {
        method: "GET", headers: { Authorization: `Bearer ${getToken()}` },
      });
      await onMembershipChange();
    } catch (err) { console.error("Join room failed:", err); }
    finally { setJoining(false); }
  };

  const handleLeaveRoom = async () => {
    if (!window.confirm("Leave this study room?")) return;
    setLeaving(true);
    try {
      await fetch(`${API_BASE}/room/leave/${room.id}`, {
        method: "GET", headers: { Authorization: `Bearer ${getToken()}` },
      });
      await onMembershipChange();
      onClose();
    } catch (err) { console.error("Leave room failed:", err); }
    finally { setLeaving(false); }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      !members.some((m) => m.email === u.email || m.id === u.id) &&
      (
        (u.userName    || "").toLowerCase().includes(query.toLowerCase()) ||
        (u.email       || "").toLowerCase().includes(query.toLowerCase()) ||
        (u.displayName || "").toLowerCase().includes(query.toLowerCase())
      )
  );

  if (!isOpen && !visible) return null;

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(30,27,75,0.45)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div style={{ width:"100%",maxWidth:540,background:"#fff",borderRadius:"24px 24px 0 0",boxShadow:"0 -12px 48px rgba(108,99,255,0.2)",transform:visible?"translateY(0)":"translateY(100%)",transition:"transform 0.38s cubic-bezier(0.34,1.4,0.64,1)",maxHeight:"88vh",display:"flex",flexDirection:"column" }}>
        <div style={{ width:44,height:5,borderRadius:99,background:"#DDD5FF",margin:"14px auto 0" }} />

        {/* Header */}
        <div style={{ padding:"14px 24px 0",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <p style={{ margin:0,fontWeight:800,fontSize:18,color:theme.colors.textPrimary }}>Room Members</p>
            <p style={{ margin:0,fontSize:12,color:theme.colors.textMuted }}>
              {room?.name} · {room?.memberCount ?? members.length} member{(room?.memberCount ?? members.length) !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={onClose} style={{ width:34,height:34,borderRadius:"50%",border:"none",background:"#F3F0FF",color:theme.colors.primary,fontSize:20,cursor:"pointer" }}>×</button>
        </div>

        {/* Sub-tabs */}
        <div style={{ display:"flex",padding:"14px 24px 0",borderBottom:`1px solid ${theme.colors.border}` }}>
          {[
            { key:"members", label:`👥 Members (${room?.memberCount ?? members.length})` },
            { key:"add",     label:"🔍 Find People" },
          ].map(t => (
            <button key={t.key} onClick={() => setDrawerTab(t.key)} style={{ padding:"9px 18px",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:drawerTab===t.key?700:500,color:drawerTab===t.key?theme.colors.primary:theme.colors.textMuted,borderBottom:drawerTab===t.key?`2.5px solid ${theme.colors.primary}`:"2.5px solid transparent",marginBottom:-1,transition:"all 0.15s" }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1,overflowY:"auto",padding:"16px 24px" }}>

          {/* MEMBERS TAB */}
          {drawerTab === "members" && (
            <>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderRadius:14,marginBottom:16,background:isCurrentUserMember?"linear-gradient(135deg,#FFF1F1,#FFEDED)":"linear-gradient(135deg,#F3F0FF,#EDE9FF)",border:`1.5px solid ${isCurrentUserMember?"#FECACA":theme.colors.border}` }}>
                <div>
                  <p style={{ margin:0,fontWeight:700,fontSize:14,color:theme.colors.textPrimary }}>
                    {isCurrentUserMember ? "✅ You're a member" : "🚪 You're not in this room"}
                  </p>
                  <p style={{ margin:0,fontSize:12,color:theme.colors.textMuted }}>
                    {isCurrentUserMember ? "You have full access to collaborate" : "Join to access notes, tasks, and chat"}
                  </p>
                </div>
                {isCurrentUserMember ? (
                  <button onClick={handleLeaveRoom} disabled={leaving} style={{ padding:"8px 18px",borderRadius:10,border:"none",background:leaving?"#FECACA":"#EF4444",color:"#fff",fontWeight:700,fontSize:13,cursor:leaving?"not-allowed":"pointer" }}>
                    {leaving ? "Leaving…" : "🚪 Leave"}
                  </button>
                ) : (
                  <button onClick={handleJoinRoom} disabled={joining} style={{ padding:"8px 18px",borderRadius:10,border:"none",background:joining?"#C4B5FD":theme.colors.primaryGradient,color:"#fff",fontWeight:700,fontSize:13,cursor:joining?"not-allowed":"pointer" }}>
                    {joining ? "Joining…" : "🚀 Join Room"}
                  </button>
                )}
              </div>

              {members.length === 0 ? (
                <div style={{ textAlign:"center",padding:"40px 0",color:theme.colors.textMuted }}>
                  <div style={{ fontSize:40 }}>👥</div>
                  <p style={{ fontSize:13,marginTop:8 }}>No members yet</p>
                </div>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {members.map((member, i) => {
                    const isMe = member.email === currentEmail || String(member.id) === String(getCurrentUserId());
                    const displayName = member.userName || member.username || member.displayName || "User";
                    return (
                      <div key={member.id || i} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:14,background:isMe?"#F3F0FF":"#FAFAFA",border:`1px solid ${isMe?theme.colors.border:"#F0EEF8"}` }}>
                        <div style={{ width:42,height:42,borderRadius:"50%",flexShrink:0,background:isMe?theme.colors.primaryGradient:"#E0DBFF",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#fff",fontSize:16 }}>
                          {displayName[0].toUpperCase()}
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:0,fontWeight:600,fontSize:14,color:theme.colors.textPrimary }}>
                            {displayName}{" "}{isMe && <span style={{ fontSize:11,color:theme.colors.primary }}>(you)</span>}
                          </p>
                          <p style={{ margin:0,fontSize:12,color:theme.colors.textMuted }}>{member.email}</p>
                        </div>
                        <span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:isMe?theme.colors.primaryLight:"#F0EEF8",color:isMe?theme.colors.primary:theme.colors.textMuted }}>
                          {isMe ? "You" : "Member"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* FIND PEOPLE TAB */}
          {drawerTab === "add" && (
            <>
              <div style={{ padding:"10px 14px",borderRadius:10,marginBottom:14,background:"#FFFBEB",border:"1px solid #FDE68A",fontSize:12,color:"#92400E",lineHeight:1.5 }}>
                ℹ️ Users must join rooms themselves. Share the room ID{" "}
                <strong style={{ background:"#FEF3C7",padding:"1px 6px",borderRadius:4 }}>#{room?.id}</strong>
                {" "}so they can click <strong>Join Room</strong>.
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:10,background:"#F9F5FF",borderRadius:12,border:`1.5px solid ${theme.colors.border}`,padding:"10px 14px",marginBottom:18 }}>
                <span style={{ color:theme.colors.textMuted,fontSize:16 }}>🔍</span>
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users by name or email…"
                  style={{ flex:1,border:"none",outline:"none",background:"transparent",fontSize:14,color:theme.colors.textPrimary,fontFamily:"inherit" }} />
                {loadingUsers && <span style={{ fontSize:12,color:theme.colors.textMuted }}>Loading…</span>}
              </div>
              {filteredUsers.length > 0 ? (
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  <p style={{ fontSize:11,fontWeight:700,color:theme.colors.textMuted,letterSpacing:"0.08em",textTransform:"uppercase",margin:"0 0 10px" }}>Not yet joined ({filteredUsers.length})</p>
                  {filteredUsers.map(user => {
                    const name = user.userName || user.displayName || user.email || "User";
                    return (
                      <div key={user.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:12,background:"#fff",border:`1px solid ${theme.colors.border}` }}>
                        <div style={{ width:40,height:40,borderRadius:"50%",flexShrink:0,background:"#E0DBFF",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:theme.colors.primary,fontSize:15 }}>
                          {name[0].toUpperCase()}
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ margin:0,fontWeight:600,fontSize:14,color:theme.colors.textPrimary }}>{name}</p>
                          <p style={{ margin:0,fontSize:12,color:theme.colors.textMuted }}>{user.email}</p>
                        </div>
                        <span style={{ fontSize:11,padding:"3px 10px",borderRadius:20,background:"#F3F4F6",color:theme.colors.textMuted }}>Not joined</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                !loadingUsers && (
                  <div style={{ textAlign:"center",padding:"40px 0",color:theme.colors.textMuted }}>
                    <div style={{ fontSize:36 }}>🧑‍🤝‍🧑</div>
                    <p style={{ fontSize:13,marginTop:10 }}>{query ? `No results for "${query}"` : "All registered users are already members"}</p>
                  </div>
                )
              )}
            </>
          )}
        </div>

        <div style={{ padding:"14px 24px",borderTop:`1px solid ${theme.colors.border}` }}>
          <button onClick={onClose} style={{ width:"100%",padding:"12px",borderRadius:12,border:"none",background:theme.colors.primaryGradient,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer" }}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default MembersDrawer;