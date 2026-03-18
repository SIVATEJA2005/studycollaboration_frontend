import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import DashBoard from "./pages/DashBoard";
import RoomPage from "./pages/RoomPage";
import { AuthProvider } from "./context/AuthContext";
import { RoomsProvider } from "./context/RoomContext";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RoomsProvider>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/"          element={<Login />} />
            <Route path="/signup"    element={<SignUp />} />
            <Route path="/dashboard" element={<DashBoard />} />
            <Route path="/room/:id"  element={<RoomPage />} />
          </Routes>
        </RoomsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
