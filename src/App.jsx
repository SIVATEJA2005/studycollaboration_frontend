import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import DashBoard from "./pages/DashBoard";
import RoomPage from "./pages/RoomPage";
import { AuthProvider } from "./context/AuthContext";
import { RoomsProvider } from "./context/RoomContext";
import { Toaster } from "react-hot-toast";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/"       element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/dashboard" element={
            <RoomsProvider>
              <DashBoard />
            </RoomsProvider>
          } />
          <Route path="/room/:id" element={
            <RoomsProvider>
              <RoomPage />
            </RoomsProvider>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;