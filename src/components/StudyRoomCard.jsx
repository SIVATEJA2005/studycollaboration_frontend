import React from "react";

// ─── Theme ────────────────────────────────────────────────────────────────────
export const theme = {
  colors: {
    primary: "#6C63FF",                                        // violet-blue – buttons, active
    primaryGradient: "linear-gradient(135deg, #6C63FF, #F472B6)", // blue→pink gradient
    primaryLight: "#F3F0FF",                                   // soft lavender – active sidebar bg
    accent: "#F59E0B",                                         // gold star
    white: "#FFFFFF",
    bgPage: "#FDF4FF",                                         // very soft pink-white page bg
    bgCard: "#FFFFFF",
    border: "#EDD9F7",                                         // soft pink-purple border
    textPrimary: "#2D1B4E",                                    // deep purple-navy
    textSecondary: "#7B6899",                                  // muted purple
    textMuted: "#B39DCC",                                      // light lavender-grey
    tagBg: {
      Favorites: "#FCE7F3",
      Networking: "#EDE9FE",
      "Machine Learning": "#E0F2FE",
      default: "#F3F0FF",
    },
    tagText: {
      Favorites: "#BE185D",
      Networking: "#6D28D9",
      "Machine Learning": "#0369A1",
      default: "#6C63FF",
    },
  },
  radii: {
    card: "14px",
    tag: "6px",
    avatar: "50%",
  },
  shadow: {
    card: "0 2px 8px rgba(108,99,255,0.08), 0 1px 3px rgba(244,114,182,0.06)",
    cardHover: "0 6px 20px rgba(108,99,255,0.18)",
  },
};

// ─── Avatar Stack ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#93C5FD","#6EE7B7","#FCA5A5","#C4B5FD","#FDE68A"];

function AvatarStack({ count, extra }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div style={{ display: "flex" }}>
        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 28,
              height: 28,
              borderRadius: theme.radii.avatar,
              background: AVATAR_COLORS[i % AVATAR_COLORS.length],
              border: `2px solid ${theme.colors.white}`,
              marginLeft: i === 0 ? 0 : -8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>
      {extra && (
        <span
          style={{
            fontSize: 12,
            color: theme.colors.textSecondary,
            fontWeight: 500,
          }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

// ─── Tag ──────────────────────────────────────────────────────────────────────
function Tag({ label }) {
  const bg = theme.colors.tagBg[label] ?? theme.colors.tagBg.default;
  const color = theme.colors.tagText[label] ?? theme.colors.tagText.default;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: theme.radii.tag,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}

// ─── Room Icon ─────────────────────────────────────────────────────────────────
function RoomIcon({ icon }) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 10,
        background: theme.colors.bgPage,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
  );
}

// ─── RoomCard (exported, reusable) ────────────────────────────────────────────
/**
 * Props:
 *  icon        string  – emoji or any React node shown in the icon box
 *  title       string  – room name
 *  description string  – short description
 *  tag         string  – category tag label
 *  memberCount number  – total members (shows first 3 avatars + overflow)
 *  isFavorite  bool    – show gold star
 *  lastActivity string – e.g. "James Wilson added a new task  45m ago"
 */
export function StudyRoomCard({
  icon = "📚",
  title = "Study Room",
  description = "",
  tag = "",
  memberCount = 3,
  isFavorite = false,
  lastActivity = "",
  onClick = () => {},
}) {
  const [hovered, setHovered] = React.useState(false);
  const avatarShow = Math.min(memberCount, 3);
  const extra = memberCount > 3 ? memberCount - 3 : null;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: theme.colors.bgCard,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radii.card,
        padding: "18px 20px",
        cursor: "pointer",
        transition: "box-shadow 0.18s ease, transform 0.18s ease",
        boxShadow: hovered ? theme.shadow.cardHover : theme.shadow.card,
        transform: hovered ? "translateY(-2px)" : "none",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <RoomIcon icon={icon} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: theme.colors.textPrimary,
                lineHeight: 1.3,
              }}
            >
              {title}
            </span>
            {isFavorite && (
              <span style={{ color: theme.colors.accent, fontSize: 16 }}>★</span>
            )}
          </div>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: theme.colors.textSecondary,
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        </div>
      </div>

      {/* Tag + avatars */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {tag && <Tag label={tag} />}
        <AvatarStack count={avatarShow} extra={extra} />
      </div>
      {/* Last activity */}
      {lastActivity && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderTop: `1px solid ${theme.colors.border}`,
            paddingTop: 10,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: theme.radii.avatar,
              background: "#CBD5E1",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, color: theme.colors.textSecondary }}>
            {lastActivity}
          </span>
        </div>
      )}
    </div>
  );
}
