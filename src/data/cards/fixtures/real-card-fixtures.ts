import testCards from "../generated/test-cards.json";
import { parseCardCatalog } from "../schema";

// The local PDF could not be extracted reliably in this environment. These IDs
// are explicitly development fixtures, not claims about official card metadata.
export const structuredFixtureIds = [
  "fixture-character-001",
  "fixture-relic-001",
  "fixture-verse-001",
  "fixture-essence-001",
] as const;

const testCardCatalog = parseCardCatalog(testCards);
export const testCardDefinitionsById = Object.fromEntries(testCardCatalog.map((card) => [card.id, card]));
export const structuredCardFixtures = structuredFixtureIds.map((id) => testCardDefinitionsById[id]).filter((card): card is NonNullable<typeof card> => Boolean(card));
