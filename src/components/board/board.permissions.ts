import type { CardDefinition } from "@/domain/cards/card.types";
import type { CardInstance, CardZone } from "@/domain/game/game.types";

export type BoardContextAction = "INSPECT" | "TAP" | "UNTAP" | "COUNTER" | "TO_GRAVEYARD" | "TO_HAND" | "TO_FIELD" | "DETACH";

export function supportsGenericCounter(definition?: CardDefinition | null) {
  return definition !== undefined && definition !== null && definition.type !== "CHARACTER" && definition.type !== "ESSENCE" && definition.type !== "SANCTUARY";
}

export function canEditCard(card: CardInstance, localPlayerId: string) {
  return card.controllerId === localPlayerId;
}

export function canTapCard(card: CardInstance, localPlayerId: string) {
  return canEditCard(card, localPlayerId) && card.zone !== "HAND" && card.zone !== "MAIN_DECK" && card.zone !== "ESSENCE_DECK" && card.zone !== "GRAVEYARD" && card.zone !== "SANCTUARY";
}

export function canDragCard(card: CardInstance, localPlayerId: string) {
  return canEditCard(card, localPlayerId) && card.zone !== "ESSENCE_ZONE" && card.zone !== "SANCTUARY";
}

export function getContextActions(card: CardInstance, localPlayerId: string, definition?: CardDefinition | null): BoardContextAction[] {
  if (!canEditCard(card, localPlayerId)) return ["INSPECT"];
  const actions: BoardContextAction[] = ["INSPECT"];
  if (canTapCard(card, localPlayerId)) {
    actions.push(card.tapped ? "UNTAP" : "TAP");
    if (supportsGenericCounter(definition)) actions.push("COUNTER");
  }
  if (card.zone === "FIELD" || card.zone === "VERSE_RESOLUTION" || card.zone === "HAND") actions.push("TO_GRAVEYARD");
  if (card.zone === "GRAVEYARD") actions.push("TO_HAND", "TO_FIELD");
  if (card.attachedToInstanceId) actions.push("DETACH");
  return actions;
}

export function canMoveFromGraveyardTo(card: CardInstance, target: CardZone, localPlayerId: string) {
  return card.zone === "GRAVEYARD" && canEditCard(card, localPlayerId) && (target === "HAND" || target === "FIELD");
}
