"use client";

import React, { useState, useEffect } from "react";
import { MainLayout } from "../components/layout";
import { Card, Button, Icons, Badge } from "../components/ui";
import { useModal } from "../components/ui/Modal";
import { useToast } from "../components/ui/Toast";
import { DB } from "../lib/database";
import { MockData } from "../lib/mockData";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const { openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const loadUsers = async () => {
    try {
      const allUsers = await DB.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      showToast("Error", "No se pudieron cargar los usuarios", "error");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const getCurrentUser = () => {
    if (typeof window !== "undefined") {
      return JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    }
    return {};
  };

  const isAdmin = () => {
    const user = getCurrentUser();
    return user.rol === "ADMIN" || user.rol === "DEVELOPER";
  };

  // Not admin - show restricted access
  if (typeof window !== "undefined" && !isAdmin()) {
    return (
      <MainLayout>
        <div className="page-header">
          <div>
            <h1 className="page-title">Usuarios</h1>
            <p className="page-subtitle">Gestión de usuarios del sistema</p>
          </div>
        </div>
        <Card style={{ textAlign: "center", padding: "60px 40px" }}>
          <Icons.Lock
            size={64}
            style={{ color: "var(--text-muted)", marginBottom: "16px" }}
          />
          <h2 style={{ margin: "0 0 8px", color: "var(--text-primary)" }}>
            Acceso Restringido
          </h2>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Solo los administradores pueden gestionar usuarios.
          </p>
        </Card>
      </MainLayout>
    );
  }

  const roleMap = { A: "Admin", S: "Supervisor", O: "Operador", D: "Desarrollador" };
  const roleBadgeMap = { A: "completed", S: "in-transit", O: "pending", D: "cancelled" };

  const openUserModal = (userId = null) => {
    const user = userId ? users.find((u) => u.id_usuario == userId) : null;
    const isEdit = !!user;

    openModal(
      isEdit ? "Editar Usuario" : "Nuevo Usuario",
      <UserForm
        user={user}
        isEdit={isEdit}
        onSave={(data) => saveUser(userId, data)}
        onCancel={closeModal}
      />,
      "default",
    );
  };

  const saveUser = async (userId, data) => {
    if (!data.nombre_completo || !data.correo) {
      showToast(
        "Error",
        "Por favor completa todos los campos requeridos",
        "error",
      );
      return;
    }

    if (!userId && !data.contrasena) {
      showToast(
        "Error",
        "La contraseña es requerida para nuevos usuarios",
        "error",
      );
      return;
    }

    try {
      const isSupabase = process.env.NEXT_PUBLIC_DB_MODE === "supabase";

      if (userId) {
        // Update existing user
        if (isSupabase) {
          // Usar el adaptador DB que llama a Supabase
          await DB.updateUser(userId, {
            nombre_completo: data.nombre_completo,
            email: data.correo,
            password: data.contrasena || undefined, // Solo enviar si hay contraseña
            rol: data.rol,
          });
        } else {
          // Modo Mock
          const rawUser = MockData.USUARIO.find((u) => u.id_usuario == userId);
          if (rawUser) {
            rawUser.nombre_completo = data.nombre_completo;
            rawUser.correo = data.correo;
            rawUser.rol = data.rol;
            if (data.contrasena) {
              rawUser.contrasena = data.contrasena;
            }
          }
        }
        showToast(
          "Usuario Actualizado",
          `${data.nombre_completo} ha sido actualizado`,
          "success",
        );
      } else {
        // Create new user
        if (isSupabase) {
          // Crear usuario en Supabase
          await DB.createUser({
            nombre_completo: data.nombre_completo,
            email: data.correo,
            password: data.contrasena,
            rol: data.rol,
          });
        } else {
          // Modo Mock
          const newId =
            Math.max(...MockData.USUARIO.map((u) => u.id_usuario)) + 1;
          MockData.USUARIO.push({
            id_usuario: newId,
            nombre_completo: data.nombre_completo,
            correo: data.correo,
            contrasena: data.contrasena,
            rol: data.rol,
            estado: true,
          });
        }
        showToast(
          "Usuario Creado",
          `${data.nombre_completo} ha sido agregado al sistema`,
          "success",
        );
      }
      closeModal();
      loadUsers();
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      showToast(
        "Error",
        error.message || "No se pudo guardar el usuario",
        "error",
      );
    }
  };

  const deleteUser = (userId) => {
    const currentUser = getCurrentUser();
    if (userId == currentUser.id_usuario) {
      showToast("Error", "No puedes eliminar tu propio usuario", "error");
      return;
    }

    const user = users.find((u) => u.id_usuario == userId);
    if (!user) return;

    if (confirm(`¿Estás seguro de eliminar a "${user.nombre_completo}"?`)) {
      const index = MockData.USUARIO.findIndex((u) => u.id_usuario == userId);
      if (index > -1) {
        MockData.USUARIO.splice(index, 1);
        showToast(
          "Usuario Eliminado",
          "El usuario ha sido eliminado del sistema",
          "success",
        );
        loadUsers();
      }
    }
  };

  return (
    <MainLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Gestión de usuarios del sistema</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => openUserModal()}>
            <Icons.Plus size={18} />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Users Grid */}
      <div
        className="users-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "var(--spacing-4)",
        }}
      >
        {users.map((user) => (
          <Card
            key={user.id_usuario}
            className="user-card"
            style={{ padding: "var(--spacing-5)" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-4)",
                marginBottom: "var(--spacing-4)",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "20px",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {user.nombre_completo
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    margin: "0 0 4px",
                    fontSize: "16px",
                    fontWeight: 600,
                  }}
                >
                  {user.nombre_completo}
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    fontSize: "13px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user.correo}
                </p>
              </div>
            </div>

            <div
              style={{
                marginTop: "16px",
                paddingTop: "16px",
                borderTop: "1px solid var(--border-light)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>Rol:</span>
                <Badge variant={roleBadgeMap[user.rol] || "pending"}>
                  {roleMap[user.rol] || user.rol}
                </Badge>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Estado:</span>
                <Badge variant={user.estado ? "completed" : "cancelled"}>
                  {user.estado ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>

            <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
              <Button
                variant="secondary"
                size="sm"
                style={{ flex: 1 }}
                onClick={() => openUserModal(user.id_usuario)}
              >
                <Icons.Edit size={14} />
                Editar
              </Button>
              {user.id_usuario !== getCurrentUser().id_usuario && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => deleteUser(user.id_usuario)}
                >
                  <Icons.Delete size={14} />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </MainLayout>
  );
}

// User Form Component
function UserForm({ user, isEdit, onSave, onCancel }) {
  // Mapear rol de texto completo a letra
  const getRolCode = (rol) => {
    const rolMap = {
      ADMIN: "A",
      SUPERVISOR: "S",
      OPERADOR: "O",
      DEVELOPER: "D",
      A: "A",
      S: "S",
      O: "O",
      D: "D"
    };
    return rolMap[rol] || "O";
  };

  const [formData, setFormData] = useState({
    nombre_completo: user?.nombre_completo || "",
    correo: user?.correo || user?.email || "",
    contrasena: "",
    rol: user ? getRolCode(user.rol) : "O",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group" style={{ marginBottom: "16px" }}>
        <label>Nombre Completo *</label>
        <input
          type="text"
          value={formData.nombre_completo}
          onChange={(e) =>
            setFormData({ ...formData, nombre_completo: e.target.value })
          }
          placeholder="Ej: Juan Pérez"
          required
        />
      </div>

      <div className="form-group" style={{ marginBottom: "16px" }}>
        <label>Email *</label>
        <input
          type="email"
          value={formData.correo}
          onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
          placeholder="ejemplo@correo.com"
          required
        />
      </div>

      <div className="form-group" style={{ marginBottom: "16px" }}>
        <label>
          {isEdit
            ? "Nueva Contraseña (dejar vacío para mantener)"
            : "Contraseña *"}
        </label>
        <input
          type="password"
          value={formData.contrasena}
          onChange={(e) =>
            setFormData({ ...formData, contrasena: e.target.value })
          }
          placeholder="••••••••"
          minLength={4}
          required={!isEdit}
        />
      </div>

      <div className="form-group" style={{ marginBottom: "20px" }}>
        <label>Rol *</label>
        <select
          value={formData.rol}
          onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
          required
        >
          <option value="O">Operador</option>
          <option value="S">Supervisor</option>
          <option value="A">Administrador</option>
          {/* Only developers can assign developer role */}
          {(() => {
            const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
            return currentUser.rol === 'DEVELOPER' ? <option value="D">Desarrollador</option> : null;
          })()}
        </select>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "12px",
          paddingTop: "16px",
          borderTop: "1px solid var(--border-light)",
        }}
      >
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary">
          {isEdit ? "Guardar Cambios" : "Crear Usuario"}
        </Button>
      </div>
    </form>
  );
}
