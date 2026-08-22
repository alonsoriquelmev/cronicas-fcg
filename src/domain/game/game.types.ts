import type { CardDefinition } from "../cards/card.types";

export type PlayerId = string;
export type GameId = string;
export type RoomId = string;
export type CardInstanceId = string;
export type CardDefinitionId = string;
export type CardZone = "MAIN_DECK" | "ESSENCE_DECK" | "HAND" | "FIELD" | "ESSENCE_ZONE" | "SANCTUARY" | "GRAVEYARD" | "VERSE_RESOLUTION";
export type GamePhase = "ALBA" | "AMANECER" | "MEDIODIA" | "ANOCHECER";

export type CardInstance = {
  instanceId: CardInstanceId;
  cardDefinitionId: CardDefinitionId;
  ownerId: PlayerId;
  controllerId: PlayerId;
  zone: CardZone;
  zoneOrder: number;
  tapped: boolean;
  faceUp: boolean;
  attachedToInstanceId: CardInstanceId | null;
  counter: number;
};

export type PlayerGameState = { playerId: PlayerId; displayName: string; sanctuaryHp: number };

export type GameState = {
  gameId: GameId;
  roomId: RoomId;
  revision: number;
  turnNumber: number;
  activePlayerId: PlayerId;
  startingPlayerId: PlayerId;
  phase: GamePhase;
  players: Record<PlayerId, PlayerGameState>;
  cardInstances: Record<CardInstanceId, CardInstance>;
};

export type CardView = CardInstance & { definition: CardDefinition };
export type HiddenCardView = Pick<CardInstance, "instanceId" | "ownerId" | "controllerId" | "zone" | "zoneOrder" | "faceUp">;
export type PlayerView = Omit<GameState, "cardInstances"> & { cardInstances: Record<CardInstanceId, CardView | HiddenCardView> };
