import type { CardDefinition } from "../cards/card.types";
import type { CharacterMarker } from "./character-markers";

export type PlayerId = string;
export type GameId = string;
export type RoomId = string;
export type CardInstanceId = string;
export type CardDefinitionId = string;
export type CardZone = "MAIN_DECK" | "ESSENCE_DECK" | "HAND" | "FIELD" | "ESSENCE_ZONE" | "SANCTUARY" | "GRAVEYARD" | "VERSE_RESOLUTION" | "DECK_LOOK" | "DEVASTATED";
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
  manualAttackModifier?: number;
  manualHealthModifier?: number;
  devastatedFromZone?: "FIELD" | "GRAVEYARD";
  devastatedFromAttachedToInstanceId?: CardInstanceId | null;
};

export type DeckLookMode = "LOOK" | "SEARCH";

export type DeckLookState = {
  orderedInstanceIds: CardInstanceId[];
  mode?: DeckLookMode;
  revealedInstanceIds?: CardInstanceId[];
};

export type DeckSearchReveal = {
  playerId: PlayerId;
  instanceIds: CardInstanceId[];
};

export type CharacterStatChangeProposal = {
  proposalId: string;
  characterInstanceId: CardInstanceId;
  proposerId: PlayerId;
  attackDelta: number;
  healthDelta: number;
};

export type VirtualEssenceChangeProposal = {
  proposalId: string;
  playerId: PlayerId;
  amount: number;
};

export type TurnPhaseProgress = {
  turnNumber: number;
  playerId: PlayerId;
  essenceDrawn: boolean;
  mainCardDrawn: boolean;
};

export type PlayerGameState = {
  playerId: PlayerId;
  displayName: string;
  sanctuaryHp: number;
  virtualEssenceCount: number;
};

export type GameState = {
  gameId: GameId;
  roomId: RoomId;
  revision: number;
  turnNumber: number;
  activePlayerId: PlayerId;
  startingPlayerId: PlayerId;
  phase: GamePhase;
  phaseProgress?: TurnPhaseProgress;
  players: Record<PlayerId, PlayerGameState>;
  cardInstances: Record<CardInstanceId, CardInstance>;
  deckLooks?: Record<PlayerId, DeckLookState>;
  pendingStatChanges?: Record<CardInstanceId, CharacterStatChangeProposal>;
  pendingVirtualEssenceChanges?: Record<PlayerId, VirtualEssenceChangeProposal>;
  characterMarkers?: Record<CardInstanceId, CharacterMarker[]>;
};

export type CardView = CardInstance & { definition: CardDefinition };
export type HiddenCardView = Pick<CardInstance, "instanceId" | "ownerId" | "controllerId" | "zone" | "zoneOrder" | "faceUp">;
export type FaceDownPublicCardView = CardInstance & { cardDefinitionId: string; definition: null; hidden: true };
export type HiddenZoneCounts = { HAND: number; MAIN_DECK: number; ESSENCE_DECK: number };
export type PlayerViewCard = CardView | FaceDownPublicCardView;
export type PlayerView = Omit<GameState, "cardInstances" | "deckLooks"> & {
  cardInstances: PlayerViewCard[];
  deckLook: DeckLookState | null;
  deckReveal: DeckSearchReveal | null;
  hiddenCounts: Record<PlayerId, HiddenZoneCounts>;
  publicCounts: Record<PlayerId, HiddenZoneCounts>;
};
