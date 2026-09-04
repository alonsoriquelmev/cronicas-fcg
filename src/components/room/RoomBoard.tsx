"use client";

import {
  DndContext,
  type DragEndEvent,
  useDndContext,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { motion } from "motion/react";
import { useMutation } from "convex/react";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/../convex/_generated/api";
import type { CardDefinition } from "@/domain/cards/card.types";
import type { GameAction } from "@/domain/game/game.actions";
import type { CardInstance, CharacterStatChangeProposal, DeckLookState, GamePhase, VirtualEssenceChangeProposal } from "@/domain/game/game.types";
import { getPhaseBlockers, phaseBlockerLabels, phaseBlockersFromError } from "@/domain/game/phase-rules";
import {
  CHARACTER_MARKER_KINDS,
  CHARACTER_MARKER_LABELS,
  isCharacterMarkerKind,
  type CharacterMarker,
  type CharacterMarkerKind,
} from "@/domain/game/character-markers";
import {
  getCharacterDerivedStats,
  getVisibleMarkersForCards,
  sortHandForDisplay,
  getTopCardInZone,
} from "@/domain/game/game.selectors";
import {
  canDropCardOnTarget,
  DROP_TARGET_IDS,
  dropActionForTarget,
  parseDropTarget,
} from "@/domain/game/drop-targets";
import { CardInspection } from "@/components/board/CardInspection";
import { GameCard } from "@/components/board/GameCard";
import { CardBack } from "@/components/board/CardBack";
import { useCardClick } from "@/components/board/useCardClick";
import {
  getDeckClickAction,
  getDeckContextActions,
  getHandCardContextActions,
  getPublicCardContextActions,
  getCentralZoneOrder,
  type RoomContextAction,
  type RoomViewCard,
} from "./room.board.permissions";

type ViewCard = RoomViewCard;
type HiddenCounts = Record<
  string,
  { HAND: number; MAIN_DECK: number; ESSENCE_DECK: number }
>;
type ContextMenuPlacement = "below" | "above";
type RoomView = {
  status: string;
  code: string;
  playerId: string;
  seat: string;
  players: { playerId: string; displayName: string; seat: string }[];
  game: {
    revision: number;
    turnNumber: number;
    activePlayerId: string;
    startingPlayerId: string;
    phaseProgress?: { turnNumber: number; playerId: string; essenceDrawn: boolean; mainCardDrawn: boolean } | null;
    phase: GamePhase;
    players: Record<
      string,
      { playerId: string; displayName: string; sanctuaryHp: number; virtualEssenceCount?: number }
    >;
    cardInstances: ViewCard[];
    deckLook?: DeckLookState | null;
    deckReveal?: { playerId: string; instanceIds: string[] } | null;
    pendingStatChanges?: Record<string, CharacterStatChangeProposal>;
    pendingVirtualEssenceChanges?: Record<string, VirtualEssenceChangeProposal>;
    characterMarkers?: Record<string, CharacterMarker[]>;
    hiddenCounts?: HiddenCounts;
    publicCounts?: HiddenCounts;
  } | null;
};
type ContextMenuState = {
  x: number;
  y: number;
  actions: RoomContextAction[];
  card?: ViewCard;
  placement?: ContextMenuPlacement;
};
type FinishIntent = "FINISHED" | "ABANDONED";

const zone = (
  cards: ViewCard[],
  playerId: string,
  name: CardInstance["zone"],
) =>
  cards
    .filter((card) => card.controllerId === playerId && card.zone === name)
    .sort(
      (a, b) =>
        a.zoneOrder - b.zoneOrder || a.instanceId.localeCompare(b.instanceId),
    );
const publicCount = (
  counts: HiddenCounts | undefined,
  playerId: string,
  zoneName: keyof HiddenCounts[string],
) => counts?.[playerId]?.[zoneName] ?? 0;
const virtualEssenceCount = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export function RoomBoard({
  view,
  sessionToken,
}: {
  view: RoomView;
  sessionToken: string;
}) {
  const submit = useMutation(api.rooms.submitGameAction);
  const finish = useMutation(api.rooms.finishRoom);
  const [error, setError] = useState("");
  const [phaseBlockers, setPhaseBlockers] = useState<string[]>([]);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [inspected, setInspected] = useState<ViewCard | null>(null);
  const [gallery, setGallery] = useState<{
    ownerId: string;
    zone: "GRAVEYARD" | "DEVASTATED";
  } | null>(null);
  const [statEditorCardId, setStatEditorCardId] = useState<string | null>(null);
  const [deckLookCount, setDeckLookCount] = useState<number | null>(null);
  const [restoreCardId, setRestoreCardId] = useState<string | null>(null);
  const [virtualEssenceEditor, setVirtualEssenceEditor] = useState(false);
  const [sanctuaryBackground, setSanctuaryBackground] = useState(false);
  const [finishIntent, setFinishIntent] = useState<FinishIntent | null>(null);
  const previousActivePlayerRef = useRef<string | null>(view.game?.activePlayerId ?? null);
  const turnPopupTimeoutRef = useRef<number | null>(null);
  const [turnPopupPlayerId, setTurnPopupPlayerId] = useState<string | null>(null);
  const me = view.playerId;
  const opponent = view.players.find((player) => player.playerId !== me);
  useEffect(() => {
    const activePlayerId = view.game?.activePlayerId;
    if (!activePlayerId || previousActivePlayerRef.current === activePlayerId) return;
    previousActivePlayerRef.current = activePlayerId;
    setTurnPopupPlayerId(activePlayerId);
    if (turnPopupTimeoutRef.current !== null) window.clearTimeout(turnPopupTimeoutRef.current);
    turnPopupTimeoutRef.current = window.setTimeout(() => setTurnPopupPlayerId(null), 2800);
  }, [view.game?.activePlayerId]);
  useEffect(() => () => {
    if (turnPopupTimeoutRef.current !== null) window.clearTimeout(turnPopupTimeoutRef.current);
  }, []);
  const cards = view.game?.cardInstances ?? [];
  const deckRevealKey = view.game?.deckReveal
    ? `${view.game.deckReveal.playerId}:${view.game.deckReveal.instanceIds.join(",")}`
    : null;
  const definitions = Object.fromEntries(
    cards.flatMap((card) =>
      card.definition ? [[card.cardDefinitionId, card.definition]] : [],
    ),
  ) as Record<string, CardDefinition>;

  const run = async (action: GameAction): Promise<boolean> => {
    if (view.status !== "IN_GAME") return false;
    setError("");
    if (view.game && action.type === "TAP_CARD" && view.game.phase === "ALBA") {
      setError("No se puede tapear durante Alba.");
      return false;
    }
    if (view.game && (action.type === "PLAY_CHARACTER" || action.type === "PLAY_CHARACTER_ATTACH_RELIC" || action.type === "PLAY_RELIC") && view.game.phase !== "MEDIODIA") {
      setError("Personajes y Reliquias solo pueden jugarse durante Mediodia.");
      return false;
    }
    if (action.type === "SET_PHASE" && view.game) {
      const blockers = getPhaseBlockers(view.game, me, action.phase);
      if (blockers.length > 0) {
        setPhaseBlockers(blockers);
        return false;
      }
    }
    try {
      await submit({
        code: view.code,
        playerSessionToken: sessionToken,
        clientActionId: crypto.randomUUID(),
        action,
      });
      return true;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Accion rechazada";
      const blockers = action.type === "SET_PHASE" ? phaseBlockersFromError(message) : [];
      if (blockers.length > 0) setPhaseBlockers(blockers);
      else setError(message);
      return false;
    }
  };
  const inspect = (card: ViewCard) => {
    if (card.definition) setInspected(card);
  };
  const openMenu = (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
    placement: ContextMenuPlacement = "below",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const visibleActions = view.game?.phase === "ALBA" ? actions.filter((action) => action !== "TAP") : actions;
    setMenu({ x: event.clientX, y: event.clientY, actions: visibleActions, card, placement });
  };
  const closeMenu = () => setMenu(null);
  const performContextAction = (action: RoomContextAction) => {
    if (action === "INSPECT" && menu?.card) inspect(menu.card);
    if ((action === "TAP" || action === "UNTAP") && menu?.card)
      void run({
        type: action === "TAP" ? "TAP_CARD" : "UNTAP_CARD",
        instanceId: menu.card.instanceId,
      });
    if (action === "DETACH" && menu?.card)
      void run({ type: "DETACH_RELIC", relicInstanceId: menu.card.instanceId });
    if (action === "SEND_TO_GRAVEYARD" && menu?.card)
      void run(menu.card.zone === "HAND"
        ? { type: "MOVE_HAND_CARD_TO_GRAVEYARD", instanceId: menu.card.instanceId, playerId: me }
        : { type: "MOVE_CARD", instanceId: menu.card.instanceId, toZone: "GRAVEYARD", controllerId: me });
    if (action === "RETURN_TO_HAND" && menu?.card)
      void run({
        type: "MOVE_CARD",
        instanceId: menu.card.instanceId,
        toZone: "HAND",
        controllerId: me,
      });
    if (action === "MOVE_TO_FIELD" && menu?.card)
      void run({
        type: "MOVE_CARD",
        instanceId: menu.card.instanceId,
        toZone: "FIELD",
        controllerId: me,
        attachedToInstanceId: null,
      });
    if (action === "MOVE_TO_RESOLUTION" && menu?.card)
      void run({
        type: "MOVE_CARD",
        instanceId: menu.card.instanceId,
        toZone: "VERSE_RESOLUTION",
        controllerId: me,
      });
    if (action === "RESOLVE" && menu?.card)
      void run({
        type: "RESOLVE_VERSE",
        instanceId: menu.card.instanceId,
        playerId: me,
      });
    if (action === "DRAW_CARD") void run({ type: "DRAW_CARD", playerId: me });
    if (action === "LOOK_MAIN_DECK") setDeckLookCount(1);
    if (action === "SEARCH_MAIN_DECK")
      void run({ type: "SEARCH_MAIN_DECK", playerId: me });
    if (action === "DRAW_ESSENCE")
      void run({ type: "DRAW_ESSENCE", playerId: me });
    if (action === "SEND_TOP_TO_GRAVEYARD")
      void run({ type: "SEND_MAIN_DECK_TOP_TO_GRAVEYARD", playerId: me });
    if (action === "SHUFFLE_MAIN_DECK")
      void run({ type: "SHUFFLE_MAIN_DECK", playerId: me });
    if (action === "SHUFFLE_INTO_MAIN_DECK" && menu?.card)
      void run({ type: "SHUFFLE_CARD_INTO_MAIN_DECK", instanceId: menu.card.instanceId, playerId: me });
    if (action === "RETURN_ESSENCE_TO_DECK_BOTTOM" && menu?.card)
      void run({ type: "RETURN_ESSENCE_TO_DECK_BOTTOM", instanceId: menu.card.instanceId, playerId: me });
    if (action === "MODIFY_CHARACTER_STATS" && menu?.card)
      setStatEditorCardId(menu.card.instanceId);
    if (action === "DEVASTATE" && menu?.card)
      void run({ type: "DEVASTATE_CARD", instanceId: menu.card.instanceId, playerId: me });
    if (action === "REVERT_DEVASTATION" && menu?.card)
      setRestoreCardId(menu.card.instanceId);
    if (action === "SET_SANCTUARY_BACKGROUND") setSanctuaryBackground(true);
    if (action === "REMOVE_SANCTUARY_BACKGROUND") setSanctuaryBackground(false);
    closeMenu();
  };
  const confirmFinish = async () => {
    if (!finishIntent) return;
    setError("");
    try {
      await finish({
        code: view.code,
        playerSessionToken: sessionToken,
        status: finishIntent,
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo actualizar el estado de la sala",
      );
      setFinishIntent(null);
    }
  };
  if (view.status !== "IN_GAME")
    return (
      <div className="mx-auto max-w-xl border border-rose-300/30 bg-[#15120f] p-8">
        <p className="text-xs uppercase tracking-widest text-rose-200/70">
          Sala {view.code}
        </p>
        <h1 className="mt-2 text-2xl">Estado de partida no disponible</h1>
        <p className="mt-3 text-sm text-zinc-400">
          La mesa ya no acepta acciones.
        </p>
      </div>
    );
  if (!view.game)
    return (
      <div className="mx-auto max-w-xl border border-rose-300/30 bg-[#15120f] p-8">
        <p className="text-xs uppercase tracking-widest text-rose-200/70">
          Sala {view.code}
        </p>
        <h1 className="mt-2 text-2xl">Partida no disponible</h1>
        <p className="mt-3 text-sm text-zinc-400">
          No se pudo recuperar el estado de la partida.
        </p>
      </div>
    );

  const hand = sortHandForDisplay(zone(cards, me, "HAND"), definitions);
  const field = zone(cards, me, "FIELD");
  const opponentField = zone(cards, opponent?.playerId ?? "", "FIELD");
  const essences = zone(cards, me, "ESSENCE_ZONE");
  const opponentEssences = zone(
    cards,
    opponent?.playerId ?? "",
    "ESSENCE_ZONE",
  );
  const sanctuary = zone(cards, me, "SANCTUARY")[0];
  const opponentSanctuary = zone(
    cards,
    opponent?.playerId ?? "",
    "SANCTUARY",
  )[0];
  const resolution = cards
    .filter((card) => card.zone === "VERSE_RESOLUTION")
    .sort((a, b) => a.zoneOrder - b.zoneOrder || a.instanceId.localeCompare(b.instanceId));
  const statEditorCard = statEditorCardId
    ? cards.find((card) => card.instanceId === statEditorCardId)
    : undefined;
  const pendingProposals = Object.values(view.game.pendingStatChanges ?? {});
  const opponentProposal = pendingProposals.find((proposal) => proposal.proposerId !== me);
  const ownProposal = pendingProposals.find((proposal) => proposal.proposerId === me);
  const pendingVirtualEssences = Object.values(view.game.pendingVirtualEssenceChanges ?? {});
  const characterMarkers = view.game.characterMarkers ?? {};
  const opponentVirtualEssenceProposal = pendingVirtualEssences.find((proposal) => proposal.playerId !== me);
  const ownVirtualEssenceProposal = pendingVirtualEssences.find((proposal) => proposal.playerId === me);
  const proposalCharacter = opponentProposal
    ? cards.find((card) => card.instanceId === opponentProposal.characterInstanceId)
    : undefined;
  const attachedRelicsFor = (characterInstanceId: string) =>
    cards.filter((card) => card.definition?.type === "RELIC" && card.attachedToInstanceId === characterInstanceId);
  const handleDragEnd = (event: DragEndEvent) => {
    const marker = event.active.data.current?.utilityMarker;
    const target = event.over ? parseDropTarget(String(event.over.id)) : null;
    const markerTarget = target && typeof target !== "string" && target.type === "CHARACTER_SLOT" ? target : null;
    if (isCharacterMarkerKind(marker) && markerTarget) {
      void run({
        type: "ADD_CHARACTER_MARKER",
        characterInstanceId: markerTarget.characterInstanceId,
        markerId: crypto.randomUUID(),
        marker,
      });
      return;
    }
    const dragged = cards.find((card) => card.instanceId === event.active.id);
    const action =
      dragged && target
        ? dropActionForTarget(
            dragged,
            target,
            me,
            definitions,
            Object.fromEntries(cards.map((card) => [card.instanceId, card])),
          )
        : null;
    if (action) void run(action);
  };

  const counts = view.game.publicCounts ?? view.game.hiddenCounts;
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <main
        className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#090807] p-3 text-zinc-100"
        onClick={closeMenu}
      >
        <Header
          view={view}
          opponent={opponent}
          onAbandon={() => setFinishIntent("ABANDONED")}
          onFinish={() => setFinishIntent("FINISHED")}
        />
        {error && (
          <p
            role="alert"
            className="mx-auto mt-2 w-full max-w-[1700px] border border-rose-300/30 bg-rose-950/30 p-2 text-sm text-rose-100"
          >
            {error}
          </p>
        )}
        {turnPopupPlayerId && (
          <TurnChangePopup
            ownTurn={turnPopupPlayerId === me}
            onClose={() => setTurnPopupPlayerId(null)}
          />
        )}
        <div className="mx-auto flex min-h-0 w-full max-w-[1700px] flex-1 gap-3 overflow-visible py-1">
          <section
            data-testid="board-column"
            className="grid min-h-0 min-w-0 flex-1 grid-rows-[284px_auto_284px_auto] content-start gap-0 overflow-x-visible overflow-y-auto"
          >
            <BoardSide
              label={opponent?.displayName ?? "Oponente"}
              cards={cards}
              playerId={opponent?.playerId ?? ""}
              field={opponentField}
              essences={opponentEssences}
              opponent
              viewerId={me}
              definitions={definitions}
              virtualEssenceCount={virtualEssenceCount(view.game.players[opponent?.playerId ?? ""]?.virtualEssenceCount)}
              virtualEssencePending={Boolean(view.game.pendingVirtualEssenceChanges?.[opponent?.playerId ?? ""])}
              characterMarkers={characterMarkers}
              onInspect={inspect}
              onCardMenu={openMenu}
              onOpenGraveyard={(ownerId) => setGallery({ ownerId, zone: "GRAVEYARD" })}
              onOpenDevastated={(ownerId) => setGallery({ ownerId, zone: "DEVASTATED" })}
            />
            <VerseResolutionZone
              cards={resolution}
              viewerId={me}
              definitions={definitions}
              allCards={cards}
              onInspect={inspect}
              onContextMenu={openMenu}
            />
            <BoardSide
              label="TU"
              cards={cards}
              playerId={me}
              field={field}
              essences={essences}
              onAction={run}
              onInspect={inspect}
              onCardMenu={openMenu}
              onOpenGraveyard={(ownerId) => setGallery({ ownerId, zone: "GRAVEYARD" })}
              onOpenDevastated={(ownerId) => setGallery({ ownerId, zone: "DEVASTATED" })}
              viewerId={me}
              definitions={definitions}
              virtualEssenceCount={virtualEssenceCount(view.game.players[me]?.virtualEssenceCount)}
              virtualEssencePending={Boolean(view.game.pendingVirtualEssenceChanges?.[me])}
              onEditVirtualEssence={() => setVirtualEssenceEditor(true)}
              characterMarkers={characterMarkers}
            />
            <HandZone
              cards={hand}
              onInspect={inspect}
              onPlay={(card) => playable(card, me, run, view.game?.phase ?? "ALBA")}
              onContextMenu={openMenu}
            />
          </section>
          <aside
            data-testid="board-sidebar"
            className="flex min-h-0 w-56 shrink-0 flex-col gap-1 overflow-visible"
            aria-label="Controles de partida"
          >
            <ResourcePanel
              testId="resource-panel-rival"
              label={opponent?.displayName ?? "Oponente"}
              opponent
              sanctuary={opponentSanctuary}
              sanctuaryHp={
                opponent
                  ? (view.game.players[opponent.playerId]?.sanctuaryHp ?? 0)
                  : 0
              }
              playerId={opponent?.playerId ?? ""}
              cards={cards}
              hiddenCounts={counts}
              onAction={undefined}
              onInspect={inspect}
              onContextMenu={openMenu}
              sanctuaryBackground={false}
            />
            <TurnPanel game={view.game} playerId={me} onAction={run} />
            <ResourcePanel
              testId="resource-panel-own"
              label="TU"
              sanctuary={sanctuary}
              sanctuaryHp={view.game.players[me]?.sanctuaryHp ?? 0}
              playerId={me}
              cards={cards}
              hiddenCounts={counts}
              onAction={run}
              onInspect={inspect}
              onContextMenu={openMenu}
              sanctuaryBackground={sanctuaryBackground}
            />
          </aside>
        </div>
        {menu && (
          <ContextMenu
            actions={menu.actions}
            x={menu.x}
            y={menu.y}
            placement={menu.placement}
            onAction={performContextAction}
          />
        )}
        <CardInspection
          card={inspected}
          definition={inspected?.definition ?? undefined}
          onClose={() => setInspected(null)}
        />
        {phaseBlockers.length > 0 && (
          <PhaseBlockerPopup blockers={phaseBlockers} onClose={() => setPhaseBlockers([])} />
        )}
        {gallery && (
          <GraveyardGallery
            cards={zone(cards, gallery.ownerId, gallery.zone)}
            ownerId={gallery.ownerId}
            title={gallery.zone === "DEVASTATED" ? "Devastadas" : "Cementerio"}
            viewerId={me}
            onClose={() => setGallery(null)}
            onInspect={inspect}
            onContextMenu={openMenu}
          />
        )}
        {finishIntent && (
          <FinishConfirmation
            intent={finishIntent}
            onCancel={() => setFinishIntent(null)}
            onConfirm={() => void confirmFinish()}
          />
        )}
        {statEditorCard?.definition?.type === "CHARACTER" && (
          <CharacterStatEditor
            card={statEditorCard}
            current={getCharacterDerivedStats(statEditorCard, attachedRelicsFor(statEditorCard.instanceId), definitions)}
            pending={Boolean(view.game.pendingStatChanges?.[statEditorCard.instanceId])}
            onClose={() => setStatEditorCardId(null)}
            onSubmit={(attackDelta, healthDelta) => {
              void run({ type: "PROPOSE_CHARACTER_STAT_CHANGE", proposalId: crypto.randomUUID(), characterInstanceId: statEditorCard.instanceId, playerId: me, attackDelta, healthDelta });
              setStatEditorCardId(null);
            }}
          />
        )}
        {opponentProposal && proposalCharacter?.definition?.type === "CHARACTER" && (
          <StatChangeApproval
            proposal={opponentProposal}
            card={proposalCharacter}
            current={getCharacterDerivedStats(proposalCharacter, attachedRelicsFor(proposalCharacter.instanceId), definitions)}
            onApprove={() => void run({ type: "APPROVE_CHARACTER_STAT_CHANGE", proposalId: opponentProposal.proposalId, characterInstanceId: opponentProposal.characterInstanceId, playerId: me })}
            onReject={() => void run({ type: "REJECT_CHARACTER_STAT_CHANGE", proposalId: opponentProposal.proposalId, characterInstanceId: opponentProposal.characterInstanceId, playerId: me })}
          />
        )}
        {ownProposal && (
          <div role="status" className="fixed bottom-3 left-1/2 z-30 -translate-x-1/2 border border-amber-200/30 bg-[#171311] px-4 py-2 text-xs text-amber-100">
            Cambio de ATQ/PV pendiente de aprobacion rival
          </div>
        )}
        {view.game.deckLook?.mode === "SEARCH" && (
          <DeckSearchDialog
            cards={view.game.deckLook.orderedInstanceIds.map((instanceId) => cards.find((card) => card.instanceId === instanceId)).filter((card): card is ViewCard => Boolean(card))}
            allCards={cards}
            revealedInstanceIds={view.game.deckLook.revealedInstanceIds ?? []}
            onClose={() => void run({ type: "CLOSE_DECK_SEARCH", playerId: me })}
            onSetRevealed={(instanceIds, revealed) => run({ type: "SET_DECK_SEARCH_REVEALED", playerId: me, instanceIds, revealed })}
            onResolve={(instanceIds, destination) => run({ type: "RESOLVE_DECK_SEARCH", playerId: me, instanceIds, destination })}
            onInspect={inspect}
          />
        )}
        {view.game.deckReveal && (
          <DeckSearchRevealDialog
            key={deckRevealKey}
            cards={view.game.deckReveal.instanceIds.map((instanceId) => cards.find((card) => card.instanceId === instanceId)).filter((card): card is ViewCard => Boolean(card))}
            playerName={view.players.find((player) => player.playerId === view.game!.deckReveal!.playerId)?.displayName ?? "El oponente"}
            onInspect={inspect}
          />
        )}
        {view.game.deckLook && view.game.deckLook.mode !== "SEARCH" && (
            <DeckLookDialog
              cards={view.game.deckLook.orderedInstanceIds.map((instanceId) => cards.find((card) => card.instanceId === instanceId)).filter((card): card is ViewCard => Boolean(card))}
              allCards={cards}
              onClose={() => void run({ type: "RESOLVE_DECK_LOOK", playerId: me, instanceIds: view.game!.deckLook!.orderedInstanceIds, destination: "TOP" })}
              onReorder={(orderedInstanceIds) => void run({ type: "REORDER_DECK_LOOK", playerId: me, orderedInstanceIds })}
              onResolve={(instanceIds, destination) => run({ type: "RESOLVE_DECK_LOOK", playerId: me, instanceIds, destination })}
            />
        )}
        {deckLookCount !== null && (
          <DeckLookCountDialog
            maximum={publicCount(counts, me, "MAIN_DECK")}
            initialCount={deckLookCount}
            onClose={() => setDeckLookCount(null)}
            onConfirm={(count) => {
              void run({ type: "LOOK_AT_MAIN_DECK", playerId: me, count });
              setDeckLookCount(null);
            }}
          />
        )}
        {restoreCardId && (
          <DevastationRestoreDialog
            card={cards.find((card) => card.instanceId === restoreCardId)}
            onClose={() => setRestoreCardId(null)}
            onRestore={(toZone) => {
              void run({ type: "REVERT_DEVASTATION", instanceId: restoreCardId, playerId: me, toZone });
              setRestoreCardId(null);
            }}
          />
        )}
        {virtualEssenceEditor && (
          <VirtualEssenceEditor
            current={virtualEssenceCount(view.game.players[me]?.virtualEssenceCount)}
            pending={Boolean(ownVirtualEssenceProposal)}
            onClose={() => setVirtualEssenceEditor(false)}
            onSubmit={(amount) => {
              void run({ type: "REQUEST_VIRTUAL_ESSENCE_CHANGE", proposalId: crypto.randomUUID(), playerId: me, amount });
              setVirtualEssenceEditor(false);
            }}
          />
        )}
        {opponentVirtualEssenceProposal && (
          <VirtualEssenceApproval
            proposal={opponentVirtualEssenceProposal}
            current={virtualEssenceCount(view.game.players[opponentVirtualEssenceProposal.playerId]?.virtualEssenceCount)}
            onApprove={() => void run({ type: "APPROVE_VIRTUAL_ESSENCE_CHANGE", proposalId: opponentVirtualEssenceProposal.proposalId, playerId: me, targetPlayerId: opponentVirtualEssenceProposal.playerId })}
            onReject={() => void run({ type: "REJECT_VIRTUAL_ESSENCE_CHANGE", proposalId: opponentVirtualEssenceProposal.proposalId, playerId: me, targetPlayerId: opponentVirtualEssenceProposal.playerId })}
          />
        )}
      </main>
    </DndContext>
  );
}

function Header({
  view,
  opponent,
  onAbandon,
  onFinish,
}: {
  view: RoomView;
  opponent?: RoomView["players"][number];
  onAbandon: () => void;
  onFinish: () => void;
}) {
  const opponentHandCount = view.game && opponent
    ? publicCount(view.game.publicCounts ?? view.game.hiddenCounts, opponent.playerId, "HAND")
    : 0;
  return (
    <header className="relative mx-auto flex w-full max-w-[1700px] shrink-0 justify-end gap-2 border-b border-white/10 pb-1 text-xs text-zinc-400">
      <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.24em] text-zinc-500">
        Mano rival / {opponentHandCount}
      </span>
      <span className="self-center">Rev. {view.game?.revision}</span>
      <button
        type="button"
        className="border border-white/15 px-2 py-1"
        onClick={onAbandon}
      >
        Abandonar
      </button>
      <button
        type="button"
        className="border border-rose-300/40 px-2 py-1 text-rose-100"
        onClick={onFinish}
      >
        Finalizar
      </button>
    </header>
  );
}

function FinishConfirmation({
  intent,
  onCancel,
  onConfirm,
}: {
  intent: FinishIntent;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const abandoning = intent === "ABANDONED";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-confirmation-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6"
    >
      <section className="w-full max-w-md border border-amber-200/30 bg-[#15120f] p-6">
        <h2 id="finish-confirmation-title" className="text-lg font-semibold">
          {abandoning ? "Abandonar la partida" : "Finalizar la partida"}
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          {abandoning
            ? "El rival vera que la partida fue abandonada."
            : "La partida quedara marcada como finalizada para ambos jugadores."}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="border border-white/20 px-3 py-2 text-sm text-zinc-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="border border-rose-300/40 px-3 py-2 text-sm text-rose-100"
          >
            {abandoning ? "Abandonar" : "Finalizar"}
          </button>
        </div>
      </section>
    </div>
  );
}

function TurnPanel({
  game,
  playerId,
  onAction,
}: {
  game: NonNullable<RoomView["game"]>;
  playerId: string;
  onAction: (action: GameAction) => void;
}) {
  const phases: GamePhase[] = ["ALBA", "AMANECER", "MEDIODIA", "ANOCHECER"];
  const active = game.activePlayerId === playerId;
  const nextPhase: Record<Exclude<GamePhase, "ANOCHECER">, GamePhase> = {
    ALBA: "AMANECER",
    AMANECER: "MEDIODIA",
    MEDIODIA: "ANOCHECER",
  };
  return (
    <section
      data-testid="turn-phase-panel"
      className={`border p-1 ${active ? "border-emerald-300/40 bg-emerald-950/15" : "border-white/10 bg-white/[0.02]"}`}
    >
      <div className="flex items-center justify-between">
        <ZoneLabel>Turno</ZoneLabel>
        <strong className="text-sm text-amber-100">{game.turnNumber}</strong>
      </div>
      <p
        className={`text-xs font-semibold uppercase tracking-widest ${active ? "text-emerald-200" : "text-zinc-400"}`}
      >
        {active ? "Tu turno" : "Turno del rival"}
      </p>
      <div role="list" aria-label="Fases de turno" className="mt-2 space-y-0.5">
        {phases.map((phase) => {
          const current = phase === game.phase;
          return (
            <div
              key={phase}
              role="listitem"
              aria-current={current ? "step" : undefined}
              aria-label={current ? `Fase actual: ${phase}` : phase}
              data-testid={`phase-${phase}`}
              data-phase-active={current ? "true" : "false"}
              className={`flex min-h-6 items-center justify-center border px-2 text-[10px] uppercase tracking-widest transition ${current ? "border-emerald-300/70 bg-emerald-950/45 font-semibold text-emerald-100 shadow-[0_0_12px_rgba(74,222,128,0.22)]" : "border-white/10 bg-black/10 text-zinc-600"}`}
            >
              {phase}
            </div>
          );
        })}
      </div>
      {active && game.phase !== "ANOCHECER" && (
        <button
          type="button"
          className="mt-2 w-full border border-emerald-300/40 px-2 py-1 text-[10px] uppercase tracking-widest text-emerald-100"
          onClick={() =>
            onAction({
              type: "SET_PHASE",
              phase: nextPhase[game.phase as Exclude<GamePhase, "ANOCHECER">],
            })
          }
        >
          Siguiente fase
        </button>
      )}
      {active && game.phase === "ANOCHECER" && (
        <button
          type="button"
          className="mt-2 w-full border border-emerald-300/40 px-2 py-1 text-[10px] uppercase tracking-widest text-emerald-100"
          onClick={() => onAction({ type: "END_TURN" })}
        >
          Terminar turno
        </button>
      )}
    </section>
  );
}

function PhaseBlockerPopup({ blockers, onClose }: { blockers: string[]; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Acciones pendientes de la fase"
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="w-full max-w-sm border border-amber-200/35 bg-[#171311] p-5 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.28em] text-amber-200/70">Fase incompleta</p>
        <h2 className="mt-2 text-lg font-semibold text-amber-50">Antes de continuar</h2>
        <ul className="mt-4 space-y-2 text-sm text-zinc-200">
          {blockers.map((blocker) => (
            <li key={blocker} className="border-l border-amber-300/50 pl-3">
              {phaseBlockerLabels[blocker as keyof typeof phaseBlockerLabels] ?? blocker}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-5 w-full border border-amber-200/40 px-3 py-2 text-xs uppercase tracking-widest text-amber-100 hover:bg-amber-200/10"
          onClick={onClose}
        >
          Entendido
        </button>
      </section>
    </div>
  );
}

function TurnChangePopup({ ownTurn, onClose }: { ownTurn: boolean; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ownTurn ? "Tu turno" : "Turno del oponente"}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/25 p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Image
        src={ownTurn ? "/assets/turn-own.png" : "/assets/turn-opponent.png"}
        alt={ownTurn ? "Tu turno" : "Turno oponente"}
        width={2048}
        height={768}
        priority
        className="h-auto w-[min(92vw,1100px)] object-contain"
      />
    </div>
  );
}

function ResourcePanel({
  testId,
  label,
  opponent,
  sanctuary,
  sanctuaryHp,
  playerId,
  cards,
  hiddenCounts,
  onAction,
  onInspect,
  onContextMenu,
  sanctuaryBackground,
}: {
  testId: string;
  label: string;
  opponent?: boolean;
  sanctuary?: ViewCard;
  sanctuaryHp: number;
  playerId: string;
  cards: ViewCard[];
  hiddenCounts?: HiddenCounts;
  onAction?: (action: GameAction) => void;
  onInspect: (card: ViewCard) => void;
  onContextMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
    placement?: ContextMenuPlacement,
  ) => void;
  sanctuaryBackground: boolean;
}) {
  void cards;
  const mainCount = publicCount(hiddenCounts, playerId, "MAIN_DECK");
  const essenceDeckCount = publicCount(hiddenCounts, playerId, "ESSENCE_DECK");
  return (
    <section
      data-testid={testId}
      className="border border-white/10 bg-white/[0.02] p-1"
    >
      <div className="mb-0 flex items-center justify-between">
        <ZoneLabel>{label}</ZoneLabel>
        <span className="text-[9px] uppercase tracking-widest text-zinc-600">
          {opponent ? "Rival" : "Propio"}
        </span>
      </div>
      <SanctuarySlot
        sanctuary={sanctuary}
        opponent={Boolean(opponent)}
        playerId={playerId}
        sanctuaryHp={sanctuaryHp}
        sanctuaryBackground={sanctuaryBackground}
        onAction={onAction}
        onInspect={onInspect}
        onContextMenu={onContextMenu}
      />
      <div className="mt-1 grid grid-cols-2 justify-items-center gap-1">
        <DeckPile
          label="Main Deck"
          count={mainCount}
          enabled={!opponent}
          opponent={Boolean(opponent)}
          deck="MAIN_DECK"
          onContextMenu={(event) =>
            onContextMenu(
              event,
              getDeckContextActions("MAIN_DECK", Boolean(opponent)),
              undefined,
              "above",
            )
          }
        />
        <DeckPile
          label="Essence Deck"
          count={essenceDeckCount}
          enabled={!opponent}
          opponent={Boolean(opponent)}
          deck="ESSENCE_DECK"
          onContextMenu={(event) =>
            onContextMenu(
              event,
              getDeckContextActions("ESSENCE_DECK", Boolean(opponent)),
            )
          }
        />
      </div>
    </section>
  );
}

function VerseResolutionZone({
  cards,
  viewerId,
  definitions,
  allCards,
  onInspect,
  onContextMenu,
}: {
  cards: ViewCard[];
  viewerId: string;
  definitions: Record<string, CardDefinition>;
  allCards: ViewCard[];
  onInspect: (card: ViewCard) => void;
  onContextMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
  ) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: DROP_TARGET_IDS.VERSE_RESOLUTION,
  });
  const { active } = useDndContext();
  const activeCard = active?.data.current?.card as ViewCard | undefined;
  const accepts = activeCard
    ? canDropCardOnTarget(
        activeCard,
        "VERSE_RESOLUTION",
        viewerId,
        definitions,
        Object.fromEntries(allCards.map((card) => [card.instanceId, card])),
      )
    : false;
  return (
    <div
      ref={setNodeRef}
      data-testid="verse-resolution-zone"
      className={`relative z-10 my-1 flex shrink-0 overflow-hidden border-y border-rose-200/20 px-3 text-[10px] uppercase tracking-[0.25em] transition ${cards.length > 0 ? "min-h-[104px] items-center justify-center gap-3 py-1" : "h-8 min-h-8 items-center justify-center py-1"} ${isOver && accepts ? "bg-rose-950/40 ring-1 ring-rose-200/60" : ""}`}
    >
      <span
        data-testid="verse-resolution-label"
        className={cards.length > 0 ? "shrink-0 whitespace-nowrap" : ""}
      >
        Verse Resolution / {cards.length}
      </span>
      {cards.length > 0 && (
        <div
          data-testid="verse-resolution-content"
          className="flex min-h-[88px] min-w-0 flex-1 flex-nowrap items-center justify-start gap-2 overflow-x-auto"
        >
          {cards.map((card) => (
            <PublicCard
              key={card.instanceId}
              card={card}
              size="verse"
              editable={card.controllerId === viewerId}
              onInspect={onInspect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function playable(
  card: ViewCard,
  playerId: string,
  run: (action: GameAction) => Promise<boolean>,
  phase: GamePhase,
) {
  if (
    card.zone !== "HAND" ||
    card.controllerId !== playerId ||
    !card.definition
  )
    return;
  if (card.definition.type === "CHARACTER" && phase === "MEDIODIA")
    void run({ type: "PLAY_CHARACTER", instanceId: card.instanceId, playerId });
  if (card.definition.type === "VERSE")
    void run({ type: "PLAY_VERSE", instanceId: card.instanceId, playerId });
}

function HandZone({
  cards,
  onInspect,
  onPlay,
  onContextMenu,
}: {
  cards: ViewCard[];
  onInspect: (card: ViewCard) => void;
  onPlay: (card: ViewCard) => void;
  onContextMenu: (event: React.MouseEvent, actions: RoomContextAction[], card?: ViewCard) => void;
}) {
  const { active } = useDndContext();
  const stacks = cards.reduce<ViewCard[][]>((groups, card) => {
    const previous = groups[groups.length - 1];
    if (previous?.[0].cardDefinitionId === card.cardDefinitionId) previous.push(card);
    else groups.push([card]);
    return groups;
  }, []);
  return (
    <section
      data-testid="hand-zone"
      className={`relative top-2 flex h-[clamp(156px,16vh,168px)] w-full shrink-0 flex-col overflow-visible border-t border-white/10 pt-1 ${active ? "z-20" : "z-0"}`}
    >
      <div className="px-1 text-[10px] uppercase tracking-widest text-zinc-500">
        Tu mano / {cards.length}
      </div>
      <div className="flex min-h-0 flex-1 items-end justify-center gap-1 overflow-visible px-8 pb-1 pt-2">
        {stacks.map((stack) => (
          <div
            key={stack[0].cardDefinitionId}
            data-testid={`hand-stack-${stack[0].cardDefinitionId}`}
            data-stack-count={stack.length}
            className="relative h-[168px] shrink-0"
            style={{ width: `calc(7.14rem + ${(stack.length - 1) * 16}px)` }}
          >
            {stack.map((card, index) => (
              <div
                key={card.instanceId}
                className="absolute bottom-0 left-0"
                style={{ transform: `translate(${index * 16}px, ${-index * 5}px)`, zIndex: index + 1 }}
              >
                <DraggableHandCard
                  card={card}
                  onInspect={onInspect}
                  onPlay={onPlay}
                  onContextMenu={onContextMenu}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function DraggableHandCard({
  card,
  onInspect,
  onPlay,
  onContextMenu,
}: {
  card: ViewCard;
  onInspect: (card: ViewCard) => void;
  onPlay: (card: ViewCard) => void;
  onContextMenu: (event: React.MouseEvent, actions: RoomContextAction[], card?: ViewCard) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.instanceId, data: { card } });
  return (
    <div
      ref={setNodeRef}
      data-testid={`hand-card-${card.instanceId}`}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.35 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
      className="relative shrink-0 origin-bottom"
      {...listeners}
      {...attributes}
      title="Arrastra la carta al destino correspondiente"
    >
      <motion.div
        layout
        data-testid={`hand-card-surface-${card.instanceId}`}
        whileHover={{ y: -8, scale: 1.06, zIndex: 30 }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        className="origin-bottom scale-[0.94]"
      >
        <GameCard
          card={card}
          definition={card.definition ?? undefined}
          size="hand"
          showGenericCounter={card.definition?.type !== "CHARACTER"}
          onInspect={() => onInspect(card)}
          onDoubleClick={() => onPlay(card)}
          onContextMenu={(event) => onContextMenu(event, getHandCardContextActions(card), card)}
        />
      </motion.div>
    </div>
  );
}

function BoardSide({
  label,
  cards,
  playerId,
  field,
  essences,
  opponent = false,
  onAction,
  onInspect,
  onCardMenu,
  onOpenGraveyard,
  onOpenDevastated,
  viewerId,
  definitions,
  virtualEssenceCount,
  virtualEssencePending,
  onEditVirtualEssence,
  characterMarkers,
}: {
  label: string;
  cards: ViewCard[];
  playerId: string;
  field: ViewCard[];
  essences: ViewCard[];
  opponent?: boolean;
  onAction?: (action: GameAction) => void;
  onInspect: (card: ViewCard) => void;
  onCardMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
  ) => void;
  onOpenGraveyard: (playerId: string) => void;
  onOpenDevastated: (playerId: string) => void;
  viewerId: string;
  definitions: Record<string, CardDefinition>;
  virtualEssenceCount: number;
  virtualEssencePending: boolean;
  onEditVirtualEssence?: () => void;
  characterMarkers: Record<string, CharacterMarker[]>;
}) {
  const graveyard = zone(cards, playerId, "GRAVEYARD");
  const markers = getVisibleMarkersForCards(cards, playerId, definitions);
  const characters = field.filter(
    (card) => card.definition?.type === "CHARACTER",
  );
  const looseRelics = field.filter(
    (card) =>
      card.definition?.type === "RELIC" && card.attachedToInstanceId === null,
  );
  const attachedRelics = field.filter(
    (card) =>
      card.definition?.type === "RELIC" && card.attachedToInstanceId !== null,
  );
  const central = getCentralZoneOrder(opponent);
  const essenceField = (
    <EssenceField
      cards={essences}
      opponent={opponent}
      onAction={onAction}
      onInspect={onInspect}
      onContextMenu={onCardMenu}
      virtualEssenceCount={virtualEssenceCount}
      virtualEssencePending={virtualEssencePending}
      onEditVirtualEssence={onEditVirtualEssence}
      onUntapAllEssences={!opponent && essences.some((card) => card.tapped) ? () => onAction?.({ type: "UNTAP_ALL_ESSENCES", playerId }) : undefined}
    />
  );
  const hiddenFieldCards = field.filter((card) => card.hidden);
  const characterField = (
    <CharacterField
      opponent={opponent}
      viewerId={viewerId}
      allCards={cards}
      definitions={definitions}
      characters={characters}
      looseRelics={looseRelics}
      attachedRelics={attachedRelics}
      characterMarkers={characterMarkers}
      hiddenCards={hiddenFieldCards}
      onAction={onAction}
      onInspect={onInspect}
      onContextMenu={onCardMenu}
      onOpenDevastated={() => onOpenDevastated(playerId)}
    />
  );
  return (
    <section
      aria-label={`Tablero de ${label}`}
      className="relative z-10 h-full min-h-0 min-w-0"
    >
      <div className={`pointer-events-none absolute left-1 z-20 text-[10px] uppercase tracking-[0.24em] text-zinc-500 ${opponent ? "bottom-1" : "top-1"}`}>
        <span>{label}</span>
      </div>
      <div className={`pointer-events-none absolute left-0 z-20 w-[88px] text-center text-[8px] uppercase tracking-wider text-amber-100/80 ${opponent ? "top-[112px]" : "top-[162px]"}`}>
        {markers.map((marker) => <span key={marker.id}>{marker.label} {marker.value}</span>)}
      </div>
      <div className="grid h-full min-h-0 grid-cols-[88px_minmax(0,1fr)] items-stretch gap-2">
        <div
          className={`grid min-h-0 ${opponent ? "grid-rows-[104px_180px]" : "grid-rows-[180px_104px]"}`}
        >
          <div className={opponent ? "row-start-1" : "row-start-2"}>
            <GraveyardZone
              cards={graveyard}
              opponent={opponent}
              viewerId={viewerId}
              definitions={definitions}
              allCards={cards}
              onOpenGraveyard={() => onOpenGraveyard(playerId)}
              onContextMenu={onCardMenu}
            />
          </div>
          <div className={opponent ? "row-start-2 self-center" : "row-start-1 self-center"}>
            <UtilityChest playerId={playerId} disabled={opponent} />
          </div>
        </div>
        <div
          data-testid={opponent ? "opponent-central-zones" : "own-central-zones"}
          className={`grid min-h-0 min-w-0 flex-1 gap-0 ${opponent ? "grid-rows-[104px_180px]" : "grid-rows-[180px_104px]"}`}
        >
          {central[0] === "ESSENCE_ZONE" ? (
            <>
              {essenceField}
              {characterField}
            </>
          ) : (
            <>
              {characterField}
              {essenceField}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function GraveyardZone({
  cards,
  opponent,
  viewerId,
  definitions,
  allCards,
  onOpenGraveyard,
  onContextMenu,
}: {
  cards: ViewCard[];
  opponent: boolean;
  viewerId: string;
  definitions: Record<string, CardDefinition>;
  allCards: ViewCard[];
  onOpenGraveyard: () => void;
  onContextMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
  ) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: DROP_TARGET_IDS.GRAVEYARD,
    disabled: opponent,
  });
  const { active } = useDndContext();
  const activeCard = active?.data.current?.card as ViewCard | undefined;
  const accepts = activeCard
    ? canDropCardOnTarget(
        activeCard,
        "GRAVEYARD",
        viewerId,
        definitions,
        Object.fromEntries(allCards.map((card) => [card.instanceId, card])),
      )
    : false;
  const top = getTopCardInZone(cards);
  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-0 flex-col justify-start gap-1 transition ${
        opponent ? "self-start" : "self-end"
      } ${isOver && accepts ? "rounded bg-zinc-900/70 ring-1 ring-zinc-300/60" : ""}`}
    >
      <div
        data-testid="graveyard-slot"
        role="button"
        tabIndex={0}
        aria-label={`Abrir Cementerio, ${cards.length} cartas`}
        className="flex h-[clamp(104px,10vh,108px)] min-h-[clamp(104px,10vh,108px)] cursor-pointer items-center justify-center border border-white/10 bg-white/[0.025] p-1 text-center text-[9px] uppercase tracking-widest text-zinc-500 hover:border-amber-200/50"
        onClick={onOpenGraveyard}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onOpenGraveyard();
        }}
      >
        {top ? (
          <div className="origin-center scale-[0.92]">
            <PublicCard
              card={top}
              size="sm"
              onInspect={() => undefined}
              onContextMenu={onContextMenu}
            />
          </div>
        ) : (
          "Cementerio vacío"
        )}
      </div>
    </div>
  );
}

const markerTone: Record<CharacterMarkerKind, string> = {
  IMBATIBLE: "border-sky-200/60 bg-sky-950/90 text-sky-100",
  MITICA: "border-fuchsia-200/60 bg-fuchsia-950/90 text-fuchsia-100",
  DEVASTAR: "border-rose-200/60 bg-rose-950/90 text-rose-100",
  ENTRENAMIENTO: "border-amber-200/60 bg-amber-950/90 text-amber-100",
};

function UtilityChest({ playerId, disabled }: { playerId: string; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const [trayPosition, setTrayPosition] = useState({ left: 8, top: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const updateTrayPosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTrayPosition({
        left: Math.max(8, rect.right - 176),
        top: rect.top + rect.height / 2,
      });
    };
    updateTrayPosition();
    window.addEventListener("resize", updateTrayPosition);
    document.addEventListener("scroll", updateTrayPosition, true);
    return () => {
      window.removeEventListener("resize", updateTrayPosition);
      document.removeEventListener("scroll", updateTrayPosition, true);
    };
  }, [open, disabled]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !trayRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
  }, [open, disabled]);

  return (
    <div ref={rootRef} data-testid={`utility-chest-${playerId}`} className="relative z-30 flex h-16 w-[88px] justify-end">
      {open && !disabled
        ? createPortal(
            <div
              ref={trayRef}
              data-testid={`utility-tray-${playerId}`}
              style={{ left: trayPosition.left, top: trayPosition.top }}
              className="fixed z-[100] grid w-[176px] -translate-y-1/2 grid-cols-2 gap-1 border border-amber-200/30 bg-[#171311]/95 p-1 shadow-xl"
            >
              {CHARACTER_MARKER_KINDS.map((kind) => (
                <UtilityMarkerSource key={kind} kind={kind} playerId={playerId} disabled={disabled} />
              ))}
            </div>,
            document.body,
          )
        : disabled ? (
          <div aria-hidden="true" className="flex h-16 w-16 items-center justify-center p-0 opacity-70">
            <Image
              src="/assets/utils-chest.png"
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
        <button
          type="button"
          aria-label="Abrir Utils"
          aria-expanded={false}
          className="group flex h-16 w-16 items-center justify-center p-0 transition disabled:cursor-default disabled:opacity-70"
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
        >
          <Image
            src="/assets/utils-chest.png"
            alt=""
            width={64}
            height={64}
            className="h-full w-full object-contain transition duration-150 group-hover:brightness-125 group-hover:drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] group-disabled:brightness-75"
          />
        </button>
      )}
    </div>
  );
}

function UtilityMarkerSource({ kind, playerId, disabled }: { kind: CharacterMarkerKind; playerId: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `utility:${playerId}:${kind}`,
    disabled,
    data: { utilityMarker: kind },
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-label={`Marcador ${CHARACTER_MARKER_LABELS[kind]}`}
      data-testid={`utility-marker-${playerId}-${kind}`}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.45 : disabled ? 0.45 : 1,
      }}
      className={`flex h-7 min-w-0 cursor-grab items-center justify-center border px-1 text-center text-[7px] font-semibold uppercase leading-tight active:cursor-grabbing ${markerTone[kind]}`}
      title={disabled ? "Marcadores del rival" : `Arrastrar ${CHARACTER_MARKER_LABELS[kind]}`}
    >
      {CHARACTER_MARKER_LABELS[kind]}
    </button>
  );
}

function CharacterMarkerStack({
  markers,
  editable,
  characterInstanceId,
  onRemove,
}: {
  markers: CharacterMarker[];
  editable: boolean;
  characterInstanceId: string;
  onRemove: (markerId: string) => void;
}) {
  if (markers.length === 0) return null;
  return (
    <div data-testid={`character-marker-stack-${characterInstanceId}`} className="pointer-events-none absolute inset-x-1 top-1 z-30 flex flex-col gap-0.5">
      {markers.map((marker) => (
        <div
          key={marker.markerId}
          role={editable ? "button" : undefined}
          tabIndex={editable ? 0 : undefined}
          aria-label={editable ? `Quitar ${CHARACTER_MARKER_LABELS[marker.kind]}` : CHARACTER_MARKER_LABELS[marker.kind]}
          className={`pointer-events-auto flex h-4 w-full items-center justify-center border px-1 text-center text-[8px] font-semibold uppercase tracking-wide shadow ${markerTone[marker.kind]} ${editable ? "cursor-pointer hover:brightness-125" : ""}`}
          onPointerDown={(event) => {
            if (editable) event.stopPropagation();
          }}
          onClick={(event) => {
            if (!editable) return;
            event.stopPropagation();
            onRemove(marker.markerId);
          }}
          onKeyDown={(event) => {
            if (!editable || (event.key !== "Enter" && event.key !== " ")) return;
            event.preventDefault();
            event.stopPropagation();
            onRemove(marker.markerId);
          }}
        >
          <span className="truncate">{CHARACTER_MARKER_LABELS[marker.kind]}</span>
        </div>
      ))}
    </div>
  );
}

function CharacterField({
  opponent,
  viewerId,
  allCards,
  definitions,
  characters,
  looseRelics,
  attachedRelics,
  characterMarkers,
  hiddenCards,
  onAction,
  onInspect,
  onContextMenu,
  onOpenDevastated,
}: {
  opponent: boolean;
  viewerId: string;
  allCards: ViewCard[];
  definitions: Record<string, CardDefinition>;
  characters: ViewCard[];
  looseRelics: ViewCard[];
  attachedRelics: ViewCard[];
  characterMarkers: Record<string, CharacterMarker[]>;
  hiddenCards: ViewCard[];
  onAction?: (action: GameAction) => void;
  onInspect: (card: ViewCard) => void;
  onContextMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
  ) => void;
  onOpenDevastated: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: DROP_TARGET_IDS.FIELD,
    disabled: opponent,
  });
  const { active } = useDndContext();
  const activeCard = active?.data.current?.card as ViewCard | undefined;
  const cardMap = Object.fromEntries(
    allCards.map((card) => [card.instanceId, card]),
  );
  const accepts = activeCard
    ? canDropCardOnTarget(activeCard, "FIELD", viewerId, definitions, cardMap)
    : false;
  return (
    <div
      ref={setNodeRef}
      className={`relative flex h-[180px] min-h-[180px] flex-col border border-white/[0.08] bg-white/[0.02] p-1 transition ${isOver && accepts ? "border-amber-200/80 bg-amber-950/20" : ""}`}
    >
      <div className={`pointer-events-none absolute inset-x-1 z-10 flex items-center justify-between ${opponent ? "bottom-1" : "top-1"}`}>
        <ZoneLabel>FIELD</ZoneLabel>
        {isOver && accepts && (
          <span className="text-[9px] uppercase tracking-widest text-amber-200">
            Soltar en Campo
          </span>
        )}
      </div>
      <button
        type="button"
        className={`absolute left-2 z-20 flex h-8 w-[76px] items-center justify-center border border-rose-200/25 bg-[#171311]/90 px-2 text-[8px] uppercase tracking-wider text-rose-100 hover:border-rose-200/60 ${opponent ? "top-2" : "bottom-2"}`}
        onClick={onOpenDevastated}
        aria-label="Abrir Devastadas"
      >
        <span>Devastadas</span>
      </button>
      <div
        data-testid="character-field-content"
        className="flex h-full min-h-0 flex-wrap content-center items-center justify-center gap-x-2 gap-y-1 overflow-visible"
      >
        {characters.map((character) => {
          const relics = attachedRelics.filter(
            (relic) => relic.attachedToInstanceId === character.instanceId,
          );
          return (
            <CharacterSlot
              key={character.instanceId}
              card={character}
              opponent={opponent}
              viewerId={viewerId}
              allCards={allCards}
              attachedRelics={relics}
            >
              <CharacterStack
                character={character}
                relics={relics}
                markers={characterMarkers[character.instanceId] ?? []}
                opponent={opponent}
                onAction={onAction}
                onInspect={onInspect}
                onContextMenu={onContextMenu}
                definitions={definitions}
              />
            </CharacterSlot>
          );
        })}
        {looseRelics.map((relic) => (
          <FieldSlot
            key={relic.instanceId}
            slotId={relic.instanceId}
            viewerId={viewerId}
            definitions={definitions}
            allCards={cardMap}
            disabled={opponent}
          >
            <FieldCard
              card={relic}
              opponent={opponent}
              onAction={onAction}
              onInspect={onInspect}
              onContextMenu={onContextMenu}
            />
          </FieldSlot>
        ))}
        {hiddenCards.map((card) => (
          <PublicCard
            key={card.instanceId}
            card={card}
            size="field"
            onInspect={onInspect}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </div>
  );
}

function getRelicStackLayout(count: number) {
  const plateHeight = count >= 3 ? 18 : 20;
  const rowStep =
    count <= 1 ? plateHeight : count === 2 ? 14 : Math.max(8, 10 - (count - 3));
  const stackHeight = count === 0 ? 0 : plateHeight + (count - 1) * rowStep;
  return { plateHeight, rowStep, stackHeight };
}

function CharacterStack({
  character,
  relics,
  markers,
  opponent,
  onAction,
  onInspect,
  onContextMenu,
  definitions,
}: {
  character: ViewCard;
  relics: ViewCard[];
  markers: CharacterMarker[];
  opponent: boolean;
  onAction?: (action: GameAction) => void;
  onInspect: (card: ViewCard) => void;
  onContextMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
  ) => void;
  definitions: Record<string, CardDefinition>;
}) {
  const { plateHeight, rowStep, stackHeight } = getRelicStackLayout(
    relics.length,
  );
  return (
    <div
      data-testid={`character-stack-${character.instanceId}`}
      data-stack-height={141 + stackHeight}
      className="flex h-full w-full shrink-0 items-center justify-center"
    >
      <div className="flex shrink-0 flex-col items-center justify-center">
        <div className="relative shrink-0">
          <FieldCard
            card={character}
            opponent={opponent}
            onAction={onAction}
            onInspect={onInspect}
            onContextMenu={onContextMenu}
            showCharacterStats
            characterStats={getCharacterDerivedStats(
              character,
              relics,
              definitions,
            )}
          />
          <CharacterMarkerStack
            markers={markers}
            editable={!opponent}
            characterInstanceId={character.instanceId}
            onRemove={(markerId) =>
              onAction?.({
                type: "REMOVE_CHARACTER_MARKER",
                characterInstanceId: character.instanceId,
                markerId,
              })
            }
          />
        </div>
        {relics.length > 0 && (
          <div
            data-testid={`attached-relic-stack-${character.instanceId}`}
            data-stack-row-step={rowStep}
            className="pointer-events-none flex w-full shrink-0 flex-col items-center"
            style={{ height: stackHeight }}
          >
            <div
              className="pointer-events-auto grid w-full justify-items-center"
              style={{ gridAutoRows: rowStep }}
            >
              {relics.map((relic) => (
                <AttachedRelicPlate
                  key={relic.instanceId}
                  card={relic}
                  opponent={opponent}
                  plateHeight={plateHeight}
                  onAction={onAction}
                  onInspect={onInspect}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldSlot({
  slotId,
  viewerId,
  definitions,
  allCards,
  disabled,
  children,
}: {
  slotId: string;
  viewerId: string;
  definitions: Record<string, CardDefinition>;
  allCards: Record<string, ViewCard>;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const target = { type: "FIELD_SLOT", slotId } as const;
  const { isOver, setNodeRef } = useDroppable({
    id: DROP_TARGET_IDS.fieldSlot(slotId),
    disabled,
  });
  const { active } = useDndContext();
  const activeCard = active?.data.current?.card as ViewCard | undefined;
  const accepts = activeCard
    ? canDropCardOnTarget(activeCard, target, viewerId, definitions, allCards)
    : false;
  return (
    <div
      ref={setNodeRef}
      data-testid={`field-slot-${slotId}`}
      className={`flex h-[180px] min-h-[180px] min-w-32 items-center justify-center transition ${isOver && accepts ? "rounded bg-amber-950/20 ring-1 ring-amber-200/70" : ""}`}
    >
      {children}
    </div>
  );
}

function CharacterSlot({
  card,
  opponent,
  viewerId,
  allCards,
  attachedRelics,
  children,
}: {
  card: ViewCard;
  opponent: boolean;
  viewerId: string;
  allCards: ViewCard[];
  attachedRelics: ViewCard[];
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: DROP_TARGET_IDS.characterSlot(card.instanceId),
    disabled: opponent,
  });
  const { active } = useDndContext();
  const activeCard = active?.data.current?.card as ViewCard | undefined;
  const activeMarker = active?.data.current?.utilityMarker;
  const definitions = Object.fromEntries(
    allCards.flatMap((item) =>
      item.definition ? [[item.cardDefinitionId, item.definition]] : [],
    ),
  );
  const cardMap = Object.fromEntries(
    allCards.map((item) => [item.instanceId, item]),
  );
  const accepts = activeCard
    ? canDropCardOnTarget(
        activeCard,
        { type: "CHARACTER_SLOT", characterInstanceId: card.instanceId },
        viewerId,
        definitions,
        cardMap,
      )
    : isCharacterMarkerKind(activeMarker) && !opponent;
  return (
    <div
      ref={setNodeRef}
      className={`relative flex h-[180px] min-h-[180px] min-w-32 shrink-0 items-center justify-center overflow-visible transition ${isOver && accepts ? "rounded border border-amber-200/80 bg-amber-950/20" : ""}`}
      data-attached-relic-count={attachedRelics.length}
    >
      {children}
    </div>
  );
}

function EssenceField({
  cards,
  opponent,
  onAction,
  onInspect,
  onContextMenu,
  virtualEssenceCount,
  virtualEssencePending,
  onEditVirtualEssence,
  onUntapAllEssences,
}: {
  cards: ViewCard[];
  opponent: boolean;
  onAction?: (action: GameAction) => void;
  onInspect: (card: ViewCard) => void;
  onContextMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
  ) => void;
  virtualEssenceCount: number;
  virtualEssencePending: boolean;
  onEditVirtualEssence?: () => void;
  onUntapAllEssences?: () => void;
}) {
  const sizeClass = "h-[104px] min-h-[104px]";
  return (
    <div
      data-testid="essence-zone"
      className={`relative flex ${sizeClass} shrink-0 flex-col border border-emerald-200/15 bg-emerald-950/10 px-2 py-1`}
    >
      <div className={`pointer-events-none absolute inset-x-2 z-10 ${opponent ? "top-1" : "bottom-1"}`}>
        <ZoneLabel>Essences / {cards.length}</ZoneLabel>
      </div>
      <button
        type="button"
        className={`absolute right-2 z-20 border px-1.5 py-0.5 text-[8px] uppercase tracking-wider ${opponent ? "top-1 pointer-events-none border-emerald-200/20 text-emerald-100/70" : "bottom-1 border-emerald-200/40 text-emerald-100 hover:border-emerald-100"}`}
        onClick={onEditVirtualEssence}
        aria-label={opponent ? `Esencias virtuales: ${virtualEssenceCount}` : "Modificar Esencias virtuales"}
      >
        VE {virtualEssenceCount}{virtualEssencePending ? " *" : ""}
      </button>
      {onUntapAllEssences && (
        <button
          type="button"
          className="absolute left-2 top-1 z-20 border border-emerald-200/40 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-emerald-100 hover:border-emerald-100"
          onClick={onUntapAllEssences}
          aria-label="Enderezar todas las Esencias"
        >
          Enderezar Esencias
        </button>
      )}
      {cards.length > 0 && (
        <div
          data-testid="essence-zone-content"
          className="flex min-h-0 flex-1 flex-wrap content-center items-center justify-center gap-1 overflow-visible"
        >
          {cards.map((card) => (
            <div
              key={card.instanceId}
              data-testid={`essence-card-frame-${card.instanceId}`}
              className={`flex h-[6.12rem] shrink-0 items-center justify-center ${card.tapped ? "w-[6.12rem]" : "w-[4.335rem]"}`}
            >
              <FieldCard
                card={card}
                opponent={opponent}
                size="essence"
                onAction={onAction}
                onInspect={onInspect}
                onContextMenu={onContextMenu}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SanctuarySlot({
  sanctuary,
  opponent,
  playerId,
  sanctuaryHp,
  onAction,
  onInspect,
  onContextMenu,
  sanctuaryBackground,
}: {
  sanctuary?: ViewCard;
  opponent: boolean;
  playerId: string;
  sanctuaryHp: number;
  sanctuaryBackground: boolean;
  onAction?: (action: GameAction) => void;
  onInspect: (card: ViewCard) => void;
  onContextMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
  ) => void;
}) {
  const hpButtonClass =
    "h-8 w-8 shrink-0 border border-amber-200/30 bg-amber-950/30 text-base leading-none text-amber-100 transition hover:border-amber-100/70";
  const hpSpacer = <span aria-hidden="true" className="h-8 w-8 shrink-0" />;
  const sanctuaryContextMenu = (event: React.MouseEvent) => {
    if (!sanctuary) return;
    const actions = getPublicCardContextActions(sanctuary, !opponent);
    if (!opponent) {
      actions.push(
        sanctuaryBackground
          ? "REMOVE_SANCTUARY_BACKGROUND"
          : "SET_SANCTUARY_BACKGROUND",
      );
    }
    onContextMenu(event, actions, sanctuary);
  };
  return (
    <div
      data-testid="resource-sanctuary"
      className={`relative flex h-[174px] flex-col items-center gap-0.5 overflow-hidden border border-amber-200/10 bg-amber-950/[0.08] p-1 ${sanctuaryBackground ? "bg-cover bg-center" : ""}`}
      style={sanctuaryBackground ? { backgroundImage: "linear-gradient(rgba(9, 8, 7, 0.28), rgba(9, 8, 7, 0.28)), url('/assets/sanctuary-background.png')" } : undefined}
    >
      <ZoneLabel>Sanctuary</ZoneLabel>
      {sanctuary && (
        <>
          <div className="flex h-[124px] w-full shrink-0 items-center justify-center gap-2">
            {opponent ? (
              hpSpacer
            ) : (
              <button
                type="button"
                aria-label="Bajar vida del Santuario"
                className={hpButtonClass}
                onClick={() =>
                  onAction?.({
                    type: "CHANGE_SANCTUARY_HP",
                    playerId,
                    amount: -1,
                  })
                }
              >
                -
              </button>
            )}
            <PublicCard
              card={sanctuary}
              size="sanctuary"
              onInspect={onInspect}
              onContextMenu={sanctuaryContextMenu}
            />
            {opponent ? (
              hpSpacer
            ) : (
              <button
                type="button"
                aria-label="Subir vida del Santuario"
                className={hpButtonClass}
                onClick={() =>
                  onAction?.({
                    type: "CHANGE_SANCTUARY_HP",
                    playerId,
                    amount: 1,
                  })
                }
              >
                +
              </button>
            )}
          </div>
          <div className="flex h-6 shrink-0 items-center justify-center">
            <span className="text-base font-semibold leading-none text-rose-200">
              PV {sanctuaryHp}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function FieldCard({
  card,
  opponent,
  size = "field",
  characterStats,
  showCharacterStats = false,
  onAction,
  onInspect,
  onContextMenu,
}: {
  card: ViewCard;
  opponent: boolean;
  size?: "essence" | "field" | "sm";
  characterStats?: { attack: number; health: number };
  showCharacterStats?: boolean;
  onAction?: (action: GameAction) => void;
  onInspect: (card: ViewCard) => void;
  onContextMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
  ) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.instanceId,
      disabled: opponent || card.definition?.type !== "RELIC",
      data: { card },
    });
  const onDoubleClick = opponent
    ? undefined
    : () =>
        onAction?.({
          type: card.tapped ? "UNTAP_CARD" : "TAP_CARD",
          instanceId: card.instanceId,
        });
  const rendered = (
    <div>
      <PublicCard
        card={card}
        size={size}
        characterStats={characterStats}
        showCharacterStats={showCharacterStats}
        editable={!opponent}
        onCounterChange={
          opponent || card.definition?.type === "RELIC"
            ? undefined
            : (amount) =>
                onAction?.({
                  type: "CHANGE_CARD_COUNTER",
                  instanceId: card.instanceId,
                  amount,
                })
        }
        onInspect={onInspect}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      />
    </div>
  );
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.35 : 1,
      }}
      {...listeners}
      {...attributes}
    >
      {rendered}
    </div>
  );
}

function AttachedRelicPlate({
  card,
  opponent,
  plateHeight,
  onAction,
  onInspect,
  onContextMenu,
}: {
  card: ViewCard;
  opponent: boolean;
  plateHeight: number;
  onAction?: (action: GameAction) => void;
  onInspect: (card: ViewCard) => void;
  onContextMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
  ) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.instanceId, disabled: opponent, data: { card } });
  const name = card.definition?.name ?? "Reliquia";
  const clickHandlers = useCardClick(
    () => onInspect(card),
    opponent
      ? undefined
      : () =>
          onAction?.({
            type: card.tapped ? "UNTAP_CARD" : "TAP_CARD",
            instanceId: card.instanceId,
          }),
  );
  return (
    <div
      ref={setNodeRef}
      className="pointer-events-auto relative z-10 w-full max-w-[6.426rem] shrink-0"
      style={{
        height: plateHeight,
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        {...listeners}
        {...attributes}
        onPointerDownCapture={clickHandlers.onPointerDownCapture}
        onPointerUpCapture={clickHandlers.onPointerUpCapture}
        onPointerCancelCapture={clickHandlers.onPointerCancelCapture}
        onDoubleClick={clickHandlers.onDoubleClick}
        onContextMenu={(event) =>
          onContextMenu(
            event,
            getPublicCardContextActions(card, !opponent),
            card,
          )
        }
        className="flex h-full items-center justify-center truncate border border-amber-200/40 bg-[#2a211b] px-2 text-[9px] font-medium text-amber-100 shadow-lg transition hover:border-amber-100/80"
        title={name}
      >
        {name}
      </motion.div>
    </div>
  );
}

function PublicCard({
  card,
  size = "md",
  characterStats,
  showCharacterStats = false,
  editable = false,
  onCounterChange,
  onInspect,
  onDoubleClick,
  onContextMenu,
}: {
  card: ViewCard;
  size?: "essence" | "field" | "sm" | "md" | "sanctuary" | "verse";
  characterStats?: { attack: number; health: number };
  showCharacterStats?: boolean;
  editable?: boolean;
  onCounterChange?: (amount: number) => void;
  onInspect: (card: ViewCard) => void;
  onDoubleClick?: () => void;
  onContextMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
  ) => void;
}) {
  if (!card.definition)
    return (
      <GameCard
        card={card}
        size={size}
        onContextMenu={(event) => onContextMenu(event, [], card)}
      />
    );
  return (
    <GameCard
      card={card}
      definition={card.definition}
      characterStats={characterStats}
      showCharacterStats={showCharacterStats}
      size={size}
      editable={editable}
      showGenericCounter={card.definition.type !== "CHARACTER"}
      onCounterChange={onCounterChange}
      onInspect={() => onInspect(card)}
      onDoubleClick={onDoubleClick}
      onContextMenu={(event) =>
        onContextMenu(event, getPublicCardContextActions(card, editable), card)
      }
    />
  );
}

function GraveyardGallery({
  cards,
  ownerId,
  title,
  viewerId,
  onClose,
  onInspect,
  onContextMenu,
}: {
  cards: ViewCard[];
  ownerId: string;
  title: string;
  viewerId: string;
  onClose: () => void;
  onInspect: (card: ViewCard) => void;
  onContextMenu: (
    event: React.MouseEvent,
    actions: RoomContextAction[],
    card?: ViewCard,
  ) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} de ${ownerId}`}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl border border-white/15 bg-[#171311] p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-[0.2em]">
            {title} / {ownerId}
          </h2>
          <button
            type="button"
            className="border border-white/15 px-3 py-1 text-xs"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 md:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.instanceId}
              className="flex justify-center"
              onContextMenu={(event) =>
                onContextMenu(
                  event,
                  getPublicCardContextActions(
                    card,
                    card.controllerId === viewerId,
                  ),
                  card,
                )
              }
            >
              <PublicCard
                card={card}
                editable={card.controllerId === viewerId}
                onInspect={onInspect}
                onContextMenu={onContextMenu}
              />
            </div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}

function DeckPile({
  label,
  count,
  enabled,
  opponent,
  deck,
  onContextMenu,
}: {
  label: string;
  count: number;
  enabled: boolean;
  opponent: boolean;
  deck: "MAIN_DECK" | "ESSENCE_DECK";
  onContextMenu: (event: React.MouseEvent) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      {opponent && <DeckMetadata label={label} count={count} />}
      <CardBack
        label={label}
        count={count}
        deck={deck}
        enabled={enabled}
        showCount={false}
        onClick={(event) => {
          event.stopPropagation();
          getDeckClickAction();
        }}
        onContextMenu={onContextMenu}
      />
      {!opponent && <DeckMetadata label={label} count={count} />}
    </div>
  );
}

function DeckMetadata({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex min-h-7 flex-col items-center justify-center text-center leading-none">
      <span className="text-[8px] uppercase tracking-[0.12em] text-zinc-500">{label}</span>
      <strong className="mt-0.5 text-sm text-amber-100">{count}</strong>
    </div>
  );
}

function ZoneLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-0.5 text-[9px] uppercase tracking-[0.18em] text-zinc-500">
      {children}
    </div>
  );
}

function CharacterStatEditor({
  card,
  current,
  pending,
  onClose,
  onSubmit,
}: {
  card: ViewCard;
  current: { attack: number; health: number };
  pending: boolean;
  onClose: () => void;
  onSubmit: (attackDelta: number, healthDelta: number) => void;
}) {
  const [attackDelta, setAttackDelta] = useState(0);
  const [healthDelta, setHealthDelta] = useState(0);
  const nextAttack = Math.max(0, current.attack + attackDelta);
  const nextHealth = Math.max(0, current.health + healthDelta);
  const controlClass = "h-8 w-8 border border-white/15 text-base hover:border-amber-200/60 disabled:opacity-30";
  return (
    <div role="dialog" aria-modal="true" aria-label="Modificar ATQ y PV" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
      <section className="w-full max-w-sm border border-amber-200/25 bg-[#171311] p-5">
        <h2 className="text-sm uppercase tracking-[0.2em] text-amber-100">Modificar ATQ/PV</h2>
        <p className="mt-2 text-sm text-zinc-300">{card.definition?.name}</p>
        <p className="mt-1 text-xs text-zinc-500">El rival debe aprobar el cambio antes de aplicarlo.</p>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="border border-white/10 p-3 text-center">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">ATQ</span>
            <strong className="mt-2 block text-2xl">{nextAttack}</strong>
            <div className="mt-3 flex justify-center gap-2">
              <button type="button" aria-label="Bajar ATQ" className={controlClass} disabled={nextAttack <= 0} onClick={() => setAttackDelta((value) => Math.max(-current.attack, value - 1))}>-</button>
              <button type="button" aria-label="Subir ATQ" className={controlClass} disabled={attackDelta >= 99} onClick={() => setAttackDelta((value) => Math.min(99, value + 1))}>+</button>
            </div>
          </div>
          <div className="border border-white/10 p-3 text-center">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">PV</span>
            <strong className="mt-2 block text-2xl">{nextHealth}</strong>
            <div className="mt-3 flex justify-center gap-2">
              <button type="button" aria-label="Bajar PV" className={controlClass} disabled={nextHealth <= 0} onClick={() => setHealthDelta((value) => Math.max(-current.health, value - 1))}>-</button>
              <button type="button" aria-label="Subir PV" className={controlClass} disabled={healthDelta >= 99} onClick={() => setHealthDelta((value) => Math.min(99, value + 1))}>+</button>
            </div>
          </div>
        </div>
        {pending && <p role="status" className="mt-4 text-xs text-amber-200">Ya existe una propuesta pendiente para este Personaje.</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="border border-white/15 px-3 py-2 text-xs" onClick={onClose}>Cancelar</button>
          <button type="button" className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100 disabled:opacity-30" disabled={pending || attackDelta === 0 && healthDelta === 0} onClick={() => onSubmit(attackDelta, healthDelta)}>Solicitar cambio</button>
        </div>
      </section>
    </div>
  );
}

function StatChangeApproval({
  proposal,
  card,
  current,
  onApprove,
  onReject,
}: {
  proposal: CharacterStatChangeProposal;
  card: ViewCard;
  current: { attack: number; health: number };
  onApprove: () => void;
  onReject: () => void;
}) {
  const nextAttack = Math.max(0, current.attack + proposal.attackDelta);
  const nextHealth = Math.max(0, current.health + proposal.healthDelta);
  return (
    <div role="dialog" aria-modal="true" aria-label="Aprobar cambio de ATQ y PV" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
      <section className="w-full max-w-sm border border-amber-200/25 bg-[#171311] p-5">
        <h2 className="text-sm uppercase tracking-[0.2em] text-amber-100">Cambio de ATQ/PV</h2>
        <p className="mt-2 text-sm text-zinc-300">{card.definition?.name}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <div className="border border-white/10 p-3"><span className="text-[10px] text-zinc-500">ATQ</span><strong className="mt-1 block text-xl">{current.attack} → {nextAttack}</strong></div>
          <div className="border border-white/10 p-3"><span className="text-[10px] text-zinc-500">PV</span><strong className="mt-1 block text-xl">{current.health} → {nextHealth}</strong></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="border border-rose-300/40 px-3 py-2 text-xs text-rose-100" onClick={onReject}>Rechazar</button>
          <button type="button" className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100" onClick={onApprove}>Aprobar</button>
        </div>
      </section>
    </div>
  );
}

function DeckLookCountDialog({
  maximum,
  initialCount,
  onClose,
  onConfirm,
}: {
  maximum: number;
  initialCount: number;
  onClose: () => void;
  onConfirm: (count: number) => void;
}) {
  const [count, setCount] = useState(Math.min(Math.max(initialCount, 1), maximum));
  return (
    <div role="dialog" aria-modal="true" aria-label="Mirar cartas del mazo" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
      <section className="w-full max-w-sm border border-amber-200/25 bg-[#171311] p-5">
        <h2 className="text-sm uppercase tracking-[0.2em] text-amber-100">Mirar Mazo</h2>
        <p className="mt-2 text-sm text-zinc-400">Elige cuantas cartas superiores mirar. Solo tu las veras.</p>
        <label className="mt-5 block text-xs text-zinc-300" htmlFor="deck-look-count">Cartas (1-{maximum})</label>
        <input id="deck-look-count" type="number" min={1} max={maximum} value={count} onChange={(event) => setCount(Math.min(maximum, Math.max(1, Number(event.target.value) || 1)))} className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2 text-sm" />
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="border border-white/20 px-3 py-2 text-xs" onClick={onClose}>Cancelar</button>
          <button type="button" className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100" onClick={() => onConfirm(count)}>Mirar</button>
        </div>
      </section>
    </div>
  );
}

function DeckLookDialog({
  cards,
  allCards,
  onClose,
  onReorder,
  onResolve,
}: {
  cards: ViewCard[];
  allCards: ViewCard[];
  onClose: () => void;
  onReorder: (orderedInstanceIds: string[]) => void;
  onResolve: (instanceIds: string[], destination: "HAND" | "GRAVEYARD" | "TOP" | "BOTTOM" | "SHUFFLE") => Promise<boolean>;
}) {
  const [ordered, setOrdered] = useState(cards);
  const [selected, setSelected] = useState<string[]>(cards.map((card) => card.instanceId));
  const [destinations, setDestinations] = useState<Record<string, "HAND" | "GRAVEYARD" | "TOP" | "BOTTOM" | "SHUFFLE">>({});
  const [resolving, setResolving] = useState(false);
  const allCardsById = new Map(allCards.map((card) => [card.instanceId, card]));
  const selectableIds = ordered.filter((card) => !destinations[card.instanceId]).map((card) => card.instanceId);
  const allSelected = selectableIds.length > 0 && selectableIds.every((instanceId) => selected.includes(instanceId));
  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= ordered.length || destinations[ordered[index].instanceId] || destinations[ordered[nextIndex].instanceId] || resolving) return;
    const next = [...ordered];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setOrdered(next);
    onReorder(next.filter((card) => !destinations[card.instanceId]).map((card) => card.instanceId));
  };
  const toggle = (instanceId: string) => {
    if (destinations[instanceId] || resolving) return;
    setSelected((current) => current.includes(instanceId) ? current.filter((id) => id !== instanceId) : [...current, instanceId]);
  };
  const toggleAll = () => {
    if (resolving || selectableIds.length === 0) return;
    setSelected(allSelected ? [] : selectableIds);
  };
  const resolve = async (destination: "HAND" | "GRAVEYARD" | "TOP" | "BOTTOM" | "SHUFFLE") => {
    const ids = selected.filter((instanceId) => !destinations[instanceId]);
    if (!ids.length || resolving) return;
    setResolving(true);
    const succeeded = await onResolve(ids, destination);
    if (succeeded) {
      setDestinations((current) => Object.fromEntries([...Object.entries(current), ...ids.map((instanceId) => [instanceId, destination])]) as Record<string, "HAND" | "GRAVEYARD" | "TOP" | "BOTTOM" | "SHUFFLE">);
      setSelected((current) => current.filter((instanceId) => !ids.includes(instanceId)));
    }
    setResolving(false);
  };
  const destinationLabels: Record<"HAND" | "GRAVEYARD" | "TOP" | "BOTTOM" | "SHUFFLE", string> = { HAND: "MANO", GRAVEYARD: "CEMENTERIO", TOP: "TOP", BOTTOM: "FONDO", SHUFFLE: "BARAJAR" };
  let returnOrder = 0;
  return (
    <div role="dialog" aria-modal="true" aria-label="Cartas miradas del mazo" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <section className="max-h-[90vh] w-full max-w-4xl overflow-auto border border-amber-200/25 bg-[#171311] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm uppercase tracking-[0.2em] text-amber-100">Mazo privado</h2><p className="mt-1 text-xs text-zinc-400">El orden mostrado define el retorno al mazo: 1 es la primera carta.</p></div><div className="flex gap-2"><button type="button" className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100 disabled:opacity-40" disabled={!selectableIds.length || resolving} onClick={toggleAll}>{allSelected ? "Deseleccionar todo" : "Seleccionar todo"}</button><button type="button" className="border border-white/20 px-3 py-2 text-xs disabled:opacity-40" disabled={resolving} onClick={onClose}>Dejar arriba</button></div></div>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {ordered.map((card, index) => {
            const destination = destinations[card.instanceId];
            const currentCard = allCardsById.get(card.instanceId) ?? card;
            const order = destination === "HAND" || destination === "GRAVEYARD" ? null : ++returnOrder;
            return (
            <article data-testid={`deck-look-card-${card.instanceId}`} key={card.instanceId} className={`border p-1 ${destination ? "border-amber-300/60" : selected.includes(card.instanceId) ? "border-emerald-300/60" : "border-white/10"}`}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase text-zinc-300"><label className="flex items-center gap-2"><input type="checkbox" checked={selected.includes(card.instanceId)} disabled={Boolean(destination) || resolving} onChange={() => toggle(card.instanceId)} /> Seleccionar</label>{order !== null && <span data-testid={`deck-look-order-${card.instanceId}`} className="text-amber-100">Orden {order}</span>}</div>
              {destination && <div data-testid={`deck-look-destination-${card.instanceId}`} className="mb-1 border border-amber-200/30 bg-amber-950/40 px-1 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wider text-amber-100">{destinationLabels[destination]}</div>}
              <PublicCard card={currentCard} size="field" onInspect={() => undefined} onContextMenu={() => undefined} />
              <div className="mt-1 flex justify-center gap-1"><button type="button" aria-label="Mover antes" className="border border-white/15 px-2 text-xs" onClick={() => move(index, -1)}>←</button><button type="button" aria-label="Mover despues" className="border border-white/15 px-2 text-xs" onClick={() => move(index, 1)}>→</button></div>
             </article>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-white/10 pt-4">
          <button type="button" disabled={!selected.length || resolving} className="border border-white/20 px-3 py-2 text-xs disabled:opacity-30" onClick={() => void resolve("TOP")}>Dejar arriba</button>
          <button type="button" disabled={!selected.length || resolving} className="border border-white/20 px-3 py-2 text-xs disabled:opacity-30" onClick={() => void resolve("BOTTOM")}>Enviar al fondo</button>
          <button type="button" disabled={!selected.length || resolving} className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100 disabled:opacity-30" onClick={() => void resolve("HAND")}>Enviar a la mano</button>
          <button type="button" disabled={!selected.length || resolving} className="border border-rose-300/40 px-3 py-2 text-xs text-rose-100 disabled:opacity-30" onClick={() => void resolve("GRAVEYARD")}>Enviar al cementerio</button>
          <button type="button" disabled={!selected.length || resolving} className="border border-amber-300/40 px-3 py-2 text-xs text-amber-100 disabled:opacity-30" onClick={() => void resolve("SHUFFLE")}>Barajar en el mazo</button>
        </div>
      </section>
    </div>
  );
}

function DeckSearchDialog({
  cards,
  allCards,
  revealedInstanceIds,
  onClose,
  onSetRevealed,
  onResolve,
  onInspect,
}: {
  cards: ViewCard[];
  allCards: ViewCard[];
  revealedInstanceIds: string[];
  onClose: () => void;
  onSetRevealed: (instanceIds: string[], revealed: boolean) => Promise<boolean>;
  onResolve: (instanceIds: string[], destination: "HAND" | "GRAVEYARD" | "FIELD") => Promise<boolean>;
  onInspect: (card: ViewCard) => void;
}) {
  type SearchDestination = "HAND" | "GRAVEYARD" | "FIELD";
  const [ordered] = useState(cards);
  const [selected, setSelected] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<Record<string, SearchDestination>>({});
  const [resolving, setResolving] = useState(false);
  const allCardsById = new Map(allCards.map((card) => [card.instanceId, card]));
  const selectableIds = ordered
    .filter((card) => !destinations[card.instanceId])
    .map((card) => card.instanceId);
  const allSelected = selectableIds.length > 0 && selectableIds.every((instanceId) => selected.includes(instanceId));
  const selectedIds = selected.filter((instanceId) => !destinations[instanceId]);
  const selectedCards = selectedIds
    .map((instanceId) => allCardsById.get(instanceId) ?? ordered.find((card) => card.instanceId === instanceId))
    .filter((card): card is ViewCard => Boolean(card));
  const canSendToField = selectedCards.length > 0 && selectedCards.every((card) => card.definition?.type === "CHARACTER" || card.definition?.type === "RELIC");
  const revealedIds = new Set(revealedInstanceIds);
  const selectedAreRevealed = selectedIds.length > 0 && selectedIds.every((instanceId) => revealedIds.has(instanceId));
  const destinationLabels: Record<SearchDestination, string> = {
    HAND: "MANO",
    GRAVEYARD: "CEMENTERIO",
    FIELD: "CAMPO",
  };

  const toggleAll = () => {
    if (resolving || selectableIds.length === 0) return;
    setSelected(allSelected ? [] : selectableIds);
  };
  const toggle = (instanceId: string) => {
    if (resolving || destinations[instanceId]) return;
    setSelected((current) => current.includes(instanceId)
      ? current.filter((id) => id !== instanceId)
      : [...current, instanceId]);
  };
  const resolve = async (destination: SearchDestination) => {
    if (!selectedIds.length || resolving || (destination === "FIELD" && !canSendToField)) return;
    setResolving(true);
    const succeeded = await onResolve(selectedIds, destination);
    if (succeeded) {
      setDestinations((current) => ({
        ...current,
        ...Object.fromEntries(selectedIds.map((instanceId) => [instanceId, destination])),
      }));
      setSelected((current) => current.filter((instanceId) => !selectedIds.includes(instanceId)));
    }
    setResolving(false);
  };
  const setSelectedRevealed = async () => {
    if (!selectedIds.length || resolving) return;
    setResolving(true);
    await onSetRevealed(selectedIds, !selectedAreRevealed);
    setResolving(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Buscar cartas en el Mazo Principal"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !resolving) onClose();
      }}
    >
      <section className="max-h-[90vh] w-full max-w-6xl overflow-auto border border-amber-200/25 bg-[#171311] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm uppercase tracking-[0.2em] text-amber-100">Buscar en Mazo Principal</h2>
            <p className="mt-1 text-xs text-zinc-400">Seleccionadas: {selectedIds.length}. Elige un destino para las cartas marcadas.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100 disabled:opacity-40"
              disabled={!selectableIds.length || resolving}
              onClick={toggleAll}
            >
              {allSelected ? "Deseleccionar todo" : "Seleccionar todo"}
            </button>
            <button type="button" className="border border-white/20 px-3 py-2 text-xs disabled:opacity-40" disabled={resolving} onClick={onClose}>Cerrar</button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 justify-items-center gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {ordered.map((card) => {
            const destination = destinations[card.instanceId];
            const currentCard = allCardsById.get(card.instanceId) ?? card;
            return (
              <article
                key={card.instanceId}
                data-testid={`deck-search-card-${card.instanceId}`}
                className={`w-fit border p-1 ${destination ? "border-amber-300/60" : selected.includes(card.instanceId) ? "border-emerald-300/70" : "border-white/10"}`}
              >
                <div className="mb-1 flex min-h-5 items-center justify-center text-[9px] uppercase text-zinc-300">
                  <label className="flex cursor-pointer items-center gap-1">
                    <input type="checkbox" checked={selected.includes(card.instanceId)} disabled={Boolean(destination) || resolving} onChange={() => toggle(card.instanceId)} />
                    Elegir
                  </label>
                </div>
                {destination && <div data-testid={`deck-search-destination-${card.instanceId}`} className="mb-1 border border-amber-200/30 bg-amber-950/40 px-1 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wider text-amber-100">{destinationLabels[destination]}</div>}
                {!destination && revealedIds.has(card.instanceId) && <div data-testid={`deck-search-revealed-${card.instanceId}`} className="mb-1 border border-sky-200/40 bg-sky-950/45 px-1 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wider text-sky-100">Mostrada al oponente</div>}
                <PublicCard card={currentCard} size="sm" onInspect={() => onInspect(currentCard)} onContextMenu={(event) => event.preventDefault()} />
              </article>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2 border-t border-white/10 pt-4">
          <button type="button" disabled={!selectedIds.length || resolving} className="border border-sky-300/40 px-3 py-2 text-xs text-sky-100 disabled:opacity-30" onClick={() => void setSelectedRevealed()}>{selectedAreRevealed ? "Ocultar al oponente" : "Mostrar al oponente"}</button>
          <button type="button" disabled={!selectedIds.length || resolving} className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100 disabled:opacity-30" onClick={() => void resolve("HAND")}>Enviar a la mano</button>
          <button type="button" disabled={!selectedIds.length || resolving} className="border border-rose-300/40 px-3 py-2 text-xs text-rose-100 disabled:opacity-30" onClick={() => void resolve("GRAVEYARD")}>Enviar al cementerio</button>
          <button type="button" disabled={!selectedIds.length || resolving || !canSendToField} className="border border-amber-300/40 px-3 py-2 text-xs text-amber-100 disabled:opacity-30" onClick={() => void resolve("FIELD")}>Enviar al campo</button>
        </div>
      </section>
    </div>
  );
}

function DeckSearchRevealDialog({ cards, playerName, onInspect }: { cards: ViewCard[]; playerName: string; onInspect: (card: ViewCard) => void }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cartas mostradas por el oponente"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section className="max-h-[85vh] w-full max-w-4xl overflow-auto border border-sky-200/30 bg-[#171311] p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-sm uppercase tracking-[0.2em] text-sky-100">Cartas mostradas</h2><p className="mt-1 text-xs text-zinc-400">{playerName} muestra {cards.length} {cards.length === 1 ? "carta" : "cartas"} de su mazo.</p></div>
          <button type="button" className="border border-white/20 px-3 py-2 text-xs" onClick={() => setOpen(false)}>Cerrar</button>
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {cards.map((card) => <PublicCard key={card.instanceId} card={card} size="md" onInspect={() => onInspect(card)} onContextMenu={(event) => event.preventDefault()} />)}
        </div>
      </section>
    </div>
  );
}

function VirtualEssenceEditor({ current, pending, onClose, onSubmit }: { current: number; pending: boolean; onClose: () => void; onSubmit: (amount: number) => void }) {
  const [amount, setAmount] = useState(1);
  return (
    <div role="dialog" aria-modal="true" aria-label="Modificar Esencias virtuales" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
      <section className="w-full max-w-sm border border-emerald-300/30 bg-[#171311] p-5"><h2 className="text-sm uppercase tracking-[0.2em] text-emerald-100">Esencias virtuales</h2><p className="mt-2 text-sm text-zinc-400">Actuales: {current}. El rival debe aprobar cualquier cambio.</p>{pending ? <p className="mt-4 text-sm text-amber-100">Ya hay una solicitud pendiente.</p> : <><label className="mt-4 block text-xs text-zinc-300" htmlFor="virtual-essence-change">Cambio</label><input id="virtual-essence-change" type="number" value={amount} onChange={(event) => setAmount(Number(event.target.value) || 0)} className="mt-1 w-full border border-white/15 bg-black/30 px-3 py-2" /><p className="mt-2 text-xs text-zinc-500">Resultado: {Math.max(0, current + amount)}</p><div className="mt-5 flex justify-end gap-2"><button type="button" className="border border-white/20 px-3 py-2 text-xs" onClick={onClose}>Cancelar</button><button type="button" disabled={!amount || current + amount < 0} className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100 disabled:opacity-40" onClick={() => onSubmit(amount)}>Solicitar aprobacion</button></div></>}</section>
    </div>
  );
}

function VirtualEssenceApproval({ proposal, current, onApprove, onReject }: { proposal: VirtualEssenceChangeProposal; current: number; onApprove: () => void; onReject: () => void }) {
  return <div role="dialog" aria-modal="true" aria-label="Aprobar cambio de Esencias virtuales" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"><section className="w-full max-w-sm border border-emerald-300/30 bg-[#171311] p-5"><h2 className="text-sm uppercase tracking-[0.2em] text-emerald-100">Esencias virtuales</h2><p className="mt-3 text-sm text-zinc-300">El rival solicita {proposal.amount >= 0 ? `+${proposal.amount}` : proposal.amount}: {current} → {Math.max(0, current + proposal.amount)}.</p><div className="mt-5 flex justify-end gap-2"><button type="button" className="border border-rose-300/40 px-3 py-2 text-xs text-rose-100" onClick={onReject}>Rechazar</button><button type="button" className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100" onClick={onApprove}>Aprobar</button></div></section></div>;
}

function DevastationRestoreDialog({ card, onClose, onRestore }: { card?: ViewCard; onClose: () => void; onRestore: (toZone: "HAND" | "FIELD" | "GRAVEYARD") => void }) {
  const canReturnToField = card?.definition?.type === "CHARACTER" || card?.definition?.type === "RELIC";
  return <div role="dialog" aria-modal="true" aria-label="Revertir devastacion" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4"><section className="w-full max-w-sm border border-rose-300/30 bg-[#171311] p-5"><h2 className="text-sm uppercase tracking-[0.2em] text-rose-100">Revertir devastacion</h2><p className="mt-2 text-sm text-zinc-300">{card?.definition?.name}</p><div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" className="border border-white/20 px-3 py-2 text-xs" onClick={onClose}>Cancelar</button><button type="button" className="border border-white/20 px-3 py-2 text-xs" onClick={() => onRestore("HAND")}>Volver a la Mano</button>{canReturnToField && <button type="button" className="border border-emerald-300/40 px-3 py-2 text-xs text-emerald-100" onClick={() => onRestore("FIELD")}>Volver al Campo</button>}<button type="button" className="border border-rose-300/40 px-3 py-2 text-xs text-rose-100" onClick={() => onRestore("GRAVEYARD")}>Volver al Cementerio</button></div></section></div>;
}

function ContextMenu({
  actions,
  x,
  y,
  placement = "below",
  onAction,
}: {
  actions: RoomContextAction[];
  x: number;
  y: number;
  placement?: ContextMenuPlacement;
  onAction: (action: RoomContextAction) => void;
}) {
  if (!actions.length) return null;
  const labels: Record<RoomContextAction, string> = {
    INSPECT: "Inspeccionar",
    TAP: "Tap",
    UNTAP: "Untap",
    DETACH: "Separar Reliquia",
    SEND_TO_GRAVEYARD: "Enviar al Cementerio",
    RETURN_TO_HAND: "Devolver a la Mano",
    MOVE_TO_FIELD: "Mover al Campo",
    MOVE_TO_RESOLUTION: "Mover a Resolución",
    RESOLVE: "Resolver",
    DRAW_CARD: "Robar",
    DRAW_ESSENCE: "Robar",
    SEND_TOP_TO_GRAVEYARD: "Enviar top al Cementerio",
    SHUFFLE_MAIN_DECK: "Barajar",
    SHUFFLE_INTO_MAIN_DECK: "Devolver al Mazo y barajar",
    RETURN_ESSENCE_TO_DECK_BOTTOM: "Enviar al fondo del Mazo de Esencias",
    MODIFY_CHARACTER_STATS: "Modificar ATQ/PV",
    LOOK_MAIN_DECK: "Mirar",
    SEARCH_MAIN_DECK: "Buscar en el Mazo",
    DEVASTATE: "Devastar",
    REVERT_DEVASTATION: "Revertir devastacion",
    SET_SANCTUARY_BACKGROUND: "Poner fondo",
    REMOVE_SANCTUARY_BACKGROUND: "Quitar fondo",
  };
  return (
    <div
      data-testid="context-menu"
      className={`fixed z-50 min-w-36 border border-white/15 bg-[#171311] p-1 shadow-2xl ${placement === "above" ? "-translate-y-full" : ""}`}
      style={{ left: x, top: y }}
      onClick={(event) => event.stopPropagation()}
    >
      {actions.map((action) => (
        <button
          type="button"
          key={action}
          className="block w-full px-3 py-2 text-left text-xs hover:bg-white/10"
          onClick={() => onAction(action)}
        >
          {labels[action]}
        </button>
      ))}
    </div>
  );
}
