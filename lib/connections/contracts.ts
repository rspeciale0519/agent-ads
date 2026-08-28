import { z } from "zod";
import { findSecretPattern } from "../security/secret-material";

export { findSecretPattern } from "../security/secret-material";

export const connectionProviders = [
  "google_ads",
  "google_analytics",
  "google_tag_manager",
  "meta",
  "tiktok",
  "dubsado",
  "wordpress",
  "videoask",
  "organic_social",
  "asset_source",
] as const;

export type ConnectionProvider = (typeof connectionProviders)[number];
export const connectionProviderSchema = z.enum(connectionProviders);

export const systemTypes = ["paid_media", "analytics", "crm_revenue", "organic_social", "website_lead_capture", "asset_source"] as const;
export type SystemType = (typeof systemTypes)[number];
export const systemTypeSchema = z.enum(systemTypes);

export const ownershipStatuses = ["owner", "administrator", "viewer", "invited", "not_sure", "not_applicable"] as const;
export const preferredMethods = ["oauth", "provider_invitation", "service_principal", "approved_export", "manual_inventory"] as const;
export const connectionPurposes = ["reporting", "analytics", "tagging", "crm_context", "inventory"] as const;
export const requestStates = ["draft", "ready", "awaiting_authorization", "authorizing", "discovering", "selection_required", "verifying", "completed", "attention_required", "archived"] as const;
export type RequestState = (typeof requestStates)[number];
export const connectionStates = ["pending", "authorizing", "discovering", "verifying", "active_read_only", "degraded", "expired", "revoked", "archived"] as const;
export type ConnectionState = (typeof connectionStates)[number];

export const knownIdentifierSchema = z.object({
  kind: z.string().trim().min(1).max(80),
  value: z.string().trim().max(200).optional(),
  notSure: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if (!value.notSure && !value.value) ctx.addIssue({ code: "custom", path: ["value"], message: "Provide an identifier or choose not sure." });
});

const connectionRequestInputBaseSchema = z.object({
  system: systemTypeSchema,
  provider: connectionProviderSchema,
  product: z.string().trim().max(100).optional(),
  purpose: z.enum(connectionPurposes).default("inventory"),
  knownIdentifiers: z.array(knownIdentifierSchema).max(20).default([]),
  ownershipStatus: z.enum(ownershipStatuses),
  preferredMethod: z.enum(preferredMethods),
  notes: z.string().trim().max(500).optional(),
});

export const connectionRequestInputSchema = connectionRequestInputBaseSchema.superRefine((value, ctx) => {
  const text = [value.product, value.notes, ...value.knownIdentifiers.map((entry) => entry.value)].filter(Boolean).join("\n");
  const finding = findSecretPattern(text);
  if (finding) ctx.addIssue({ code: "custom", path: ["notes"], message: `Do not submit ${finding} or other platform credentials.` });
});

export type ConnectionRequestInput = z.infer<typeof connectionRequestInputSchema>;

export const requestPatchSchema = connectionRequestInputBaseSchema.partial().extend({
  state: z.enum(requestStates).optional(),
}).superRefine((value, ctx) => {
  const text = [value.product, value.notes, ...(value.knownIdentifiers ?? []).map((entry) => entry.value)].filter(Boolean).join("\n");
  const finding = findSecretPattern(text);
  if (finding) ctx.addIssue({ code: "custom", path: ["notes"], message: `Do not submit ${finding} or other platform credentials.` });
});

export const resourceSelectionSchema = z.object({
  resourceIds: z.array(z.string().uuid()).max(100),
});

export const providerAuthorizeSchema = z.object({
  requestId: z.string().uuid().optional(),
  connectionId: z.string().uuid().optional(),
  returnPath: z.string().max(120).default("/connections"),
  grantId: z.string().uuid().optional(),
});

export const stepUpActionSchema = z.object({
  actionClass: z.enum(["connection_authorize", "connection_secret", "connection_reconnect", "connection_revoke", "connection_role_confirm", "membership_manage", "organization_export", "organization_offboard"]),
});

export const readOnlyRoleConfirmationSchema = z.object({
  grantId: z.string().uuid().optional(),
  evidenceSource: z.enum(["provider_console", "operator_observation"]),
  sourceDate: z.coerce.date(),
}).strict().superRefine((value, ctx) => {
  if (value.sourceDate.getTime() > Date.now()) ctx.addIssue({ code: "custom", path: ["sourceDate"], message: "Evidence date cannot be in the future." });
  if (value.sourceDate.getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000) ctx.addIssue({ code: "custom", path: ["sourceDate"], message: "Role evidence must be recent." });
}).transform(({ evidenceSource, sourceDate }) => ({ evidenceSource, sourceDate }));

export function providerMetadata(provider: ConnectionProvider) {
  const metadata: Record<ConnectionProvider, { label: string; description: string; methods: readonly string[]; automated: boolean }> = {
    google_ads: { label: "Google Ads", description: "Advertiser and manager account reporting access.", methods: ["oauth", "provider_invitation", "service_principal"], automated: true },
    google_analytics: { label: "Google Analytics 4", description: "Read-only property and stream context.", methods: ["oauth", "provider_invitation"], automated: true },
    google_tag_manager: { label: "Google Tag Manager", description: "Read-only container and workspace context.", methods: ["oauth", "provider_invitation"], automated: true },
    meta: { label: "Meta Business", description: "Business, ad account, Page, Instagram, and pixel inventory.", methods: ["oauth", "provider_invitation"], automated: true },
    tiktok: { label: "TikTok for Business", description: "Advertiser and Business Center reporting access.", methods: ["oauth", "provider_invitation"], automated: true },
    dubsado: { label: "Dubsado", description: "Approved export or client-owned integration metadata.", methods: ["approved_export", "client_owned_integration"], automated: false },
    wordpress: { label: "WordPress", description: "Site and administrator invitation tracking.", methods: ["provider_invitation", "manual_inventory"], automated: false },
    videoask: { label: "VideoAsk", description: "Workspace and form inventory.", methods: ["provider_invitation", "manual_inventory"], automated: false },
    organic_social: { label: "Organic social", description: "Channel inventory and ownership tracking.", methods: ["manual_inventory"], automated: false },
    asset_source: { label: "Asset source", description: "Creative, document, or media source inventory.", methods: ["manual_inventory"], automated: false },
  };
  return metadata[provider];
}

export function normalizeProviderIdentifier(provider: ConnectionProvider, value: string) {
  const normalized = value.trim();
  if (!normalized) return "";
  if (provider.startsWith("google_")) return normalized.replace(/\s+/g, "").toLowerCase();
  return normalized.replace(/\s+/g, " ");
}

export function connectionWorkspaceEnabled() {
  return process.env.ACCOUNT_CONNECTIONS_ENABLED === "true";
}

export function providerAuthorizationEnabled(provider: ConnectionProvider, organizationId: string) {
  if (!connectionWorkspaceEnabled() || process.env.ACCOUNT_CONNECTIONS_GLOBAL_KILL_SWITCH === "true") return false;
  const key = `ACCOUNT_CONNECTIONS_${provider.split("_")[0].toUpperCase()}_ENABLED`;
  if (process.env[key] !== "true") return false;
  const allowedOrganizations = (process.env.ACCOUNT_CONNECTIONS_ALLOWED_ORGANIZATION_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => z.string().uuid().safeParse(value).success);
  return allowedOrganizations.includes(organizationId);
}

export function providerRequiresRoleConfirmation(provider: ConnectionProvider) {
  return provider === "google_ads" || provider === "meta" || provider === "tiktok";
}
