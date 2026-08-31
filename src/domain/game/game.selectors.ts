import type { CardDefinition, CharacterCardDefinition, RelicCardDefinition } from "../cards/card.types";
import type { CardInstance, CardZone, GameState, PlayerId } from "./game.types";

const HAND_ORDER: Record<string, number> = { CHARACTER: 0, VERSE: 1, RELIC: 2, ESSENCE: 3, SANCTUARY: 4 };

export function getCardsInZone(state: GameState, zone: CardZone, controllerId?: PlayerId) {
  return Object.values(state.cardInstances)
    .filter((card) => card.zone === zone && (controllerId === undefined || card.controllerId === controllerId))
    .sort((a, b) => a.zoneOrder - b.zoneOrder || a.instanceId.localeCompare(b.instanceId));
}

export function getTopCardInZone(cards: CardInstance[]) {
  return cards.reduce<CardInstance | undefined>((top, card) => {
    if (!top || card.zoneOrder > top.zoneOrder || (card.zoneOrder === top.zoneOrder && card.instanceId > top.instanceId)) return card;
    return top;
  }, undefined);
}

export function sortHandForDisplay(cards: CardInstance[], definitions: Record<string, CardDefinition>) {
  return [...cards].sort((a, b) => {
    const definitionA = definitions[a.cardDefinitionId];
    const definitionB = definitions[b.cardDefinitionId];
    const typeOrder = (HAND_ORDER[definitionA?.type ?? ""] ?? 9) - (HAND_ORDER[definitionB?.type ?? ""] ?? 9);
    if (typeOrder !== 0) return typeOrder;

    const costA = definitionA && "cost" in definitionA ? definitionA.cost : Number.POSITIVE_INFINITY;
    const costB = definitionB && "cost" in definitionB ? definitionB.cost : Number.POSITIVE_INFINITY;
    if (costA !== costB) return costA - costB;

    const nameOrder = (definitionA?.name ?? "").localeCompare(definitionB?.name ?? "", "es", { sensitivity: "base" });
    return nameOrder || a.zoneOrder - b.zoneOrder || a.instanceId.localeCompare(b.instanceId);
  });
}

export type CharacterDerivedStats = { attack: number; health: number };

export function getCharacterDerivedStats(character: CardInstance, attachedRelics: CardInstance[], definitions: Record<string, CardDefinition>): CharacterDerivedStats {
  const definition = definitions[character.cardDefinitionId];
  if (!definition || definition.type !== "CHARACTER") return { attack: 0, health: 0 };
  const base = definition as CharacterCardDefinition;
  const derived = attachedRelics.reduce((stats, relic) => {
    const relicDefinition = definitions[relic.cardDefinitionId];
    if (!relicDefinition || relicDefinition.type !== "RELIC") return stats;
    const modifiers = relicDefinition as RelicCardDefinition;
    return {
      attack: stats.attack + (modifiers.attackModifier ?? 0),
      health: stats.health + (modifiers.healthModifier ?? 0),
    };
  }, { attack: base.attack + (character.manualAttackModifier ?? 0), health: base.health + (character.manualHealthModifier ?? 0) });
  return { attack: Math.max(0, derived.attack), health: Math.max(0, derived.health) };
}

export function formatModifier(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return value >= 0 ? `+${value}` : `${value}`;
}

export type VisibleMarker = {
  id: string;
  label: string;
  value: number;
};

function normalizedKeyword(keyword: string) {
  return keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

export function getVisibleMarkersForCards(cards: CardInstance[], playerId: PlayerId, definitions: Record<string, CardDefinition>): VisibleMarker[] {
  const vestigio = cards.filter((card) => {
    if (card.zone !== "GRAVEYARD" || card.controllerId !== playerId) return false;
    const keywords = definitions[card.cardDefinitionId]?.keywords ?? [];
    return keywords.some((keyword) => {
      const normalized = normalizedKeyword(keyword);
      return normalized === "VESTIGIO" || normalized === "VESTIGIOS";
    });
  }).length;
  return [{ id: "VESTIGIO", label: "Vestigio", value: vestigio }];
}

export function getVisibleMarkers(state: GameState, playerId: PlayerId, definitions: Record<string, CardDefinition>): VisibleMarker[] {
  return getVisibleMarkersForCards(Object.values(state.cardInstances), playerId, definitions);
}
