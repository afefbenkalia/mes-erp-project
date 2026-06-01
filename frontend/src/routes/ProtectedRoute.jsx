import React from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // No token: redirect to login
  if (!token) {
    return <Navigate to="/login" />;
  }

  // Try to decode and validate JWT
  try {
    const decoded = jwtDecode(token);
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      // Token expired
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return <Navigate to="/login" />;
    }

    // Check role-based access
    if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center text-white">
            <h1 className="text-4xl font-bold mb-4">Accès refusé</h1>
            <p className="text-gray-400 mb-6">
              Vous n'avez pas la permission d'accéder à cette ressource
            </p>
            <a
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition"
            >
              Aller au tableau de bord
            </a>
          </div>
        </div>
      );
    }

  } catch (error) {
    // Invalid token
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;