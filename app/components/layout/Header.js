"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "../ui/Icons";
import { Button } from "../ui/Button";
import { Badge, StatusBadge } from "../ui/Badge";
import { useModal } from "../ui/Modal";
import { useToast } from "../ui/Toast";
import { Helpers } from "../../lib/utils/helpers";
import { DB } from "../../lib/database";
import { Auth } from "../../lib/auth";


export const Header = ({ toggleSidebar, user, onLogout }) => {
  const router = useRouter();
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState({ pendingMovements: [], lowStock: [] });

  useEffect(() => {
    const updateNotificationCount = async () => {
      if (!user) return;
      try {
        const data = await DB.getNotifications(user.rol);
        setNotifications(data);
        setNotificationCount(data.count);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    updateNotificationCount();

    // Poll every minute for updates
    const interval = setInterval(updateNotificationCount, 60000);

    // Listen for settings changes
    const handleSettingsChange = () => updateNotificationCount();
    window.addEventListener("app-settings-changed", handleSettingsChange);
    window.addEventListener("storage", handleSettingsChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("app-settings-changed", handleSettingsChange);
      window.removeEventListener("storage", handleSettingsChange);
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      // Cerrar sesión en Supabase
      await Auth.signOut();

      // Limpiar sessionStorage
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("currentUser");
      }

      closeModal();

      // Usar window.location para forzar recarga y limpiar cookies
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      // Si hay error, igual limpiar y redirigir
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("currentUser");
      }
      window.location.href = "/";
    }
  };

  const showProfileModal = () => {
    if (!user) return;

    const isAdmin = user.rol === "ADMIN";
    const initials =
      user.nombre_completo
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2) || "U";

    openModal(
      "Perfil de Usuario",
      <div>
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "white",
              fontSize: "24px",
              fontWeight: 600,
            }}
          >
            {initials}
          </div>
          <h3 style={{ margin: "0 0 4px", fontSize: "18px" }}>
            {user.nombre_completo}
          </h3>
          <p style={{ color: "var(--text-muted)", margin: "0 0 16px" }}>
            {user.email}
          </p>
          <Badge variant="completed">{user.rol}</Badge>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border-light)",
            paddingTop: "16px",
            marginTop: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)" }}>
              ID de usuario:
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
              {user.id_usuario}
            </span>
          </div>
        </div>

        {isAdmin && (
          <div
            style={{
              borderTop: "1px solid var(--border-light)",
              paddingTop: "16px",
              marginTop: "16px",
            }}
          >
            <Button
              variant="primary"
              style={{ width: "100%" }}
              onClick={() => {
                closeModal();
                router.push("/users");
              }}
            >
              <Icons.Users size={16} />
              Gestionar Usuarios
            </Button>
          </div>
        )}

        <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
          <Button variant="secondary" onClick={closeModal} style={{ flex: 1 }}>
            Cerrar
          </Button>
          <Button variant="danger" onClick={handleLogout} style={{ flex: 1 }}>
            <Icons.LogOut size={16} />
            Cerrar Sesión
          </Button>
        </div>
      </div>,
    );
  };

  const showNotificationsModal = () => {
    const { pendingMovements, lowStock } = notifications;
    const canApprove = user?.rol === "ADMIN" || user?.rol === "SUPERVISOR";
    // pendingMovements is already filtered by role in DB.getNotifications but good to double check or just use data

    // DB.getNotifications already handles role check for pending movements availability
    const hasNotifications = lowStock.length > 0 || pendingMovements.length > 0;

    openModal({
      title: "Notificaciones",
      size: "lg",
      content: (
        <div>
          {!hasNotifications ? (
            <div style={{ textAlign: "center", padding: "48px 20px" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: "var(--bg-hover)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  color: "var(--color-success)",
                }}
              >
                <Icons.Check size={36} />
              </div>
              <h3
                style={{
                  margin: "0 0 8px",
                  color: "var(--text-primary)",
                  fontSize: "18px",
                  fontWeight: 600,
                }}
              >
                Todo al día
              </h3>
              <p
                style={{
                  color: "var(--text-secondary)",
                  margin: 0,
                  fontSize: "14px",
                }}
              >
                No tienes notificaciones pendientes.
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Pending Movements */}
              {pendingMovements.length > 0 && (
                <div
                  style={{
                    background: "var(--bg-subtle)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-light)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "16px",
                      borderBottom: "1px solid var(--border-light)",
                      background: "var(--bg-card)",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "rgba(168, 85, 247, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#a855f7",
                      }}
                    >
                      <Icons.File size={18} />
                    </div>
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Solicitudes Pendientes
                      </h4>
                      <div
                        style={{ fontSize: "12px", color: "var(--text-muted)" }}
                      >
                        {pendingMovements.length}{" "}
                        {pendingMovements.length === 1
                          ? "solicitud requiere"
                          : "solicitudes requieren"}{" "}
                        revisión
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "8px" }}>
                    {pendingMovements.slice(0, 5).map((mov) => {
                      const product = mov.producto; // fetched via join
                      const typeLabels = {
                        ENT: "Entrada",
                        SAL: "Salida",
                        TRF: "Transferencia",
                      };

                      const handleItemClick = () => {
                        closeModal();
                        // Admin/Supervisor goes to Requests to approve
                        router.push("/requests");
                      };

                      return (
                        <div
                          key={mov.id_movimiento}
                          onClick={handleItemClick}
                          style={{
                            padding: "12px",
                            background: "var(--bg-card)",
                            borderRadius: "8px",
                            marginBottom: "4px",
                            border: "1px solid var(--border-light)",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            cursor: "pointer",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "var(--bg-hover)")
                          }
                          onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "var(--bg-card)")
                          }
                        >
                          <Badge
                            variant={
                              mov.tipo === "ENT"
                                ? "completed"
                                : mov.tipo === "SAL"
                                  ? "cancelled"
                                  : "pending"
                            }
                          >
                            {typeLabels[mov.tipo] || mov.tipo}
                          </Badge>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 500,
                                fontSize: "14px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {product?.nombre || "Producto"}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--text-muted)",
                              }}
                            >
                              Cant: <strong>{mov.cantidad}</strong> • Solic: {mov.solicitante?.nombre_completo || 'N/A'}
                            </div>
                          </div>
                          <Icons.ChevronRight
                            size={16}
                            style={{ color: "var(--text-muted)" }}
                          />
                        </div>
                      );
                    })}
                    {pendingMovements.length > 5 && (
                      <button
                        style={{
                          width: "100%",
                          padding: "8px",
                          background: "none",
                          border: "none",
                          color: "var(--color-primary)",
                          fontSize: "13px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          closeModal();
                          router.push("/requests");
                        }}
                      >
                        Ver todas
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Low Stock */}
              {lowStock.length > 0 && (
                <div
                  style={{
                    background: "var(--bg-subtle)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-light)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "16px",
                      borderBottom: "1px solid var(--border-light)",
                      background: "var(--bg-card)",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: "rgba(239, 68, 68, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ef4444",
                      }}
                    >
                      <Icons.AlertTriangle size={18} />
                    </div>
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        Stock Bajo
                      </h4>
                      <div
                        style={{ fontSize: "12px", color: "var(--text-muted)" }}
                      >
                        {lowStock.length}{" "}
                        {lowStock.length === 1
                          ? "producto requiere"
                          : "productos requieren"}{" "}
                        reabastecimiento
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "8px" }}>
                    {lowStock.slice(0, 5).map((item) => {
                      const p = item.product;
                      // stock_total is already in p from getAllProducts hydration

                      const handleItemClick = () => {
                        closeModal();
                        router.push("/inventory");
                      };

                      return (
                        <div
                          key={p.codigo_producto}
                          onClick={handleItemClick}
                          style={{
                            padding: "10px 12px",
                            background: "var(--bg-card)",
                            borderRadius: "8px",
                            marginBottom: "4px",
                            border: "1px solid var(--border-light)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            transition: "background-color 0.2s",
                          }}
                          onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "var(--bg-hover)")
                          }
                          onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "var(--bg-card)")
                          }
                        >
                          <div style={{ flex: 1, marginRight: "10px" }}>
                            <div style={{ fontWeight: 500, fontSize: "14px" }}>
                              {p.nombre}
                            </div>
                          </div>
                          <div
                            style={{
                              background: "rgba(239, 68, 68, 0.1)",
                              color: "#ef4444",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            {p.stock_total} unid.
                          </div>
                          <Icons.ChevronRight
                            size={16}
                            style={{
                              color: "var(--text-muted)",
                              marginLeft: "8px",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Button variant="secondary" onClick={closeModal}>
              Cerrar
            </Button>
          </div>
        </div>
      ),
    });
  };

  return (
    <header className="header">
      <div className="header-left">
        <Button
          variant="ghost"
          className="menu-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle Menu"
        >
          <Icons.Menu size={20} />
        </Button>

        <div className="breadcrumb">
          <span className="breadcrumb-item">Inicio</span>
          <Icons.Next size={14} className="breadcrumb-separator" />
          <span className="breadcrumb-item current" id="current-page-title">
            Dashboard
          </span>
        </div>
      </div>

      <div className="header-right">
        <Button
          variant="ghost"
          className="notification-btn"
          aria-label="Notificaciones"
          onClick={showNotificationsModal}
          style={{ position: "relative", color: "var(--text-primary)" }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ minWidth: "22px" }}
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          {notificationCount > 0 && (
            <span className="notification-badge" style={{ display: "flex" }}>
              {notificationCount}
            </span>
          )}
        </Button>

        <div
          className="user-menu"
          id="user-menu"
          onClick={showProfileModal}
          style={{ cursor: "pointer" }}
        >
          <div className="user-avatar">
            {user?.nombre_completo
              ? user.nombre_completo.charAt(0).toUpperCase()
              : "U"}
          </div>
          <div className="user-info">
            <span className="user-name">
              {user?.nombre_completo || "Usuario"}
            </span>
            <span className="user-role">{user?.rol || "Invitado"}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
