import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const AuthContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: `${API_BASE}/api/users`,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (error) {
      console.warn("Failed to parse saved user:", error);
      localStorage.removeItem("user");
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post("/login", { email, password });
      console.log("Login successful:", response.data);
      const { token, user: userData } = response.data;
      localStorage.setItem("token",       token);
      localStorage.setItem("user",        JSON.stringify(userData));
      localStorage.setItem("userId",      String(userData.id));
      localStorage.setItem("email",       userData.email);
      localStorage.setItem("userName",    userData.userName);
      localStorage.setItem("displayName", userData.displayName);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUser(userData);
      return userData;
    } catch (error) {
      console.error("Login failed:", error);
      throw new Error("Login failed. Check your credentials.");
    }
  };
  const signup = async (email, userName, displayName, password) => {
    try {
      const response = await api.post("/register", {
        email,
        userName,
        displayName,
        password,
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error("Sign Up Failed: Something went wrong");
      }
    }
  };
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("email");
    localStorage.removeItem("userName");
    localStorage.removeItem("displayName");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
