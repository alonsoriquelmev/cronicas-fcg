import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  healthChecks: defineTable({ label: v.string(), createdAt: v.number() }).index("by_createdAt", ["createdAt"]),
});
