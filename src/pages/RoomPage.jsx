import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import ChatTab from "../components/ChatTab";

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

// ══════════════════════════════════════════════════════════════════════════════
// NOTES TAB
// ══════════════════════════════════════════════════════════════════════════════
function NotesTab({ roomId }) {
  const [notes, setNotes]               = useState([]);
  const [activeNote, setActiveNote]     = useState(null);
  const [content, setContent]           = useState("");
  const [title, setTitle]               = useState("");
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [showNewNote, setShowNewNote]   = useState(false);
  const saveTimer = useRef(null);
  const editorRef = useRef(null);
  const storageKey = `notes_room_${roomId}`;

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    setNotes(stored);
    if (stored.length > 0) { setActiveNote(stored[0]); setContent(stored[0].content || ""); setTitle(stored[0].title || ""); }
  }, [roomId]);

  const persist = (updated) => localStorage.setItem(storageKey, JSON.stringify(updated));

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const updated = notes.map(n => n.id === activeNote?.id ? { ...n, content: val } : n);
      setNotes(updated); persist(updated);
    }, 800);
  };

  const handleTitleChange = (e) => {
    const val = e.target.value; setTitle(val);
    const updated = notes.map(n => n.id === activeNote?.id ? { ...n, title: val } : n);
    setNotes(updated); persist(updated);
  };

  const applyFormat = (format) => {
    const textarea = editorRef.current; if (!textarea) return;
    const start = textarea.selectionStart, end = textarea.selectionEnd;
    const sel = content.substring(start, end);
    const map = {
      "B":`**${sel||"bold"}**`,"I":`*${sel||"italic"}*`,"U":`__${sel||"underline"}__`,"S":`~~${sel||"strike"}~~`,
      "H1":`\n# ${sel||"Heading"}\n`,"H2":`\n## ${sel||"Heading"}\n`,
      "• List":`\n- ${sel||"item"}\n`,"1. List":`\n1. ${sel||"item"}\n`,
      "Code":"`"+`${sel||"code"}`+"`","---":`\n---\n`,
    };
    if (!map[format]) return;
    const next = content.substring(0, start) + map[format] + content.substring(end);
    setContent(next);
    const updated = notes.map(n => n.id === activeNote?.id ? { ...n, content: next } : n);
    setNotes(updated); persist(updated);
  };

  const download = (ext) => {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: ext==="md"?"text/markdown":"text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title||"note"}.${ext}`; a.click(); URL.revokeObjectURL(url);
  };

  const createNote = () => {
    if (!newNoteTitle.trim()) return;
    const note = { id: Date.now(), title: newNoteTitle.trim(), content: "" };
    const updated = [...notes, note]; setNotes(updated); persist(updated);
    setActiveNote(note); setContent(""); setTitle(note.title);
    setNewNoteTitle(""); setShowNewNote(false);
  };

  const TOOLBAR = ["B","I","U","S","H1","H2","• List","1. List","Code","---"];

  return (
    <div style={{ display:"flex",height:"100%" }}>
      <div style={{ width:220,borderRight:`1px solid ${theme.colors.border}`,display:"flex",flexDirection:"column",background:"#FBF5FF",flexShrink:0 }}>
        <div style={{ padding:"14px 14px 10px",borderBottom:`1px solid ${theme.colors.border}` }}>
          <p style={{ fontSize:11,fontWeight:700,color:theme.colors.textMuted,letterSpacing:"0.08em",textTransform:"uppercase",margin:0 }}>Notes</p>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"8px" }}>
          {notes.length === 0 && <p style={{ fontSize:12,color:theme.colors.textMuted,padding:"12px 8px" }}>No notes yet.</p>}
          {notes.map(note => {
            const isActive = activeNote?.id === note.id;
            return (
              <button key={note.id} onClick={() => { setActiveNote(note); setContent(note.content||""); setTitle(note.title||""); }}
                style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:10,border:"none",textAlign:"left",cursor:"pointer",background:isActive?"white":"transparent",boxShadow:isActive?"0 2px 8px rgba(108,99,255,0.12)":"none",color:isActive?theme.colors.primary:theme.colors.textSecondary,fontWeight:isActive?600:400,fontSize:13,marginBottom:2,transition:"all 0.15s" }}>
                <span>📝</span>
                <span style={{ overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{note.title}</span>
              </button>
            );
          })}
        </div>
        <div style={{ padding:"10px",borderTop:`1px solid ${theme.colors.border}` }}>
          {showNewNote ? (
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              <input autoFocus value={newNoteTitle} onChange={e => setNewNoteTitle(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter") createNote(); if(e.key==="Escape") setShowNewNote(false); }}
                placeholder="Note title…" style={{ padding:"7px 10px",borderRadius:7,border:`1.5px solid ${theme.colors.primary}`,fontSize:12,outline:"none",fontFamily:"inherit" }} />
              <div style={{ display:"flex",gap:6 }}>
                <button onClick={createNote} style={{ flex:1,padding:"6px",borderRadius:6,border:"none",background:theme.colors.primaryGradient,color:"#fff",fontSize:12,cursor:"pointer" }}>Create</button>
                <button onClick={() => setShowNewNote(false)} style={{ padding:"6px 10px",borderRadius:6,border:`1px solid ${theme.colors.border}`,background:"transparent",fontSize:12,cursor:"pointer" }}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNewNote(true)} style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderRadius:8,border:`1.5px dashed ${theme.colors.border}`,background:"transparent",color:theme.colors.textMuted,fontSize:13,cursor:"pointer" }}>＋ New Note</button>
          )}
        </div>
      </div>
      <div style={{ flex:1,display:"flex",flexDirection:"column",background:"#fff" }}>
        {!activeNote ? (
          <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:theme.colors.textMuted }}>
            <div style={{ textAlign:"center" }}><div style={{ fontSize:40 }}>📝</div><p style={{ marginTop:10 }}>Select or create a note</p></div>
          </div>
        ) : (
          <>
            <div style={{ padding:"16px 24px 0",borderBottom:`1px solid ${theme.colors.border}` }}>
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
                <input value={title} onChange={handleTitleChange} style={{ fontSize:20,fontWeight:700,border:"none",outline:"none",color:theme.colors.textPrimary,background:"transparent",fontFamily:"inherit",flex:1 }} placeholder="Note title…" />
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={() => download("txt")} style={{ padding:"5px 12px",borderRadius:7,border:`1.5px solid ${theme.colors.border}`,background:"transparent",color:theme.colors.textSecondary,fontSize:12,cursor:"pointer" }}>⬇ TXT</button>
                  <button onClick={() => download("md")} style={{ padding:"5px 12px",borderRadius:7,border:"none",background:theme.colors.primaryGradient,color:"#fff",fontSize:12,cursor:"pointer" }}>⬇ MD</button>
                </div>
              </div>
              <div style={{ display:"flex",gap:4,flexWrap:"wrap",paddingBottom:10 }}>
                {TOOLBAR.map(action => (
                  <button key={action} onClick={() => applyFormat(action)}
                    style={{ padding:"4px 10px",borderRadius:6,border:`1px solid ${theme.colors.border}`,background:"#FDFAFF",color:theme.colors.textSecondary,fontSize:12,cursor:"pointer",fontWeight:500 }}
                    onMouseEnter={e => { e.target.style.background=theme.colors.primaryLight; e.target.style.color=theme.colors.primary; }}
                    onMouseLeave={e => { e.target.style.background="#FDFAFF"; e.target.style.color=theme.colors.textSecondary; }}>
                    {action}
                  </button>
                ))}
              </div>
            </div>
            <textarea ref={editorRef} value={content} onChange={handleContentChange}
              style={{ flex:1,padding:"20px 24px",border:"none",outline:"none",resize:"none",fontSize:14,lineHeight:1.9,color:theme.colors.textPrimary,fontFamily:"'Georgia',serif",background:"#fff" }}
              placeholder="Start writing… Markdown supported" />
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TASKS TAB
// ══════════════════════════════════════════════════════════════════════════════
function TasksTab({ roomId }) {
  const [tasks, setTasks]       = useState([]);
  const [newTask, setNewTask]   = useState("");
  const [priority, setPriority] = useState("medium");
  const [adding, setAdding]     = useState(false);
  const storageKey = `tasks_room_${roomId}`;

  useEffect(() => { setTasks(JSON.parse(localStorage.getItem(storageKey) || "[]")); }, [roomId]);
  const persist = (updated) => localStorage.setItem(storageKey, JSON.stringify(updated));

  const addTask = async () => {
    if (!newTask.trim()) return;
    setAdding(true);
    const taskPayload = { text: newTask.trim(), priority, done: false };
    try {
      const res = await fetch(`${API_BASE}/api/todo/create/${roomId}`, {
        method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` },
        body: JSON.stringify(taskPayload),
      });
      const serverTask = res.ok ? await res.json() : { id: Date.now(), ...taskPayload };
      const updated = [...tasks, serverTask]; setTasks(updated); persist(updated);
    } catch {
      const localTask = { id: Date.now(), ...taskPayload };
      const updated = [...tasks, localTask]; setTasks(updated); persist(updated);
    } finally { setNewTask(""); setAdding(false); }
  };

  const toggle = (task) => {
    const updated = tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t);
    setTasks(updated); persist(updated);
  };

  const PRIORITY_COLORS = {
    high:   { bg:"#FEE2E2", text:"#DC2626" },
    medium: { bg:"#FEF3C7", text:"#D97706" },
    low:    { bg:"#D1FAE5", text:"#059669" },
  };

  return (
    <div style={{ padding:"24px 28px",overflowY:"auto" }}>
      <h2 style={{ margin:"0 0 20px",fontSize:18,fontWeight:700,color:theme.colors.textPrimary }}>
        Tasks <span style={{ fontSize:13,color:theme.colors.textMuted,fontWeight:400 }}>({tasks.filter(t=>!t.done).length} pending)</span>
      </h2>
      <div style={{ display:"flex",gap:8,marginBottom:20 }}>
        <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key==="Enter" && addTask()} placeholder="Add a new task…"
          style={{ flex:1,padding:"10px 14px",borderRadius:10,border:`1.5px solid ${theme.colors.border}`,fontSize:13,outline:"none",background:"#FDFAFF",fontFamily:"inherit",color:theme.colors.textPrimary }}
          onFocus={e => e.target.style.borderColor=theme.colors.primary}
          onBlur={e => e.target.style.borderColor=theme.colors.border}
        />
        <select value={priority} onChange={e => setPriority(e.target.value)} style={{ padding:"10px 12px",borderRadius:10,border:`1.5px solid ${theme.colors.border}`,fontSize:13,outline:"none",background:"#FDFAFF",cursor:"pointer" }}>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <button onClick={addTask} disabled={adding} style={{ padding:"10px 18px",borderRadius:10,border:"none",background:adding?"#C4B5FD":theme.colors.primaryGradient,color:"#fff",fontWeight:600,fontSize:13,cursor:adding?"not-allowed":"pointer" }}>
          {adding ? "Adding…" : "＋ Add"}
        </button>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {tasks.length === 0 && (
          <div style={{ textAlign:"center",padding:"40px 0",color:theme.colors.textMuted }}>
            <div style={{ fontSize:40 }}>✅</div>
            <p style={{ fontSize:14,marginTop:10 }}>No tasks yet. Add one above!</p>
          </div>
        )}
        {tasks.map(task => {
          const p = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
          return (
            <div key={task.id} style={{ display:"flex",alignItems:"center",gap:12,padding:"14px 18px",background:"#fff",borderRadius:12,border:`1px solid ${theme.colors.border}`,opacity:task.done?0.6:1,transition:"opacity 0.2s" }}>
              <div onClick={() => toggle(task)} style={{ width:22,height:22,borderRadius:6,flexShrink:0,cursor:"pointer",background:task.done?theme.colors.primaryGradient:"#fff",border:task.done?"none":`2px solid ${theme.colors.border}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                {task.done && <span style={{ color:"#fff",fontSize:13 }}>✓</span>}
              </div>
              <span style={{ flex:1,fontSize:14,color:theme.colors.textPrimary,textDecoration:task.done?"line-through":"none" }}>{task.text}</span>
              <span style={{ fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:p.bg,color:p.text }}>{task.priority}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RESOURCES TAB
// ══════════════════════════════════════════════════════════════════════════════
const TYPE_ICONS = { link:"🔗", pdf:"📄", video:"🎥", image:"🖼️", file:"📁" };

function ResourcesTab({ roomId }) {
  const [resources, setResources] = useState([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [linkUrl, setLinkUrl]     = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const storageKey = `resources_room_${roomId}`;

  useEffect(() => { setResources(JSON.parse(localStorage.getItem(storageKey) || "[]")); }, [roomId]);
  const persist = (updated) => localStorage.setItem(storageKey, JSON.stringify(updated));

  const addLink = () => {
    if (!linkUrl.trim()) return;
    const item = { id:Date.now(), title:linkTitle||linkUrl, url:linkUrl, type:"link", addedBy:localStorage.getItem("userName")||"You", createdAt:new Date().toISOString() };
    const updated = [...resources, item]; setResources(updated); persist(updated);
    setLinkUrl(""); setLinkTitle(""); setShowAdd(false);
  };

  const deleteResource = (id) => {
    const updated = resources.filter(r => r.id !== id); setResources(updated); persist(updated);
  };

  return (
    <div style={{ padding:"24px 28px",overflowY:"auto",height:"100%" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:theme.colors.textPrimary }}>
          Shared Resources <span style={{ fontSize:13,color:theme.colors.textMuted,fontWeight:400 }}>({resources.length})</span>
        </h2>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding:"8px 16px",borderRadius:8,border:"none",background:theme.colors.primaryGradient,color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer" }}>＋ Add Link</button>
      </div>
      {showAdd && (
        <div style={{ background:"#F9F5FF",border:`1.5px solid ${theme.colors.border}`,borderRadius:14,padding:"20px",marginBottom:20 }}>
          <p style={{ margin:"0 0 14px",fontWeight:700,fontSize:14,color:theme.colors.textPrimary }}>Add Resource Link</p>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Title (optional)" style={{ padding:"9px 14px",borderRadius:8,border:`1.5px solid ${theme.colors.border}`,fontSize:13,outline:"none",fontFamily:"inherit" }} />
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" style={{ padding:"9px 14px",borderRadius:8,border:`1.5px solid ${theme.colors.border}`,fontSize:13,outline:"none",fontFamily:"inherit" }} />
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={addLink} style={{ padding:"9px 20px",borderRadius:8,border:"none",background:theme.colors.primaryGradient,color:"#fff",fontWeight:600,fontSize:13,cursor:"pointer" }}>Add</button>
              <button onClick={() => setShowAdd(false)} style={{ padding:"9px 16px",borderRadius:8,border:`1px solid ${theme.colors.border}`,background:"transparent",fontSize:13,cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {resources.length === 0 && !showAdd && (
        <div style={{ textAlign:"center",marginTop:60,color:theme.colors.textMuted }}>
          <div style={{ fontSize:40 }}>📂</div>
          <p style={{ fontSize:14,marginTop:10 }}>No resources yet. Add a link!</p>
        </div>
      )}
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {resources.map(res => (
          <div key={res.id} style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:"#fff",borderRadius:12,border:`1px solid ${theme.colors.border}` }}>
            <div style={{ width:42,height:42,borderRadius:10,background:theme.colors.primaryLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{TYPE_ICONS[res.type]||"📁"}</div>
            <div style={{ flex:1,minWidth:0 }}>
              <p style={{ margin:0,fontWeight:600,fontSize:14,color:theme.colors.textPrimary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{res.title}</p>
              <p style={{ margin:"2px 0 0",fontSize:12,color:theme.colors.textMuted }}>Added by {res.addedBy} · {res.createdAt?new Date(res.createdAt).toLocaleDateString():""}</p>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              {res.url && <a href={res.url} target="_blank" rel="noreferrer" style={{ padding:"6px 14px",borderRadius:7,border:`1.5px solid ${theme.colors.border}`,background:"transparent",color:theme.colors.primary,fontSize:12,fontWeight:600,textDecoration:"none" }}>Open</a>}
              <button onClick={() => deleteResource(res.id)} style={{ width:30,height:30,borderRadius:7,border:"1px solid #FECACA",background:"#FEF2F2",color:"#EF4444",fontSize:14,cursor:"pointer" }}>🗑</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// AI ASSISTANT TAB
// ══════════════════════════════════════════════════════════════════════════════
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
