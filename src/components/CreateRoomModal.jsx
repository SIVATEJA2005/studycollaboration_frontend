import React, { useState, useEffect } from "react";
import { theme } from "../components/StudyRoomCard";
import { useRooms } from "../context/RoomContext";

// ─── Icon picker options ───────────────────────────────────────────────────────
const ICONS = ["📚", "👥", "⚙️", "📈", "🔷", "🧠", "💡", "🎯", "🔬", "🌐", "🏆", "✏️"];

const TAG_OPTIONS = ["Favorites", "Networking", "Machine Learning", "General", "Competitive", "Research"];

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(45, 27, 78, 0.45)",
    backdropFilter: "blur(4px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "flex-end",       // sheet slides from bottom
    justifyContent: "center",
  },
  sheet: (visible) => ({
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: "24px 24px 0 0",
    padding: "0 0 32px",
    boxShadow: "0 -8px 40px rgba(108,99,255,0.18)",
    transform: visible ? "translateY(0)" : "translateY(100%)",
    transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
    maxHeight: "92vh",
    overflowY: "auto",
  }),
  handle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    background: "#E2D9F3",
    margin: "14px auto 0",
  },
  header: {
    padding: "20px 28px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: theme.colors.textPrimary,
    margin: 0,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "none",
    background: "#F3F0FF",
    color: theme.colors.primary,
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  body: {
    padding: "20px 28px 0",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: theme.colors.textSecondary,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    marginBottom: 6,
    display: "block",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: `1.5px solid ${theme.colors.border}`,
    fontSize: 14,
    color: theme.colors.textPrimary,
    outline: "none",
    fontFamily: "inherit",
    background: "#FDFAFF",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  textarea: {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: `1.5px solid ${theme.colors.border}`,
    fontSize: 14,
    color: theme.colors.textPrimary,
    outline: "none",
    fontFamily: "inherit",
    background: "#FDFAFF",
    boxSizing: "border-box",
    resize: "none",
    minHeight: 80,
    transition: "border-color 0.15s",
  },
  iconGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 8,
  },
  iconBtn: (selected) => ({
    width: "100%",
    aspectRatio: "1",
    borderRadius: 10,
    border: selected ? `2px solid ${theme.colors.primary}` : `1.5px solid ${theme.colors.border}`,
    background: selected ? theme.colors.primaryLight : "#FDFAFF",
    fontSize: 22,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s",
  }),
  tagGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  tagBtn: (selected) => ({
    padding: "6px 14px",
    borderRadius: 20,
    border: selected ? `2px solid ${theme.colors.primary}` : `1.5px solid ${theme.colors.border}`,
    background: selected ? theme.colors.primaryLight : "#FDFAFF",
    color: selected ? theme.colors.primary : theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: selected ? 600 : 400,
    cursor: "pointer",
    transition: "all 0.15s",
  }),
  submitBtn: (loading) => ({
    width: "100%",
    padding: "13px",
    borderRadius: 12,
    border: "none",
    background: loading ? "#C4B5FD" : theme.colors.primaryGradient,
    color: "#fff",
    fontSize: 15,
    fontWeight: 700,
    cursor: loading ? "not-allowed" : "pointer",
    marginTop: 4,
    letterSpacing: "0.02em",
    transition: "opacity 0.2s",
  }),
  error: {
    fontSize: 13,
    color: "#EF4444",
    background: "#FEF2F2",
    border: "1px solid #FECACA",
    borderRadius: 8,
    padding: "9px 14px",
  },
  success: {
    fontSize: 13,
    color: "#059669",
    background: "#ECFDF5",
    border: "1px solid #6EE7B7",
    borderRadius: 8,
    padding: "9px 14px",
    textAlign: "center",
  },
};

// ─── CreateRoomModal ───────────────────────────────────────────────────────────
/**
 * Props:
 *   isOpen     bool      — controls visibility
 *   onClose    fn        — called when user closes
 *   onSuccess  fn(room)  — called with new room object after successful API call
 */
export default function CreateRoomModal({ isOpen, onClose, onSuccess }) {
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    icon: "📚",
    tag: "General",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);

  // Animate in/out
  useEffect(() => {
    if (isOpen) {
      // small delay so CSS transition fires
      setTimeout(() => setVisible(true), 10);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setForm({ title: "", description: "", icon: "📚", tag: "General" });
        setError(null);
        setSuccess(false);
      }, 350);
    }
  }, [isOpen]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const { createRoom } = useRooms();
  const handleSubmit = async () => {
  if (!form.title.trim()) {
    setError("Room name is required.");
    return;
  }
  setLoading(true);
  setError(null);

  const result = await createRoom({
    title: form.title.trim(),
    description: form.description.trim(),
    icon: form.icon,
    tag: form.tag,
  });

  if (result.success) {
    setSuccess(true);
    setTimeout(() => {
      onSuccess(result.room);  // pass new room up to Dashboard
      onClose();
    }, 900);
  } else {
    setError(result.error);
  }

  setLoading(false);
};

  if (!isOpen && !visible) return null;

  return (
    <div style={s.overlay} onClick={handleOverlayClick}>
      <div style={s.sheet(visible)}>
        {/* Drag handle */}
        <div style={s.handle} />

        {/* Header */}
        <div style={s.header}>
          <h2 style={s.title}>Create a Room</h2>
          <button style={s.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Body */}
        <div style={s.body}>

          {/* Room Name */}
          <div>
            <label style={s.label}>Room Name *</label>
            <input
              style={s.input}
              placeholder="e.g. DSA Study Group"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onFocus={(e) => (e.target.style.borderColor = theme.colors.primary)}
              onBlur={(e) => (e.target.style.borderColor = theme.colors.border)}
            />
          </div>

          {/* Description */}
          <div>
            <label style={s.label}>Description</label>
            <textarea
              style={s.textarea}
              placeholder="What is this room about?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              onFocus={(e) => (e.target.style.borderColor = theme.colors.primary)}
              onBlur={(e) => (e.target.style.borderColor = theme.colors.border)}
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label style={s.label}>Pick an Icon</label>
            <div style={s.iconGrid}>
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  style={s.iconBtn(form.icon === icon)}
                  onClick={() => setForm({ ...form, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Picker */}
          <div>
            <label style={s.label}>Category</label>
            <div style={s.tagGrid}>
              {TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  style={s.tagBtn(form.tag === tag)}
                  onClick={() => setForm({ ...form, tag })}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Error / Success */}
          {error   && <div style={s.error}>⚠️ {error}</div>}
          {success && <div style={s.success}>✅ Room created successfully!</div>}

          {/* Submit */}
          <button
            style={s.submitBtn(loading)}
            onClick={handleSubmit}
            disabled={loading || success}
          >
            {loading ? "Creating…" : success ? "Done!" : "＋ Create Room"}
          </button>

        </div>
      </div>
    </div>
  );
}
