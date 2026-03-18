import React, { useState } from "react";
import { Mail, Lock } from "lucide-react";
import background from "../assets/loginbackgroundimage.png";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() 
{

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (error) {
      alert("Login Failed: Check your credentials");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-100">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-center bg-cover blur-sm brightness-90"
        style={{ backgroundImage: `url(${background})` }}
      ></div>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20"></div>
      {/* Login Card */}
      <div className="relative z-10 bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl p-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="text-blue-600 text-3xl animate-bounce">🤖</div>
          <h1 className="text-2xl font-bold text-blue-600">
            Brain <span className="text-pink-500">Bridge</span>
          </h1>
        </div>
        {/* Welcome Text */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-700">Welcome Back</h2>
          <p className="text-gray-500 text-sm">Log in to continue your studies</p>
        </div>
        {/* Form */}
        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="flex items-center border rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-400 transition">
            <Mail className="text-pink-500 w-5 h-5 mr-2" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full outline-none text-sm placeholder-gray-400"
            />
          </div>
          <div className="flex items-center border rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-pink-400 transition">
            <Lock className="text-blue-500 w-5 h-5 mr-2" />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full outline-none text-sm placeholder-gray-400"
            />
          </div>

          <div className="text-right text-xs text-pink-500 cursor-pointer hover:underline">
            Forgot password?
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-white font-semibold
            bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-300" />
          <span className="px-3 text-gray-400 text-xs">Or continue with</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Social Login */}
        <div className="flex justify-center gap-6">
          {[
            "https://cdn-icons-png.flaticon.com/512/281/281764.png", // Facebook
            "https://cdn-icons-png.flaticon.com/512/732/732221.png", // Google
            "https://cdn-icons-png.flaticon.com/512/0/747.png",      // Twitter
          ].map((icon, idx) => (
            <button
              key={idx}
              className="p-3 bg-gray-100 rounded-full shadow hover:scale-110 transition"
            >
              <img src={icon} className="w-5 h-5" />
            </button>
          ))}
        </div>
        {/* Signup */}
        <div className="text-center mt-6 text-sm text-gray-500">
          Don’t have an account?
          <span className="text-pink-500 font-semibold cursor-pointer ml-1 hover:underline" onClick={()=>navigate("/signup")}>
            Sign Up
          </span>
        </div>
      </div>
    </div>
  );
}