import type { CardInstance, GamePhase, GameState, PlayerId, TurnPhaseProgress } from "./game.types";

export type PhaseBlocker = "UNTAP_CARDS" | "DRAW_ESSENCE" | "DRAW_MAIN_CARD";

type RuleCard = Pick<CardInstance, "controllerId" | "zone" | "tapped">;
type RuleState = Omit<Pick<GameState, "activePlayerId" | "startingPlayerId" | "turnNumber" | "phase" | "phaseProgress">, "phaseProgress"> & {
  phaseProgress?: TurnPhaseProgress | null;
  cardInstances: Record<string, RuleCard> | RuleCard[];
  hiddenCounts?: Record<string, { MAIN_DECK: number; ESSENCE_DECK: number }>;
};

const cardList = (state: RuleState) =>
  Array.isArray(state.cardInstances) ? state.cardInstances : Object.values(state.cardInstances);

const deckCount = (state: RuleState, playerId: PlayerId, zone: "MAIN_DECK" | "ESSENCE_DECK") => {
  const visibleCount = cardList(state).filter((card) => card.controllerId === playerId && card.zone === zone).length;
  return Math.max(visibleCount, state.hiddenCounts?.[playerId]?.[zone] ?? 0);
};

export function getPersonalTurnNumber(state: Pick<GameState, "startingPlayerId" | "turnNumber">, playerId: PlayerId) {
  return playerId === state.startingPlayerId
    ? Math.ceil(state.turnNumber / 2)
    : Math.floor(state.turnNumber / 2);
}

export function isOpeningTurn(state: Pick<GameState, "startingPlayerId" | "turnNumber">, playerId: PlayerId) {
  return state.turnNumber === 1 && state.startingPlayerId === playerId;
}

export function getCurrentTurnPhaseProgress(state: Pick<GameState, "activePlayerId" | "turnNumber"> & { phaseProgress?: TurnPhaseProgress | null }): TurnPhaseProgress {
  const progress = state.phaseProgress;
  if (progress?.turnNumber === state.turnNumber && progress.playerId === state.activePlayerId) return progress;
  return { turnNumber: state.turnNumber, playerId: state.activePlayerId, essenceDrawn: false, mainCardDrawn: false };
}

export function getPhaseBlockers(state: RuleState, playerId: PlayerId, targetPhase: GamePhase): PhaseBlocker[] {
  if (state.activePlayerId !== playerId) return [];
  const blockers: PhaseBlocker[] = [];
  const progress = getCurrentTurnPhaseProgress(state);

  if (state.phase === "ALBA" && targetPhase === "AMANECER") {
    const hasTappedCard = cardList(state).some(
      (card) => card.controllerId === playerId && card.tapped && (card.zone === "FIELD" || card.zone === "ESSENCE_ZONE"),
    );
    if (hasTappedCard) blockers.push("UNTAP_CARDS");
    if (!progress.essenceDrawn && deckCount(state, playerId, "ESSENCE_DECK") > 0) blockers.push("DRAW_ESSENCE");
  }

  if (state.phase === "AMANECER" && targetPhase === "MEDIODIA") {
    if (!isOpeningTurn(state, playerId) && !progress.mainCardDrawn && deckCount(state, playerId, "MAIN_DECK") > 0) {
      blockers.push("DRAW_MAIN_CARD");
    }
  }

  return blockers;
}

export const phaseBlockerLabels: Record<PhaseBlocker, string> = {
  UNTAP_CARDS: "Endereza todas tus cartas.",
  DRAW_ESSENCE: "Roba una Esencia.",
  DRAW_MAIN_CARD: "Roba una carta del Mazo Principal.",
};

export function phaseBlockerError(blockers: PhaseBlocker[]) {
  return `PHASE_BLOCKED:${blockers.join(",")}`;
}

export function phaseBlockersFromError(message: string): PhaseBlocker[] {
  const value = message.match(/PHASE_BLOCKED:([A-Z_,]+)/)?.[1];
  if (!value) return [];
  return value.split(",").filter((item): item is PhaseBlocker => item in phaseBlockerLabels);
}
