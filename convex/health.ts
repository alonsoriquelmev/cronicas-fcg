import { query } from "./_generated/server";
import { v } from "convex/values";

export const status = query({
  args: {},
  returns: v.object({ ok: v.boolean(), service: v.string(), mission: v.string() }),
  handler: async () => ({ ok: true, service: "cronicas-fcg", mission: "MISSION_001" }),
});
