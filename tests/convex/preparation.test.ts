import { describe, expect, it } from "vitest";
import { createPreparedGameState } from "@/../convex/gameSeed";
import { preparationView } from "@/../convex/rooms";
import { mockCardCatalog } from "@/data/mock-card-catalog";
import { ESSENCE_DECK_SIZE, MAIN_DECK_SIZE, resolveStartingPlayerRolls, rollStartingPlayerDie, type PlayerLoadout, type PreparationState } from "@/domain/preparation/preparation";

const mainIds = mockCardCatalog.filter((definition) => definition.type !== "ESSENCE" && definition.type !== "SANCTUARY").map((definition) => definition.id);
const loadout = (prefix: string): PlayerLoadout => ({
  faction: "TEST",
  mainDeck: Array.from({ length: MAIN_DECK_SIZE }, (_, index) => mainIds[index % mainIds.length]),
  sanctuary: "mock-sanctuary",
  essenceDeck: Array.from({ length: ESSENCE_DECK_SIZE }, (_, index) => prefix === "A" ? (index % 2 === 0 ? "mock-essence-b" : "mock-essence-a") : (index % 2 === 0 ? "mock-essence-a" : "mock-essence-b")),
});

describe("MISSION_003 authoritative preparation boundaries", () => {
  it("does not expose the opponent loadout and exposes only preparation status", () => {
    const preparation: PreparationState = {
      stage: "ESSENCE_ORDERING",
      startingPlayerId: "A",
      startingPlayerRollWinnerId: null,
      players: {
        A: { playerId: "A", displayName: "Alice", faction: "TEST", loadout: loadout("A"), startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganDecision: null, mulliganSelectedInstanceIds: [] },
        B: { playerId: "B", displayName: "Bob", faction: "TEST", loadout: loadout("B"), startingPlayerRoll: 4, essenceConfirmed: true, initialDrawConfirmed: false, mulliganDecision: null, mulliganSelectedInstanceIds: [] },
      },
    };
    const view = preparationView(preparation, "A");
    expect(view?.you?.loadout).toEqual(loadout("A"));
    expect(view?.players).toEqual([
      { playerId: "A", displayName: "Alice", faction: "TEST", loadoutSubmitted: true, startingPlayerRoll: null, essenceConfirmed: false, initialDrawConfirmed: false, mulliganConfirmed: false },
      { playerId: "B", displayName: "Bob", faction: "TEST", loadoutSubmitted: true, startingPlayerRoll: 4, essenceConfirmed: true, initialDrawConfirmed: false, mulliganConfirmed: false },
    ]);
    expect(view?.players[1]).not.toHaveProperty("loadout");
  });

  it("creates unique instances, draws five cards, keeps the Essence order, and initializes Sanctuary", () => {
    const state = createPreparedGameState("room-prep", [{ playerId: "A", displayName: "Alice" }, { playerId: "B", displayName: "Bob" }], { A: loadout("A"), B: loadout("B") }, { A: loadout("A").essenceDeck, B: loadout("B").essenceDeck }, "B", () => 0.25);
    const cards = Object.values(state.cardInstances);
    expect(new Set(cards.map((card) => card.instanceId)).size).toBe(cards.length);
    for (const playerId of ["A", "B"]) {
      expect(cards.filter((card) => card.ownerId === playerId && card.zone === "HAND")).toHaveLength(5);
      expect(cards.filter((card) => card.ownerId === playerId && card.zone === "MAIN_DECK")).toHaveLength(30);
      expect(cards.find((card) => card.ownerId === playerId && card.zone === "SANCTUARY")).toMatchObject({ cardDefinitionId: "mock-sanctuary" });
    }
    expect(cards.filter((card) => card.ownerId === "A" && card.zone === "ESSENCE_DECK").sort((left, right) => left.zoneOrder - right.zoneOrder).map((card) => card.cardDefinitionId)).toEqual(loadout("A").essenceDeck);
    expect(state.startingPlayerId).toBe("B");
    expect(state.activePlayerId).toBe("B");
    expect(Object.values(state.cardInstances).some((card) => card.zone === "FIELD")).toBe(false);
    expect(Object.values(state.cardInstances).some((card) => card.zone === "GRAVEYARD")).toBe(false);
    expect(Object.values(state.cardInstances).some((card) => card.zone === "VERSE_RESOLUTION")).toBe(false);
  });

  it("resolves the starting player from two server-side die results and leaves ties unresolved", () => {
    expect(rollStartingPlayerDie(() => 0)).toBe(1);
    expect(rollStartingPlayerDie(() => 0.999999)).toBe(6);
    expect(resolveStartingPlayerRolls([{ playerId: "A", startingPlayerRoll: 5 }, { playerId: "B", startingPlayerRoll: 3 }])).toBe("A");
    expect(resolveStartingPlayerRolls([{ playerId: "A", startingPlayerRoll: 2 }, { playerId: "B", startingPlayerRoll: 6 }])).toBe("B");
    expect(resolveStartingPlayerRolls([{ playerId: "A", startingPlayerRoll: 4 }, { playerId: "B", startingPlayerRoll: 4 }])).toBe("TIE");
  });
});
