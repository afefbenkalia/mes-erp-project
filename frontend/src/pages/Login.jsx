import React, { useState } from "react";
import API from "../api/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      alert("Enter email and password.");
      return;
    }

    try {
      const res = await API.post("/auth/login", {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      localStorage.setItem("token", res.data.access_token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      window.location.href = "/";
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        alert("Invalid email or password.");
      } else {
        alert("Login failed.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-900 to-blue-600">
      <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-2xl w-full max-w-md">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-4 rounded-full">
            🔒
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">Bienvenue</h2>
        <p className="text-gray-400 text-center mb-6">
          Connectez-vous à votre compte
        </p>

        {/* Email */}
        <div className="mb-4">
          <label className="text-sm text-gray-400">Email</label>
          <input
            type="email"
            placeholder="admin@erp-system.fr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="text-sm text-gray-400">Mot de passe</label>
          <input
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Forgot password */}
        <div className="text-right mb-4">
          <a href="#" className="text-blue-400 text-sm hover:underline">
            Mot de passe oublié ?
          </a>
        </div>

        {/* Button */}
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 transition p-3 rounded-lg font-semibold"
        >
          Se connecter
        </button>

        {/* Demo account */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg text-sm text-gray-400">
          <p>Compte de démonstration :</p>
          <p>Email: admin@erp-system.fr</p>
          <p>Mot de passe: admin123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;