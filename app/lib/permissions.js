// Definición de permisos por rol
export const ROLES = {
  ADMIN: "ADMIN",
  SUPERVISOR: "SUPERVISOR",
  OPERADOR: "OPERADOR",
};

// Permisos por página
export const PAGE_PERMISSIONS = {
  "/dashboard": [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR], // Todos
  "/users": [ROLES.ADMIN], // Solo Admin
  "/products": [ROLES.ADMIN, ROLES.SUPERVISOR], // Admin y Supervisor
  "/inventory": [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR], // Todos
  "/entries": [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR], // Todos
  "/exits": [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR], // Todos
  "/transfers": [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR], // Todos
  "/requests": [ROLES.ADMIN, ROLES.SUPERVISOR], // Admin y Supervisor
  "/history": [ROLES.ADMIN, ROLES.SUPERVISOR], // Admin y Supervisor
  "/settings": [ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.OPERADOR], // Todos
};

// Verificar si un usuario tiene permiso para acceder a una ruta
export function hasPermission(userRole, path) {
  // Extraer la ruta base (sin query params)
  const basePath = path.split("?")[0];

  // Buscar la ruta más específica que coincida
  const matchingPath = Object.keys(PAGE_PERMISSIONS).find(
    (route) => basePath === route || basePath.startsWith(route + "/"),
  );

  if (!matchingPath) {
    // Si no hay definición específica, permitir acceso
    return true;
  }

  const allowedRoles = PAGE_PERMISSIONS[matchingPath];
  return allowedRoles.includes(userRole);
}

// Obtener el mensaje de error apropiado
export function getAccessDeniedMessage(userRole) {
  const messages = {
    [ROLES.OPERADOR]:
      "Esta sección requiere permisos de Supervisor o Administrador.",
    [ROLES.SUPERVISOR]: "Esta sección requiere permisos de Administrador.",
    [ROLES.ADMIN]:
      "No tienes permisos suficientes para acceder a esta sección.",
  };

  return messages[userRole] || "Acceso denegado.";
}

// Obtener rutas permitidas para un rol
export function getAllowedRoutes(userRole) {
  return Object.entries(PAGE_PERMISSIONS)
    .filter(([_, roles]) => roles.includes(userRole))
    .map(([path]) => path);
}
