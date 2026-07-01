// Role-based access control helpers shared across the data layer.
//
// Two layers of roles exist:
// - GlobalRole: coarse workspace-wide permissions (OWNER/ADMIN can manage
//   members, the property schema, and every record; MEMBER can create and
//   manage their own records; VIEWER is read-only workspace-wide).
// - ChatRole: fine-grained, per-record access via Chat.ownerId + ChatMember,
//   letting a MEMBER share an individual record as EDITOR/VIEWER.

export type GlobalRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
export type ChatRole = "OWNER" | "EDITOR" | "VIEWER";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: GlobalRole;
};

export type ChatAccessContext = {
  ownerId: string | null;
  memberRole?: ChatRole | null;
};

const GLOBAL_RANK: Record<GlobalRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

export function hasGlobalRoleAtLeast(
  user: AuthUser | null | undefined,
  min: GlobalRole,
): boolean {
  if (!user) return false;
  return GLOBAL_RANK[user.role] >= GLOBAL_RANK[min];
}

export function isWorkspaceAdmin(user: AuthUser | null | undefined): boolean {
  return hasGlobalRoleAtLeast(user, "ADMIN");
}

/** Can the user manage workspace-wide schema (PropertyDefs) and membership? */
export function canManageWorkspace(user: AuthUser | null | undefined): boolean {
  return isWorkspaceAdmin(user);
}

/** Can the user see every record regardless of ownership? */
export function canViewAllRecords(user: AuthUser | null | undefined): boolean {
  return isWorkspaceAdmin(user);
}

/**
 * Effective role a user holds on a specific chat/record, combining global
 * admin override, direct ownership, and explicit ChatMember grants.
 */
export function effectiveChatRole(
  user: AuthUser | null | undefined,
  ctx: ChatAccessContext,
): ChatRole | null {
  if (!user) return null;
  if (isWorkspaceAdmin(user)) return "OWNER";
  if (ctx.ownerId && ctx.ownerId === user.id) return "OWNER";
  if (ctx.memberRole) return ctx.memberRole;
  return null;
}

export function canViewChat(
  user: AuthUser | null | undefined,
  ctx: ChatAccessContext,
): boolean {
  return effectiveChatRole(user, ctx) !== null;
}

export function canEditChat(
  user: AuthUser | null | undefined,
  ctx: ChatAccessContext,
): boolean {
  const role = effectiveChatRole(user, ctx);
  return role === "OWNER" || role === "EDITOR";
}

export function canDeleteChat(
  user: AuthUser | null | undefined,
  ctx: ChatAccessContext,
): boolean {
  return effectiveChatRole(user, ctx) === "OWNER";
}

export function canShareChat(
  user: AuthUser | null | undefined,
  ctx: ChatAccessContext,
): boolean {
  return effectiveChatRole(user, ctx) === "OWNER";
}

export class ForbiddenError extends Error {
  constructor(message = "You don't have permission to do that.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
