import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  healthChecks: defineTable({ label: v.string(), createdAt: v.number() }).index("by_createdAt", ["createdAt"]),
  rooms: defineTable({
    code: v.string(),
    status: v.union(v.literal("WAITING_FOR_PLAYER"), v.literal("PREPARATION"), v.literal("IN_GAME"), v.literal("FINISHED"), v.literal("ABANDONED")),
    preparation: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_code", ["code"]),
  players: defineTable({
    roomId: v.id("rooms"),
    displayName: v.string(),
    seat: v.union(v.literal("PLAYER_1"), v.literal("PLAYER_2")),
    playerId: v.string(),
    sessionToken: v.string(),
    createdAt: v.number(),
  }).index("by_room", ["roomId"]).index("by_room_session", ["roomId", "sessionToken"]),
  games: defineTable({ roomId: v.id("rooms"), state: v.any(), revision: v.number() }).index("by_room", ["roomId"]),
  gameActions: defineTable({ gameId: v.id("games"), sequence: v.number(), actorPlayerId: v.string(), action: v.any(), createdAt: v.number(), clientActionId: v.string() }).index("by_game_sequence", ["gameId", "sequence"]),
});
