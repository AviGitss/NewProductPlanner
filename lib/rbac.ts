// lib/rbac.ts
//
// Application-layer permission checks. RLS (see
// supabase/migrations/0007_company_rbac.sql) guarantees tenant isolation —
// you can never read or write another company's data no matter what the
// app code does. This file is the *second*, finer-grained layer on top of
// that: which of a company's own roles may perform which action. A bug
// here is a permissions bug, not a data-leak-across-companies bug — the
// two layers are intentionally independent.

import { Role, UserContext } from "./types";

export const ROLES: Role[] = ["admin", "sales", "rfp_prep", "production", "viewer"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  sales: "Sales",
  rfp_prep: "RFP Prep",
  production: "Production",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Manages the company: invites/removes teammates, assigns roles, full access to every RFP.",
  sales: "Creates and monitors RFPs across the whole team; does not need to touch process/machine detail.",
  rfp_prep: "Builds out components, process definition, and machine selection for an RFP.",
  production: "Fills in the production-capacity stage of an RFP when it's their turn in the workflow.",
  viewer: "Read-only access to RFPs.",
};

export function canManageCompany(ctx: UserContext): boolean {
  return ctx.role === "admin";
}

/** Who may start a brand-new RFP/project. */
export function canCreateProject(ctx: UserContext): boolean {
  return ctx.role === "admin" || ctx.role === "sales" || ctx.role === "rfp_prep";
}

/** Who may edit component/process/machine-selection detail on an RFP. */
export function canEditRfpDetail(ctx: UserContext): boolean {
  return ctx.role === "admin" || ctx.role === "rfp_prep";
}

/** Who may fill in / edit the production-capacity workflow stage. */
export function canEditProductionCapacity(ctx: UserContext): boolean {
  return ctx.role === "admin" || ctx.role === "production";
}

/** Who sees the cross-RFP sales monitoring dashboard. */
export function canViewSalesDashboard(ctx: UserContext): boolean {
  return ctx.role === "admin" || ctx.role === "sales";
}

export function requireRole(ctx: UserContext, allowed: Role[], action: string): void {
  if (!ctx.role || !allowed.includes(ctx.role)) {
    throw new Error(`Your role (${ctx.role ?? "none"}) is not permitted to ${action}.`);
  }
}
