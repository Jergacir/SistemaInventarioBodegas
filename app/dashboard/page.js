"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  StatsCard,
  Icons,
} from "../components/ui";
import { MainLayout } from "../components/layout";
import { DB } from "../lib/database";
import { Helpers } from "../lib/utils/helpers";
import { getAccessDeniedMessage } from "../lib/permissions";
import Link from "next/link";

// Componente interno que usa useSearchParams
function DashboardContent() {
  const searchParams = useSearchParams();
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [data, setData] = useState({
    lowStockItems: [],
    pendingTransfers: [],
    recentMovements: [],
    principalTotal: 0,
    instrumentacionTotal: 0,
    isLoading: true
  });

  useEffect(() => {
    if (searchParams.get("access_denied") === "true") {
      setShowAccessDenied(true);
      setTimeout(() => setShowAccessDenied(false), 5000);
    }

    // Cargar usuario actual
    const userStr = sessionStorage.getItem("currentUser");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }

    const loadDashboardData = async () => {
      try {
        const user = userStr ? JSON.parse(userStr) : null;

        // Fetch notifications (low stock and pending)
        const notifications = await DB.getNotifications(user?.rol);

        // Fetch recent completed movements
        const allMovements = await DB.getAllMovements();
        const recent = allMovements
          .filter((m) => m.estado === "C")
          .sort((a, b) => new Date(b.fechaHoraSolicitud) - new Date(a.fechaHoraSolicitud))
          .slice(0, 5);

        // Fetch inventory totals
        const inventory = await DB.getInventory(); // Note: supabaseDB.js uses getInventory which returns joined data
        const principal = inventory
          .filter((i) => i.id_bodega === 1)
          .reduce((sum, i) => sum + i.stock, 0);
        const instrumentacion = inventory
          .filter((i) => i.id_bodega === 2)
          .reduce((sum, i) => sum + i.stock, 0);

        setData({
          lowStockItems: notifications.lowStock,
          pendingTransfers: notifications.pendingMovements,
          recentMovements: recent,
          principalTotal: principal,
          instrumentacionTotal: instrumentacion,
          isLoading: false
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setData(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadDashboardData();
  }, [searchParams]);

  const { lowStockItems, pendingTransfers, recentMovements, isLoading } = data;

  if (isLoading) {
    return (
      <MainLayout>
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          Cargando datos del panel...
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {showAccessDenied && currentUser && (
        <div
          style={{
            background: "#ef4444",
            color: "white",
            padding: "16px",
            borderRadius: "8px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <Icons.Warning size={24} />
          <div>
            <strong>Acceso Denegado</strong>
            <p style={{ margin: "4px 0 0 0", opacity: 0.9 }}>
              {getAccessDeniedMessage(currentUser.rol)}
            </p>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Resumen general del sistema de inventarios
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatsCard
          title="Alertas de Stock"
          value={lowStockItems.length}
          icon={<Icons.Warning size={24} />}
          iconColor="warning"
        />
        <StatsCard
          title="Transferencias Pendientes"
          value={pendingTransfers.length}
          icon={<Icons.Transfers size={24} />}
          iconColor="danger"
        />
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Stock Alerts Card */}
        <Card>
          <CardHeader>
            <CardTitle
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Icons.Warning
                size={20}
                style={{ color: "var(--color-danger)" }}
              />
              Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <div className="stock-alerts-list">
            {lowStockItems.length === 0 ? (
              <div className="empty-state">
                <p className="text-muted">No hay alertas de stock</p>
              </div>
            ) : (
              lowStockItems.map((item) => {
                const currentStock = Helpers.getTotalStock(item.product.id);
                const stockPrincipal =
                  Helpers.getInventory(item.product.id, 1)?.stock || 0;
                const stockInstrum =
                  Helpers.getInventory(item.product.id, 2)?.stock || 0;

                return (
                  <div key={item.product.id} className="stock-alert-item">
                    <div className="stock-alert-info">
                      <span
                        className={`stock-alert-indicator ${currentStock === 0 ? "critical" : "warning"}`}
                      ></span>
                      <div style={{ width: "100%" }}>
                        <div className="stock-alert-product">
                          {item.product.nombre}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            marginTop: "4px",
                            fontSize: "0.75rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          <div>
                            Principal:{" "}
                            <strong style={{ color: "var(--text-primary)" }}>
                              {stockPrincipal}
                            </strong>
                          </div>
                          <div>
                            Instrum.:{" "}
                            <strong style={{ color: "var(--text-primary)" }}>
                              {stockInstrum}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="stock-alert-values">
                      <div
                        className={`stock-alert-current ${currentStock === 0 ? "critical" : "warning"}`}
                      >
                        Total: {currentStock}
                      </div>
                      <div className="stock-alert-minimum">
                        Mín: {item.product.stock_minimo}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Recent Activity Card */}
        <Card>
          <CardHeader>
            <CardTitle
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <Icons.Movements
                size={20}
                style={{ color: "var(--color-primary)" }}
              />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <div className="activity-list">
            {recentMovements.length === 0 ? (
              <div className="empty-state">
                <p className="text-muted">No hay actividad reciente</p>
              </div>
            ) : (
              recentMovements.map((mov) => {
                const product = Helpers.getProduct(mov.codigo_producto);
                const iconClass =
                  mov.tipo === "ENT"
                    ? "entry"
                    : mov.tipo === "SAL"
                      ? "exit"
                      : "transfer";

                return (
                  <div key={mov.id_movimiento} className="activity-item">
                    <div className={`activity-icon ${iconClass}`}>
                      {mov.tipo === "ENT" && <Icons.Check size={16} />}
                      {mov.tipo === "SAL" && <Icons.Truck size={16} />}
                      {mov.tipo === "TRF" && <Icons.Transfers size={16} />}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">
                        {mov.codigo_movimiento} -{" "}
                        {product?.nombre || "Producto"}
                      </div>
                      <div className="activity-meta">
                        {mov.cantidad}{" "}
                        {product?.unidad_medida?.toLowerCase() || ""} ·{" "}
                        {Helpers.formatRelativeTime(mov.fechaHoraSolicitud)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Warehouse Summary */}
      <div
        className="stats-grid mt-6"
        style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
      >
        <Link
          href="/inventory?warehouse=principal"
          style={{ textDecoration: "none" }}
        >
          <StatsCard
            title={
              <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                Bodega Principal
              </span>
            }
            value={
              <span
                style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}
              >
                Ver Inventario →
              </span>
            }
            icon={<Icons.Home size={24} />}
            iconColor="primary"
          />
        </Link>
        <Link
          href="/inventory?warehouse=instrumentacion"
          style={{ textDecoration: "none" }}
        >
          <StatsCard
            title={
              <span style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                Bodega Instrumentación
              </span>
            }
            value={
              <span
                style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}
              >
                Ver Inventario →
              </span>
            }
            icon={<Icons.Inventory size={24} />}
            iconColor="success"
          />
        </Link>
      </div>
    </MainLayout>
  );
}

// Componente principal con Suspense
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div style={{ padding: "20px", textAlign: "center" }}>
            Cargando...
          </div>
        </MainLayout>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
