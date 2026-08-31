import type { CardDefinition } from "../cards/card.types";
import type { GameAction } from "./game.actions";
import type { CardInstance } from "./game.types";

export type DropTarget = "FIELD" | "VERSE_RESOLUTION" | "GRAVEYARD" | "HAND" | { type: "FIELD_SLOT"; slotId: string } | { type: "CHARACTER_SLOT"; characterInstanceId: string };

export const DROP_TARGET_IDS = {
  FIELD: "FIELD",
  VERSE_RESOLUTION: "VERSE_RESOLUTION",
  GRAVEYARD: "GRAVEYARD",
  HAND: "HAND",
  fieldSlot: (slotId: string) => `FIELD_SLOT:${slotId}`,
  characterSlot: (characterInstanceId: string) => `CHARACTER_SLOT:${characterInstanceId}`,
};

export function parseDropTarget(id: string): DropTarget | null {
  if (id === DROP_TARGET_IDS.FIELD || id === DROP_TARGET_IDS.VERSE_RESOLUTION || id === DROP_TARGET_IDS.GRAVEYARD || id === DROP_TARGET_IDS.HAND) return id as DropTarget;
  if (id.startsWith("FIELD_SLOT:")) {
    const slotId = id.slice("FIELD_SLOT:".length);
    return slotId ? { type: "FIELD_SLOT", slotId } : null;
  }
  if (id.startsWith("CHARACTER_SLOT:")) {
    const characterInstanceId = id.slice("CHARACTER_SLOT:".length);
    return characterInstanceId ? { type: "CHARACTER_SLOT", characterInstanceId } : null;
  }
  return null;
}

function typeOf(card: CardInstance | undefined, definitions: Record<string, CardDefinition>) {
  return card ? definitions[card.cardDefinitionId]?.type : undefined;
}

function ownCharacter(character: CardInstance | undefined, viewerId: string, definitions: Record<string, CardDefinition>) {
  return character?.controllerId === viewerId && character.zone === "FIELD" && typeOf(character, definitions) === "CHARACTER";
}

function looseRelic(card: CardInstance | undefined, definitions: Record<string, CardDefinition>) {
  return card?.zone === "FIELD" && typeOf(card, definitions) === "RELIC" && card.attachedToInstanceId === null;
}

function fieldSlotCard(target: Extract<DropTarget, { type: "FIELD_SLOT" }>, cards: Record<string, CardInstance>) {
  return cards[target.slotId];
}

export function canDropCardOnTarget(card: CardInstance, target: DropTarget, viewerId: string, definitions: Record<string, CardDefinition>, cards: Record<string, CardInstance>) {
  if (card.controllerId !== viewerId) return false;
  const type = typeOf(card, definitions);
  if (target === "FIELD") return (card.zone === "HAND" && type === "CHARACTER") || (card.zone === "FIELD" && type === "RELIC");
  if (target === "VERSE_RESOLUTION") return card.zone === "HAND" && type === "VERSE";
  if (target === "GRAVEYARD") return (card.zone === "FIELD" && (type === "CHARACTER" || type === "RELIC")) || card.zone === "VERSE_RESOLUTION";
  if (target === "HAND") return card.zone === "GRAVEYARD";
  if (target.type === "CHARACTER_SLOT") return ownCharacter(cards[target.characterInstanceId], viewerId, definitions) && ((card.zone === "HAND" && type === "RELIC") || looseRelic(card, definitions));
  const occupant = fieldSlotCard(target, cards);
  if (!occupant) return (card.zone === "HAND" && type === "CHARACTER") || (card.zone === "FIELD" && type === "RELIC");
  return looseRelic(occupant, definitions) && card.zone === "HAND" && type === "CHARACTER";
}

export function dropActionForTarget(card: CardInstance, target: DropTarget, viewerId: string, definitions: Record<string, CardDefinition>, cards: Record<string, CardInstance>): GameAction | null {
  if (!canDropCardOnTarget(card, target, viewerId, definitions, cards)) return null;
  if (target === "FIELD") {
    if (card.zone === "HAND" && typeOf(card, definitions) === "CHARACTER") return { type: "PLAY_CHARACTER", instanceId: card.instanceId, playerId: viewerId };
    if (card.zone === "FIELD" && typeOf(card, definitions) === "RELIC" && card.attachedToInstanceId !== null) return { type: "DETACH_RELIC", relicInstanceId: card.instanceId };
    return null;
  }
  if (target === "VERSE_RESOLUTION") return { type: "PLAY_VERSE", instanceId: card.instanceId, playerId: viewerId };
  if (target === "GRAVEYARD") return card.zone === "VERSE_RESOLUTION" ? { type: "RESOLVE_VERSE", instanceId: card.instanceId, playerId: viewerId } : { type: "MOVE_CARD", instanceId: card.instanceId, toZone: "GRAVEYARD", controllerId: viewerId };
  if (target === "HAND") return { type: "MOVE_CARD", instanceId: card.instanceId, toZone: "HAND", controllerId: viewerId };
  if (target.type === "CHARACTER_SLOT") return card.zone === "HAND" ? { type: "PLAY_RELIC", instanceId: card.instanceId, playerId: viewerId, attachedToInstanceId: target.characterInstanceId } : { type: "ATTACH_RELIC", relicInstanceId: card.instanceId, characterInstanceId: target.characterInstanceId };
  const occupant = fieldSlotCard(target, cards);
  if (occupant && looseRelic(occupant, definitions) && card.zone === "HAND" && typeOf(card, definitions) === "CHARACTER") return { type: "PLAY_CHARACTER_ATTACH_RELIC", characterInstanceId: card.instanceId, relicInstanceId: occupant.instanceId, playerId: viewerId };
  if (card.zone === "HAND" && typeOf(card, definitions) === "CHARACTER") return { type: "PLAY_CHARACTER", instanceId: card.instanceId, playerId: viewerId };
  if (card.zone === "FIELD" && typeOf(card, definitions) === "RELIC" && card.attachedToInstanceId !== null) return { type: "DETACH_RELIC", relicInstanceId: card.instanceId };
  return null;
}
