import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { applyGameAction } from "../src/domain/game/game.reducer";
import type { GameAction } from "../src/domain/game/game.actions";
import type { CardView, FaceDownPublicCardView, GameState, PlayerViewCard } from "../src/domain/game/game.types";
import { createPreparedGameState, definitions } from "./gameSeed";
import { assertAuthorizedAction } from "./roomAuthority";
import { applyMulligan } from "../src/domain/preparation/mulligan";
import { resolveStartingPlayerRolls, rollStartingPlayerDie, validateEssenceOrder, validateLoadout, type PlayerLoadout, type PreparationPlayer, type PreparationState, type MulliganDecision } from "../src/domain/preparation/preparation";
import type { CardDefinition } from "../src/domain/cards/card.types";

const roomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const token = () => `${crypto.randomUUID()}-${crypto.randomUUID()}`;
const playerId = () => `player-${crypto.randomUUID()}`;

type ConvexContext = QueryCtx | MutationCtx;
async function getRoom(ctx: ConvexContext, code: string) {
  return ctx.db.query("rooms").withIndex("by_code", (q) => q.eq("code", code)).unique();
}

function preparationForPlayers(playerOne: { playerId: string; displayName: string }, playerTwo: { playerId: string; displayName: string }): PreparationState {
  const player = (value: { playerId: string; displayName: string }): PreparationPlayer => ({ playerId: value.playerId, displayName: value.displayName, faction: null, loadout: null, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganDecision: null, mulliganSelectedInstanceIds: [] });
  return { stage: "DECK_SELECTION", startingPlayerId: null, startingPlayerRollWinnerId: null, players: { [playerOne.playerId]: player(playerOne), [playerTwo.playerId]: player(playerTwo) } };
}

export function preparationView(preparation: PreparationState | undefined, viewerId: string) {
  if (!preparation) return null;
  const own = preparation.players[viewerId];
  return {
    stage: preparation.stage,
    startingPlayerId: preparation.startingPlayerId,
    startingPlayerRollWinnerId: preparation.startingPlayerRollWinnerId ?? null,
    players: Object.values(preparation.players).map((player) => ({ playerId: player.playerId, displayName: player.displayName, faction: player.faction, loadoutSubmitted: Boolean(player.loadout), startingPlayerRoll: player.startingPlayerRoll ?? null, essenceConfirmed: player.essenceConfirmed, initialDrawConfirmed: player.initialDrawConfirmed, mulliganConfirmed: player.mulliganDecision !== null })),
    you: own ? { faction: own.faction, loadout: own.loadout, startingPlayerRoll: own.startingPlayerRoll ?? null, essenceConfirmed: own.essenceConfirmed, initialDrawConfirmed: own.initialDrawConfirmed, mulliganDecision: own.mulliganDecision, mulliganSelectedInstanceIds: own.mulliganSelectedInstanceIds } : null,
  };
}

function sameOrder(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function assertRoomInGame(status: string) {
  if (status !== "IN_GAME") throw new Error("Room is not in game");
}

export const createRoom = mutation({
  args: { displayName: v.string() },
  returns: v.object({ code: v.string(), playerSessionToken: v.string(), seat: v.string(), playerId: v.string() }),
  handler: async (ctx, args) => {
    const code = roomCode();
    const sessionToken = token();
    const currentPlayerId = playerId();
    const roomId = await ctx.db.insert("rooms", { code, status: "WAITING_FOR_PLAYER", createdAt: Date.now() });
    await ctx.db.insert("players", { roomId, displayName: args.displayName.trim().slice(0, 40) || "Jugador", seat: "PLAYER_1", playerId: currentPlayerId, sessionToken, createdAt: Date.now() });
    return { code, playerSessionToken: sessionToken, seat: "PLAYER_1", playerId: currentPlayerId };
  },
});

export const joinRoom = mutation({
  args: { code: v.string(), displayName: v.string() },
  returns: v.object({ code: v.string(), playerSessionToken: v.string(), seat: v.string(), playerId: v.string() }),
  handler: async (ctx, args) => {
    const room = await getRoom(ctx, args.code.trim().toUpperCase());
    if (!room) throw new Error("Room not found");
    if (room.status !== "WAITING_FOR_PLAYER") throw new Error("Room is not available");
    const players = await ctx.db.query("players").withIndex("by_room", (q) => q.eq("roomId", room._id)).take(2);
    if (players.some((player) => player.seat === "PLAYER_2")) throw new Error("Room is full");
    const sessionToken = token();
    const currentPlayerId = playerId();
    await ctx.db.insert("players", { roomId: room._id, displayName: args.displayName.trim().slice(0, 40) || "Jugador", seat: "PLAYER_2", playerId: currentPlayerId, sessionToken, createdAt: Date.now() });
    const playerOne = players.find((player) => player.seat === "PLAYER_1");
    if (!playerOne) throw new Error("Room has no host");
    await ctx.db.patch(room._id, { status: "PREPARATION", preparation: preparationForPlayers({ playerId: playerOne.playerId, displayName: playerOne.displayName }, { playerId: currentPlayerId, displayName: args.displayName.trim().slice(0, 40) || "Jugador" }) });
    return { code: room.code, playerSessionToken: sessionToken, seat: "PLAYER_2", playerId: currentPlayerId };
  },
});

async function session(ctx: ConvexContext, code: string, sessionToken: string) {
  const room = await getRoom(ctx, code.trim().toUpperCase());
  if (!room) return null;
  const player = await ctx.db.query("players").withIndex("by_room_session", (q) => q.eq("roomId", room._id).eq("sessionToken", sessionToken)).unique();
  return player ? { room, player } : null;
}

export function playerView(state: GameState, viewerId: string) {
  const hiddenCounts = Object.fromEntries(Object.values(state.players).map((player) => [player.playerId, { HAND: 0, MAIN_DECK: 0, ESSENCE_DECK: 0 }])) as Record<string, { HAND: number; MAIN_DECK: number; ESSENCE_DECK: number }>;
  for (const card of Object.values(state.cardInstances)) {
    if (card.zone === "HAND" || card.zone === "MAIN_DECK" || card.zone === "ESSENCE_DECK" || card.zone === "DECK_LOOK") {
      const counts = hiddenCounts[card.ownerId];
      if (counts) counts[card.zone === "DECK_LOOK" ? "MAIN_DECK" : card.zone] += 1;
    }
  }
  const opponentRevealEntry = Object.entries(state.deckLooks ?? {}).find(([playerId, look]) => playerId !== viewerId && look.mode === "SEARCH" && (look.revealedInstanceIds?.length ?? 0) > 0);
  const deckReveal = opponentRevealEntry
    ? {
        playerId: opponentRevealEntry[0],
        instanceIds: (opponentRevealEntry[1].revealedInstanceIds ?? []).filter((instanceId) => state.cardInstances[instanceId]?.zone === "DECK_LOOK"),
      }
    : null;
  const revealedSearchIds = new Set(deckReveal?.instanceIds ?? []);
  const cardInstances: PlayerViewCard[] = [];
  for (const card of Object.values(state.cardInstances)) {
    const publicZone = card.zone === "FIELD" || card.zone === "GRAVEYARD" || card.zone === "SANCTUARY" || card.zone === "ESSENCE_ZONE" || card.zone === "VERSE_RESOLUTION" || card.zone === "DEVASTATED";
    const visible = publicZone || card.ownerId === viewerId && (card.zone === "HAND" || card.zone === "DECK_LOOK") || card.zone === "DECK_LOOK" && revealedSearchIds.has(card.instanceId);
    if (!visible || card.zone === "MAIN_DECK" || card.zone === "ESSENCE_DECK") continue;
    if (publicZone && !card.faceUp && card.ownerId !== viewerId) {
      cardInstances.push({ ...card, cardDefinitionId: "", definition: null, hidden: true } satisfies FaceDownPublicCardView);
      continue;
    }
    const definition = definitions[card.cardDefinitionId as keyof typeof definitions] as unknown as CardDefinition | undefined;
    if (definition) cardInstances.push({ ...card, definition } satisfies CardView);
  }
  const characterMarkers = Object.fromEntries(
    Object.entries(state.characterMarkers ?? {}).filter(([characterInstanceId]) => {
      const character = state.cardInstances[characterInstanceId];
      return character?.zone === "FIELD" && definitions[character.cardDefinitionId as keyof typeof definitions]?.type === "CHARACTER";
    }),
  );
  return { gameId: state.gameId, revision: state.revision, turnNumber: state.turnNumber, activePlayerId: state.activePlayerId, startingPlayerId: state.startingPlayerId, phase: state.phase, players: state.players, cardInstances, deckLook: state.deckLooks?.[viewerId] ?? null, deckReveal: deckReveal?.instanceIds.length ? deckReveal : null, pendingStatChanges: state.pendingStatChanges ?? {}, pendingVirtualEssenceChanges: state.pendingVirtualEssenceChanges ?? {}, characterMarkers, hiddenCounts, publicCounts: hiddenCounts };
}

function shuffled<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function materializeGameAction(state: GameState, action: GameAction): GameAction {
  if (action.type === "RESOLVE_DECK_LOOK" && action.destination === "SHUFFLE") {
    const deckIds = Object.values(state.cardInstances)
      .filter((card) => card.zone === "MAIN_DECK" && card.controllerId === action.playerId)
      .map((card) => card.instanceId);
    return { ...action, orderedInstanceIds: shuffled([...deckIds, ...action.instanceIds]) };
  }
  if (action.type !== "SHUFFLE_MAIN_DECK" && action.type !== "SHUFFLE_CARD_INTO_MAIN_DECK") return action;
  const deckIds = Object.values(state.cardInstances)
    .filter((card) => card.zone === "MAIN_DECK" && card.controllerId === action.playerId)
    .map((card) => card.instanceId);
  if (action.type === "SHUFFLE_CARD_INTO_MAIN_DECK") deckIds.push(action.instanceId);
  return { ...action, orderedInstanceIds: shuffled(deckIds) };
}

export const getPlayerView = query({
  args: { code: v.string(), playerSessionToken: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const found = await session(ctx, args.code, args.playerSessionToken);
    if (!found) return { status: "INVALID_SESSION" };
    const game = await ctx.db.query("games").withIndex("by_room", (q) => q.eq("roomId", found.room._id)).unique();
    const players = await ctx.db.query("players").withIndex("by_room", (q) => q.eq("roomId", found.room._id)).take(2);
    return { status: found.room.status, code: found.room.code, seat: found.player.seat, playerId: found.player.playerId, displayName: found.player.displayName, players: players.map((player) => ({ playerId: player.playerId, displayName: player.displayName, seat: player.seat })), preparation: preparationView(found.room.preparation as PreparationState | undefined, found.player.playerId), game: game ? playerView(game.state as GameState, found.player.playerId) : null };
  },
});

export const submitLoadout = mutation({
  args: { code: v.string(), playerSessionToken: v.string(), loadout: v.any() },
  returns: v.object({ stage: v.string() }),
  handler: async (ctx, args) => {
    const found = await session(ctx, args.code, args.playerSessionToken);
    if (!found) throw new Error("Invalid session");
    if (found.room.status !== "PREPARATION") throw new Error("Room is not in preparation");
    const preparation = found.room.preparation as PreparationState | undefined;
    if (!preparation || preparation.stage !== "DECK_SELECTION") throw new Error("Loadouts are locked");
    const checked = validateLoadout(args.loadout, definitions);
    if (!checked.ok) throw new Error(checked.error);
    const current = preparation.players[found.player.playerId];
    if (!current) throw new Error("Player is not part of preparation");
    const nextPlayers = { ...preparation.players, [found.player.playerId]: { ...current, faction: checked.loadout.faction, loadout: checked.loadout, essenceConfirmed: false, initialDrawConfirmed: false, mulliganDecision: null, mulliganSelectedInstanceIds: [] } };
    const allSubmitted = Object.values(nextPlayers).every((player) => player.loadout !== null);
  const nextPreparation: PreparationState = { ...preparation, players: nextPlayers, startingPlayerId: allSubmitted ? null : preparation.startingPlayerId, startingPlayerRollWinnerId: allSubmitted ? null : preparation.startingPlayerRollWinnerId ?? null, stage: allSubmitted ? "STARTING_PLAYER" : "DECK_SELECTION" };
    await ctx.db.patch(found.room._id, { preparation: nextPreparation });
    return { stage: nextPreparation.stage };
  },
});

export const rollStartingPlayer = mutation({
  args: { code: v.string(), playerSessionToken: v.string() },
  returns: v.object({ stage: v.string(), roll: v.number(), tied: v.boolean(), startingPlayerId: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    const found = await session(ctx, args.code, args.playerSessionToken);
    if (!found) throw new Error("Invalid session");
    const preparation = found.room.preparation as PreparationState | undefined;
    if (found.room.status !== "PREPARATION" || !preparation || preparation.stage !== "STARTING_PLAYER") throw new Error("Starting player roll is not available");
    const current = preparation.players[found.player.playerId];
    if (!current) throw new Error("Player is not part of preparation");
    if (current.startingPlayerRoll !== null && current.startingPlayerRoll !== undefined) throw new Error("Player has already rolled");
    const roll = rollStartingPlayerDie();
    const rolledPlayers = { ...preparation.players, [found.player.playerId]: { ...current, startingPlayerRoll: roll } };
    const winner = resolveStartingPlayerRolls(Object.values(rolledPlayers));
    if (winner === "TIE") {
      const resetPlayers = Object.fromEntries(Object.entries(rolledPlayers).map(([playerId, player]) => [playerId, { ...player, startingPlayerRoll: null }])) as Record<string, PreparationPlayer>;
      await ctx.db.patch(found.room._id, { preparation: { ...preparation, players: resetPlayers, startingPlayerId: null, startingPlayerRollWinnerId: null, stage: "STARTING_PLAYER" } });
      return { stage: "STARTING_PLAYER", roll, tied: true, startingPlayerId: null };
    }
    await ctx.db.patch(found.room._id, { preparation: { ...preparation, players: rolledPlayers, startingPlayerId: null, startingPlayerRollWinnerId: winner, stage: "STARTING_PLAYER" } });
    return { stage: "STARTING_PLAYER", roll, tied: false, startingPlayerId: null };
  },
});

export const chooseStartingPlayer = mutation({
  args: { code: v.string(), playerSessionToken: v.string(), choice: v.union(v.literal("SELF"), v.literal("OPPONENT")) },
  returns: v.object({ stage: v.string(), startingPlayerId: v.string() }),
  handler: async (ctx, args) => {
    const found = await session(ctx, args.code, args.playerSessionToken);
    if (!found) throw new Error("Invalid session");
    const preparation = found.room.preparation as PreparationState | undefined;
    if (found.room.status !== "PREPARATION" || !preparation || preparation.stage !== "STARTING_PLAYER") throw new Error("Starting player choice is not available");
    const winnerId = preparation.startingPlayerRollWinnerId;
    if (!winnerId || winnerId !== found.player.playerId) throw new Error("Only the die winner can choose the starting player");
    const opponent = Object.values(preparation.players).find((player) => player.playerId !== winnerId);
    if (!opponent) throw new Error("Opponent is not available");
    const startingPlayerId = args.choice === "SELF" ? winnerId : opponent.playerId;
    await ctx.db.patch(found.room._id, { preparation: { ...preparation, startingPlayerId, stage: "ESSENCE_ORDERING" } });
    return { stage: "ESSENCE_ORDERING", startingPlayerId };
  },
});

export const confirmEssenceOrder = mutation({
  args: { code: v.string(), playerSessionToken: v.string(), orderedDefinitionIds: v.array(v.string()) },
  returns: v.object({ stage: v.string() }),
  handler: async (ctx, args) => {
    const found = await session(ctx, args.code, args.playerSessionToken);
    if (!found) throw new Error("Invalid session");
    const preparation = found.room.preparation as PreparationState | undefined;
    if (found.room.status !== "PREPARATION" || !preparation || preparation.stage !== "ESSENCE_ORDERING") throw new Error("Essence ordering is not available");
    const current = preparation.players[found.player.playerId];
    if (!current?.loadout) throw new Error("Submit a loadout first");
    if (!sameOrder([...args.orderedDefinitionIds].sort(), [...current.loadout.essenceDeck].sort())) throw new Error("Essence order does not match the submitted deck");
    const orderCheck = validateEssenceOrder(args.orderedDefinitionIds, definitions, preparation.startingPlayerId === found.player.playerId);
    if (!orderCheck.ok) throw new Error(orderCheck.error);
    const nextPlayers = { ...preparation.players, [found.player.playerId]: { ...current, loadout: { ...current.loadout, essenceDeck: [...args.orderedDefinitionIds] }, essenceConfirmed: true } };
    const bothConfirmed = Object.values(nextPlayers).every((player) => player.essenceConfirmed && player.loadout);
    if (!bothConfirmed) {
      await ctx.db.patch(found.room._id, { preparation: { ...preparation, players: nextPlayers } });
      return { stage: preparation.stage };
    }
    const playerRows = await ctx.db.query("players").withIndex("by_room", (q) => q.eq("roomId", found.room._id)).take(2);
    const loadouts = Object.fromEntries(Object.values(nextPlayers).map((player) => [player.playerId, player.loadout])) as Record<string, PlayerLoadout>;
    const orders = Object.fromEntries(Object.values(nextPlayers).map((player) => [player.playerId, player.loadout?.essenceDeck ?? []]));
    const startingPlayerId = preparation.startingPlayerId;
    if (!startingPlayerId) throw new Error("Starting player has not been determined");
    const existingGame = await ctx.db.query("games").withIndex("by_room", (q) => q.eq("roomId", found.room._id)).unique();
    if (!existingGame) {
      const state = createPreparedGameState(found.room._id, playerRows.map((player) => ({ playerId: player.playerId, displayName: player.displayName })), loadouts, orders, startingPlayerId);
      await ctx.db.insert("games", { roomId: found.room._id, state, revision: state.revision });
    }
    await ctx.db.patch(found.room._id, { preparation: { ...preparation, players: nextPlayers, stage: "INITIAL_DRAW" } });
    return { stage: "INITIAL_DRAW" };
  },
});

export const confirmInitialDraw = mutation({
  args: { code: v.string(), playerSessionToken: v.string() },
  returns: v.object({ stage: v.string() }),
  handler: async (ctx, args) => {
    const found = await session(ctx, args.code, args.playerSessionToken);
    if (!found) throw new Error("Invalid session");
    const preparation = found.room.preparation as PreparationState | undefined;
    if (found.room.status !== "PREPARATION" || !preparation || preparation.stage !== "INITIAL_DRAW") throw new Error("Initial draw is not available");
    const current = preparation.players[found.player.playerId];
    if (!current || current.initialDrawConfirmed) throw new Error("Initial draw is already confirmed");
    const nextPlayers = { ...preparation.players, [found.player.playerId]: { ...current, initialDrawConfirmed: true } };
    const bothConfirmed = Object.values(nextPlayers).every((player) => player.initialDrawConfirmed);
    const nextPreparation: PreparationState = { ...preparation, players: nextPlayers, stage: bothConfirmed ? "MULLIGAN" : "INITIAL_DRAW" };
    await ctx.db.patch(found.room._id, { preparation: nextPreparation });
    return { stage: nextPreparation.stage };
  },
});

export const submitMulligan = mutation({
  args: { code: v.string(), playerSessionToken: v.string(), decision: v.union(v.literal("KEEP"), v.literal("MULLIGAN")), selectedInstanceIds: v.array(v.string()) },
  returns: v.object({ stage: v.string() }),
  handler: async (ctx, args) => {
    const found = await session(ctx, args.code, args.playerSessionToken);
    if (!found) throw new Error("Invalid session");
    const preparation = found.room.preparation as PreparationState | undefined;
    if (found.room.status !== "PREPARATION" || !preparation || preparation.stage !== "MULLIGAN") throw new Error("Mulligan is not available");
    const current = preparation.players[found.player.playerId];
    if (!current || current.mulliganDecision) throw new Error("Mulligan decision is already locked");
    if (args.decision === "KEEP" && args.selectedInstanceIds.length > 0) throw new Error("Keep cannot include mulligan selections");
    const game = await ctx.db.query("games").withIndex("by_room", (q) => q.eq("roomId", found.room._id)).unique();
    if (!game) throw new Error("Game not initialized");
    const nextState = applyMulligan(game.state as GameState, found.player.playerId, args.selectedInstanceIds);
    await ctx.db.replace(game._id, { roomId: game.roomId, state: nextState, revision: nextState.revision });
    const nextPlayers = { ...preparation.players, [found.player.playerId]: { ...current, mulliganDecision: args.decision as MulliganDecision, mulliganSelectedInstanceIds: [...args.selectedInstanceIds] } };
    const bothReady = Object.values(nextPlayers).every((player) => player.mulliganDecision !== null);
    const nextPreparation: PreparationState = { ...preparation, players: nextPlayers, stage: bothReady ? "IN_GAME" : "MULLIGAN" };
    await ctx.db.patch(found.room._id, { preparation: nextPreparation, ...(bothReady ? { status: "IN_GAME" as const } : {}) });
    return { stage: nextPreparation.stage };
  },
});

export const submitGameAction = mutation({
  args: { code: v.string(), playerSessionToken: v.string(), clientActionId: v.string(), action: v.any() },
  returns: v.object({ revision: v.number(), actionType: v.string() }),
  handler: async (ctx, args) => {
    const found = await session(ctx, args.code, args.playerSessionToken);
    if (!found) throw new Error("Invalid session");
    assertRoomInGame(found.room.status);
    const game = await ctx.db.query("games").withIndex("by_room", (q) => q.eq("roomId", found.room._id)).unique();
    if (!game) throw new Error("Game not initialized");
    const state = game.state as GameState;
    const requestedAction = args.action as GameAction;
    assertAuthorizedAction(state, requestedAction, found.player.playerId);
    const action = materializeGameAction(state, requestedAction);
    const nextState = applyGameAction(state, action, definitions);
    const revision = state.revision + 1;
    nextState.revision = revision;
    await ctx.db.replace(game._id, { roomId: game.roomId, state: nextState, revision });
    await ctx.db.insert("gameActions", { gameId: game._id, sequence: revision, actorPlayerId: found.player.playerId, action, createdAt: Date.now(), clientActionId: args.clientActionId });
    return { revision, actionType: action.type };
  },
});

export const finishRoom = mutation({
  args: { code: v.string(), playerSessionToken: v.string(), status: v.union(v.literal("FINISHED"), v.literal("ABANDONED")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const found = await session(ctx, args.code, args.playerSessionToken);
    if (!found) throw new Error("Invalid session");
    assertRoomInGame(found.room.status);
    await ctx.db.patch(found.room._id, { status: args.status });
    return null;
  },
});
