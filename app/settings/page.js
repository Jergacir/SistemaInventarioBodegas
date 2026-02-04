"use client";

import React from "react";
import { MainLayout } from "../components/layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Button,
  Icons,
} from "../components/ui";
import { useToast } from "../components/ui/Toast";
import { DB } from "../lib/database";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [canEditProfile, setCanEditProfile] = React.useState(false);

  // Profile Edit State
  const [profileData, setProfileData] = React.useState({
    nombre: "",
    email: "",
  });

  // Settings State
  const [settings, setSettings] = React.useState({
    lowStockAlert: true,
    transferAlert: true,
    stockThreshold: 100,
  });

  // Password State
  const [passwordData, setPasswordData] = React.useState({
    current: "",
    new: "",
    confirm: "",
  });

  React.useEffect(() => {
    const loadData = async () => {
      try {
        // Load Settings
        const savedSettings = DB.getSettings();
        if (savedSettings) {
          setSettings({
            lowStockAlert: savedSettings.lowStockAlert ?? true,
            transferAlert: savedSettings.transferAlert ?? true,
            stockThreshold: savedSettings.stockThreshold ?? 100,
          });
        }

        // Load User from session
        const sessionStr = sessionStorage.getItem("currentUser");

        if (sessionStr) {
          const sessionData = JSON.parse(sessionStr);
          console.log("Loaded user from session:", sessionData);

          if (sessionData && sessionData.id_usuario) {
            // Usar los datos de sesión directamente
            setCurrentUser(sessionData);
            setProfileData({
              nombre: sessionData.nombre_completo || sessionData.nombre || "",
              email: sessionData.correo || sessionData.email || "",
            });

            // Role Check: Only ADMIN and SUPERVISOR can edit profile info
            const isOperator = sessionData.rol === "OPERADOR";
            setCanEditProfile(!isOperator);
          }
        }
      } catch (e) {
        console.error("Error loading settings data:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleProfileChange = (key, value) => {
    if (!canEditProfile) return;
    setProfileData((prev) => ({ ...prev, [key]: value }));
  };

  const handlePasswordChange = (key, value) => {
    setPasswordData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    try {
      // Save System Settings
      const currentSettings = DB.getSettings();
      DB.saveSettings({
        ...currentSettings,
        lowStockAlert: settings.lowStockAlert,
        transferAlert: settings.transferAlert,
        stockThreshold: settings.stockThreshold,
      });

      // Force UI update
      window.dispatchEvent(new Event("app-settings-changed"));

      // Save Profile if changed and allowed
      if (canEditProfile && currentUser) {
        if (
          profileData.email !== currentUser.email ||
          profileData.nombre !== currentUser.nombre
        ) {
          const userId = currentUser.id_usuario || currentUser.id;
          const updatedUser = await DB.updateUser(userId, {
            nombre_completo: profileData.nombre,
            email: profileData.email,
          });

          if (updatedUser) {
            setCurrentUser(updatedUser);
            sessionStorage.setItem("currentUser", JSON.stringify(updatedUser));
            window.dispatchEvent(new Event("storage"));
          }
        }
      }

      showToast(
        "Configuración Guardada",
        "Preferencias actualizadas correctamente.",
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("Error", "Hubo un problema al guardar los cambios.", "error");
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      showToast(
        "Error",
        "Por favor completa todos los campos de contraseña.",
        "error",
      );
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      showToast("Error", "Las nuevas contraseñas no coinciden.", "error");
      return;
    }

    if (passwordData.current === passwordData.new) {
      showToast(
        "Error",
        "La nueva contraseña debe ser diferente a la actual.",
        "error",
      );
      return;
    }

    if (passwordData.new.length < 6) {
      showToast(
        "Error",
        "La nueva contraseña debe tener al menos 6 caracteres.",
        "error",
      );
      return;
    }

    if (!currentUser) {
      showToast(
        "Error",
        "No se ha identificado al usuario. Por favor recarga la página.",
        "error",
      );
      return;
    }

    setLoading(true);
    try {
      // Llamar a la API para cambiar contraseña
      const response = await fetch("/api/users/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUser.id_usuario,
          currentPassword: passwordData.current,
          newPassword: passwordData.new,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showToast(
          "Error",
          result.error || "No se pudo actualizar la contraseña.",
          "error",
        );
        return;
      }

      // Limpiar campos
      setPasswordData({ current: "", new: "", confirm: "" });

      showToast(
        "Contraseña Actualizada",
        "Tu contraseña ha sido modificada correctamente. Se ha enviado una notificación a tu correo.",
        "success",
      );
    } catch (error) {
      console.error("Error changing password:", error);
      showToast("Error", "No se pudo actualizar la contraseña.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <MainLayout>Loading...</MainLayout>;

  return (
    <MainLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Preferencias del sistema y seguridad</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: "24px",
        }}
      >
        {/* Left Column: Security (Span 4) */}
        <div style={{ gridColumn: "span 4" }}>
          <Card style={{ height: "100%" }}>
            <CardHeader>
              <CardTitle>
                <Icons.Lock size={20} style={{ marginRight: "8px" }} />
                Seguridad de la Cuenta
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                <div className="form-group">
                  <label>Nombre Completo</label>
                  <input
                    type="text"
                    value={profileData.nombre}
                    onChange={(e) =>
                      handleProfileChange("nombre", e.target.value)
                    }
                    disabled={!canEditProfile}
                    className={!canEditProfile ? "disabled-input" : ""}
                    style={
                      !canEditProfile
                        ? {
                          backgroundColor: "var(--bg-subtle)",
                          cursor: "not-allowed",
                          color: "var(--text-muted)",
                        }
                        : {}
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) =>
                      handleProfileChange("email", e.target.value)
                    }
                    disabled={!canEditProfile}
                    className={!canEditProfile ? "disabled-input" : ""}
                    style={
                      !canEditProfile
                        ? {
                          backgroundColor: "var(--bg-subtle)",
                          cursor: "not-allowed",
                          color: "var(--text-muted)",
                        }
                        : {}
                    }
                  />
                </div>
              </div>

              {!canEditProfile && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "20px",
                    fontStyle: "italic",
                  }}
                >
                  * Contacta a un administrador para modificar tu información
                  personal.
                </div>
              )}

              <div
                style={{
                  paddingTop: "20px",
                  borderTop: "1px solid var(--border-light)",
                }}
              >
                <h4
                  style={{
                    fontSize: "14px",
                    marginBottom: "16px",
                    color: "var(--text-primary)",
                  }}
                >
                  Cambiar Contraseña
                </h4>

                <div className="form-group">
                  <label>Contraseña Actual</label>
                  <input
                    type="password"
                    value={passwordData.current}
                    onChange={(e) =>
                      handlePasswordChange("current", e.target.value)
                    }
                    placeholder="Ingresa tu contraseña actual"
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  <div className="form-group">
                    <label>Nueva Contraseña</label>
                    <input
                      type="password"
                      value={passwordData.new}
                      onChange={(e) =>
                        handlePasswordChange("new", e.target.value)
                      }
                      placeholder="Nueva contraseña"
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirmar Nueva Contraseña</label>
                    <input
                      type="password"
                      value={passwordData.confirm}
                      onChange={(e) =>
                        handlePasswordChange("confirm", e.target.value)
                      }
                      placeholder="Repite la nueva contraseña"
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "16px",
                  }}
                >
                  <Button
                    variant="secondary"
                    onClick={handleUpdatePassword}
                    disabled={
                      !passwordData.current ||
                      !passwordData.new ||
                      !passwordData.confirm
                    }
                  >
                    Actualizar
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Center Column: Notifications (Span 4) */}
        <div style={{ gridColumn: "span 4" }}>
          <Card style={{ height: "fit-content" }}>
            <CardHeader>
              <CardTitle>
                <Icons.Bell size={20} style={{ marginRight: "8px" }} />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div
                  className="settings-item"
                  style={{
                    borderBottom: "none",
                    background: "var(--bg-subtle)",
                    padding: "16px",
                    borderRadius: "8px",
                  }}
                >
                  <div className="settings-item-info">
                    <div className="settings-item-label">Alertas de Stock</div>
                    <div className="settings-item-description">
                      Avisar si baja del mínimo
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.lowStockAlert}
                    onChange={(e) =>
                      handleSettingChange("lowStockAlert", e.target.checked)
                    }
                    style={{ width: "20px", height: "20px" }}
                  />
                </div>
                <div
                  className="settings-item"
                  style={{
                    borderBottom: "none",
                    background: "var(--bg-subtle)",
                    padding: "16px",
                    borderRadius: "8px",
                  }}
                >
                  <div className="settings-item-info">
                    <div className="settings-item-label">Transferencias</div>
                    <div className="settings-item-description">
                      Avisar nuevas solicitudes
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.transferAlert}
                    onChange={(e) =>
                      handleSettingChange("transferAlert", e.target.checked)
                    }
                    style={{ width: "20px", height: "20px" }}
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Inventory (Span 4) */}
        <div style={{ gridColumn: "span 4" }}>
          <Card style={{ height: "fit-content" }}>
            <CardHeader>
              <CardTitle>
                <Icons.Inventory size={20} style={{ marginRight: "8px" }} />
                Inventario
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div
                className="settings-item"
                style={{
                  borderBottom: "none",
                  background: "var(--bg-subtle)",
                  padding: "16px",
                  borderRadius: "8px",
                }}
              >
                <div className="settings-item-info">
                  <div className="settings-item-label">Umbral Alerta (%)</div>
                  <div className="settings-item-description">
                    % del mínimo para avisar
                  </div>
                </div>
                <input
                  type="number"
                  value={settings.stockThreshold}
                  onChange={(e) =>
                    handleSettingChange(
                      "stockThreshold",
                      parseInt(e.target.value),
                    )
                  }
                  min={50}
                  max={200}
                  style={{ width: "80px" }}
                />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div
        style={{
          marginTop: "var(--spacing-6)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Button
          variant="primary"
          onClick={handleSaveSettings}
          size="lg"
          style={{ minWidth: "200px" }}
        >
          <Icons.Check size={20} />
          Guardar Preferencias
        </Button>
      </div>
    </MainLayout>
  );
}
