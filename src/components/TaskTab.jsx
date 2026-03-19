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

export default TasksTab;