import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../api/api";
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle } from "lucide-react";

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Redirect if no token
  React.useEffect(() => {
    if (!token) {
      navigate("/login");
    }
  }, [token, navigate]);

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);

    return {
      isValid: password.length >= minLength && hasUppercase && hasLowercase && hasDigit,
      minLength: password.length >= minLength,
      hasUppercase,
      hasLowercase,
      hasDigit,
    };
  };

  const passwordValidation = validatePassword(newPassword);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Validation
    if (!currentPassword.trim()) {
      setError("Le mot de passe actuel est requis");
      return;
    }

    if (!newPassword.trim()) {
      setError("Le nouveau mot de passe est requis");
      return;
    }

    if (!confirmPassword.trim()) {
      setError("La confirmation du mot de passe est requise");
      return;
    }

    if (!passwordValidation.isValid) {
      setError(
        "Le mot de passe doit comporter au moins 8 caractères avec majuscule, minuscule et chiffre"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (currentPassword === newPassword) {
      setError("Le nouveau mot de passe doit être différent de l'actuel");
      return;
    }

    setLoading(true);

    try {
      const response = await API.post(
        "/auth/change-password",
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || err.response?.data?.message || "Échec du changement de mot de passe";
      setError(errorMsg);
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
            <Lock size={32} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-2">Changer le mot de passe</h2>
        <p className="text-gray-400 text-center mb-6">
          Veuillez définir un nouveau mot de passe pour continuer
        </p>

        {/* User Info */}
        <div className="bg-gray-800 p-3 rounded-lg mb-6 text-sm">
          <p className="text-gray-300">
            <span className="text-gray-400">Utilisateur :</span> {user.prenom} {user.nom}
          </p>
          <p className="text-gray-300">
            <span className="text-gray-400">Email :</span> {user.email}
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-900 border border-green-700 text-green-200 p-4 rounded-lg mb-6 flex items-center gap-2">
            <CheckCircle size={20} />
            <span>Mot de passe modifié avec succès ! Redirection en cours...</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 p-4 rounded-lg mb-6 flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Mot de passe actuel *
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Saisissez votre mot de passe actuel"
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200"
                disabled={loading}
              >
                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Nouveau mot de passe *
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Saisissez votre nouveau mot de passe"
                className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none transition"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200"
                disabled={loading}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Requirements */}
            {newPassword && (
              <div className="mt-3 space-y-1 text-sm">
                <div
                  className={`flex items-center gap-2 ${
                    passwordValidation.minLength
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border ${
                      passwordValidation.minLength
                        ? "bg-green-400 border-green-400"
                        : "border-gray-600"
                    }`}
                  />
                  Au moins 8 caractères
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    passwordValidation.hasUppercase
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border ${
                      passwordValidation.hasUppercase
                        ? "bg-green-400 border-green-400"
                        : "border-gray-600"
                    }`}
                  />
                  Une lettre majuscule
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    passwordValidation.hasLowercase
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border ${
                      passwordValidation.hasLowercase
                        ? "bg-green-400 border-green-400"
                        : "border-gray-600"
                    }`}
                  />
                  Une lettre minuscule
                </div>
                <div
                  className={`flex items-center gap-2 ${
                    passwordValidation.hasDigit
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border ${
                      passwordValidation.hasDigit
                        ? "bg-green-400 border-green-400"
                        : "border-gray-600"
                    }`}
                  />
                  Un chiffre
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Confirmer le mot de passe *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ressaisissez votre nouveau mot de passe"
                className={`w-full bg-gray-800 text-white px-4 py-2 rounded-lg border transition focus:outline-none ${
                  confirmPassword && newPassword !== confirmPassword
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-700 focus:border-blue-500"
                }`}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-200"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-red-400 text-sm mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !passwordValidation.isValid}
            className={`w-full py-2 rounded-lg font-semibold transition mt-6 ${
              loading || !passwordValidation.isValid
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {loading ? "Modification en cours..." : "Changer le mot de passe"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-gray-400 text-center text-sm mt-6">
          Le mot de passe doit comporter au moins 8 caractères avec majuscule, minuscule et chiffre
        </p>
      </div>
    </div>
  );
};

export default ChangePassword;
