import React, { useState } from "react";
import { Lock, ArrowLeft } from "lucide-react";
import background from "../assets/loginbackgroundimage.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

export default function ResetPassword() 
{
  const [newPassword, setNew]       = useState("");
  const [confirm, setConfirm]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState("");
  const navigate                    = useNavigate();
  const [searchParams]              = useSearchParams();
  const token                       = searchParams.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/users/reset-password`, { token, newPassword });
      setSuccess(true);
    } catch {
      setError("Invalid or already used reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-100">
      <div
        className="absolute inset-0 bg-center bg-cover blur-sm brightness-90"
        style={{ backgroundImage: `url(${background})` }}
      />
      <div className="absolute inset-0 bg-black/20" />

      <div className="relative z-10 bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl p-10 w-full max-w-md">

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="text-blue-600 text-3xl animate-bounce">🤖</div>
          <h1 className="text-2xl font-bold text-blue-600">
            Brain <span className="text-pink-500">Bridge</span>
          </h1>
        </div>

        {!success ? (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-700">Reset Password</h2>
              <p className="text-gray-500 text-sm mt-1">Enter your new password below.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="flex items-center border rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-400 transition">
                <Lock className="text-pink-500 w-5 h-5 mr-2" />
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNew(e.target.value)}
                  required
                  className="w-full outline-none text-sm placeholder-gray-400"
                />
              </div>

              <div className="flex items-center border rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-pink-400 transition">
                <Lock className="text-blue-500 w-5 h-5 mr-2" />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full outline-none text-sm placeholder-gray-400"
                />
              </div>

              {error && <p className="text-red-500 text-xs text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-white font-semibold
                bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90
                transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Password Updated!</h2>
            <p className="text-gray-500 text-sm">You can now log in with your new password.</p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 py-2 px-6 rounded-lg text-white font-semibold
              bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 transition"
            >
              Go to Login
            </button>
          </div>
        )}

        {!success && (
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 mx-auto mt-6 text-sm text-gray-500 hover:text-pink-500 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
        )}

      </div>
    </div>
  );
}