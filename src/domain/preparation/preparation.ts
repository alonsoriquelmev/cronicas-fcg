import type { CardDefinition, CardType } from "../cards/card.types";

export const MAIN_DECK_SIZE = 35;
export const MAX_COPIES_PER_CARD = 3;
export const INITIAL_HAND_SIZE = 5;
export const ESSENCE_DECK_SIZE = 10;

export const PREPARATION_FACTIONS = [
  { id: "ORDEN", name: "Orden" },
  { id: "INSTINTO", name: "Instinto" },
  { id: "FORJA", name: "Forja" },
  { id: "CAOS", name: "Caos" },
  { id: "VALOR", name: "Valor" },
  { id: "ERRANTES", name: "Errantes" },
] as const;

export type PreparationStage = "DECK_SELECTION" | "STARTING_PLAYER" | "ESSENCE_ORDERING" | "INITIAL_DRAW" | "MULLIGAN" | "READY_TO_START" | "IN_GAME";
export type MulliganDecision = "KEEP" | "MULLIGAN";
export type PlayerLoadout = { faction: string; mainDeck: string[]; sanctuary: string; essenceDeck: string[] };
export type PreparationPlayer = { playerId: string; displayName: string; faction: string | null; loadout: PlayerLoadout | null; startingPlayerRoll: number | null; essenceConfirmed: boolean; initialDrawConfirmed: boolean; mulliganDecision: MulliganDecision | null; mulliganSelectedInstanceIds: string[] };
export type PreparationState = { stage: PreparationStage; startingPlayerId: string | null; startingPlayerRollWinnerId: string | null; players: Record<string, PreparationPlayer> };

export type CatalogEntry = Pick<CardDefinition, "id" | "name" | "type" | "factionId" | "subtype"> & { essenceKind?: "BASIC" | "SPECIAL" };

export function eligibleForFaction(definition: CatalogEntry, faction: string) {
  return definition.factionId === faction;
}

export function mainDeckDefinitions(catalog: CatalogEntry[], faction: string) {
  return catalog.filter((definition) => eligibleForFaction(definition, faction) && definition.type !== "ESSENCE" && definition.type !== "SANCTUARY");
}

export function sanctuaryDefinitions(catalog: CatalogEntry[], faction: string) {
  return catalog.filter((definition) => definition.type === "SANCTUARY" && (definition.factionId === faction || definition.factionId === null));
}

export function essenceDefinitions(catalog: CatalogEntry[], faction: string) {
  return catalog.filter((definition) => eligibleForFaction(definition, faction) && definition.type === "ESSENCE");
}

export function defaultEssenceDeck(catalog: CatalogEntry[], faction: string) {
  const available = essenceDefinitions(catalog, faction);
  const source = available;
  return Array.from({ length: ESSENCE_DECK_SIZE }, (_, index) => source[index % source.length]?.id).filter((id): id is string => Boolean(id));
}

export function allowedSpecialEssencePositions(startingPlayer: boolean) {
  return new Set(startingPlayer ? [2, 4, 6, 8] : [1, 3, 5, 7]);
}

export function isSpecialEssence(definition: CatalogEntry) {
  return definition.type === "ESSENCE" && (definition.essenceKind === "SPECIAL" || definition.subtype === "SPECIAL");
}

export function rollStartingPlayerDie(random: () => number = Math.random) {
  return Math.floor(random() * 6) + 1;
}

export function resolveStartingPlayerRolls(players: Array<Pick<PreparationPlayer, "playerId" | "startingPlayerRoll">>) {
  if (players.length !== 2 || players.some((player) => player.startingPlayerRoll === null || player.startingPlayerRoll === undefined)) return null;
  if (players[0].startingPlayerRoll === players[1].startingPlayerRoll) return "TIE" as const;
  return (players[0].startingPlayerRoll ?? 0) > (players[1].startingPlayerRoll ?? 0) ? players[0].playerId : players[1].playerId;
}

export function validateEssenceOrder(orderedDefinitionIds: unknown, catalog: Record<string, CatalogEntry>, startingPlayer: boolean) {
  if (!Array.isArray(orderedDefinitionIds) || orderedDefinitionIds.length !== ESSENCE_DECK_SIZE) return { ok: false as const, error: `El Mazo de Esencias debe tener exactamente ${ESSENCE_DECK_SIZE} cartas` };
  const specialPositions = allowedSpecialEssencePositions(startingPlayer);
  for (const [index, cardId] of orderedDefinitionIds.entries()) {
    const definition = typeof cardId === "string" ? catalog[cardId] : undefined;
    if (!definition || definition.type !== "ESSENCE") return { ok: false as const, error: "Configuracion de Esencias invalida" };
    if (isSpecialEssence(definition) && !specialPositions.has(index + 1)) return { ok: false as const, error: `La Esencia especial no puede ocupar la posicion ${index + 1}` };
  }
  return { ok: true as const };
}

export function validateLoadout(input: unknown, catalog: Record<string, CatalogEntry>) {
  if (!input || typeof input !== "object") return { ok: false as const, error: "Loadout invalido" };
  const value = input as Partial<PlayerLoadout>;
  const isLegacyTestCatalog = value.faction === "TEST" && Object.keys(catalog).some((id) => id.startsWith("mock-"));
  if (typeof value.faction !== "string" || (!PREPARATION_FACTIONS.some((faction) => faction.id === value.faction) && !isLegacyTestCatalog)) return { ok: false as const, error: "Faccion invalida" };
  if (!Array.isArray(value.mainDeck) || value.mainDeck.length !== MAIN_DECK_SIZE) return { ok: false as const, error: `El Mazo Principal debe tener exactamente ${MAIN_DECK_SIZE} cartas` };
  if (!Array.isArray(value.essenceDeck) || value.essenceDeck.length !== ESSENCE_DECK_SIZE) return { ok: false as const, error: `El Mazo de Esencias debe tener exactamente ${ESSENCE_DECK_SIZE} cartas` };
  if (typeof value.sanctuary !== "string") return { ok: false as const, error: "Debes seleccionar un Santuario" };
  const counts = new Map<string, number>();
  for (const cardId of value.mainDeck) {
    if (typeof cardId !== "string") return { ok: false as const, error: "El Mazo Principal contiene una carta invalida" };
    const definition = catalog[cardId];
    const count = (counts.get(cardId) ?? 0) + 1;
    counts.set(cardId, count);
    if (!definition || !eligibleForFaction(definition, value.faction) || definition.type === "ESSENCE" || definition.type === "SANCTUARY") return { ok: false as const, error: "El Mazo Principal contiene una carta no elegible" };
    if (count > MAX_COPIES_PER_CARD) return { ok: false as const, error: `No puedes usar mas de ${MAX_COPIES_PER_CARD} copias de una carta` };
  }
  const sanctuary = catalog[value.sanctuary];
  if (!sanctuary || sanctuary.type !== "SANCTUARY" || (sanctuary.factionId !== value.faction && sanctuary.factionId !== null)) return { ok: false as const, error: "Santuario invalido" };
  for (const cardId of value.essenceDeck) {
    const definition = typeof cardId === "string" ? catalog[cardId] : undefined;
    if (!definition || definition.type !== "ESSENCE" || !eligibleForFaction(definition, value.faction)) return { ok: false as const, error: "Configuracion de Esencias invalida" };
  }
  return { ok: true as const, loadout: { faction: value.faction, mainDeck: [...value.mainDeck], sanctuary: value.sanctuary, essenceDeck: [...value.essenceDeck] } };
}

export function formatCardType(type: CardType) {
  return type === "CHARACTER" ? "Character" : type === "RELIC" ? "Relic" : type === "VERSE" ? "Verse" : type;
}
