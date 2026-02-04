"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "../components/ui";
import { supabase } from "../lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Verificar si hay un hash de recuperación en la URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");

    if (type !== "recovery" || !accessToken) {
      setError(
        "Enlace de recuperación inválido o expirado. Solicita uno nuevo.",
      );
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);

    try {
      // Actualizar contraseña usando Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess("Contraseña actualizada correctamente. Redirigiendo...");

      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      console.error("Reset password error:", err);
      setError(err.message || "Error al actualizar la contraseña.");
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
          <h1 className="login-title">Restablecer Contraseña</h1>
          <p className="login-subtitle">Ingresa tu nueva contraseña</p>
        </div>

        {error && <div className="login-error show">{error}</div>}
        {success && (
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
            {success}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="new-password">Nueva Contraseña</label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={isLoading || !!success}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirm-password">Confirmar Contraseña</label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
              disabled={isLoading || !!success}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="login-btn"
            isLoading={isLoading}
            disabled={isLoading || !!success}
          >
            Actualizar Contraseña
          </Button>
        </form>

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
