import React, { useState } from "react";
import { Mail, User, Lock } from "lucide-react"; 
import background from "../assets/loginbackgroundimage.png";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SignUp() 
{
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!email || !userName || !displayName || !password) {
      alert("All fields are required!");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    setLoading(true);
    try 
    {
      await signup(email, userName, displayName, password);
      alert("Signup successful!");
      navigate("/login");
    } catch (error) {
      if (error.response?.data?.message) {
        alert(error.response.data.message);
      } else {
        alert("Sign Up Failed: Check your credentials or uniqueness");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-100">
      <div
        className="absolute inset-0 bg-center bg-cover blur-sm brightness-90"
        style={{ backgroundImage: `url(${background})` }}
      ></div>
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10 bg-white/90 backdrop-blur-md shadow-2xl rounded-3xl p-10 w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="text-blue-600 text-3xl animate-bounce">🤖</div>
          <h1 className="text-2xl font-bold text-blue-600">
            Brain <span className="text-pink-500">Bridge</span>
          </h1>
        </div>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-700">Create Account</h2>
          <p className="text-gray-500 text-sm">Sign up to start your learning journey</p>
        </div>
        <form className="space-y-4" onSubmit={handleSignUp}>
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

          <div className="flex items-center border rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-400 transition">
            <User className="text-pink-500 w-5 h-5 mr-2" />
            <input
              type="text"
              placeholder="Username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
              className="w-full outline-none text-sm placeholder-gray-400"
            />
          </div>

          <div className="flex items-center border rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-400 transition">
            <User className="text-pink-500 w-5 h-5 mr-2" />
            <input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full outline-none text-sm placeholder-gray-400"
            />
          </div>

          <div className="flex items-center border rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-pink-400 transition">
            <Lock className="text-blue-500 w-5 h-5 mr-2" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full outline-none text-sm placeholder-gray-400"
            />
          </div>

          <div className="flex items-center border rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-pink-400 transition">
            <Lock className="text-blue-500 w-5 h-5 mr-2" />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full outline-none text-sm placeholder-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-white font-semibold
            bg-gradient-to-r from-blue-500 to-pink-500 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing up..." : "Sign Up"}
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
            "https://cdn-icons-png.flaticon.com/512/281/281764.png",
            "https://cdn-icons-png.flaticon.com/512/732/732221.png",
            "https://cdn-icons-png.flaticon.com/512/0/747.png",
          ].map((icon, idx) => (
            <button
              key={idx}
              className="p-3 bg-gray-100 rounded-full shadow hover:scale-110 transition"
            >
              <img src={icon} className="w-5 h-5" />
            </button>
          ))}
        </div>
        <div className="text-center mt-6 text-sm text-gray-500">
          Already have an account?
          <span
            className="text-pink-500 font-semibold cursor-pointer ml-1 hover:underline"
            onClick={() => navigate("/")}
          >
            Log In
          </span>
        </div>
      </div>
    </div>
  );
}