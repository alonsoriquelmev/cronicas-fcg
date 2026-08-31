import generatedCards from "./generated/cards.generated.json";
import type { CardDefinition } from "../../domain/cards/card.types";
import { parseCardCatalog } from "./schema";

export const cardCatalog: CardDefinition[] = parseCardCatalog(generatedCards) as CardDefinition[];
export const cardDefinitionsById = Object.fromEntries(cardCatalog.map((card) => [card.id, card])) as Record<string, CardDefinition>;

export function getCardDefinition(id: string): CardDefinition | undefined {
  return cardDefinitionsById[id];
}

export type CardImageVariant = "board" | "detail";

export function getCardImageSource(definition: CardDefinition | null | undefined, variant: CardImageVariant = "board"): string | null {
  const image = definition?.image;
  if (typeof image === "string") return image;
  if (!image || typeof image !== "object") return null;
  return image[variant] ?? image.board ?? image.detail ?? null;
}

export const developmentCardCatalog = cardCatalog.filter((card) => card.status === "TESTING");
