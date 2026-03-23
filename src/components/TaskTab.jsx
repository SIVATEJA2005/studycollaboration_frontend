import React, { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import {
  MdOutlineCalendarMonth,
  MdAdd,
  MdDeleteOutline,
  MdCheckCircle,
  MdRadioButtonUnchecked,
  MdOutlineAccessTime,
  MdRefresh,
  MdFlag,
  MdAssignment,
  MdHourglassEmpty,
  MdDoneAll,
  MdWarning,
  MdCircle,
} from "react-icons/md";

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
    danger: "#DC2626",
    dangerLight: "#FFF5F5",
    success: "#059669",
    successLight: "#ECFDF5",
  },
};

const PRIORITY_CONFIG = {
  HIGH:   { color: "#DC2626", bg: "#FEE2E2", label: "High"   },
  MEDIUM: { color: "#D97706", bg: "#FEF3C7", label: "Medium" },
  LOW:    { color: "#059669", bg: "#D1FAE5", label: "Low"    },
};

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
const getToken  = () => localStorage.getItem("token");
const getUserId = () => localStorage.getItem("userId");

export default function TasksTab({ roomId }) {
  const [tasks,     setTasks]     = useState([]);
  const [newTask,   setNewTask]   = useState("");
  const [priority,  setPriority]  = useState("MEDIUM");
  const [dueDate,   setDueDate]   = useState("");
  const [adding,    setAdding]    = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("ALL"); // ALL | PENDING | DONE | OVERDUE
  const [dueDateError, setDueDateError] = useState(false);

  const stompClientRef = useRef(null);

  const isOverdue = (task) =>
    task.dueDate && !task.done && new Date(task.dueDate) < new Date();

  const isMyTask = (task) =>
    String(task.createdById) === String(getUserId());

  // ── 1. Fetch from DB ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/todo/room/${roomId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) setTasks(await res.json());
      } catch (err) {
        console.error("Failed to load tasks:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [roomId]);

  // ── 2. WebSocket ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_BASE}/ws`),
      connectHeaders: { Authorization: `Bearer ${getToken()}` },
      onConnect: () => {
        setConnected(true);
        client.subscribe(`/topic/room/${roomId}/todos`, (msg) => {
          const newTodo = JSON.parse(msg.body);
          setTasks((prev) =>
            prev.some((t) => String(t.id) === String(newTodo.id))
              ? prev
              : [...prev, newTodo]
          );
        });
        client.subscribe(`/topic/room/${roomId}/todos/toggle`, (msg) => {
          const toggled = JSON.parse(msg.body);
          setTasks((prev) =>
            prev.map((t) => String(t.id) === String(toggled.id) ? toggled : t)
          );
        });
        client.subscribe(`/topic/room/${roomId}/todos/delete`, (msg) => {
          const id = JSON.parse(msg.body);
          setTasks((prev) => prev.filter((t) => String(t.id) !== String(id)));
        });
      },
      onDisconnect:   () => setConnected(false),
      onStompError:   () => setConnected(false),
      reconnectDelay: 5000,
    });
    client.activate();
    stompClientRef.current = client;
    return () => stompClientRef.current?.deactivate();
  }, [roomId]);

  // ── 3. Add task ───────────────────────────────────────────────────────────────
  const addTask = async () => {
    if (!newTask.trim()) return alert("Task name is required!");
    if (!dueDate) {
      setDueDateError(true);
      return alert("Due date and time is required!");
    }
    setDueDateError(false);
    setAdding(true);
    const payload = {
      text:     newTask.trim(),
      priority,
      done:     false,
      dueDate:  new Date(dueDate).toISOString(),
    };
    try {
      const res = await fetch(`${API_BASE}/api/todo/create/${roomId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify(payload),
      });
      if (res.ok) {
        // ✅ Do NOT call setTasks here.
        // The WebSocket subscriber on /topic/room/${roomId}/todos
        // will broadcast the saved task back and add it to state — adding it
        // here too is what causes the duplicate.
        setNewTask("");
        setDueDate("");
      }
    } catch (err) {
      console.error("Failed to add task:", err);
    } finally {
      setAdding(false);
    }
  };

  // ── 4. Toggle ────────────────────────────────────────────────────────────────
  const toggle = async (task) => {
    setTasks((prev) =>
      prev.map((t) => t.id === task.id ? { ...t, done: !t.done } : t)
    );
    try {
      await fetch(`${API_BASE}/api/todo/toggle/${task.id}`, {
        method:  "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {
      setTasks((prev) =>
        prev.map((t) => t.id === task.id ? { ...t, done: task.done } : t)
      );
    }
  };

  // ── 5. Delete ────────────────────────────────────────────────────────────────
  const deleteTask = async (task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await fetch(`${API_BASE}/api/todo/delete/${task.id}`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {
      setTasks((prev) => [...prev, task]);
    }
  };

  // ── Filter logic ──────────────────────────────────────────────────────────────
  const filteredTasks = tasks.filter((t) => {
    if (filter === "PENDING") return !t.done;
    if (filter === "DONE")    return t.done;
    if (filter === "OVERDUE") return isOverdue(t);
    return true;
  });

  const pendingCount   = tasks.filter((t) => !t.done).length;
  const overdueCount   = tasks.filter((t) => isOverdue(t)).length;
  const completedCount = tasks.filter((t) => t.done).length;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      height:        "100%",
      overflow:      "hidden",
      background:    theme.colors.bgPage,
    }}>

      {/* ── Top section (fixed, doesn't scroll) ── */}
      <div style={{ flexShrink: 0, padding: "20px 24px 0" }}>

        {/* Connection pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          marginBottom: 16, fontSize: 11, fontWeight: 600,
          padding: "4px 12px", borderRadius: 20,
          background: connected ? "#ECFDF5" : "#FEF3C7",
          color:      connected ? "#059669" : "#D97706",
          border: `1px solid ${connected ? "#6EE7B7" : "#FDE68A"}`,
        }}>
          <MdCircle size={8} color={connected ? "#10B981" : "#F59E0B"} />
          {connected ? "Live sync ON" : "Connecting…"}
        </div>

        {/* ── Stats row (TOPMOST) ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {[
            { label: "Total",   value: tasks.length,   Icon: MdAssignment,    color: "#F3F0FF", text: theme.colors.primary,  iconColor: theme.colors.primary },
            { label: "Pending", value: pendingCount,   Icon: MdHourglassEmpty, color: "#FEF3C7", text: "#D97706",             iconColor: "#D97706" },
            { label: "Done",    value: completedCount, Icon: MdDoneAll,        color: "#ECFDF5", text: "#059669",             iconColor: "#059669" },
            { label: "Overdue", value: overdueCount,   Icon: MdWarning,        color: "#FEF2F2", text: "#DC2626",             iconColor: "#DC2626" },
          ].map(({ label, value, Icon, color, text, iconColor }) => (
            <div key={label} style={{
              flex: 1, minWidth: 80,
              background: color, borderRadius: 10,
              padding: "10px 14px",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Icon size={22} color={iconColor} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: text, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: theme.colors.textMuted }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Input row ── */}
        <div style={{
          background: "#fff", borderRadius: 12, padding: "16px",
          boxShadow: "0 2px 12px rgba(108,99,255,0.08)",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

            {/* Task name */}
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="What needs to be done?"
              style={{
                flex: 1, minWidth: 180,
                padding: "10px 14px", borderRadius: 8,
                border: `1.5px solid ${theme.colors.border}`,
                fontSize: 14, outline: "none",
                fontFamily: "inherit", color: theme.colors.textPrimary,
                background: "#FDFAFF",
              }}
              onFocus={(e) => (e.target.style.borderColor = theme.colors.primary)}
              onBlur={(e)  => (e.target.style.borderColor = theme.colors.border)}
            />

            {/* Priority */}
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{
                padding: "10px 12px", borderRadius: 8,
                border: `1.5px solid ${theme.colors.border}`,
                fontSize: 13, outline: "none",
                background: "#FDFAFF", cursor: "pointer",
                color: theme.colors.textPrimary,
              }}
            >
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            {/* Due date — MANDATORY */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "0 12px", borderRadius: 8,
              border: `1.5px solid ${dueDateError ? theme.colors.danger : theme.colors.border}`,
              background: dueDateError ? "#FFF5F5" : "#FDFAFF",
              position: "relative",
            }}>
              <MdOutlineCalendarMonth color={dueDateError ? theme.colors.danger : theme.colors.primary} size={16} />
              <input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (e.target.value) setDueDateError(false);
                }}
                required
                style={{
                  border: "none", outline: "none",
                  fontSize: 13, background: "transparent",
                  color: theme.colors.textPrimary,
                }}
              />
              {/* Required indicator */}
              <span style={{
                position: "absolute", top: -6, right: -4,
                fontSize: 14, color: theme.colors.danger, fontWeight: 700,
                lineHeight: 1,
              }}>*</span>
            </div>

            {/* Add button */}
            <button
              onClick={addTask}
              disabled={adding}
              style={{
                padding: "10px 20px", borderRadius: 8, border: "none",
                background: adding ? "#C4B5FD" : theme.colors.primaryGradient,
                color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: adding ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {adding
                ? <MdRefresh size={18} style={{ animation: "spin 1s linear infinite" }} />
                : <MdAdd size={18} />}
              {adding ? "Adding…" : "Add Task"}
            </button>
          </div>

          {/* Due date required hint */}
          {dueDateError && (
            <p style={{
              margin: "8px 0 0", fontSize: 12,
              color: theme.colors.danger,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <MdWarning size={13} /> Due date &amp; time is required
            </p>
          )}
        </div>

        {/* ── Filter tabs ── */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 16,
          borderBottom: `1px solid ${theme.colors.border}`,
          paddingBottom: 0,
        }}>
          {[
            { key: "ALL",     label: `All (${tasks.length})` },
            { key: "PENDING", label: `Pending (${pendingCount})` },
            { key: "DONE",    label: `Done (${completedCount})` },
            { key: "OVERDUE", label: `Overdue (${overdueCount})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "8px 16px", border: "none",
                background: "transparent", cursor: "pointer",
                fontSize: 13, fontWeight: filter === f.key ? 700 : 400,
                color: filter === f.key ? theme.colors.primary : theme.colors.textMuted,
                borderBottom: filter === f.key
                  ? `2.5px solid ${theme.colors.primary}`
                  : "2.5px solid transparent",
                marginBottom: -1,
                transition: "all 0.15s",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable task list ── */}
      <div style={{
        flex:      1,
        overflowY: "auto",
        padding:   "0 24px 24px",
      }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: theme.colors.textMuted }}>
            <MdRefresh size={36} style={{ animation: "spin 1s linear infinite", marginBottom: 12 }} />
            <p style={{ fontSize: 14 }}>Loading tasks…</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredTasks.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: theme.colors.textMuted }}>
            <div style={{ marginBottom: 12 }}>
              {filter === "DONE"    ? <MdDoneAll size={48} color="#059669" />
               : filter === "OVERDUE" ? <MdWarning size={48} color="#DC2626" />
               : <MdAssignment size={48} color={theme.colors.textMuted} />}
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: theme.colors.textSecondary }}>
              {filter === "DONE"    ? "No completed tasks yet"
               : filter === "OVERDUE" ? "No overdue tasks!"
               : filter === "PENDING" ? "All caught up!"
               : "No tasks yet — add one above!"}
            </p>
          </div>
        )}

        {/* Task cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredTasks.map((task) => {
            const expired = isOverdue(task);
            const mine    = isMyTask(task);
            const p       = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;

            return (
              <div
                key={task.id}
                style={{
                  display:    "flex",
                  alignItems: "center",
                  gap:        12,
                  padding:    "14px 16px",
                  background: task.done ? "#FAFAFA" : expired ? theme.colors.dangerLight : "#fff",
                  border:     `1.5px solid ${expired ? "#FECACA" : task.done ? "#E5E7EB" : theme.colors.border}`,
                  borderRadius: 12,
                  opacity:    task.done ? 0.7 : 1,
                  transition: "all 0.2s",
                  boxShadow:  task.done ? "none" : "0 2px 8px rgba(108,99,255,0.06)",
                }}
              >
                {/* Checkbox */}
                <div
                  onClick={() => toggle(task)}
                  style={{ cursor: "pointer", flexShrink: 0 }}
                >
                  {task.done
                    ? <MdCheckCircle size={24} color={theme.colors.primary} />
                    : <MdRadioButtonUnchecked size={24} color={theme.colors.border} />}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600,
                    color: task.done ? theme.colors.textMuted : theme.colors.textPrimary,
                    textDecoration: task.done ? "line-through" : "none",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {task.text}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, flexWrap: "wrap" }}>

                    {/* Priority badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: p.color, background: p.bg,
                      padding: "2px 8px", borderRadius: 20,
                      display: "flex", alignItems: "center", gap: 3,
                    }}>
                      <MdFlag size={11} /> {p.label}
                    </span>

                    {/* Due date */}
                    {task.dueDate && (
                      <span style={{
                        fontSize: 11,
                        color: expired ? theme.colors.danger : theme.colors.textMuted,
                        fontWeight: expired ? 700 : 400,
                        display: "flex", alignItems: "center", gap: 3,
                      }}>
                        <MdOutlineAccessTime size={12} />
                        {expired ? "Overdue · " : ""}
                        {new Date(task.dueDate).toLocaleString([], {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </span>
                    )}

                    {/* Created by */}
                    {task.createdByName && (
                      <span style={{ fontSize: 11, color: theme.colors.textMuted }}>
                        by {mine ? "you" : task.createdByName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Delete — only own tasks */}
                {mine && (
                  <button
                    onClick={() => deleteTask(task)}
                    style={{
                      background: "none", border: "none",
                      cursor: "pointer", flexShrink: 0,
                      color: "#D1D5DB", padding: 4, borderRadius: 6,
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = theme.colors.danger)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#D1D5DB")}
                  >
                    <MdDeleteOutline size={20} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
