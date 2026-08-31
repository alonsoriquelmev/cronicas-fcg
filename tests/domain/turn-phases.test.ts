import { describe, expect, it } from "vitest";
import { buildMockGameState, MOCK_IDS } from "@/data/mock-card-catalog";
import { applyGameAction } from "@/domain/game/game.reducer";
import { assertAuthorizedAction } from "@/../convex/roomAuthority";
import { assertRoomInGame } from "@/../convex/rooms";

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
    const state = { ...buildMockGameState(), phase: "ALBA" as const, activePlayerId: MOCK_IDS.local };
    expect(() => assertAuthorizedAction(state, { type: "SET_PHASE", phase: "AMANECER" }, MOCK_IDS.local)).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "SET_PHASE", phase: "MEDIODIA" }, MOCK_IDS.local)).toThrow();
    expect(() => assertAuthorizedAction(state, { type: "SET_PHASE", phase: "AMANECER" }, MOCK_IDS.opponent)).toThrow();
    expect(() => assertAuthorizedAction({ ...state, phase: "ANOCHECER" }, { type: "END_TURN" }, MOCK_IDS.local)).not.toThrow();
    expect(() => assertAuthorizedAction(state, { type: "END_TURN" }, MOCK_IDS.local)).toThrow();
  });

  it("keeps preparation actions outside the gameplay mutation boundary", () => {
    expect(() => assertRoomInGame("MULLIGAN")).toThrow("Room is not in game");
    expect(() => assertRoomInGame("FINISHED")).toThrow("Room is not in game");
    expect(() => assertRoomInGame("ABANDONED")).toThrow("Room is not in game");
    expect(() => assertRoomInGame("IN_GAME")).not.toThrow();
  });
});
