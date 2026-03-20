import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { requirePermission } from "./lib/rbac";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

function normalizeName(value: string, fieldLabel: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new ConvexError({
      code: "INVALID_GOVERNORATE",
      message: `${fieldLabel} is required.`,
    });
  }

  return normalized;
}

function sanitizeShippingFee(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new ConvexError({
      code: "INVALID_SHIPPING_FEE",
      message: "Shipping fee must be a non-negative number.",
    });
  }

  return value;
}

async function ensureUniqueGovernorateName(
  ctx: Pick<QueryCtx, "db">,
  name_en: string,
  excludeId?: Id<"governorates">,
) {
  const existing = await ctx.db
    .query("governorates")
    .withIndex("by_name_en", (q) => q.eq("name_en", name_en))
    .unique();

  if (existing && existing._id !== excludeId) {
    throw new ConvexError({
      code: "GOVERNORATE_EXISTS",
      message: "A governorate with this English name already exists.",
    });
  }
}

export const listActiveGovernorates = query({
  args: {},
  handler: async (ctx) => {
    const governorates = await ctx.db
      .query("governorates")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return governorates.sort((a, b) => a.name_en.localeCompare(b.name_en));
  },
});

export const listGovernoratesForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");

    const governorates = await ctx.db.query("governorates").collect();
    return governorates.sort((a, b) => a.name_en.localeCompare(b.name_en));
  },
});

export const createGovernorate = mutation({
  args: {
    name_ar: v.string(),
    name_en: v.string(),
    shippingFee: v.number(),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");

    const payload = {
      name_ar: normalizeName(args.name_ar, "Arabic name"),
      name_en: normalizeName(args.name_en, "English name"),
      shippingFee: sanitizeShippingFee(args.shippingFee),
      isActive: args.isActive ?? true,
    };

    await ensureUniqueGovernorateName(ctx, payload.name_en);
    const governorateId = await ctx.db.insert("governorates", payload);

    await ctx.runMutation(internal.audit.logAudit, {
      userId: actor._id,
      entityId: String(governorateId),
      actionType: "CREATE_GOVERNORATE",
      changes: payload,
    });

    return governorateId;
  },
});

export const updateGovernorate = mutation({
  args: {
    id: v.id("governorates"),
    name_ar: v.string(),
    name_en: v.string(),
    shippingFee: v.number(),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");
    const previous = await ctx.db.get(args.id);

    if (!previous) {
      throw new ConvexError({ code: "GOVERNORATE_NOT_FOUND", message: "Governorate not found." });
    }

    const patch = {
      name_ar: normalizeName(args.name_ar, "Arabic name"),
      name_en: normalizeName(args.name_en, "English name"),
      shippingFee: sanitizeShippingFee(args.shippingFee),
    };

    await ensureUniqueGovernorateName(ctx, patch.name_en, args.id);
    await ctx.db.patch(args.id, patch);

    await ctx.runMutation(internal.audit.logAudit, {
      userId: actor._id,
      entityId: String(args.id),
      actionType: "UPDATE_GOVERNORATE",
      changes: { previous, updated: patch },
    });

    return { success: true };
  },
});

export const toggleGovernorateStatus = mutation({
  args: { id: v.id("governorates") },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "MANAGE_SYSTEM_CONFIG");
    const governorate = await ctx.db.get(args.id);

    if (!governorate) {
      throw new ConvexError({ code: "GOVERNORATE_NOT_FOUND", message: "Governorate not found." });
    }

    const nextIsActive = !governorate.isActive;
    await ctx.db.patch(args.id, { isActive: nextIsActive });

    await ctx.runMutation(internal.audit.logAudit, {
      userId: actor._id,
      entityId: String(args.id),
      actionType: "TOGGLE_GOVERNORATE_STATUS",
      changes: { previousActive: governorate.isActive, newActive: nextIsActive },
    });

    return { isActive: nextIsActive };
  },
});
