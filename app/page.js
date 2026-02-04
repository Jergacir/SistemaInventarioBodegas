"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Auth } from "./lib/auth";
import { Button, Icons } from "./components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setForgotSuccess("");
    setIsLoading(true);

    try {
      // Usar Supabase Auth
      const { user, userData } = await Auth.signIn(email.trim(), password);

      // Map role for UI
      const roleMap = { A: "ADMIN", S: "SUPERVISOR", O: "OPERADOR" };
      const uiUser = {
        id_usuario: userData.id_usuario,
        nombre_completo: userData.nombre_completo,
        correo: userData.email,
        rol: roleMap[userData.rol] || userData.rol,
        estado: userData.estado,
      };

      // Save to session storage
      if (typeof window !== "undefined") {
        sessionStorage.setItem("currentUser", JSON.stringify(uiUser));
      }

      // Usar window.location para forzar recarga y sincronizar cookies
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.message || "Error al iniciar sesión. Verifica tus credenciales.",
      );
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError("");
    setForgotSuccess("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const result = await response.json();

      if (response.ok) {
        setForgotSuccess("Revisa tu correo para restablecer tu contraseña.");
        setForgotEmail("");
      } else {
        setError(result.error || "Error al enviar el correo.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Error al procesar tu solicitud.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo" style={{ background: "transparent" }}>
          <Image
            src="/assets/img/eneragro-logo.png"
            alt="Eneragro"
            width={280}
            height={80}
            style={{ maxWidth: "100%", height: "auto", borderRadius: "8px" }}
            priority
          />
        </div>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h1 className="login-title">Bienvenido operadossr</h1>
          <p className="login-subtitle">Sistema de Gestión de Inventarios</p>
        </div>

        {error && <div className="login-error show">{error}</div>}
        {forgotSuccess && (
          <div
            className="login-success show"
            style={{
              background: "#10b981",
              color: "white",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            {forgotSuccess}
          </div>
        )}

        {!showForgotPassword ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-email">Correo Electrónico</label>
              <input
                type="email"
                id="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Contraseña</label>
              <input
                type="password"
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="login-btn"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Iniciar Sesión
            </Button>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setError("");
                  setForgotSuccess("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3b82f6",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "0.9rem",
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleForgotPassword}>
            <div className="form-group">
              <label htmlFor="forgot-email">Correo Electrónico</label>
              <input
                type="email"
                id="forgot-email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
              <small
                style={{
                  color: "rgba(255,255,255,0.7)",
                  marginTop: "8px",
                  display: "block",
                }}
              >
                Te enviaremos un enlace para restablecer tu contraseña
              </small>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="login-btn"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Enviar Enlace
            </Button>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError("");
                  setForgotSuccess("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#3b82f6",
                  cursor: "pointer",
                  textDecoration: "underline",
                  fontSize: "0.9rem",
                }}
              >
                Volver al inicio de sesión
              </button>
            </div>
          </form>
        )}

        <div className="login-footer">
          <p>Sistema de Inventarios Multi-Bodega</p>
        </div>
      </div>

      <div
        style={{
          marginTop: "2rem",
          color: "rgba(255,255,255,0.6)",
          fontSize: "0.9rem",
          fontWeight: 500,
        }}
      >
        Developed by Andy Ñañez Ramirez
      </div>
    </div>
  );
}
