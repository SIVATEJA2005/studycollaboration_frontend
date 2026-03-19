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

export default NotesTab;