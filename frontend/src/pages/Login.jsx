import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";
import { AlertCircle, Loader } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/login", {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      // Check if user must change password on first login
      if (res.data.force_change_password) {
        navigate("/change-password");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const status = err.response?.status;
      const errorMsg = err.response?.data?.detail || "Login failed";
      
      if (status === 401) {
        setError("Invalid email or password");
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-900 to-blue-600 py-12 px-4">
      <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-2xl w-full max-w-md">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-4 rounded-full">
            🏭
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">MES System</h2>
        <p className="text-gray-400 text-center mb-6">
          Manufacturing Execution System
        </p>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 p-4 rounded-lg mb-6 flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label className="text-sm text-gray-400 font-semibold">Email *</label>
            <input
              type="email"
              placeholder="user@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full mt-1 p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 transition disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-gray-400 font-semibold">Password *</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500 transition disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-200 disabled:opacity-50"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition p-3 rounded-lg font-semibold flex items-center justify-center gap-2"
          >
            {loading && <Loader size={20} className="animate-spin" />}
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Info Message */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg text-sm text-gray-400">
          <p className="font-semibold mb-2">ℹ️ First Time Login?</p>
          <p className="text-xs">
            An admin will create your account and send you a temporary password via email.
            You'll be required to change it on your first login.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-500">
          <p>© 2026 MES System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
