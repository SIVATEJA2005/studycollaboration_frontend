import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const theme = {
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

const API_BASE     = import.meta.env.VITE_API_URL || "http://localhost:8080";
const getToken     = () => localStorage.getItem("token");
const getCurrentId = () => localStorage.getItem("userId");

// ══════════════════════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════════════════════
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const ok = toast.type === "success";
  return (
    <div style={{
      position:"fixed", bottom:28, left:"50%", transform:"translateX(-50%)",
      zIndex:3000, display:"flex", alignItems:"center", gap:12,
      background: ok ? "#F0FDF4" : "#FEF2F2",
      border:`1.5px solid ${ok ? "#BBF7D0" : "#FECACA"}`,
      borderRadius:14, padding:"14px 20px",
      boxShadow:"0 8px 32px rgba(0,0,0,0.13)",
      maxWidth:420, width:"calc(100% - 48px)",
      animation:"toastUp 0.3s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      <style>{`@keyframes toastUp{from{opacity:0;transform:translateX(-50%) translateY(20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      <span style={{ fontSize:20 }}>{ok ? "✅" : "⚠️"}</span>
      <p style={{ margin:0,fontSize:14,fontWeight:600,color:ok?"#15803D":"#DC2626",flex:1 }}>{toast.message}</p>
      <button onClick={onClose} style={{ border:"none",background:"none",cursor:"pointer",color:"#9CA3AF",fontSize:18,padding:0 }}>×</button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// INVITE CODE MODAL — shown immediately after room creation
// ══════════════════════════════════════════════════════════════════════════════
function InviteCodeModal({ isOpen, room, onClose, onOpenRoom }) {
  const [visible, setVisible] = useState(false);
  const [copied,  setCopied]  = useState("");

  useEffect(() => {
    if (isOpen) setTimeout(() => setVisible(true), 10);
    else setVisible(false);
  }, [isOpen]);

  const code = room?.inviteCode || room?.invite_code || "";

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2500);
  };

  if (!isOpen && !visible) return null;
  return (
    <div style={{ position:"fixed",inset:0,zIndex:2000,background:"rgba(30,27,75,0.5)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ width:"100%",maxWidth:420,background:"#fff",borderRadius:24,boxShadow:"0 24px 80px rgba(108,99,255,0.25)",transform:visible?"scale(1)":"scale(0.9)",opacity:visible?1:0,transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",overflow:"hidden" }}>
        <div style={{ background:theme.colors.primaryGradient,padding:"28px 28px 24px",textAlign:"center" }}>
          <div style={{ fontSize:48,marginBottom:10 }}>🎉</div>
          <p style={{ margin:0,fontWeight:800,fontSize:20,color:"#fff" }}>Room Created!</p>
          <p style={{ margin:"6px 0 0",fontSize:13,color:"rgba(255,255,255,0.8)" }}>Share this invite code with your students</p>
        </div>
        <div style={{ padding:"28px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:24,padding:"12px 16px",background:theme.colors.primaryLight,borderRadius:12,border:`1px solid ${theme.colors.border}` }}>
            <span style={{ fontSize:26 }}>{room?.icon || "👥"}</span>
            <div>
              <p style={{ margin:0,fontWeight:700,fontSize:15,color:theme.colors.textPrimary }}>{room?.name}</p>
              {room?.tag && <span style={{ fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:"#fff",color:theme.colors.primary }}>{room.tag}</span>}
            </div>
          </div>
          <p style={{ margin:"0 0 10px",fontSize:12,fontWeight:700,color:theme.colors.textMuted,textTransform:"uppercase",letterSpacing:"0.07em" }}>Your Invite Code</p>
          <div style={{ background:"#FAFAFA",border:`2px dashed ${theme.colors.border}`,borderRadius:14,padding:"20px",textAlign:"center",marginBottom:16 }}>
            <p style={{ margin:0,fontSize:36,fontWeight:900,letterSpacing:"0.35em",color:theme.colors.primary,fontFamily:"'Courier New',monospace" }}>
              {code || "------"}
            </p>
            <p style={{ margin:"8px 0 0",fontSize:12,color:theme.colors.textMuted }}>Anyone with this code can join your room</p>
          </div>
          <div style={{ display:"flex",gap:10,marginBottom:16 }}>
            <button onClick={() => copy(code,"code")} style={{ flex:1,padding:"11px",borderRadius:10,border:"none",background:copied==="code"?"#10B981":theme.colors.primaryGradient,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",transition:"background 0.2s" }}>
              {copied==="code" ? "✓ Copied!" : "📋 Copy Code"}
            </button>
            <button onClick={() => copy(`Join my study room "${room?.name}" on StudyCollab!\nInvite code: ${code}`,"msg")} style={{ flex:1,padding:"11px",borderRadius:10,border:`1.5px solid ${theme.colors.border}`,background:"#fff",color:theme.colors.primary,fontWeight:700,fontSize:13,cursor:"pointer" }}>
              {copied==="msg" ? "✓ Copied!" : "💬 Copy Message"}
            </button>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={onClose} style={{ flex:1,padding:"11px",borderRadius:10,border:`1.5px solid ${theme.colors.border}`,background:"#fff",color:theme.colors.textSecondary,fontWeight:600,fontSize:13,cursor:"pointer" }}>
              Back to Dashboard
            </button>
            <button onClick={() => { onClose(); onOpenRoom(room); }} style={{ flex:1,padding:"11px",borderRadius:10,border:"none",background:theme.colors.primaryGradient,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer" }}>
              Open Room →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// JOIN BY CODE MODAL — POST /room/join-by-code
// ══════════════════════════════════════════════════════════════════════════════
function JoinByCodeModal({ isOpen, onClose, onJoined }) {
  const [visible, setVisible] = useState(false);
  const [code,    setCode]    = useState("");
  const [joining, setJoining] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (isOpen) setTimeout(() => setVisible(true), 10);
    else { setVisible(false); setTimeout(() => { setCode(""); setError(""); }, 350); }
  }, [isOpen]);

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setError("Please enter an invite code"); return; }
    setJoining(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/room/join-by-code`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` },
        body:JSON.stringify({ code: trimmed }),
      });
      if (res.ok) { onJoined(await res.json()); onClose(); }
      else setError("Invalid or expired invite code. Double-check and try again.");
    } catch { setError("Network error. Please try again."); }
    finally { setJoining(false); }
  };

  if (!isOpen && !visible) return null;
  return (
    <div onClick={e => e.target===e.currentTarget && onClose()} style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(30,27,75,0.45)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div style={{ width:"100%",maxWidth:460,background:"#fff",borderRadius:"24px 24px 0 0",boxShadow:"0 -12px 48px rgba(108,99,255,0.2)",transform:visible?"translateY(0)":"translateY(100%)",transition:"transform 0.38s cubic-bezier(0.34,1.4,0.64,1)",paddingBottom:28 }}>
        <div style={{ width:44,height:5,borderRadius:99,background:"#DDD5FF",margin:"14px auto 0" }} />
        <div style={{ padding:"18px 24px 14px",borderBottom:`1px solid ${theme.colors.border}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <p style={{ margin:0,fontWeight:800,fontSize:18,color:theme.colors.textPrimary }}>Join a Room</p>
            <p style={{ margin:0,fontSize:12,color:theme.colors.textMuted }}>Enter the invite code shared by your room creator</p>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:"50%",border:"none",background:"#F3F0FF",color:theme.colors.primary,fontSize:18,cursor:"pointer" }}>×</button>
        </div>
        <div style={{ padding:"24px" }}>
          <div style={{ background:"linear-gradient(135deg,#F3F0FF,#EDE9FF)",borderRadius:14,padding:"16px 20px",marginBottom:22,display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ width:44,height:44,borderRadius:12,background:theme.colors.primaryGradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>🔑</div>
            <div>
              <p style={{ margin:0,fontWeight:700,fontSize:13,color:theme.colors.textPrimary }}>How to get an invite code?</p>
              <p style={{ margin:"3px 0 0",fontSize:12,color:theme.colors.textMuted,lineHeight:1.5 }}>Ask your teacher or group creator to share the 8-character code.</p>
            </div>
          </div>
          <p style={{ margin:"0 0 8px",fontSize:12,fontWeight:700,color:theme.colors.textMuted,textTransform:"uppercase",letterSpacing:"0.07em" }}>Invite Code</p>
          <input
            autoFocus value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
            onKeyDown={e => e.key==="Enter" && handleJoin()}
            placeholder="e.g. AB12CD34" maxLength={8}
            style={{ width:"100%",padding:"14px 18px",borderRadius:12,border:`2px solid ${error?"#FCA5A5":theme.colors.border}`,fontSize:24,fontWeight:800,letterSpacing:"0.3em",textAlign:"center",outline:"none",fontFamily:"'Courier New',monospace",color:theme.colors.textPrimary,background:"#FDFAFF",boxSizing:"border-box" }}
            onFocus={e => { if(!error) e.target.style.borderColor=theme.colors.primary; }}
            onBlur={e => { if(!error) e.target.style.borderColor=theme.colors.border; }}
          />
          {error && <p style={{ margin:"8px 0 0",fontSize:12,color:"#EF4444" }}>⚠️ {error}</p>}
          <button onClick={handleJoin} disabled={joining||!code.trim()} style={{ width:"100%",marginTop:18,padding:"13px",borderRadius:12,border:"none",background:joining||!code.trim()?"#C4B5FD":theme.colors.primaryGradient,color:"#fff",fontWeight:700,fontSize:15,cursor:joining||!code.trim()?"not-allowed":"pointer",boxShadow:"0 4px 14px rgba(108,99,255,0.35)" }}>
            {joining ? "Joining…" : "🚀 Join Room"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CREATE ROOM MODAL — POST /room/create
// ══════════════════════════════════════════════════════════════════════════════
function CreateRoomModal({ isOpen, onClose, onCreated }) {
  const [visible,     setVisible]     = useState(false);
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [tag,         setTag]         = useState("General");
  const [icon,        setIcon]        = useState("📚");
  const [creating,    setCreating]    = useState(false);
  const [error,       setError]       = useState("");

  const ICONS = ["📚","💻","🧪","🎯","📐","🧠","🔬","✏️","🌍","🎨"];
  const TAGS  = ["General","Favorites","Science","Math","Tech","Language","Arts","Other"];

  useEffect(() => {
    if (isOpen) setTimeout(() => setVisible(true), 10);
    else { setVisible(false); setTimeout(() => { setName(""); setDescription(""); setError(""); }, 350); }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Room name is required"); return; }
    setCreating(true); setError("");
    try {
      const res = await fetch(`${API_BASE}/room/create`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` },
        body:JSON.stringify({ name:name.trim(), description:description.trim(), tag, icon }),
      });
      if (res.ok) { onCreated(await res.json()); onClose(); }
      else setError("Failed to create room. Try again.");
    } catch { setError("Network error."); }
    finally { setCreating(false); }
  };

  if (!isOpen && !visible) return null;
  return (
    <div onClick={e => e.target===e.currentTarget && onClose()} style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(30,27,75,0.45)",backdropFilter:"blur(6px)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div style={{ width:"100%",maxWidth:480,background:"#fff",borderRadius:"24px 24px 0 0",boxShadow:"0 -12px 48px rgba(108,99,255,0.2)",transform:visible?"translateY(0)":"translateY(100%)",transition:"transform 0.38s cubic-bezier(0.34,1.4,0.64,1)",paddingBottom:28,maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ width:44,height:5,borderRadius:99,background:"#DDD5FF",margin:"14px auto 0" }} />
        <div style={{ padding:"18px 24px 14px",borderBottom:`1px solid ${theme.colors.border}`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div>
            <p style={{ margin:0,fontWeight:800,fontSize:18,color:theme.colors.textPrimary }}>Create Study Room</p>
            <p style={{ margin:0,fontSize:12,color:theme.colors.textMuted }}>Invite code is auto-generated after creation</p>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:"50%",border:"none",background:"#F3F0FF",color:theme.colors.primary,fontSize:18,cursor:"pointer" }}>×</button>
        </div>
        <div style={{ padding:"20px 24px",display:"flex",flexDirection:"column",gap:18 }}>
          <div>
            <p style={{ margin:"0 0 10px",fontSize:12,fontWeight:700,color:theme.colors.textMuted,textTransform:"uppercase",letterSpacing:"0.07em" }}>Room Icon</p>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)} style={{ width:42,height:42,borderRadius:10,border:icon===ic?`2px solid ${theme.colors.primary}`:`1.5px solid ${theme.colors.border}`,background:icon===ic?theme.colors.primaryLight:"#fff",fontSize:20,cursor:"pointer" }}>{ic}</button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ margin:"0 0 8px",fontSize:12,fontWeight:700,color:theme.colors.textMuted,textTransform:"uppercase",letterSpacing:"0.07em" }}>Room Name *</p>
            <input autoFocus value={name} onChange={e => { setName(e.target.value); setError(""); }}
              placeholder="e.g. DSA Study Group, React Learners…"
              style={{ width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${error?"#FCA5A5":theme.colors.border}`,fontSize:14,outline:"none",fontFamily:"inherit",color:theme.colors.textPrimary,background:"#FDFAFF",boxSizing:"border-box" }}
              onFocus={e => e.target.style.borderColor=theme.colors.primary}
              onBlur={e => e.target.style.borderColor=error?"#FCA5A5":theme.colors.border}
            />
            {error && <p style={{ margin:"6px 0 0",fontSize:12,color:"#EF4444" }}>{error}</p>}
          </div>
          <div>
            <p style={{ margin:"0 0 8px",fontSize:12,fontWeight:700,color:theme.colors.textMuted,textTransform:"uppercase",letterSpacing:"0.07em" }}>
              Description <span style={{ fontWeight:400,textTransform:"none",letterSpacing:0 }}>(optional)</span>
            </p>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="What is this room for? e.g. Weekly DSA practice for final exams…"
              style={{ width:"100%",padding:"11px 14px",borderRadius:10,border:`1.5px solid ${theme.colors.border}`,fontSize:14,outline:"none",fontFamily:"inherit",color:theme.colors.textPrimary,background:"#FDFAFF",boxSizing:"border-box",resize:"vertical",lineHeight:1.6 }}
              onFocus={e => e.target.style.borderColor=theme.colors.primary}
              onBlur={e => e.target.style.borderColor=theme.colors.border}
            />
          </div>
          <div>
            <p style={{ margin:"0 0 8px",fontSize:12,fontWeight:700,color:theme.colors.textMuted,textTransform:"uppercase",letterSpacing:"0.07em" }}>Category</p>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
              {TAGS.map(t => (
                <button key={t} onClick={() => setTag(t)} style={{ padding:"6px 14px",borderRadius:20,border:tag===t?"none":`1.5px solid ${theme.colors.border}`,background:tag===t?theme.colors.primaryGradient:"#fff",color:tag===t?"#fff":theme.colors.textSecondary,fontSize:12,fontWeight:600,cursor:"pointer" }}>{t}</button>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating} style={{ width:"100%",padding:"13px",borderRadius:12,border:"none",background:creating?"#C4B5FD":theme.colors.primaryGradient,color:"#fff",fontWeight:700,fontSize:15,cursor:creating?"not-allowed":"pointer",boxShadow:"0 4px 14px rgba(108,99,255,0.35)" }}>
            {creating ? "Creating…" : "✨ Create Room"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOM CARD — clicking navigates to RoomPage via React Router
// ══════════════════════════════════════════════════════════════════════════════
function RoomCard({ room, isCreator, onOpen }) {
  const memberCount = room.memberCount ?? room.members?.length ?? 0;

  return (
    <div
      onClick={() => onOpen(room)}
      style={{ background:"#fff",borderRadius:18,border:`1.5px solid ${theme.colors.border}`,padding:"20px 22px",boxShadow:"0 4px 16px rgba(108,99,255,0.08)",transition:"all 0.2s",cursor:"pointer" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow="0 8px 28px rgba(108,99,255,0.18)"; e.currentTarget.style.transform="translateY(-3px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow="0 4px 16px rgba(108,99,255,0.08)"; e.currentTarget.style.transform="translateY(0)"; }}
    >
      <div style={{ display:"flex",alignItems:"flex-start",gap:14 }}>
        <div style={{ width:52,height:52,borderRadius:14,flexShrink:0,background:theme.colors.primaryGradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 }}>
          {room.icon || "👥"}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}>
            <p style={{ margin:0,fontWeight:700,fontSize:15,color:theme.colors.textPrimary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{room.name}</p>
            {isCreator && (
              <span style={{ fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"linear-gradient(135deg,#FEF3C7,#FDE68A)",color:"#92400E",flexShrink:0 }}>👑 Creator</span>
            )}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
            {room.tag && <span style={{ fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:theme.colors.primaryLight,color:theme.colors.primary }}>{room.tag}</span>}
            <span style={{ fontSize:12,color:theme.colors.textMuted }}>👥 {memberCount} member{memberCount!==1?"s":""}</span>
          </div>
          {room.description && (
            <p style={{ margin:"8px 0 0",fontSize:13,color:theme.colors.textSecondary,lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>
              {room.description}
            </p>
          )}
        </div>
      </div>
      <div style={{ marginTop:16,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <span style={{ fontSize:12,color:theme.colors.textMuted }}>Click to open →</span>
        <div style={{ width:32,height:32,borderRadius:10,background:theme.colors.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",color:theme.colors.primary,fontSize:16 }}>→</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate   = useNavigate();
  const { logout } = useAuth();

  const [rooms,        setRooms]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [createOpen,   setCreateOpen]   = useState(false);
  const [joinOpen,     setJoinOpen]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [toast,        setToast]        = useState(null);
  const [newRoomModal, setNewRoomModal] = useState(null);

  const currentId = getCurrentId();
  const userName  = localStorage.getItem("userName") || "Student";

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleEnterRoom = (room) => {
    navigate(`/room/${room.id}`, { state: { room } });
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // GET /room/myRooms — returns only rooms the current user belongs to
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/room/myRooms`, {
        headers:{ Authorization:`Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (err) { console.error("Fetch rooms failed:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const isCreator = (room) =>
    String(room.createdById) === String(currentId) ||
    room.createdByName === localStorage.getItem("userName");

  const myRooms = rooms;

  const filtered = myRooms.filter(r =>
    search.trim() === "" || r.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoomCreated = async (newRoom) => {
    await fetchRooms();
    setNewRoomModal(newRoom);
  };

  const handleJoined = async (room) => {
    await fetchRooms();
    showToast(`✅ You joined "${room.name}" successfully!`);
  };

  return (
    <div style={{ minHeight:"100vh",background:theme.colors.bgPage,fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

      {/* ── Top nav ── */}
      <header style={{ background:"#fff",borderBottom:`1px solid ${theme.colors.border}`,padding:"0 32px",height:64,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10,boxShadow:"0 1px 12px rgba(108,99,255,0.07)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:34,height:34,borderRadius:10,background:theme.colors.primaryGradient,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>✦</div>
          <p style={{ margin:0,fontWeight:800,fontSize:17,color:theme.colors.textPrimary }}>StudyCollab</p>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <button onClick={() => setJoinOpen(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:10,border:`1.5px solid ${theme.colors.border}`,background:"#fff",color:theme.colors.primary,fontWeight:700,fontSize:13,cursor:"pointer" }}>
            🔑 Join with Code
          </button>
          <button onClick={() => setCreateOpen(true)} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 18px",borderRadius:10,border:"none",background:theme.colors.primaryGradient,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:"0 2px 10px rgba(108,99,255,0.3)" }}>
            ＋ Create Room
          </button>
          <div onClick={handleLogout} style={{ display:"flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:10,background:theme.colors.primaryLight,border:`1px solid ${theme.colors.border}`,cursor:"pointer" }}>
            <div style={{ width:28,height:28,borderRadius:"50%",background:theme.colors.primaryGradient,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#fff",fontSize:12 }}>
              {userName[0].toUpperCase()}
            </div>
            <span style={{ fontSize:13,fontWeight:600,color:theme.colors.textPrimary }}>{userName}</span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth:900,margin:"0 auto",padding:"36px 24px" }}>

        {/* ── Hero ── */}
        <div style={{ marginBottom:32 }}>
          <h1 style={{ margin:"0 0 6px",fontSize:26,fontWeight:800,color:theme.colors.textPrimary }}>
            Welcome back, {userName.split(" ")[0]} 👋
          </h1>
          <p style={{ margin:0,fontSize:15,color:theme.colors.textMuted }}>
            Your study rooms — collaborate, take notes, and crush your goals.
          </p>
        </div>

        {/* ── Stats ── */}
        <div style={{ display:"flex",gap:14,marginBottom:32,flexWrap:"wrap" }}>
          {[
            { label:"My Rooms",   value:myRooms.length,                          icon:"🏠", color:"#F3F0FF" },
            { label:"As Creator", value:myRooms.filter(r=>isCreator(r)).length,  icon:"👑", color:"#FEF3C7" },
            { label:"As Member",  value:myRooms.filter(r=>!isCreator(r)).length, icon:"🤝", color:"#D1FAE5" },
          ].map(s => (
            <div key={s.label} style={{ flex:1,minWidth:140,background:"#fff",borderRadius:14,border:`1px solid ${theme.colors.border}`,padding:"16px 20px",display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ width:42,height:42,borderRadius:12,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>{s.icon}</div>
              <div>
                <p style={{ margin:0,fontWeight:800,fontSize:24,color:theme.colors.textPrimary }}>{s.value}</p>
                <p style={{ margin:0,fontSize:12,color:theme.colors.textMuted }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Search ── */}
        {myRooms.length > 0 && (
          <div style={{ display:"flex",alignItems:"center",gap:10,background:"#fff",borderRadius:12,border:`1.5px solid ${theme.colors.border}`,padding:"10px 16px",marginBottom:24,maxWidth:400 }}>
            <span style={{ color:theme.colors.textMuted }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your rooms…"
              style={{ flex:1,border:"none",outline:"none",fontSize:14,background:"transparent",color:theme.colors.textPrimary,fontFamily:"inherit" }} />
            {search && <button onClick={() => setSearch("")} style={{ border:"none",background:"none",cursor:"pointer",color:theme.colors.textMuted,fontSize:16 }}>×</button>}
          </div>
        )}

        {/* ── Room grid ── */}
        {loading ? (
          <div style={{ textAlign:"center",padding:"80px 0",color:theme.colors.textMuted }}>
            <div style={{ fontSize:40,marginBottom:12 }}>⏳</div>
            <p style={{ fontSize:14 }}>Loading your rooms…</p>
          </div>

        ) : myRooms.length === 0 ? (
          <div style={{ textAlign:"center",padding:"70px 24px",background:"#fff",borderRadius:20,border:`1.5px dashed ${theme.colors.border}` }}>
            <div style={{ fontSize:56,marginBottom:16 }}>📚</div>
            <p style={{ margin:"0 0 8px",fontSize:18,fontWeight:700,color:theme.colors.textPrimary }}>No rooms yet</p>
            <p style={{ margin:"0 0 28px",fontSize:14,color:theme.colors.textMuted,maxWidth:320,marginLeft:"auto",marginRight:"auto" }}>
              Join a room using an invite code from your teacher, or create your own study room.
            </p>
            <div style={{ display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap" }}>
              <button onClick={() => setJoinOpen(true)} style={{ display:"flex",alignItems:"center",gap:8,padding:"12px 24px",borderRadius:12,border:`1.5px solid ${theme.colors.border}`,background:"#fff",color:theme.colors.primary,fontWeight:700,fontSize:14,cursor:"pointer" }}>
                🔑 Join with Code
              </button>
              <button onClick={() => setCreateOpen(true)} style={{ display:"flex",alignItems:"center",gap:8,padding:"12px 24px",borderRadius:12,border:"none",background:theme.colors.primaryGradient,color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",boxShadow:"0 4px 14px rgba(108,99,255,0.3)" }}>
                ✨ Create a Room
              </button>
            </div>
          </div>

        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center",padding:"40px",color:theme.colors.textMuted }}>
            <div style={{ fontSize:36 }}>🔍</div>
            <p style={{ fontSize:14,marginTop:10 }}>No rooms match "{search}"</p>
          </div>

        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16 }}>
            {filtered.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                isCreator={isCreator(room)}
                onOpen={handleEnterRoom}
              />
            ))}
          </div>
        )}
      </div>

      <CreateRoomModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleRoomCreated} />
      <JoinByCodeModal isOpen={joinOpen}   onClose={() => setJoinOpen(false)}   onJoined={handleJoined} />
      <InviteCodeModal isOpen={!!newRoomModal} room={newRoomModal} onClose={() => setNewRoomModal(null)} onOpenRoom={handleEnterRoom} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
