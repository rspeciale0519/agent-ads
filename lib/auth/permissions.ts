export const CONNECTION_PERMISSIONS = [
  "connections.view",
  "connections.inventory.manage",
  "connections.authorize",
  "connections.resources.select",
  "connections.verify",
  "connections.revoke",
  "connections.secrets.rotate",
] as const;

export type ConnectionPermission = (typeof CONNECTION_PERMISSIONS)[number];
export const ORGANIZATION_PERMISSIONS = ["membership.manage"] as const;
export type OrganizationPermission = (typeof ORGANIZATION_PERMISSIONS)[number];
export type Permission = ConnectionPermission | OrganizationPermission;
export type OrganizationRole = "owner" | "administrator" | "operator" | "member";

export function permissionsForRole(role: OrganizationRole): Permission[] {
  if (role === "owner" || role === "administrator") return [...CONNECTION_PERMISSIONS, ...ORGANIZATION_PERMISSIONS];
  if (role === "operator") return CONNECTION_PERMISSIONS.filter((permission) => permission !== "connections.secrets.rotate");
  return ["connections.view"];
}

export function hasPermission(permissions: readonly string[], permission: Permission) {
  return permissions.includes(permission);
}

export function permissionForStepUpAction(actionClass: string): Permission {
  if (actionClass === "membership_manage" || actionClass === "organization_export" || actionClass === "organization_offboard") return "membership.manage";
  if (actionClass === "connection_secret") return "connections.secrets.rotate";
  if (actionClass === "connection_authorize" || actionClass === "connection_reconnect") return "connections.authorize";
  if (actionClass === "connection_role_confirm") return "connections.verify";
  return "connections.revoke";
}

export function normalizeRole(role: string): OrganizationRole {
  if (role === "owner" || role === "administrator" || role === "operator") return role;
  return "member";
}
