export type CardType = "CHARACTER" | "RELIC" | "VERSE" | "ESSENCE" | "SANCTUARY";
export type CardStatus = "RELEASED" | "TESTING";

export type CardDefinitionBase = {
  id: string;
  name: string;
  type: CardType;
  factionId: string | null;
  subtype: string | null;
  image: { board: string | null; detail: string | null };
  setId: string;
  collectorNumber: string;
  rarity: string;
  status: CardStatus;
};

export type CharacterCardDefinition = CardDefinitionBase & {
  type: "CHARACTER";
  cost: number;
  attack: number;
  health: number;
  rulesText: string | null;
};

export type RelicCardDefinition = CardDefinitionBase & {
  type: "RELIC";
  cost: number;
  attackModifier: number | null;
  healthModifier: number | null;
  rulesText: string | null;
};

export type VerseCardDefinition = CardDefinitionBase & {
  type: "VERSE";
  cost: number;
  prologueText: string | null;
  epilogueText: string | null;
};

export type EssenceCardDefinition = CardDefinitionBase & {
  type: "ESSENCE";
  rulesText: string | null;
};

export type SanctuaryCardDefinition = CardDefinitionBase & {
  type: "SANCTUARY";
  health: number;
  rulesText: string | null;
};

export type CardDefinition = CharacterCardDefinition | RelicCardDefinition | VerseCardDefinition | EssenceCardDefinition | SanctuaryCardDefinition;
