import { describe, expect, it } from "vitest";
import { buildMockGameState, MOCK_IDS } from "@/data/mock-card-catalog";
import { applyGameAction } from "@/domain/game/game.reducer";
import { assertAuthorizedAction } from "@/../convex/roomAuthority";
import { assertRoomInGame } from "@/../convex/rooms";
import { getPhaseBlockers } from "@/domain/game/phase-rules";

describe("MISSION_003 manual turn phases", () => {
  it("advances phases and ends the turn back at ALBA", () => {
    let state = buildMockGameState();
    state.phase = "ALBA";
    state.activePlayerId = MOCK_IDS.local;
    state = applyGameAction(state, { type: "SET_PHASE", phase: "AMANECER" });
    state = applyGameAction(state, { type: "SET_PHASE", phase: "MEDIODIA" });
    state = applyGameAction(state, { type: "SET_PHASE", phase: "ANOCHECER" });
    state = applyGameAction(state, { type: "END_TURN" });
    expect(state).toMatchObject({ phase: "ALBA", activePlayerId: MOCK_IDS.opponent, turnNumber: 2 });
  });

  it("authorizes only the active player and valid transitions", () => {
    const state = applyGameAction({ ...buildMockGameState(), phase: "ALBA" as const, activePlayerId: MOCK_IDS.local }, { type: "DRAW_ESSENCE", playerId: MOCK_IDS.local });
    expect(() => assertAuthorizedAction(state, { type: "SET_PHASE", phase: "AMANECER" }, MOCK_IDS.local)).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "SET_PHASE", phase: "MEDIODIA" }, MOCK_IDS.local)).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "SET_PHASE", phase: "AMANECER" }, MOCK_IDS.opponent)).toThrow();
    expect(() => assertAuthorizedAction({ ...state, phase: "ANOCHECER" }, { type: "END_TURN" }, MOCK_IDS.local)).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "END_TURN" }, MOCK_IDS.local)).toThrow();
  });

  it("blocks Alba until the active player untaps and draws an Essence", () => {
    const state = buildMockGameState();
    state.cardInstances["local-hand-char"] = { ...state.cardInstances["local-hand-char"], zone: "FIELD", tapped: true };
    expect(getPhaseBlockers(state, MOCK_IDS.local, "AMANECER")).toEqual(["UNTAP_CARDS", "DRAW_ESSENCE"]);

    const untapped = applyGameAction(state, { type: "UNTAP_CARD", instanceId: "local-hand-char" });
    expect(getPhaseBlockers(untapped, MOCK_IDS.local, "AMANECER")).toEqual(["DRAW_ESSENCE"]);
    const ready = applyGameAction(untapped, { type: "DRAW_ESSENCE", playerId: MOCK_IDS.local });
    expect(getPhaseBlockers(ready, MOCK_IDS.local, "AMANECER")).toEqual([]);
  });

  it("requires a Main Deck draw from the second personal turn onward", () => {
    const state = { ...buildMockGameState(), turnNumber: 3, phase: "AMANECER" as const, phaseProgress: { turnNumber: 3, playerId: MOCK_IDS.local, essenceDrawn: true, mainCardDrawn: false } };
    expect(getPhaseBlockers(state, MOCK_IDS.local, "MEDIODIA")).toEqual(["DRAW_MAIN_CARD"]);
    const ready = applyGameAction(state, { type: "DRAW_CARD", playerId: MOCK_IDS.local });
    expect(getPhaseBlockers(ready, MOCK_IDS.local, "MEDIODIA")).toEqual([]);
  });

  it("skips the opening Main Deck draw only for the starting player", () => {
    const opening = { ...buildMockGameState(), phase: "AMANECER" as const, phaseProgress: { turnNumber: 1, playerId: MOCK_IDS.local, essenceDrawn: true, mainCardDrawn: false } };
    expect(getPhaseBlockers(opening, MOCK_IDS.local, "MEDIODIA")).toEqual([]);

    const secondPlayer = { ...opening, activePlayerId: MOCK_IDS.opponent, turnNumber: 2, phaseProgress: { turnNumber: 2, playerId: MOCK_IDS.opponent, essenceDrawn: true, mainCardDrawn: false } };
    expect(getPhaseBlockers(secondPlayer, MOCK_IDS.opponent, "MEDIODIA")).toEqual(["DRAW_MAIN_CARD"]);
  });

  it("keeps preparation actions outside the gameplay mutation boundary", () => {
    expect(() => assertRoomInGame("MULLIGAN")).toThrow("Room is not in game");
    expect(() => assertRoomInGame("FINISHED")).toThrow("Room is not in game");
    expect(() => assertRoomInGame("ABANDONED")).toThrow("Room is not in game");
    expect(() => assertRoomInGame("IN_GAME")).not.toThrow();
  });
});
