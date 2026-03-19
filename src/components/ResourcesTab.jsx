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

export default ResourcesTab;