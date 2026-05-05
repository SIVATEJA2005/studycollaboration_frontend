import React, { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
    MdAdd, MdCheck, MdClose, MdPerson,
    MdFlag, MdDeleteOutline, MdCheckCircle,
    MdRadioButtonUnchecked, MdPending
} from "react-icons/md";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
const getToken  = () => localStorage.getItem("token");
const getUserId = () => localStorage.getItem("userId");
const getUserName = () => localStorage.getItem("userName");

const STATUS_CONFIG = {
    NOT_STARTED: { label: "Not Started", color: "#9CA3AF", bg: "#F3F4F6", icon: "⬜" },
    IN_PROGRESS: { label: "In Progress", color: "#D97706", bg: "#FEF3C7", icon: "🔄" },
    DONE:        { label: "Done",        color: "#059669", bg: "#ECFDF5", icon: "✅" },
};

const theme = {
    primary:         "#6C63FF",
    primaryGradient: "linear-gradient(135deg,#6C63FF 0%,#A78BFA 100%)",
    primaryLight:    "#F3F0FF",
    border:          "#EDE9FF",
    text:            "#1E1B4B",
    textSec:         "#4B4880",
    textMuted:       "#9CA3AF",
    bg:              "#F8F6FF",
};

export default function TopicTracker({ roomId }) {
    const [topics,    setTopics]    = useState([]);
    const [progress,  setProgress]  = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [connected, setConnected] = useState(false);
    const [newTopic,  setNewTopic]  = useState("");
    const [newDesc,   setNewDesc]   = useState("");
    const [adding,    setAdding]    = useState(false);
    const [showAdd,   setShowAdd]   = useState(false);
    const [filter,    setFilter]    = useState("ALL");

    const stompRef = useRef(null);

    // ── Load topics ───────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const [topicsRes, progressRes] = await Promise.all([
                    fetch(`${API_BASE}/api/topics/room/${roomId}`, {
                        headers: { Authorization: `Bearer ${getToken()}` }
                    }),
                    fetch(`${API_BASE}/api/topics/room/${roomId}/progress`, {
                        headers: { Authorization: `Bearer ${getToken()}` }
                    })
                ]);
                if (topicsRes.ok)   setTopics(await topicsRes.json());
                if (progressRes.ok) setProgress(await progressRes.json());
            } finally { setLoading(false); }
        };
        load();
    }, [roomId]);

    // ── WebSocket ─────────────────────────────────────────────────────────────
    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
            connectHeaders:   { Authorization: `Bearer ${getToken()}` },
            onConnect: () => {
                setConnected(true);

                // new topic added
                client.subscribe(`/topic/room/${roomId}/topics`, (msg) => {
                    const t = JSON.parse(msg.body);
                    setTopics(prev =>
                        prev.some(x => x.id === t.id) ? prev : [...prev, t]
                    );
                    refreshProgress();
                });

                // topic updated (claimed / status changed)
                client.subscribe(`/topic/room/${roomId}/topics/update`, (msg) => {
                    const t = JSON.parse(msg.body);
                    setTopics(prev => prev.map(x => x.id === t.id ? t : x));
                    refreshProgress();
                });

                // topic deleted
                client.subscribe(`/topic/room/${roomId}/topics/delete`, (msg) => {
                    const id = JSON.parse(msg.body);
                    setTopics(prev => prev.filter(x => x.id !== id));
                    refreshProgress();
                });
            },
            onDisconnect:   () => setConnected(false),
            reconnectDelay: 5000,
        });
        client.activate();
        stompRef.current = client;
        return () => stompRef.current?.deactivate();
    }, [roomId]);

    const refreshProgress = async () => {
        try {
            const res = await fetch(
                `${API_BASE}/api/topics/room/${roomId}/progress`,
                { headers: { Authorization: `Bearer ${getToken()}` } }
            );
            if (res.ok) setProgress(await res.json());
        } catch {}
    };

    // ── Add topic ─────────────────────────────────────────────────────────────
    const addTopic = async () => {
        if (!newTopic.trim()) return;
        setAdding(true);
        try {
            await fetch(`${API_BASE}/api/topics/room/${roomId}`, {
                method:  "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({ name: newTopic.trim(), description: newDesc.trim() }),
            });
            setNewTopic(""); setNewDesc(""); setShowAdd(false);
        } finally { setAdding(false); }
    };

    // ── Claim / Unclaim ───────────────────────────────────────────────────────
    const claimTopic = async (topic) => {
        await fetch(`${API_BASE}/api/topics/${topic.id}/claim`, {
            method:  "PUT",
            headers: { Authorization: `Bearer ${getToken()}` },
        });
    };

    const unclaimTopic = async (topic) => {
        await fetch(`${API_BASE}/api/topics/${topic.id}/unclaim`, {
            method:  "PUT",
            headers: { Authorization: `Bearer ${getToken()}` },
        });
    };

    // ── Update Status ─────────────────────────────────────────────────────────
    const updateStatus = async (topic, status) => {
        await fetch(`${API_BASE}/api/topics/${topic.id}/status?status=${status}`, {
            method:  "PUT",
            headers: { Authorization: `Bearer ${getToken()}` },
        });
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const deleteTopic = async (topic) => {
        setTopics(prev => prev.filter(x => x.id !== topic.id));
        await fetch(`${API_BASE}/api/topics/${topic.id}`, {
            method:  "DELETE",
            headers: { Authorization: `Bearer ${getToken()}` },
        });
    };

    const isMyTopic    = (t) => String(t.claimedById)  === String(getUserId());
    const isMyCreation = (t) => String(t.createdById)  === String(getUserId());
    const isClaimed    = (t) => t.claimedById !== null;

    const filtered = topics.filter(t => {
        if (filter === "MINE")       return isMyTopic(t);
        if (filter === "UNCLAIMED")  return !isClaimed(t);
        if (filter === "DONE")       return t.status === "DONE";
        if (filter === "INPROGRESS") return t.status === "IN_PROGRESS";
        return true;
    });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden", background:theme.bg }}>

            {/* ── Fixed top ── */}
            <div style={{ flexShrink:0, padding:"20px 24px 0" }}>

                {/* Header */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                    <div>
                        <span style={{ fontSize:17, fontWeight:700, color:theme.text }}>Topic Tracker</span>
                        <span style={{ fontSize:13, color:theme.textMuted, marginLeft:8 }}>
                            {topics.length} topics
                        </span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20, background:connected?"#ECFDF5":"#FEF3C7", color:connected?"#059669":"#D97706", border:`1px solid ${connected?"#6EE7B7":"#FDE68A"}` }}>
                            {connected ? "● Live" : "● Connecting"}
                        </div>
                        <button
                            onClick={() => setShowAdd(!showAdd)}
                            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:10, border:"none", background:theme.primaryGradient, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}
                        >
                            <MdAdd size={18} /> Add Topic
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                {progress && progress.total > 0 && (
                    <div style={{ background:"#fff", borderRadius:12, padding:"16px", marginBottom:16, border:`1.5px solid ${theme.border}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                            {[
                                { label:"Total",       value:progress.total,      color:theme.primary },
                                { label:"Done",        value:progress.done,       color:"#059669" },
                                { label:"In Progress", value:progress.inProgress, color:"#D97706" },
                                { label:"Not Started", value:progress.notStarted, color:"#9CA3AF" },
                                { label:"Unclaimed",   value:progress.unclaimed,  color:"#EF4444" },
                            ].map(s => (
                                <div key={s.label} style={{ textAlign:"center" }}>
                                    <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
                                    <div style={{ fontSize:10, color:theme.textMuted }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* Progress bar */}
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ flex:1, background:"#F3F4F6", borderRadius:99, height:10, overflow:"hidden" }}>
                                <div style={{ width:`${progress.progressPercent}%`, height:"100%", background:theme.primaryGradient, transition:"width 0.5s", borderRadius:99 }} />
                            </div>
                            <span style={{ fontSize:13, fontWeight:700, color:theme.primary, flexShrink:0 }}>
                                {progress.progressPercent}%
                            </span>
                        </div>

                        {/* Unclaimed warning */}
                        {progress.unclaimed > 0 && (
                            <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:"#FEF2F2", border:"1px solid #FECACA", fontSize:12, color:"#DC2626", fontWeight:600 }}>
                                ⚠️ {progress.unclaimed} topic{progress.unclaimed > 1 ? "s are" : " is"} unclaimed — nobody is studying {progress.unclaimed > 1 ? "them" : "it"}!
                            </div>
                        )}

                        {/* All done celebration */}
                        {progress.progressPercent === 100 && (
                            <div style={{ marginTop:10, padding:"8px 12px", borderRadius:8, background:"#ECFDF5", border:"1px solid #6EE7B7", fontSize:12, color:"#059669", fontWeight:600, textAlign:"center" }}>
                                🎉 All topics covered! Group is exam ready!
                            </div>
                        )}
                    </div>
                )}

                {/* Add topic form */}
                {showAdd && (
                    <div style={{ background:"#fff", borderRadius:12, padding:16, marginBottom:16, border:`1.5px solid ${theme.primary}` }}>
                        <p style={{ margin:"0 0 10px", fontWeight:700, fontSize:14, color:theme.text }}>Add New Topic</p>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                            <input
                                autoFocus
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && addTopic()}
                                placeholder="e.g. Chapter 3 - Binary Trees"
                                style={{ padding:"10px 14px", borderRadius:8, border:`1.5px solid ${theme.border}`, fontSize:13, outline:"none", fontFamily:"inherit", color:theme.text }}
                                onFocus={(e) => e.target.style.borderColor = theme.primary}
                                onBlur={(e)  => e.target.style.borderColor = theme.border}
                            />
                            <input
                                value={newDesc}
                                onChange={(e) => setNewDesc(e.target.value)}
                                placeholder="Description (optional)"
                                style={{ padding:"10px 14px", borderRadius:8, border:`1.5px solid ${theme.border}`, fontSize:13, outline:"none", fontFamily:"inherit", color:theme.text }}
                                onFocus={(e) => e.target.style.borderColor = theme.primary}
                                onBlur={(e)  => e.target.style.borderColor = theme.border}
                            />
                            <div style={{ display:"flex", gap:8 }}>
                                <button
                                    onClick={addTopic}
                                    disabled={adding || !newTopic.trim()}
                                    style={{ flex:1, padding:"10px", borderRadius:8, border:"none", background:adding||!newTopic.trim()?"#C4B5FD":theme.primaryGradient, color:"#fff", fontWeight:700, fontSize:13, cursor:adding||!newTopic.trim()?"not-allowed":"pointer" }}
                                >
                                    {adding ? "Adding…" : "Add Topic"}
                                </button>
                                <button
                                    onClick={() => { setShowAdd(false); setNewTopic(""); setNewDesc(""); }}
                                    style={{ padding:"10px 16px", borderRadius:8, border:`1.5px solid ${theme.border}`, background:"#fff", fontSize:13, cursor:"pointer", color:theme.textMuted }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter tabs */}
                <div style={{ display:"flex", gap:4, borderBottom:`1px solid ${theme.border}` }}>
                    {[
                        { key:"ALL",         label:`All (${topics.length})` },
                        { key:"MINE",        label:`Mine (${topics.filter(t => isMyTopic(t)).length})` },
                        { key:"UNCLAIMED",   label:`Unclaimed (${topics.filter(t => !isClaimed(t)).length})` },
                        { key:"INPROGRESS",  label:`In Progress (${topics.filter(t => t.status === "IN_PROGRESS").length})` },
                        { key:"DONE",        label:`Done (${topics.filter(t => t.status === "DONE").length})` },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding:"8px 12px", border:"none", background:"transparent", cursor:"pointer", fontSize:12, fontWeight:filter===f.key?700:400, color:filter===f.key?theme.primary:theme.textMuted, borderBottom:filter===f.key?`2.5px solid ${theme.primary}`:"2.5px solid transparent", marginBottom:-1, transition:"all 0.15s", whiteSpace:"nowrap" }}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Scrollable topic list ── */}
            <div style={{ flex:1, overflowY:"auto", padding:"16px 24px 24px" }}>

                {loading && (
                    <div style={{ textAlign:"center", padding:"50px 0", color:theme.textMuted }}>
                        <p>Loading topics…</p>
                    </div>
                )}

                {!loading && filtered.length === 0 && (
                    <div style={{ textAlign:"center", padding:"60px 0", color:theme.textMuted }}>
                        <div style={{ fontSize:48, marginBottom:12 }}>📚</div>
                        <p style={{ fontSize:15, fontWeight:600, color:theme.textSec }}>
                            {filter === "ALL" ? "No topics yet" : `No ${filter.toLowerCase()} topics`}
                        </p>
                        <p style={{ fontSize:12, marginTop:4 }}>
                            {filter === "ALL" ? "Add topics to track your syllabus coverage" : ""}
                        </p>
                    </div>
                )}

                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {filtered.map((topic) => {
                        const st     = STATUS_CONFIG[topic.status] || STATUS_CONFIG.NOT_STARTED;
                        const mine   = isMyTopic(topic);
                        const claimed = isClaimed(topic);

                        return (
                            <div key={topic.id} style={{ background:"#fff", borderRadius:12, border:`1.5px solid ${!claimed ? "#FECACA" : topic.status === "DONE" ? "#6EE7B7" : theme.border}`, padding:"16px", boxShadow:"0 2px 8px rgba(108,99,255,0.05)", transition:"all 0.2s" }}>

                                <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>

                                    {/* Status icon */}
                                    <div style={{ fontSize:22, flexShrink:0, marginTop:2 }}>
                                        {st.icon}
                                    </div>

                                    {/* Content */}
                                    <div style={{ flex:1, minWidth:0 }}>
                                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                                            <span style={{ fontSize:14, fontWeight:700, color:theme.text }}>
                                                {topic.name}
                                            </span>
                                            {/* Status badge */}
                                            <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:st.bg, color:st.color }}>
                                                {st.label}
                                            </span>
                                            {/* Unclaimed warning */}
                                            {!claimed && (
                                                <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:"#FEF2F2", color:"#DC2626" }}>
                                                    ⚠️ Unclaimed
                                                </span>
                                            )}
                                        </div>

                                        {topic.description && (
                                            <p style={{ margin:"4px 0 0", fontSize:12, color:theme.textMuted }}>{topic.description}</p>
                                        )}

                                        <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8, flexWrap:"wrap" }}>
                                            {/* Claimed by */}
                                            {claimed ? (
                                                <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:mine?theme.primary:theme.textSec, fontWeight:mine?700:400 }}>
                                                    <MdPerson size={13} />
                                                    {mine ? "You" : topic.claimedByName}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize:11, color:"#DC2626" }}>Nobody claimed this</span>
                                            )}

                                            {/* Status selector — only for person who claimed */}
                                            {mine && (
                                                <select
                                                    value={topic.status}
                                                    onChange={(e) => updateStatus(topic, e.target.value)}
                                                    style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${theme.border}`, fontSize:11, outline:"none", background:"#FDFAFF", cursor:"pointer", color:theme.text }}
                                                >
                                                    <option value="NOT_STARTED">⬜ Not Started</option>
                                                    <option value="IN_PROGRESS">🔄 In Progress</option>
                                                    <option value="DONE">✅ Done</option>
                                                </select>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>

                                        {/* Claim button — if unclaimed */}
                                        {!claimed && (
                                            <button
                                                onClick={() => claimTopic(topic)}
                                                style={{ padding:"7px 14px", borderRadius:8, border:"none", background:theme.primaryGradient, color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer" }}
                                            >
                                                🙋 Claim
                                            </button>
                                        )}

                                        {/* Unclaim — only own */}
                                        {mine && topic.status !== "DONE" && (
                                            <button
                                                onClick={() => unclaimTopic(topic)}
                                                title="Unclaim topic"
                                                style={{ width:30, height:30, borderRadius:8, border:`1px solid ${theme.border}`, background:"#fff", color:theme.textMuted, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}
                                            >
                                                <MdClose size={15} />
                                            </button>
                                        )}

                                        {/* Delete — only creator */}
                                        {isMyCreation(topic) && (
                                            <button
                                                onClick={() => deleteTopic(topic)}
                                                style={{ width:30, height:30, borderRadius:8, border:"1px solid #FECACA", background:"#FEF2F2", color:"#EF4444", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}
                                            >
                                                <MdDeleteOutline size={15} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}