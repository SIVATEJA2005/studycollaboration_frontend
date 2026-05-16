import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─── Context ──────────────────────────────────────────────────────────────────
const RoomsContext = createContext(null);

// ─── API base (change to your backend URL) ────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ─── Helper: get auth token from storage ─────────────────────────────────────
function getToken() {
  return localStorage.getItem("token"); // change key if yours is different
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function RoomsProvider({ children }) {
  const [rooms, setRooms]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  // ── Fetch all rooms belonging to the logged-in user ──────────────────────
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/room/getAllRooms`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to fetch rooms");
      }

      const data = await res.json();
      // data should be an array of room objects:
      // [{ id, title, description, tag, icon, memberCount, isFavorite, lastActivity }, ...]
      setRooms(data);
    } catch (err) {
      console.error("fetchRooms error:", err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-fetch once when the provider mounts (i.e. user is logged in) ────
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchRooms();
    }
  }, [fetchRooms]);
  // ── Create a new room ─────────────────────────────────────────────────────
  const createRoom = useCallback(async (formData) => {
    // Optimistic: add a temp entry immediately so UI feels instant
    const tempId = `temp_${Date.now()}`;
    const tempRoom = {
    //   id: tempId,
      name: formData.title,
      description: formData.description,
    //   tag: formData.tag,
    //   icon: formData.icon || "📚",
    //   memberCount: 1,
    //   isFavorite: false,
    //   lastActivity: "You created this room  just now",
    };
    setRooms((prev) => [...prev, tempRoom]);
    try {
      const res = await fetch(`${API_BASE}/room/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name: formData.title, description: formData.description }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create room");
      }
      const realRoom = await res.json();
      // Swap the temp entry with the real one from backend
      setRooms((prev) => prev.map((r) => (r.id === tempId ? realRoom : r)));
      return { success: true, room: realRoom };
    } catch (err) {
      console.error("createRoom error:", err.message);
      // Rollback optimistic entry on failure
      setRooms((prev) => prev.filter((r) => r.id !== tempId));
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);
  // ── Delete a room ─────────────────────────────────────────────────────────
  const deleteRoom = useCallback(async (roomId) => {
    // Optimistic remove
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete room");
      }
    } catch (err) {
      console.error("deleteRoom error:", err.message);
      setError(err.message);
      // Re-fetch to restore correct state on failure
      fetchRooms();
    }
  }, [fetchRooms]);
  // ── Toggle favorite ───────────────────────────────────────────────────────
  const toggleFavorite = useCallback(async (roomId) => {
    // Optimistic toggle
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, isFavorite: !r.isFavorite } : r
      )
    );
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${roomId}/favorite`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to toggle favorite");
      }
    } catch (err) {
      console.error("toggleFavorite error:", err.message);
      // Rollback on failure
      setRooms((prev) =>
        prev.map((r) =>
          r.id === roomId ? { ...r, isFavorite: !r.isFavorite } : r
        )
      );
    }
  }, []);
  // ─── Value exposed to consumers ───────────────────────────────────────────
  const value = {
    rooms,           // Room[]  — all rooms for this user
    loading,         // bool    — true while fetching
    error,           // string  — last error message, null if none
    fetchRooms,      // ()      — manually refetch
    createRoom,      // (formData) => { success, room | error }
    deleteRoom,      // (roomId) => void
    toggleFavorite,  // (roomId) => void
  };
  return <RoomsContext.Provider value={value}>{children}</RoomsContext.Provider>;
}
//───Custom hook──────────────────────────────────────────────────────────────
export function useRooms() {
  const ctx = useContext(RoomsContext);
  if (!ctx) {
    throw new Error("useRooms must be used inside <RoomsProvider>");
  }
  return ctx;
}