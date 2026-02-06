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
import { DB } from "../lib/database"; // Changed from ../lib/db to use proper adapter
import { Helpers } from "../lib/utils/helpers";
import { getAccessDeniedMessage } from "../lib/permissions";
import Link from "next/link";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Dashboard State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    lowStockItems: [],
    pendingTransfers: [],
    recentMovements: [],
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

    // Optional: Refresh interval (e.g., every 30s)
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [searchParams]);

  const loadDashboardData = async () => {
    try {
      // 1. Fetch Movements (Async support)
      const movements = await DB.getAllMovements();

      // 2. Fetch Products & Inventory (for stock calculations)
      // Note: Helpers usually use MockSync, but for Dashboard we want fresh data.
      // If DB allows async getters for products/inventory, we should use them.
      // For now, assuming Helpers might act on cached/sync data which is updated by DB calls.
      // In a full async refactor, Helpers should also be async or take data as args.

      // Calculate Recent Activity
      const recent = movements
        .filter((m) => m.estado === "C")
        .sort((a, b) => new Date(b.fechaHoraSolicitud) - new Date(a.fechaHoraSolicitud))
        .slice(0, 5);

      // Calculate Pending Transfers
      const pending = movements.filter(m => m.tipo === 'TRF' && m.estado === 'P');

      // Calculate Low Stock
      // We need to ensure DB.getAllProducts and DB.getTotalStock return fresh data
      // For Supabase, we might need direct calls if Helpers are purely static
      const products = await DB.getAllProducts();
      const inventory = await DB.getAllInventory();
      const settings = DB.getSettings(); // This might be sync (localStorage)

      // Calculate Low Stock manually with fresh data
      const lowStock = products.filter(p => {
        const prodInv = inventory.filter(i => i.codigo_producto == p.id || i.codigo_producto == p.codigo_producto);
        const totalStock = prodInv.reduce((sum, item) => sum + item.stock, 0);
        const factor = (settings.stockThreshold || 100) / 100;
        return totalStock <= (p.stock_minimo * factor);
      }).map(p => {
        const prodInv = inventory.filter(i => i.codigo_producto == p.id || i.codigo_producto == p.codigo_producto);
        const totalStock = prodInv.reduce((sum, item) => sum + item.stock, 0);
        return {
          product: p,
          totalStock,
          deficit: p.stock_minimo - totalStock
        };
      }).sort((a, b) => b.deficit - a.deficit);

      // Calculate Warehouse Totals
      const principalSum = inventory
        .filter(i => i.id_bodega === 1)
        .reduce((sum, i) => sum + i.stock, 0);

      const instrumSum = inventory
        .filter(i => i.id_bodega === 2)
        .reduce((sum, i) => sum + i.stock, 0);

      setStats({
        lowStockItems: lowStock,
        pendingTransfers: pending,
        recentMovements: recent,
        principalTotal: principalSum,
        instrumentacionTotal: instrumSum
      });

    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
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
                // Determine breakdown per warehouse (Optional optimization: calculate in map above)
                // For now, re-fetching from DB is async, so we assume 'item.product' has info or we re-calc locally using the fetched 'inventory' from stats??
                // Simpler: recalculate locally to avoid N+1 async calls
                // But we don't have full inventory in state 'stats'.
                // Let's rely on Helpers.getInventory which MIGHT work if MockDB is updated, but for Supabase it won't.
                // Better approach: We calculated totals in 'lowStock' state mapping.

                // Let's modify the map above to include principal/instrum breakdown
                // Re-implementing display logic based on available item data

                return (
                  <div key={item.product.id || item.product.codigo_producto} className="stock-alert-item">
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
                          {/* Note: Breaking down exact warehouse stock here is tricky without passing full inventory. 
                               For now showing Total vs Min is the most critical. */}
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
            ) : stats.recentMovements.length === 0 ? (
              <div className="empty-state">
                <p className="text-muted">No hay actividad reciente</p>
              </div>
            ) : (
              stats.recentMovements.map((mov) => {
                // mov.producto might be null if just defined by code, try to find name
                const prodName = mov.producto?.nombre || mov.producto_nombre || 'Producto';

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
                        {prodName}
                      </div>
                      <div className="activity-meta">
                        {mov.cantidad}{" "}
                        ·{" "}
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
