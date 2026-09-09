"use client";

import { useMutation } from "convex/react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { api } from "@/../convex/_generated/api";
import { cardCatalog, cardDefinitionsById } from "@/data/cards/catalog";
import type { CardDefinition } from "@/domain/cards/card.types";
import type { CardInstance } from "@/domain/game/game.types";
import { CardInspection } from "@/components/board/CardInspection";
import { GameCard } from "@/components/board/GameCard";
import {
  buildRoomInviteUrl,
  copyTextToClipboard,
} from "@/components/room/room.invite";
import {
  alliedCardCount,
  defaultEssenceDeck,
  essenceDefinitions,
  formatCardType,
  isSpecialEssence,
  mainDeckDefinitions,
  MAX_SPECIAL_ESSENCES,
  MAX_SPECIAL_ESSENCES_PER_ALLIED_FACTION,
  PREPARATION_FACTIONS,
  sanctuaryDefinitions,
  validateEssenceOrder,
  type CatalogEntry,
  type GameFormat,
  type PlayerLoadout,
} from "@/domain/preparation/preparation";

type PreparationPlayerView = {
  playerId: string;
  displayName: string;
  faction: string | null;
  loadoutSubmitted: boolean;
  startingPlayerRoll: number | null;
  essenceConfirmed: boolean;
  initialDrawConfirmed: boolean;
  mulliganConfirmed: boolean;
};
type PreparationView = {
  format?: GameFormat;
  stage: string;
  startingPlayerId: string | null;
  startingPlayerRollWinnerId: string | null;
  players: PreparationPlayerView[];
  you: {
    faction: string | null;
    loadout: PlayerLoadout | null;
    startingPlayerRoll: number | null;
    essenceConfirmed: boolean;
    initialDrawConfirmed: boolean;
    mulliganDecision: "KEEP" | "MULLIGAN" | null;
    mulliganSelectedInstanceIds: string[];
  } | null;
} | null;
type PreparationCard = CardInstance & { definition?: CardDefinition | null };
type PreparationGameView = {
  cardInstances: PreparationCard[];
  players: Record<
    string,
    { playerId: string; displayName: string; sanctuaryHp: number }
  >;
};
export type RoomPreparationView = {
  status: string;
  code: string;
  playerId: string;
  seat: string;
  players: { playerId: string; displayName: string; seat: string }[];
  preparation: PreparationView;
  game: PreparationGameView | null;
};
type SavedDeck = PlayerLoadout & { id: string; name: string };

const catalogById = cardDefinitionsById;
const SAVED_DECKS_KEY = "cronicas:saved-decks";
const SAVED_DECKS_EVENT = "cronicas:saved-decks-changed";
const preparationCard = (id: string, index: number): PreparationCard => ({
  instanceId: `preparation-essence-${index}-${id}`,
  cardDefinitionId: id,
  ownerId: "preparation",
  controllerId: "preparation",
  zone: "ESSENCE_DECK",
  zoneOrder: index,
  tapped: false,
  faceUp: true,
  attachedToInstanceId: null,
  counter: 0,
  definition: cardDefinitionsById[id],
});
const noStoreSubscription = () => () => {};
const getClientOrigin = () => window.location.origin;
const getServerOrigin = () => "";

function useBrowserOrigin() {
  return useSyncExternalStore(
    noStoreSubscription,
    getClientOrigin,
    getServerOrigin,
  );
}

function parseSavedDecks(raw: string): SavedDeck[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is SavedDeck => {
      if (!value || typeof value !== "object") return false;
      const deck = value as Record<string, unknown>;
      return (
        typeof deck.id === "string" &&
        typeof deck.name === "string" &&
        typeof deck.faction === "string" &&
        typeof deck.sanctuary === "string" &&
        Array.isArray(deck.mainDeck) &&
        deck.mainDeck.every((id) => typeof id === "string") &&
        Array.isArray(deck.essenceDeck) &&
        deck.essenceDeck.every((id) => typeof id === "string")
      );
    });
  } catch {
    return [];
  }
}

const getSavedDecksSnapshot = () =>
  typeof window === "undefined"
    ? "[]"
    : (window.localStorage.getItem(SAVED_DECKS_KEY) ?? "[]");
const getServerSavedDecksSnapshot = () => "[]";
const subscribeSavedDecks = (onChange: () => void) => {
  window.addEventListener("storage", onChange);
  window.addEventListener(SAVED_DECKS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SAVED_DECKS_EVENT, onChange);
  };
};

function writeSavedDecks(decks: SavedDeck[]) {
  window.localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(decks));
  window.dispatchEvent(new Event(SAVED_DECKS_EVENT));
}

function CopyIconButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-amber-200/30 text-amber-100 transition hover:border-amber-100/70 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span aria-hidden="true" className="relative block h-4 w-4">
        <span className="absolute right-0 top-0 h-3 w-3 rounded-[2px] border border-current" />
        <span className="absolute bottom-0 left-0 h-3 w-3 rounded-[2px] border border-current bg-[#15120f]" />
      </span>
    </button>
  );
}

export function PreparationScreen({
  view,
  sessionToken,
}: {
  view: RoomPreparationView;
  sessionToken: string;
}) {
  const submitLoadout = useMutation(api.rooms.submitLoadout);
  const confirmEssenceOrder = useMutation(api.rooms.confirmEssenceOrder);
  const rollStartingPlayer = useMutation(api.rooms.rollStartingPlayer);
  const chooseStartingPlayer = useMutation(api.rooms.chooseStartingPlayer);
  const confirmInitialDraw = useMutation(api.rooms.confirmInitialDraw);
  const submitMulligan = useMutation(api.rooms.submitMulligan);
  const preparation = view.preparation;
  const ownLoadout = preparation?.you?.loadout;
  const [faction, setFaction] = useState(ownLoadout?.faction ?? "ORDEN");
  const [deck, setDeck] = useState<string[]>(ownLoadout?.mainDeck ?? []);
  const [sanctuary, setSanctuary] = useState(
    ownLoadout?.sanctuary ??
      sanctuaryDefinitions(cardCatalog, "ORDEN")[0]?.id ??
      "",
  );
  const [essenceOrder, setEssenceOrder] = useState<string[]>(
    ownLoadout?.essenceDeck ?? defaultEssenceDeck(cardCatalog, "ORDEN"),
  );
  const [error, setError] = useState("");
  const [inspected, setInspected] = useState<PreparationCard | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [rollFeedback, setRollFeedback] = useState("");
  const [deckName, setDeckName] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const origin = useBrowserOrigin();
  const inviteUrl = origin ? buildRoomInviteUrl(origin, view.code) : "";
  const activeFormat = preparation?.format ?? "FACTION_WAR";
  const available = useMemo(
    () => mainDeckDefinitions(cardCatalog, faction, activeFormat),
    [faction, activeFormat],
  );
  const specialEssences = useMemo(
    () =>
      essenceDefinitions(cardCatalog, faction, activeFormat).filter(
        isSpecialEssence,
      ),
    [faction, activeFormat],
  );
  const sanctuaryOptions = useMemo(
    () => sanctuaryDefinitions(cardCatalog, faction),
    [faction],
  );
  const counts = useMemo(
    () =>
      deck.reduce<Record<string, number>>(
        (result, id) => ({ ...result, [id]: (result[id] ?? 0) + 1 }),
        {},
      ),
    [deck],
  );
  const hand = (view.game?.cardInstances ?? [])
    .filter(
      (card) => card.zone === "HAND" && card.controllerId === view.playerId,
    )
    .sort((left, right) => left.zoneOrder - right.zoneOrder);
  const savedDecksSnapshot = useSyncExternalStore(
    subscribeSavedDecks,
    getSavedDecksSnapshot,
    getServerSavedDecksSnapshot,
  );
  const savedDecks = useMemo(
    () => parseSavedDecks(savedDecksSnapshot),
    [savedDecksSnapshot],
  );

  const changeFaction = (value: string) => {
    setFaction(value);
    setDeck([]);
    setSanctuary(sanctuaryDefinitions(cardCatalog, value)[0]?.id ?? "");
    setEssenceOrder(defaultEssenceDeck(cardCatalog, value, activeFormat));
  };
  const addCard = (id: string) => {
    if ((counts[id] ?? 0) < 3 && deck.length < 35)
      setDeck((current) => [...current, id]);
  };
  const removeCard = (id: string) => {
    const index = deck.lastIndexOf(id);
    if (index >= 0)
      setDeck((current) =>
        current.filter((_, currentIndex) => currentIndex !== index),
      );
  };
  const fillTestDeck = () =>
    setDeck(
      Array.from(
        { length: 35 },
        (_, index) => available[index % available.length]?.id,
      ).filter((id): id is string => Boolean(id)),
    );
  const saveDeck = () => {
    const name = deckName.trim();
    if (!name || typeof window === "undefined") return;
    const existing = savedDecks.find(
      (saved) => saved.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    const saved: SavedDeck = {
      id:
        existing?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name,
      faction,
      mainDeck: [...deck],
      sanctuary,
      essenceDeck: [...essenceOrder],
    };
    writeSavedDecks([
      saved,
      ...savedDecks.filter((item) => item.id !== saved.id),
    ]);
    setSelectedDeckId("");
    setDeckName("");
  };
  const loadDeck = () => {
    const saved = savedDecks.find((item) => item.id === selectedDeckId);
    if (!saved) return;
    setFaction(saved.faction);
    setDeck([...saved.mainDeck]);
    setSanctuary(saved.sanctuary);
    setEssenceOrder([...saved.essenceDeck]);
  };
  const submit = async () => {
    setError("");
    try {
      await submitLoadout({
        code: view.code,
        playerSessionToken: sessionToken,
        loadout: {
          faction,
          mainDeck: deck,
          sanctuary,
          essenceDeck: essenceOrder,
        },
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo enviar el loadout",
      );
    }
  };
  const rebuildEssenceOrder = (specials: string[]) => {
    const basics = defaultEssenceDeck(
      cardCatalog,
      faction,
      activeFormat,
    ).filter((cardId) => !isSpecialEssence(cardDefinitionsById[cardId]));
    const next = [...specials];
    for (let index = 0; next.length < 10 && basics.length > 0; index += 1)
      next.push(basics[index % basics.length]);
    setEssenceOrder(next.slice(0, 10));
  };
  const addSpecialEssence = (id: string) => {
    const selected = essenceOrder.filter((cardId) =>
      isSpecialEssence(cardDefinitionsById[cardId]),
    );
    const definition = cardDefinitionsById[id];
    if (!definition || !isSpecialEssence(definition)) return;
    const factionLimit =
      activeFormat === "ALLIANCES"
        ? MAX_SPECIAL_ESSENCES_PER_ALLIED_FACTION
        : MAX_SPECIAL_ESSENCES;
    const sameFactionCount = selected.filter(
      (cardId) =>
        cardDefinitionsById[cardId]?.factionId === definition.factionId,
    ).length;
    if (
      selected.length >= MAX_SPECIAL_ESSENCES ||
      sameFactionCount >= factionLimit
    )
      return;
    rebuildEssenceOrder([...selected, id]);
  };
  const removeSpecialEssence = (id: string) => {
    const selected = essenceOrder.filter((cardId) =>
      isSpecialEssence(cardDefinitionsById[cardId]),
    );
    const index = selected.lastIndexOf(id);
    if (index < 0) return;
    rebuildEssenceOrder(
      selected.filter((_, currentIndex) => currentIndex !== index),
    );
  };
  const confirmOrder = async () => {
    setError("");
    try {
      await confirmEssenceOrder({
        code: view.code,
        playerSessionToken: sessionToken,
        orderedDefinitionIds: essenceOrder,
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo confirmar el orden",
      );
    }
  };
  const rollStartingPlayerDie = async (choice?: "SELF" | "OPPONENT") => {
    setError("");
    setRollFeedback("");
    try {
      if (choice) {
        await chooseStartingPlayer({
          code: view.code,
          playerSessionToken: sessionToken,
          choice,
        });
        return;
      }
      const result = await rollStartingPlayer({
        code: view.code,
        playerSessionToken: sessionToken,
      });
      if (result.tied)
        setRollFeedback("Empate. Ambos deben volver a lanzar el dado.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : choice
            ? "No se pudo elegir el jugador inicial"
            : "No se pudo lanzar el dado",
      );
    }
  };
  const confirmDraw = async () => {
    setError("");
    try {
      await confirmInitialDraw({
        code: view.code,
        playerSessionToken: sessionToken,
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo confirmar la mano inicial",
      );
    }
  };
  const confirmMulligan = async (
    decision: "KEEP" | "MULLIGAN",
    selectedInstanceIds: string[],
  ) => {
    setError("");
    try {
      await submitMulligan({
        code: view.code,
        playerSessionToken: sessionToken,
        decision,
        selectedInstanceIds,
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo confirmar el Mulligan",
      );
    }
  };
  const copyValue = async (value: string, successMessage: string) => {
    const copied = await copyTextToClipboard(value);
    setCopyFeedback(
      copied
        ? { kind: "success", message: successMessage }
        : {
            kind: "error",
            message: "No se pudo copiar. Selecciona el texto manualmente.",
          },
    );
    window.setTimeout(() => setCopyFeedback(null), 1800);
  };

  if (!preparation) {
    const creator =
      view.players.find((player) => player.seat === "PLAYER_1")?.displayName ??
      "Jugador creador";
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090807] p-6 text-zinc-100">
        <section className="w-full max-w-md border border-amber-200/20 bg-[#15120f] p-6">
          <p className="text-xs uppercase tracking-widest text-amber-300/70">
            Sala
          </p>
          <h1 className="mt-2 text-2xl font-semibold">{view.code}</h1>
          <p className="mt-3 text-sm text-zinc-400">Creada por {creator}</p>
          <div className="mt-7 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Codigo de sala
              </p>
              <div className="mt-2 flex items-center gap-3">
                <code
                  data-testid="room-code"
                  className="select-text text-xl font-semibold tracking-[0.2em] text-amber-100"
                >
                  {view.code}
                </code>
                <CopyIconButton
                  label="Copiar codigo"
                  onClick={() => void copyValue(view.code, "Codigo copiado")}
                />
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Link de invitacion
              </p>
              <div className="mt-2 flex items-start gap-3">
                <a
                  data-testid="room-invite-link"
                  href={inviteUrl || undefined}
                  className="min-w-0 flex-1 break-all text-sm text-amber-100 underline decoration-amber-200/30 underline-offset-4"
                >
                  {inviteUrl || "Preparando enlace..."}
                </a>
                <CopyIconButton
                  label="Copiar link"
                  disabled={!inviteUrl}
                  onClick={() => void copyValue(inviteUrl, "Link copiado")}
                />
              </div>
            </div>
          </div>
          {copyFeedback && (
            <p
              role="status"
              aria-live="polite"
              className={
                copyFeedback.kind === "success"
                  ? "mt-5 text-xs text-emerald-200"
                  : "mt-5 text-xs text-rose-200"
              }
            >
              {copyFeedback.message}
            </p>
          )}
          <p className="mt-7 border-t border-white/10 pt-4 text-sm text-zinc-300">
            Esperando oponente...
          </p>
        </section>
      </main>
    );
  }
  const submitted = Boolean(preparation.you?.loadout);
  return (
    <main className="min-h-screen bg-[#090807] p-5 text-zinc-100">
      <section className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-300/70">
              Sala {view.code} / Preparacion
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Preparar partida</h1>
            <p className="mt-1 text-xs uppercase tracking-widest text-amber-200/70">
              {activeFormat === "ALLIANCES"
                ? "Formato Alianzas"
                : "Guerra de Facciones"}
            </p>
          </div>
          <div className="text-right text-xs text-zinc-400">
            <p>
              Etapa:{" "}
              <strong className="text-amber-100">{preparation.stage}</strong>
            </p>
            <p className="mt-1">
              {
                preparation.players.filter((player) => player.loadoutSubmitted)
                  .length
              }{" "}
              / 2 loadouts listos
            </p>
          </div>
        </header>
        {error && (
          <p
            role="alert"
            className="mt-4 border border-rose-300/30 bg-rose-950/30 p-3 text-sm text-rose-100"
          >
            {error}
          </p>
        )}
        {rollFeedback && (
          <p
            role="status"
            className="mt-4 border border-amber-200/20 bg-amber-950/20 p-3 text-sm text-amber-100"
          >
            {rollFeedback}
          </p>
        )}
        {preparation.stage === "DECK_SELECTION" && (
          <DeckSelection
            format={activeFormat}
            faction={faction}
            onFactionChange={changeFaction}
            available={available}
            specialEssences={specialEssences}
            counts={counts}
            deck={deck}
            essenceOrder={essenceOrder}
            sanctuary={sanctuary}
            sanctuaryOptions={sanctuaryOptions}
            submitted={submitted}
            onAdd={addCard}
            onRemove={removeCard}
            onAddSpecial={addSpecialEssence}
            onRemoveSpecial={removeSpecialEssence}
            onSanctuaryChange={setSanctuary}
            onFill={fillTestDeck}
            onSubmit={() => void submit()}
            onInspect={setInspected}
            savedDecks={savedDecks}
            deckName={deckName}
            selectedDeckId={selectedDeckId}
            onDeckNameChange={setDeckName}
            onSelectedDeckChange={setSelectedDeckId}
            onSaveDeck={saveDeck}
            onLoadDeck={loadDeck}
          />
        )}
        {preparation.stage === "STARTING_PLAYER" && (
          <StartingPlayerStage
            players={preparation.players}
            playerId={view.playerId}
            onRoll={(choice) => void rollStartingPlayerDie(choice)}
          />
        )}
        {preparation.stage === "ESSENCE_ORDERING" && (
          <EssenceOrdering
            order={essenceOrder}
            confirmed={Boolean(preparation.you?.essenceConfirmed)}
            starter={preparation.startingPlayerId}
            playerId={view.playerId}
            onOrderChange={setEssenceOrder}
            onConfirm={() => void confirmOrder()}
            onInspect={setInspected}
          />
        )}
        {preparation.stage === "INITIAL_DRAW" && (
          <InitialDrawStage
            hand={hand}
            confirmed={Boolean(preparation.you?.initialDrawConfirmed)}
            onInspect={setInspected}
            onConfirm={() => void confirmDraw()}
          />
        )}
        {preparation.stage === "MULLIGAN" && (
          <MulliganStage
            hand={hand}
            initialSelection={
              preparation.you?.mulliganSelectedInstanceIds ?? []
            }
            confirmed={preparation.you?.mulliganDecision !== null}
            decision={preparation.you?.mulliganDecision ?? null}
            players={preparation.players}
            onInspect={setInspected}
            onConfirm={(decision, selected) =>
              void confirmMulligan(decision, selected)
            }
          />
        )}
        {preparation.stage === "IN_GAME" && (
          <div className="mt-8 border border-emerald-300/30 bg-emerald-950/20 p-6 text-center">
            <h2 className="text-xl">Partida lista</h2>
            <p className="mt-2 text-sm text-zinc-300">Entrando a la mesa...</p>
          </div>
        )}
      </section>
      <CardInspection
        card={inspected}
        definition={inspected?.definition ?? undefined}
        onClose={() => setInspected(null)}
      />
    </main>
  );
}

function StartingPlayerStage({
  players,
  playerId,
  onRoll,
}: {
  players: PreparationPlayerView[];
  playerId: string;
  onRoll: (choice?: "SELF" | "OPPONENT") => void;
}) {
  const ownRoll =
    players.find((player) => player.playerId === playerId)
      ?.startingPlayerRoll ?? null;
  const rolledPlayers = players.filter(
    (player) => player.startingPlayerRoll !== null,
  );
  const winnerId =
    rolledPlayers.length === 2 &&
    rolledPlayers[0].startingPlayerRoll !== rolledPlayers[1].startingPlayerRoll
      ? (rolledPlayers[0].startingPlayerRoll ?? 0) >
        (rolledPlayers[1].startingPlayerRoll ?? 0)
        ? rolledPlayers[0].playerId
        : rolledPlayers[1].playerId
      : null;
  const canChoose = winnerId === playerId;
  return (
    <section className="mx-auto mt-8 max-w-xl border border-amber-200/20 bg-amber-950/10 p-6 text-center">
      <h2 className="text-lg">Decidir jugador inicial</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Cada jugador lanza un dado. Quien obtenga el resultado mayor decide
        quién comienza.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {players.map((player) => (
          <div
            key={player.playerId}
            className="border border-white/10 bg-black/10 p-4"
          >
            <p className="text-sm text-zinc-300">{player.displayName}</p>
            <strong className="mt-3 block text-4xl text-amber-100">
              {player.startingPlayerRoll ?? "?"}
            </strong>
          </div>
        ))}
      </div>
      {winnerId === null && (
        <button
          type="button"
          disabled={ownRoll !== null}
          onClick={() => onRoll()}
          className="mt-6 border border-emerald-300/40 px-5 py-2 text-sm text-emerald-100 disabled:opacity-40"
        >
          {ownRoll === null ? "Tirar dado" : "Dado lanzado"}
        </button>
      )}
      {winnerId !== null && canChoose && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => onRoll("SELF")}
            className="border border-emerald-300/40 px-4 py-2 text-sm text-emerald-100"
          >
            Voy primero
          </button>
          <button
            type="button"
            onClick={() => onRoll("OPPONENT")}
            className="border border-amber-200/40 px-4 py-2 text-sm text-amber-100"
          >
            Mi enemigo va primero
          </button>
        </div>
      )}
      {winnerId !== null && !canChoose && (
        <p className="mt-6 text-sm text-zinc-400">
          El ganador de los dados está eligiendo quién comienza...
        </p>
      )}
      <p className="mt-4 text-xs text-zinc-500">
        {winnerId !== null
          ? "El ganador debe elegir el jugador inicial."
          : "Esperando la tirada del rival..."}
      </p>
    </section>
  );
}

function DeckSelection({
  format,
  faction,
  onFactionChange,
  available,
  specialEssences,
  counts,
  deck,
  essenceOrder,
  sanctuary,
  sanctuaryOptions,
  submitted,
  onAdd,
  onRemove,
  onAddSpecial,
  onRemoveSpecial,
  onSanctuaryChange,
  onFill,
  onSubmit,
  onInspect,
  savedDecks,
  deckName,
  selectedDeckId,
  onDeckNameChange,
  onSelectedDeckChange,
  onSaveDeck,
  onLoadDeck,
}: {
  format: GameFormat;
  faction: string;
  onFactionChange: (value: string) => void;
  available: CatalogEntry[];
  specialEssences: CatalogEntry[];
  counts: Record<string, number>;
  deck: string[];
  essenceOrder: string[];
  sanctuary: string;
  sanctuaryOptions: CatalogEntry[];
  submitted: boolean;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onAddSpecial: (id: string) => void;
  onRemoveSpecial: (id: string) => void;
  onSanctuaryChange: (id: string) => void;
  onFill: () => void;
  onSubmit: () => void;
  onInspect: (card: PreparationCard) => void;
  savedDecks: SavedDeck[];
  deckName: string;
  selectedDeckId: string;
  onDeckNameChange: (value: string) => void;
  onSelectedDeckChange: (value: string) => void;
  onSaveDeck: () => void;
  onLoadDeck: () => void;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [selectedFactions, setSelectedFactions] = useState<string[] | null>(
    null,
  );
  useEffect(() => setSelectedFactions(null), [faction]);
  const allCards = [...available, ...specialEssences];
  const availableFactionIds = Array.from(
    new Set(
      allCards
        .map((card) => card.factionId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const selectedSpecials = essenceOrder.filter((id) =>
    isSpecialEssence(cardDefinitionsById[id]),
  );
  const specialCounts = selectedSpecials.reduce<Record<string, number>>(
    (result, id) => ({ ...result, [id]: (result[id] ?? 0) + 1 }),
    {},
  );
  const specialFactionCounts = selectedSpecials.reduce<Record<string, number>>(
    (result, id) => {
      const factionId = cardDefinitionsById[id]?.factionId;
      if (factionId) result[factionId] = (result[factionId] ?? 0) + 1;
      return result;
    },
    {},
  );
  const alliedCount =
    format === "ALLIANCES"
      ? alliedCardCount(
          [...deck, ...essenceOrder],
          cardDefinitionsById,
          faction,
        )
      : 0;
  const visibleCards = allCards.filter(
    (card) =>
      card.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
      (typeFilter === "ALL" || card.type === typeFilter) &&
      (selectedFactions === null ||
        selectedFactions.includes(card.factionId ?? "")),
  );
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <label className="text-xs uppercase tracking-widest text-zinc-500">
          Faccion
          <select
            value={faction}
            disabled={submitted}
            onChange={(event) => onFactionChange(event.target.value)}
            className="mt-2 block border border-white/15 bg-[#15120f] px-3 py-2 text-sm text-zinc-100"
          >
            {PREPARATION_FACTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        {format === "ALLIANCES" && (
          <div className="text-right text-xs uppercase tracking-widest text-zinc-500">
            <p>Alianza</p>
            <strong
              className={
                alliedCount > 12 ? "text-rose-200" : "text-emerald-200"
              }
            >
              {alliedCount} / 12 cartas aliadas
            </strong>
          </div>
        )}
        <button
          type="button"
          disabled={submitted}
          onClick={onFill}
          className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100 disabled:opacity-40"
        >
          Completar deck
        </button>
      </div>
      <div className="mt-4 grid gap-3 border-b border-white/10 pb-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-xs uppercase tracking-widest text-zinc-500">
            Buscar cartas
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nombre de carta"
              className="mt-2 block w-full border border-white/15 bg-[#15120f] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 placeholder:text-zinc-600"
            />
          </label>
          <label className="text-xs uppercase tracking-widest text-zinc-500">
            Tipo
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="mt-2 block border border-white/15 bg-[#15120f] px-2 py-2 text-xs text-zinc-100"
            >
              <option value="ALL">Todos</option>
              <option value="CHARACTER">Personajes</option>
              <option value="RELIC">Reliquias</option>
              <option value="VERSE">Versos</option>
            </select>
          </label>
          <fieldset className="text-xs uppercase tracking-widest text-zinc-500">
            <legend>Facciones de cartas</legend>
            <div className="mt-2 flex max-w-sm flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSelectedFactions(null)}
                className={`border px-2 py-1 text-[10px] ${selectedFactions === null ? "border-emerald-300/60 text-emerald-100" : "border-white/15 text-zinc-500"}`}
              >
                Todas
              </button>
              {availableFactionIds.map((factionId) => {
                const option = PREPARATION_FACTIONS.find(
                  (item) => item.id === factionId,
                );
                const checked =
                  selectedFactions === null ||
                  selectedFactions.includes(factionId);
                return (
                  <label
                    key={factionId}
                    className={`flex cursor-pointer items-center gap-1 border px-2 py-1 text-[10px] ${checked ? "border-amber-200/40 text-amber-100" : "border-white/10 text-zinc-600"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedFactions((current) => {
                          const next =
                            current === null
                              ? availableFactionIds.filter(
                                  (id) => id !== factionId,
                                )
                              : current.includes(factionId)
                                ? current.filter((id) => id !== factionId)
                                : [...current, factionId];
                          return next.length === availableFactionIds.length
                            ? null
                            : next;
                        })
                      }
                      className="sr-only"
                    />
                    {option?.name ?? factionId}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
        <div className="flex flex-wrap items-end justify-end gap-3 text-xs uppercase tracking-widest text-zinc-500">
          <span>
            Principal{" "}
            <strong className="text-amber-100">{deck.length} / 35</strong>
          </span>
          <span>
            Esencias{" "}
            <strong className="text-amber-100">
              {essenceOrder.length} / 10
            </strong>
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 border-b border-white/10 pb-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-xs uppercase tracking-widest text-zinc-500">
            Nombre del deck
            <input
              aria-label="Nombre del deck"
              value={deckName}
              disabled={submitted}
              onChange={(event) => onDeckNameChange(event.target.value)}
              placeholder="Mi deck"
              className="mt-2 block w-full border border-white/15 bg-[#15120f] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 placeholder:text-zinc-600"
            />
          </label>
          <button
            type="button"
            disabled={submitted || !deckName.trim()}
            onClick={onSaveDeck}
            className="border border-amber-200/40 px-3 py-2 text-xs text-amber-100 disabled:opacity-30"
          >
            Guardar deck
          </button>
        </div>
        {savedDecks.length > 0 && (
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-xs uppercase tracking-widest text-zinc-500">
              Deck guardado
              <select
                aria-label="Deck guardado"
                value={selectedDeckId}
                disabled={submitted}
                onChange={(event) => onSelectedDeckChange(event.target.value)}
                className="mt-2 block w-full border border-white/15 bg-[#15120f] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100"
              >
                <option value="">Seleccionar deck</option>
                {savedDecks.map((saved) => (
                  <option key={saved.id} value={saved.id}>
                    {saved.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={submitted || !selectedDeckId}
              onClick={onLoadDeck}
              className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100 disabled:opacity-30"
            >
              Cargar
            </button>
          </div>
        )}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-widest text-amber-100">
              Cartas disponibles
            </h2>
            <strong className="text-xs text-zinc-400">
              {visibleCards.length}
            </strong>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {visibleCards.map((card, index) => {
              const preview = preparationCard(card.id, index);
              const definition = cardDefinitionsById[card.id];
              const isEssence = card.type === "ESSENCE";
              const cardCount = isEssence
                ? (specialCounts[card.id] ?? 0)
                : (counts[card.id] ?? 0);
              const sameFactionSpecialCount =
                specialFactionCounts[card.factionId ?? ""] ?? 0;
              const specialFactionLimit =
                format === "ALLIANCES"
                  ? MAX_SPECIAL_ESSENCES_PER_ALLIED_FACTION
                  : MAX_SPECIAL_ESSENCES;
              return (
                <div
                  key={card.id}
                  className="flex items-center gap-2 border border-white/10 bg-black/10 p-2"
                >
                  <div className="w-20 shrink-0">
                    <GameCard
                      card={preview}
                      definition={definition}
                      size="sm"
                      onInspect={() => onInspect(preview)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{card.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                      {formatCardType(card.type)} / {card.factionId}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-1">
                    <span className="text-[10px] text-amber-100">
                      {cardCount}
                    </span>
                    {cardCount > 0 && (
                      <span
                        data-testid={`available-card-count-${card.id}`}
                        className="sr-only"
                      >
                        {cardCount}
                      </span>
                    )}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`${isEssence ? "Anadir" : "Anadir"} ${card.name} ${isEssence ? "a esencias" : "al principal"}`}
                        disabled={
                          submitted ||
                          (isEssence
                            ? selectedSpecials.length >= MAX_SPECIAL_ESSENCES ||
                              sameFactionSpecialCount >= specialFactionLimit
                            : cardCount >= 3 || deck.length >= 35)
                        }
                        onClick={() =>
                          isEssence ? onAddSpecial(card.id) : onAdd(card.id)
                        }
                        className="h-6 w-6 border border-emerald-300/30 text-xs text-emerald-100 disabled:opacity-30"
                      >
                        +
                      </button>
                      {cardCount > 0 && (
                        <button
                          type="button"
                          aria-label={`Quitar ${card.name} del mostrador`}
                          disabled={submitted}
                          onClick={() =>
                            isEssence
                              ? onRemoveSpecial(card.id)
                              : onRemove(card.id)
                          }
                          className="h-6 w-6 border border-rose-300/30 text-xs text-rose-100 disabled:opacity-30"
                        >
                          -
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-widest text-amber-100">
              Deck
            </h2>
            <strong
              className={
                deck.length === 35 ? "text-emerald-200" : "text-amber-200"
              }
            >
              {deck.length} / 35
            </strong>
          </div>
          <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
            {Object.entries(counts).map(([id, count]) => (
              <div
                key={id}
                className="flex items-center justify-between border-b border-white/10 py-2"
              >
                <span className="text-sm">
                  {cardDefinitionsById[id]?.name ?? id}{" "}
                  <small className="text-zinc-500">x{count}</small>
                </span>
                <button
                  type="button"
                  aria-label={`Quitar ${cardDefinitionsById[id]?.name ?? id}`}
                  disabled={submitted}
                  onClick={() => onRemove(id)}
                  className="h-6 w-6 border border-white/20 disabled:opacity-30"
                >
                  -
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-widest text-amber-100">
                Esencias Especiales
              </h3>
              <strong className="text-xs text-amber-200">
                {selectedSpecials.length} / {MAX_SPECIAL_ESSENCES}
              </strong>
            </div>
            <div className="mt-2 space-y-1 text-xs text-zinc-400">
              {selectedSpecials.length === 0 ? (
                <p>No hay esencias especiales seleccionadas.</p>
              ) : (
                Array.from(new Set(selectedSpecials)).map((id) => (
                  <p key={id}>
                    {cardDefinitionsById[id]?.name ?? id} x{specialCounts[id]}
                  </p>
                ))
              )}
            </div>
          </div>
          <label className="mt-5 block text-xs uppercase tracking-widest text-zinc-500">
            Santuario
            <select
              value={sanctuary}
              disabled={submitted}
              onChange={(event) => onSanctuaryChange(event.target.value)}
              className="mt-2 block w-full border border-white/15 bg-[#15120f] px-3 py-2 text-sm text-zinc-100"
            >
              {sanctuaryOptions.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={
              submitted ||
              deck.length !== 35 ||
              essenceOrder.length !== 10 ||
              alliedCount > 12 ||
              !sanctuary
            }
            onClick={onSubmit}
            className="mt-5 w-full border border-amber-200/40 bg-amber-200/10 px-3 py-2 text-sm text-amber-100 disabled:opacity-30"
          >
            {submitted ? "Loadout enviado" : "Enviar loadout"}
          </button>
        </section>
      </div>
    </div>
  );
}

function LegacyDeckSelection({
  faction,
  onFactionChange,
  available,
  counts,
  deck,
  sanctuary,
  sanctuaryOptions,
  submitted,
  onAdd,
  onRemove,
  onSanctuaryChange,
  onFill,
  onSubmit,
  onInspect,
  savedDecks,
  deckName,
  selectedDeckId,
  onDeckNameChange,
  onSelectedDeckChange,
  onSaveDeck,
  onLoadDeck,
}: {
  faction: string;
  onFactionChange: (value: string) => void;
  available: CatalogEntry[];
  counts: Record<string, number>;
  deck: string[];
  sanctuary: string;
  sanctuaryOptions: CatalogEntry[];
  submitted: boolean;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onSanctuaryChange: (id: string) => void;
  onFill: () => void;
  onSubmit: () => void;
  onInspect: (card: PreparationCard) => void;
  savedDecks: SavedDeck[];
  deckName: string;
  selectedDeckId: string;
  onDeckNameChange: (value: string) => void;
  onSelectedDeckChange: (value: string) => void;
  onSaveDeck: () => void;
  onLoadDeck: () => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <label className="text-xs uppercase tracking-widest text-zinc-500">
          Faccion
          <select
            value={faction}
            disabled={submitted}
            onChange={(event) => onFactionChange(event.target.value)}
            className="mt-2 block border border-white/15 bg-[#15120f] px-3 py-2 text-sm text-zinc-100"
          >
            {PREPARATION_FACTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={submitted}
          onClick={onFill}
          className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100 disabled:opacity-40"
        >
          Completar deck
        </button>
      </div>
      <div className="mt-4 grid gap-3 border-b border-white/10 pb-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-xs uppercase tracking-widest text-zinc-500">
            Nombre del deck
            <input
              aria-label="Nombre del deck"
              value={deckName}
              disabled={submitted}
              onChange={(event) => onDeckNameChange(event.target.value)}
              placeholder="Mi deck"
              className="mt-2 block w-full border border-white/15 bg-[#15120f] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100 placeholder:text-zinc-600"
            />
          </label>
          <button
            type="button"
            disabled={submitted || !deckName.trim()}
            onClick={onSaveDeck}
            className="border border-amber-200/40 px-3 py-2 text-xs text-amber-100 disabled:opacity-30"
          >
            Guardar deck
          </button>
        </div>
        {savedDecks.length > 0 && (
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1 text-xs uppercase tracking-widest text-zinc-500">
              Deck guardado
              <select
                aria-label="Deck guardado"
                value={selectedDeckId}
                disabled={submitted}
                onChange={(event) => onSelectedDeckChange(event.target.value)}
                className="mt-2 block w-full border border-white/15 bg-[#15120f] px-3 py-2 text-sm normal-case tracking-normal text-zinc-100"
              >
                <option value="">Seleccionar deck</option>
                {savedDecks.map((saved) => (
                  <option key={saved.id} value={saved.id}>
                    {saved.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={submitted || !selectedDeckId}
              onClick={onLoadDeck}
              className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100 disabled:opacity-30"
            >
              Cargar
            </button>
          </div>
        )}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-widest text-amber-100">
              Available Cards
            </h2>
            <strong
              className={
                deck.length === 35
                  ? "text-xs text-emerald-200"
                  : "text-xs text-amber-200"
              }
            >
              {deck.length} / 35
            </strong>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {available.map((card, index) => {
              const preview = preparationCard(card.id, index);
              const definition = cardDefinitionsById[card.id];
              const count = counts[card.id] ?? 0;
              return (
                <div
                  key={card.id}
                  className="flex items-center gap-2 border border-white/10 bg-black/10 p-2"
                >
                  <div className="w-20 shrink-0">
                    <GameCard
                      card={preview}
                      definition={definition}
                      size="sm"
                      onInspect={() => onInspect(preview)}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{card.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                      {formatCardType(card.type)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {count > 0 && (
                      <strong
                        data-testid={`available-card-count-${card.id}`}
                        className="min-w-4 text-center text-sm text-amber-100"
                      >
                        {count}
                      </strong>
                    )}
                    {count > 0 && (
                      <button
                        type="button"
                        aria-label={`Quitar ${card.name}`}
                        data-testid={`remove-available-${card.id}`}
                        disabled={submitted}
                        onClick={() => onRemove(card.id)}
                        className="h-7 w-7 border border-rose-300/30 text-rose-100 disabled:opacity-30"
                      >
                        -
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Anadir ${card.name}`}
                      disabled={submitted || count >= 3 || deck.length >= 35}
                      onClick={() => onAdd(card.id)}
                      className="h-7 w-7 border border-emerald-300/30 text-emerald-100 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-widest text-amber-100">
              DECK
            </h2>
            <strong
              className={
                deck.length === 35 ? "text-emerald-200" : "text-amber-200"
              }
            >
              {deck.length} / 35
            </strong>
          </div>
          <div className="mt-3 space-y-2">
            {Object.entries(counts).map(([id, count]) => (
              <div
                key={id}
                className="flex items-center justify-between border-b border-white/10 py-2"
              >
                <span className="text-sm">
                  {cardDefinitionsById[id]?.name ?? id}
                </span>
                <span className="flex items-center gap-2 text-xs">
                  <strong>{count}</strong>
                  <button
                    type="button"
                    disabled={submitted}
                    onClick={() => onRemove(id)}
                    className="h-6 w-6 border border-white/20 disabled:opacity-30"
                  >
                    -
                  </button>
                </span>
              </div>
            ))}
          </div>
          <label className="mt-5 block text-xs uppercase tracking-widest text-zinc-500">
            Sanctuary
            <select
              value={sanctuary}
              disabled={submitted}
              onChange={(event) => onSanctuaryChange(event.target.value)}
              className="mt-2 block w-full border border-white/15 bg-[#15120f] px-3 py-2 text-sm text-zinc-100"
            >
              {sanctuaryOptions.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={submitted || deck.length !== 35 || !sanctuary}
            onClick={onSubmit}
            className="mt-5 w-full border border-amber-200/40 bg-amber-200/10 px-3 py-2 text-sm text-amber-100 disabled:opacity-30"
          >
            {submitted ? "Loadout enviado" : "Enviar loadout"}
          </button>
        </section>
      </div>
    </div>
  );
}

function EssenceOrdering({
  order,
  confirmed,
  starter,
  playerId,
  onOrderChange,
  onConfirm,
  onInspect,
}: {
  order: string[];
  confirmed: boolean;
  starter: string | null;
  playerId: string;
  onOrderChange: (order: string[]) => void;
  onConfirm: () => void;
  onInspect: (card: PreparationCard) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const starts = starter === playerId;
  const validation = validateEssenceOrder(order, catalogById, starts);
  const allowed = starts ? "2, 4, 6, 8" : "1, 3, 5, 7";
  const move = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex || confirmed) return;
    const next = [...order];
    const [item] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, item);
    onOrderChange(next);
    setDragIndex(null);
  };
  return (
    <section className="mx-auto mt-8 max-w-6xl border border-emerald-200/20 bg-emerald-950/10 p-6">
      <h2 className="text-lg">Orden privado de Esencias</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Ordena tus 10 Esencias. El rival solo vera tu estado de confirmacion.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs uppercase tracking-widest text-amber-200">
        <strong>{starts ? "COMIENZAS" : "VAS SEGUNDO"}</strong>
        <span className="text-zinc-500">SPECIAL permitidas: {allowed}</span>
      </div>
      {!validation.ok && (
        <p role="alert" className="mt-3 text-sm text-rose-200">
          {validation.error}
        </p>
      )}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-10">
        {order.map((id, index) => {
          const card = preparationCard(id, index);
          const definition = card.definition;
          const special = definition ? isSpecialEssence(definition) : false;
          return (
            <div
              key={`${id}-${index}`}
              draggable={!confirmed}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => move(index)}
              className={`flex min-w-0 flex-col items-center gap-1 border p-2 ${special ? "border-amber-200/40" : "border-white/10"}`}
            >
              <span className="text-xs font-semibold text-amber-100">
                {index + 1}
              </span>
              <div className="w-full">
                <GameCard
                  card={card}
                  definition={definition ?? undefined}
                  size="sm"
                  onInspect={() => onInspect(card)}
                />
              </div>
              <span className="text-center text-[9px] uppercase tracking-wider text-zinc-500">
                {special ? "SPECIAL" : "BASIC"}
              </span>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        disabled={confirmed || !validation.ok}
        onClick={onConfirm}
        className="mt-6 w-full border border-emerald-300/40 px-3 py-2 text-sm text-emerald-100 disabled:opacity-40"
      >
        {confirmed ? "Orden confirmado" : "Confirmar orden"}
      </button>
    </section>
  );
}

function InitialDrawStage({
  hand,
  confirmed,
  onInspect,
  onConfirm,
}: {
  hand: PreparationCard[];
  confirmed: boolean;
  onInspect: (card: PreparationCard) => void;
  onConfirm: () => void;
}) {
  return (
    <section className="mx-auto mt-8 max-w-6xl border border-amber-200/20 bg-amber-950/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg">Mano inicial</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Revisa tus 5 cartas antes de decidir el Mulligan.
          </p>
        </div>
        <strong className="text-amber-100">{hand.length} cartas</strong>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-center gap-4">
        {hand.map((card) => (
          <div
            key={card.instanceId}
            className="flex flex-col items-center gap-2"
          >
            <GameCard
              card={card}
              definition={card.definition ?? undefined}
              onInspect={() => onInspect(card)}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        disabled={confirmed}
        onClick={onConfirm}
        className="mt-6 w-full border border-amber-200/40 px-3 py-2 text-sm text-amber-100 disabled:opacity-40"
      >
        {confirmed
          ? "Mano revisada. Esperando rival..."
          : "Continuar a Mulligan"}
      </button>
    </section>
  );
}

function MulliganStage({
  hand,
  initialSelection,
  confirmed,
  decision,
  players,
  onInspect,
  onConfirm,
}: {
  hand: PreparationCard[];
  initialSelection: string[];
  confirmed: boolean;
  decision: "KEEP" | "MULLIGAN" | null;
  players: PreparationPlayerView[];
  onInspect: (card: PreparationCard) => void;
  onConfirm: (
    decision: "KEEP" | "MULLIGAN",
    selectedInstanceIds: string[],
  ) => void;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelection);
  const toggle = (instanceId: string) => {
    if (confirmed) return;
    setSelected((current) =>
      current.includes(instanceId)
        ? current.filter((id) => id !== instanceId)
        : [...current, instanceId],
    );
  };
  const keep = () => {
    setSelected([]);
    onConfirm("KEEP", []);
  };
  return (
    <section className="mx-auto mt-8 max-w-6xl border border-amber-200/20 bg-amber-950/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg">Mano inicial</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Selecciona cartas solo si quieres devolverlas al fondo del Mazo
            Principal.
          </p>
        </div>
        <strong className="text-amber-100">
          Seleccionadas: {selected.length}
        </strong>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-center gap-4">
        {hand.map((card) => (
          <div
            key={card.instanceId}
            className="flex flex-col items-center gap-2"
          >
            <GameCard
              card={card}
              definition={card.definition ?? undefined}
              selected={selected.includes(card.instanceId)}
              onInspect={() => onInspect(card)}
            />
            <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                aria-label={`Seleccionar ${card.definition?.name ?? "carta"} para Mulligan`}
                checked={selected.includes(card.instanceId)}
                disabled={confirmed}
                onChange={() => toggle(card.instanceId)}
                className="h-4 w-4 accent-amber-300"
              />
              Devolver
            </label>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          disabled={confirmed}
          onClick={keep}
          className="border border-emerald-300/40 px-5 py-2 text-sm text-emerald-100 disabled:opacity-40"
        >
          MANTENER MANO
        </button>
        <button
          type="button"
          disabled={confirmed}
          onClick={() => onConfirm("MULLIGAN", selected)}
          className="border border-amber-200/40 px-5 py-2 text-sm text-amber-100 disabled:opacity-40"
        >
          MULLIGAN {selected.length}
        </button>
      </div>
      {confirmed && (
        <p className="mt-4 text-center text-sm text-amber-100">
          {decision === "MULLIGAN" ? "Mulligan confirmado." : "Mano mantenida."}{" "}
          Esperando rival...
        </p>
      )}
      <div className="mt-5 space-y-1 text-center text-xs text-zinc-500">
        {players.map((player) => (
          <p key={player.playerId}>
            {player.mulliganConfirmed ? "Listo" : "Decidiendo"}
          </p>
        ))}
      </div>
    </section>
  );
}
