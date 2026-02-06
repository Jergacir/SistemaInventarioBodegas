"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

function DashboardContent() {
  const router = useRouter(); // Added for click navigation
  const searchParams = useSearchParams();
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Dashboard State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    lowStockItems: [],
    pendingTransfers: [],
    recentActivity: [], // Renamed from recentMovements to include requirements
    principalTotal: 0,
    instrumentacionTotal: 0
  });

  useEffect(() => {
    if (searchParams.get("access_denied") === "true") {
      setShowAccessDenied(true);
      setTimeout(() => setShowAccessDenied(false), 5000);
    }

    const userStr = sessionStorage.getItem("currentUser");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }

    // Initial fetch
    loadDashboardData();

    // Optional: Refresh interval
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [searchParams]);

  const loadDashboardData = async () => {
    try {
      // 1. Fetch Movements & Requirements (Async support)
      const movements = await DB.getAllMovements();
      const requirements = await DB.getRequirements(); // Fetch requirements

      // 2. Combine and Sort for "Recent Activity"
      // Movements
      const movActivity = movements
        .filter((m) => m.estado === "C")
        .map(m => ({
          ...m,
          type: 'movement',
          dateObj: new Date(m.fechaHoraSolicitud)
        }));

      // Requirements
      const reqActivity = requirements
        .map(r => ({
          ...r,
          type: 'requirement',
          dateObj: new Date(r.fechaHoraRequ) // Use request date
        }));

      const combinedActivity = [...movActivity, ...reqActivity]
        .sort((a, b) => b.dateObj - a.dateObj)
        .slice(0, 7); // Show bit more context

      // 3. Pending Transfers
      const pending = movements.filter(m => m.tipo === 'TRF' && m.estado === 'P');

      // 4. Low Stock (Using stock_total for consistency with SupabaseDB/Notifs)
      const products = await DB.getAllProducts();
      const inventory = await DB.getAllInventory();
      const settings = DB.getSettings();

      const lowStock = products.filter(p => {
        const factor = (settings.stockThreshold || 100) / 100;
        // Use stock_total now available in hydrated product (from both MockDB and Supabase)
        // Fallback to calculation if undefined (safety)
        const currentStock = p.stock_total !== undefined ? p.stock_total : Helpers.getTotalStock(p.id);
        return currentStock <= (p.stock_minimo * factor);
      }).map(p => {
        const currentStock = p.stock_total !== undefined ? p.stock_total : Helpers.getTotalStock(p.id);
        return {
          product: p,
          totalStock: currentStock,
          deficit: p.stock_minimo - currentStock
        };
      }).sort((a, b) => b.deficit - a.deficit);

      // 5. Warehouse Totals
      const principalSum = inventory
        .filter(i => i.id_bodega === 1)
        .reduce((sum, i) => sum + i.stock, 0);

      const instrumSum = inventory
        .filter(i => i.id_bodega === 2)
        .reduce((sum, i) => sum + i.stock, 0);

      setStats({
        lowStockItems: lowStock,
        pendingTransfers: pending,
        recentActivity: combinedActivity,
        principalTotal: principalSum,
        instrumentacionTotal: instrumSum
      });

    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLowStockClick = (item) => {
    // Navigate to inventory filtering by this product
    // Note: Inventory page might not support filter params yet, but we can send them.
    // Ideally: router.push(`/inventory?search=${item.product.nombre}`);
    router.push(`/inventory`);
  };

  const handleActivityClick = (item) => {
    if (item.type === 'requirement') {
      router.push('/requirements'); // Or specific detail page if available
    } else {
      // Movement
      if (item.tipo === 'TRF' || item.tipo === 'TRANSFERENCIA') {
        router.push('/requests'); // Or History
      } else if (item.tipo === 'ENT' || item.tipo === 'ENTRADA') {
        router.push('/history'); // Or Entries
      } else {
        router.push('/history'); // Or Exits
      }
    }
  };

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
        {loading && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Actualizando...</span>}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatsCard
          title="Alertas de Stock"
          value={loading ? "-" : stats.lowStockItems.length}
          icon={<Icons.Warning size={24} />}
          iconColor="warning"
        />
        <StatsCard
          title="Transferencias Pendientes"
          value={loading ? "-" : stats.pendingTransfers.length}
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
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>Cargando alertas...</div>
            ) : stats.lowStockItems.length === 0 ? (
              <div className="empty-state">
                <p className="text-muted">No hay alertas de stock</p>
              </div>
            ) : (
              stats.lowStockItems.map((item) => {
                return (
                  <div
                    key={item.product.id || item.product.codigo_producto}
                    className="stock-alert-item"
                    onClick={() => handleLowStockClick(item)}
                    style={{ cursor: 'pointer' }}
                    title="Ir al inventario"
                  >
                    <div className="stock-alert-info">
                      <span
                        className={`stock-alert-indicator ${item.totalStock === 0 ? "critical" : "warning"}`}
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
                            Minimo Requerido: <strong>{item.product.stock_minimo}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="stock-alert-values">
                      <div
                        className={`stock-alert-current ${item.totalStock === 0 ? "critical" : "warning"}`}
                      >
                        Total: {item.totalStock}
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
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>Cargando actividad...</div>
            ) : stats.recentActivity.length === 0 ? (
              <div className="empty-state">
                <p className="text-muted">No hay actividad reciente</p>
              </div>
            ) : (
              stats.recentActivity.map((item) => {
                // Handle mixed types (Movement vs Requirement)
                const isReq = item.type === 'requirement';

                // IDs
                const key = isReq ? `req-${item.id_requerimiento}` : `mov-${item.id_movimiento}`;

                // Description/Title
                const prodName = isReq
                  ? (item.producto_nombre || item.nombre_producto || 'Producto')
                  : (item.producto?.nombre || item.producto_nombre || 'Producto');

                const title = isReq
                  ? `Requerimiento #${item.id_requerimiento}`
                  : `${item.codigo_movimiento}`;

                // Icon & Style
                let icon = <Icons.Check size={16} />;
                let iconClass = 'entry'; // default green

                if (isReq) {
                  icon = <Icons.Requests size={16} />;
                  iconClass = 'transfer'; // Blue/Purple for requirements
                } else {
                  if (item.tipo === 'SAL') { icon = <Icons.Truck size={16} />; iconClass = 'exit'; }
                  if (item.tipo === 'TRF') { icon = <Icons.Transfers size={16} />; iconClass = 'transfer'; }
                }

                // Subtitle / Meta
                const metaText = isReq
                  ? `Solicitado por ${item.solicitante_nombre || 'Usuario'}`
                  : `${item.cantidad} · ${Helpers.formatRelativeTime(item.fechaHoraSolicitud)}`;

                return (
                  <div
                    key={key}
                    className="activity-item"
                    onClick={() => handleActivityClick(item)}
                    style={{ cursor: 'pointer' }}
                    title={isReq ? "Ver Requerimientos" : "Ver Movimiento"}
                  >
                    <div className={`activity-icon ${iconClass}`}>
                      {icon}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">
                        {title} - {prodName}
                      </div>
                      <div className="activity-meta">
                        {metaText}
                        {isReq && <span style={{ marginLeft: '6px', fontSize: '0.9em' }}>· {Helpers.formatRelativeTime(item.fechaHoraRequ)}</span>}
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
              loading ? "..." : (
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {stats.principalTotal} Items · Ver Inventario →
                </span>
              )
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
              loading ? "..." : (
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {stats.instrumentacionTotal} Items · Ver Inventario →
                </span>
              )
            }
            icon={<Icons.Inventory size={24} />}
            iconColor="success"
          />
        </Link>
      </div>
    </MainLayout>
  );
}

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
