import React, { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import background from "../assets/loginbackgroundimage.png";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { RiRobot2Fill } from "react-icons/ri";
import { MdOutlineMarkEmailRead } from "react-icons/md";

export default function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");
  const navigate              = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/users/forgot-password`,
        { email }
      );
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
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

        {/* Brand header */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <RiRobot2Fill className="text-blue-600 animate-bounce" size={32} />
          <h1 className="text-2xl font-bold text-blue-600">
            Brain <span className="text-pink-500">Bridge</span>
          </h1>
        </div>

        {!sent ? (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-700">Forgot Password?</h2>
              <p className="text-gray-500 text-sm mt-1">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="flex items-center border rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-400 transition">
                <Mail className="text-pink-500 w-5 h-5 mr-2" />
                <input
                  type="email"
                  placeholder="Your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="flex justify-center mb-4">
              <MdOutlineMarkEmailRead size={52} className="text-blue-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Check your inbox!</h2>
            <p className="text-gray-500 text-sm">
              A reset link has been sent to{" "}
              <span className="font-medium text-blue-500">{email}</span>.
              <br />Click the link to reset your password.
            </p>
          </div>
        )}

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 mx-auto mt-6 text-sm text-gray-500 hover:text-pink-500 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </button>

      </div>
    </div>
  );
}