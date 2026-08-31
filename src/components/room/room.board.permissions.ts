import type { CardDefinition } from "@/domain/cards/card.types";
import type { CardInstance } from "@/domain/game/game.types";

export type RoomContextAction = "INSPECT" | "TAP" | "UNTAP" | "DETACH" | "SEND_TO_GRAVEYARD" | "RETURN_TO_HAND" | "MOVE_TO_FIELD" | "MOVE_TO_RESOLUTION" | "RESOLVE" | "DRAW_CARD" | "DRAW_ESSENCE" | "SEND_TOP_TO_GRAVEYARD" | "SHUFFLE_MAIN_DECK" | "SHUFFLE_INTO_MAIN_DECK" | "RETURN_ESSENCE_TO_DECK_BOTTOM" | "MODIFY_CHARACTER_STATS" | "LOOK_MAIN_DECK" | "DEVASTATE" | "REVERT_DEVASTATION";
export type RoomViewCard = CardInstance & { definition?: CardDefinition | null; hidden?: boolean };
export type CentralZone = "ESSENCE_ZONE" | "FIELD";

const publicZones = new Set<CardInstance["zone"]>(["FIELD", "ESSENCE_ZONE", "SANCTUARY", "GRAVEYARD", "VERSE_RESOLUTION", "DEVASTATED"]);

export function getPublicCardContextActions(card: RoomViewCard, editable = false): RoomContextAction[] {
  if (!publicZones.has(card.zone) || !card.definition) return [];
  if (!editable) return ["INSPECT"];
  if (card.zone === "DEVASTATED") return ["INSPECT", "REVERT_DEVASTATION"];
  if (card.zone === "ESSENCE_ZONE") {
    return card.definition.type === "ESSENCE" ? ["INSPECT", card.tapped ? "UNTAP" : "TAP", "RETURN_ESSENCE_TO_DECK_BOTTOM"] : ["INSPECT"];
  }
  if (card.zone === "VERSE_RESOLUTION") return ["INSPECT", "RESOLVE"];
  if (card.zone === "GRAVEYARD") {
    return card.definition.type === "VERSE"
      ? ["INSPECT", "RETURN_TO_HAND", "MOVE_TO_RESOLUTION", "SHUFFLE_INTO_MAIN_DECK", "DEVASTATE"]
      : ["INSPECT", "RETURN_TO_HAND", "MOVE_TO_FIELD", "SHUFFLE_INTO_MAIN_DECK", "DEVASTATE"];
  }
  if (card.zone !== "FIELD") return ["INSPECT"];
  const actions: RoomContextAction[] = ["INSPECT", card.tapped ? "UNTAP" : "TAP", "SEND_TO_GRAVEYARD", "RETURN_TO_HAND", "DEVASTATE"];
  if (card.definition.type === "CHARACTER") actions.push("MODIFY_CHARACTER_STATS");
  if (card.definition.type === "RELIC" && card.attachedToInstanceId !== null) actions.push("DETACH");
  return actions;
}

export function getDeckContextActions(deck: "MAIN_DECK" | "ESSENCE_DECK", opponent: boolean): RoomContextAction[] {
  if (opponent) return [];
  return deck === "MAIN_DECK" ? ["DRAW_CARD", "LOOK_MAIN_DECK", "SEND_TOP_TO_GRAVEYARD", "SHUFFLE_MAIN_DECK"] : ["DRAW_ESSENCE"];
}

export function getHandCardContextActions(card: RoomViewCard): RoomContextAction[] {
  return card.zone === "HAND" && card.definition ? ["INSPECT", "SEND_TO_GRAVEYARD", "SHUFFLE_INTO_MAIN_DECK"] : [];
}

export function getDeckClickAction(): null {
  return null;
}

export function getCentralZoneOrder(opponent: boolean): [CentralZone, CentralZone] {
  return opponent ? ["ESSENCE_ZONE", "FIELD"] : ["FIELD", "ESSENCE_ZONE"];
}
