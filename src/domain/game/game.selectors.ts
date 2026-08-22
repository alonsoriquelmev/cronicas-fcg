import type { CardDefinition } from "../cards/card.types";
import type { CardInstance, CardZone, GameState, PlayerId } from "./game.types";

const HAND_ORDER: Record<string, number> = { CHARACTER: 0, VERSE: 1, RELIC: 2, ESSENCE: 3, SANCTUARY: 4 };

export function getCardsInZone(state: GameState, zone: CardZone, controllerId?: PlayerId) {
  return Object.values(state.cardInstances)
    .filter((card) => card.zone === zone && (controllerId === undefined || card.controllerId === controllerId))
    .sort((a, b) => a.zoneOrder - b.zoneOrder || a.instanceId.localeCompare(b.instanceId));
}

export function sortHandForDisplay(cards: CardInstance[], definitions: Record<string, CardDefinition>) {
  return [...cards].sort((a, b) => (HAND_ORDER[definitions[a.cardDefinitionId]?.type ?? ""] ?? 9) - (HAND_ORDER[definitions[b.cardDefinitionId]?.type ?? ""] ?? 9) || a.zoneOrder - b.zoneOrder);
}
