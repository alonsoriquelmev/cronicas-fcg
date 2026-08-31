"use client";

import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { useState } from "react";
import { buildMockGameState, MOCK_IDS, mockCardDefinitionsById } from "@/data/mock-card-catalog";
import { applyGameAction } from "@/domain/game/game.reducer";
import { getCardsInZone, getTopCardInZone, sortHandForDisplay } from "@/domain/game/game.selectors";
import type { GameAction } from "@/domain/game/game.actions";
import type { CardInstance, CardZone } from "@/domain/game/game.types";
import { DROP_TARGET_IDS, dropActionForTarget, parseDropTarget } from "@/domain/game/drop-targets";
import { CardInspection } from "./CardInspection";
import { GameCard } from "./GameCard";
import { CardBack } from "./CardBack";
import { canDragCard, canEditCard, canTapCard, getContextActions, type BoardContextAction } from "./board.permissions";

const localId = MOCK_IDS.local;
const opponentId = MOCK_IDS.opponent;

function semanticDropTargetId(id: string) {
  if (id === "own-field") return DROP_TARGET_IDS.FIELD;
  if (id === "own-graveyard") return DROP_TARGET_IDS.GRAVEYARD;
  if (id === "own-hand") return DROP_TARGET_IDS.HAND;
  if (id === "verse-resolution") return DROP_TARGET_IDS.VERSE_RESOLUTION;
  if (id.startsWith("character:")) return DROP_TARGET_IDS.characterSlot(id.slice("character:".length));
  return id;
}

function DropZone({ id, children, className = "" }: { id: string; children?: React.ReactNode; className?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id: semanticDropTargetId(id) });
  return <div ref={setNodeRef} className={`${className} ${isOver ? "bg-emerald-300/10 shadow-[0_0_32px_rgba(110,231,183,0.18)]" : ""}`}>{children}</div>;
}

function DeckPile({ label, count, opponent = false, onDraw }: { label: string; count: number; opponent?: boolean; onDraw?: () => void }) {
  const deck = label === "Essence" ? "ESSENCE_DECK" : "MAIN_DECK";
  return <div className="flex min-w-0 flex-col items-center gap-1">
    {opponent && <DeckMetadata label={label} count={count} />}
    <CardBack label={label} count={count} deck={deck} enabled={Boolean(onDraw)} showCount={false} onClick={() => onDraw?.()} />
    {!opponent && <DeckMetadata label={label} count={count} />}
  </div>;
}

function DeckMetadata({ label, count }: { label: string; count: number }) {
  return <div className="flex min-h-7 flex-col items-center justify-center text-center leading-none"><span className="text-[8px] uppercase tracking-[0.12em] text-zinc-500">{label}</span><strong className="mt-0.5 text-sm text-amber-100">{count}</strong></div>;
}

function ZoneCaption({ children, count }: { children: React.ReactNode; count?: number }) { return <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-zinc-500"><span>{children}</span>{count !== undefined && <span>{count}</span>}</div>; }

function GraveyardPile({ cards, onOpen, onInspect }: { cards: CardInstance[]; onOpen: () => void; onInspect: (card: CardInstance) => void }) {
  const top = getTopCardInZone(cards);
  return <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(); }} className="group min-h-28 w-24 shrink-0 cursor-pointer text-left" aria-label={`Abrir cementerio, ${cards.length} cartas`}><ZoneCaption count={cards.length}>Cementerio</ZoneCaption><div className="relative flex h-20 items-center justify-center border border-white/15 bg-white/[0.025] transition group-hover:border-amber-200/50">{top ? <span onClick={(event) => { event.stopPropagation(); onInspect(top); }}><GameCard card={top} definition={mockCardDefinitionsById[top.cardDefinitionId]} size="sm" /></span> : <span className="text-[9px] uppercase tracking-widest text-zinc-600">vacío</span>}</div></div>;
}

function DraggableCard({ card, definition, editable, draggable, onInspect, onDoubleClick, onContextMenu, onCounterChange, size = "md" }: { card: CardInstance; definition?: typeof mockCardDefinitionsById[string]; editable: boolean; draggable: boolean; onInspect: () => void; onDoubleClick?: () => void; onContextMenu: (event: React.MouseEvent) => void; onCounterChange: (amount: number) => void; size?: "sm" | "md" }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.instanceId, disabled: !draggable });
  const rendered = <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.25 : 1 }} {...listeners} {...attributes}><GameCard card={card} definition={definition} editable={editable} size={size} onInspect={onInspect} onDoubleClick={onDoubleClick} onContextMenu={onContextMenu} onCounterChange={onCounterChange} /></div>;
  return rendered;
}

export function BoardSandbox() {
  const [state, setState] = useState(buildMockGameState);
  const [inspected, setInspected] = useState<CardInstance | null>(null);
  const [graveyardOwner, setGraveyardOwner] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ card: CardInstance; x: number; y: number } | null>(null);
  const [sanctuaryFeedback, setSanctuaryFeedback] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const definitions = mockCardDefinitionsById;
  const cardsIn = (zone: CardZone, controllerId: string) => getCardsInZone(state, zone, controllerId);
  const definitionOf = (card: CardInstance) => definitions[card.cardDefinitionId];
  const localCards = (zone: CardZone) => cardsIn(zone, localId);
  const opponentCards = (zone: CardZone) => cardsIn(zone, opponentId);
  const dispatch = (action: GameAction) => setState((current) => applyGameAction(current, action, definitions));
  const inspect = (card: CardInstance) => { setInspected(card); setMenu(null); };
  const showMenu = (event: React.MouseEvent, card: CardInstance) => { event.preventDefault(); setMenu({ card, x: Math.min(event.clientX, window.innerWidth - 210), y: Math.min(event.clientY, window.innerHeight - 230) }); };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const card = state.cardInstances[String(active.id)];
    if (!card || !canDragCard(card, localId)) return;
    const target = parseDropTarget(String(over.id));
    const action = target ? dropActionForTarget(card, target, localId, definitions, state.cardInstances) : null;
    if (action) dispatch(action);
  };
  const cardRenderer = (card: CardInstance, size: "sm" | "md" = "md") => {
    const editable = canEditCard(card, localId);
    const tappable = canTapCard(card, localId);
    return <DraggableCard key={card.instanceId} card={card} definition={definitionOf(card)} size={size} editable={editable && card.zone !== "HAND"} draggable={canDragCard(card, localId)} onInspect={() => inspect(card)} onDoubleClick={tappable ? () => dispatch({ type: card.tapped ? "UNTAP_CARD" : "TAP_CARD", instanceId: card.instanceId }) : undefined} onContextMenu={(event) => showMenu(event, card)} onCounterChange={(amount) => dispatch({ type: "CHANGE_CARD_COUNTER", instanceId: card.instanceId, amount })} />;
  };
  const localField = localCards("FIELD");
  const graveyardCards = graveyardOwner ? cardsIn("GRAVEYARD", graveyardOwner) : [];
  const contextActions = menu ? getContextActions(menu.card, localId, definitionOf(menu.card)) : [];
  const performContextAction = (action: BoardContextAction) => {
    const card = menu?.card;
    if (!card) return;
    if (action === "INSPECT") inspect(card);
    if (action === "TAP" || action === "UNTAP") dispatch({ type: action === "TAP" ? "TAP_CARD" : "UNTAP_CARD", instanceId: card.instanceId });
    if (action === "TO_GRAVEYARD") dispatch(card.zone === "VERSE_RESOLUTION" ? { type: "RESOLVE_VERSE", instanceId: card.instanceId, playerId: localId } : { type: "MOVE_CARD", instanceId: card.instanceId, toZone: "GRAVEYARD", controllerId: localId });
    if (action === "TO_HAND") dispatch({ type: "MOVE_CARD", instanceId: card.instanceId, toZone: "HAND", controllerId: localId });
    if (action === "TO_FIELD") dispatch({ type: "MOVE_CARD", instanceId: card.instanceId, toZone: "FIELD", controllerId: localId, attachedToInstanceId: null });
    if (action === "DETACH") dispatch({ type: "DETACH_RELIC", relicInstanceId: card.instanceId });
    setMenu(null);
  };
  return <DndContext sensors={sensors} onDragEnd={handleDragEnd}><main className="h-screen overflow-hidden bg-[#090807] px-3 py-2 text-zinc-100 md:px-6" onClick={() => setMenu(null)}><header className="mx-auto flex h-[8%] max-w-[1600px] items-center justify-between border-b border-white/10"><div><p className="text-[9px] uppercase tracking-[0.3em] text-amber-300/70">MISSION_001.1 / PLAYTEST TABLE</p><h1 className="text-lg font-semibold">Crónicas FCG</h1></div><div className="flex items-center gap-3 text-xs text-zinc-400"><span>Turno {state.turnNumber}</span><span className="border border-white/10 px-2 py-1">{state.phase}</span><button className="border border-emerald-300/40 px-3 py-1.5 text-emerald-100 hover:bg-emerald-300/10" onClick={() => dispatch({ type: "END_TURN" })}>Terminar turno</button></div></header><section className="mx-auto flex h-[92%] max-w-[1600px] flex-col justify-between py-2 [perspective:1400px]"><PlayerBoard label="OPONENTE" hand={opponentCards("HAND")} field={opponentCards("FIELD")} essences={opponentCards("ESSENCE_ZONE")} sanctuary={opponentCards("SANCTUARY")[0]} graveyard={opponentCards("GRAVEYARD")} mainCount={opponentCards("MAIN_DECK").length} essenceDeckCount={opponentCards("ESSENCE_DECK").length} onInspect={inspect} onOpenGraveyard={() => setGraveyardOwner(opponentId)} renderCard={cardRenderer} opponent /><DropZone id="verse-resolution" className={`mx-auto flex w-full items-center justify-center transition-all ${localCards("VERSE_RESOLUTION").length ? "min-h-28 py-2" : "min-h-10 py-1"}`}><div className={`flex w-full items-center gap-3 border-y border-rose-200/15 px-4 ${localCards("VERSE_RESOLUTION").length ? "bg-rose-950/20 shadow-[0_0_42px_rgba(159,18,57,0.16)]" : ""}`}><span className="shrink-0 text-[9px] uppercase tracking-[0.2em] text-rose-200/60">Verse Resolution</span><div className="flex min-h-8 flex-wrap gap-3">{localCards("VERSE_RESOLUTION").map((card) => cardRenderer(card))}</div></div></DropZone><PlayerBoard label="TÚ" hand={sortHandForDisplay(localCards("HAND"), definitions)} field={localField} essences={localCards("ESSENCE_ZONE")} sanctuary={localCards("SANCTUARY")[0]} graveyard={localCards("GRAVEYARD")} mainCount={localCards("MAIN_DECK").length} essenceDeckCount={localCards("ESSENCE_DECK").length} onInspect={inspect} onOpenGraveyard={() => setGraveyardOwner(localId)} renderCard={cardRenderer} local sanctuaryHp={state.players[localId].sanctuaryHp} onDrawMain={() => dispatch({ type: "DRAW_CARD", playerId: localId })} onDrawEssence={() => dispatch({ type: "DRAW_ESSENCE", playerId: localId })} onSanctuaryHp={(amount) => dispatch({ type: "CHANGE_SANCTUARY_HP", playerId: localId, amount })} onActivateSanctuary={() => { setSanctuaryFeedback(true); window.setTimeout(() => setSanctuaryFeedback(false), 800); }} /></section>{sanctuaryFeedback && <div className="pointer-events-none fixed bottom-8 left-1/2 z-30 -translate-x-1/2 border border-amber-200/40 bg-amber-950/80 px-4 py-2 text-xs text-amber-100">Santuario activado manualmente</div>}<CardInspection card={inspected} definition={inspected ? definitions[inspected.cardDefinitionId] : undefined} onClose={() => setInspected(null)} />{graveyardOwner && <GraveyardGallery cards={graveyardCards} ownerId={graveyardOwner} localId={localId} onClose={() => setGraveyardOwner(null)} onInspect={inspect} onMove={(card, zone) => { dispatch({ type: "MOVE_CARD", instanceId: card.instanceId, toZone: zone, controllerId: localId, attachedToInstanceId: zone === "FIELD" ? null : undefined }); }} />}{menu && <ContextMenu actions={contextActions} x={menu.x} y={menu.y} onAction={performContextAction} />}</main></DndContext>;
}

function PlayerBoard({ label, hand, field, essences, sanctuary, graveyard, mainCount, essenceDeckCount, onInspect, onOpenGraveyard, renderCard, opponent = false, local = false, sanctuaryHp = 0, onDrawMain, onDrawEssence, onSanctuaryHp, onActivateSanctuary }: { label: string; hand: CardInstance[]; field: CardInstance[]; essences: CardInstance[]; sanctuary?: CardInstance; graveyard: CardInstance[]; mainCount: number; essenceDeckCount: number; onInspect: (card: CardInstance) => void; onOpenGraveyard: () => void; renderCard: (card: CardInstance, size?: "sm" | "md") => React.ReactNode; opponent?: boolean; local?: boolean; sanctuaryHp?: number; onDrawMain?: () => void; onDrawEssence?: () => void; onSanctuaryHp?: (amount: number) => void; onActivateSanctuary?: () => void }) {
  const characters = field.filter((card) => mockCardDefinitionsById[card.cardDefinitionId]?.type === "CHARACTER");
  return <section className={`flex min-h-0 flex-col gap-1 ${opponent ? "[transform:rotateX(2deg)]" : "[transform:rotateX(-2deg)]"}`}><div className="flex items-center justify-between px-1 text-[9px] uppercase tracking-[0.24em] text-zinc-500"><span>{label}</span><span>{local ? "Tu perspectiva" : "Cartas públicas y mano oculta"}</span></div><div className="flex min-h-0 items-end gap-4"><div className="w-28 shrink-0"><GraveyardPile cards={graveyard} onOpen={onOpenGraveyard} onInspect={onInspect} /></div><div className="flex min-w-0 flex-1 flex-col gap-2"><div className="relative flex min-h-28 flex-wrap items-end justify-center gap-3 overflow-visible">{characters.map((character) => <div key={character.instanceId} className="relative min-h-32 min-w-40 p-1"><DropZone id={`character:${character.instanceId}`} className="flex min-h-32 flex-wrap items-end gap-2 overflow-visible p-1"><div className="[transform-origin:center_center]">{renderCard(character)}</div>{field.filter((card) => card.attachedToInstanceId === character.instanceId).map((relic) => <div key={relic.instanceId} className="self-end">{renderCard(relic, "sm")}</div>)}</DropZone></div>)}{field.filter((card) => mockCardDefinitionsById[card.cardDefinitionId]?.type === "RELIC" && !card.attachedToInstanceId).map((relic) => <div key={relic.instanceId}>{renderCard(relic)}</div>)}<DropZone id="own-field" className="absolute inset-0 -z-10" /></div><div className="flex min-h-10 items-center justify-center gap-3 border-y border-white/[0.06] py-1">{essences.map((card) => renderCard(card, "sm"))}</div></div><div className="flex w-44 shrink-0 items-end justify-end gap-3"><div className="flex flex-col items-center gap-1"><DeckPile label="Essence" count={essenceDeckCount} opponent={opponent} onDraw={local ? onDrawEssence : undefined} /><span className="text-[9px] uppercase tracking-widest text-zinc-600">Essence Deck</span></div><div className="flex flex-col items-center gap-1"><DeckPile label="Main" count={mainCount} opponent={opponent} onDraw={local ? onDrawMain : undefined} /><span className="text-[9px] uppercase tracking-widest text-zinc-600">Main Deck</span></div>{sanctuary && <div className="flex flex-col items-center gap-1"><div role="button" tabIndex={0} onClick={() => onInspect(sanctuary)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onInspect(sanctuary); }} aria-label="Inspeccionar Santuario">{renderCard(sanctuary, "sm")}</div><span className="text-[9px] text-rose-200/80">PV {local ? sanctuaryHp : 22}</span>{local && <div className="flex gap-1"><button aria-label="Bajar vida del Santuario" className="w-5 border border-white/15" onClick={() => onSanctuaryHp?.(-1)}>−</button><button aria-label="Subir vida del Santuario" className="w-5 border border-white/15" onClick={() => onSanctuaryHp?.(1)}>+</button></div>}{local && <button type="button" className={`mt-1 border px-2 py-1 text-[9px] ${sanctuaryFeedbackClass}`} onClick={onActivateSanctuary}>Activar Santuario</button>}</div>}</div></div>{local && <DropZone id="own-hand" className="min-h-36 overflow-visible"><ZoneCaption count={hand.length}>Tu mano</ZoneCaption><div className="flex min-h-32 items-end justify-center overflow-visible px-8 pt-3">{hand.map((card, index) => <motion.div layout key={card.instanceId} className="-ml-5 first:ml-0" style={{ transform: `rotate(${(index - (hand.length - 1) / 2) * 3}deg) translateY(${Math.abs(index - (hand.length - 1) / 2) * 2}px)` }} whileHover={{ y: -14, zIndex: 10 }}>{renderCard(card)}</motion.div>)}</div></DropZone>}</section>;
}

const sanctuaryFeedbackClass = "border-amber-200/30 text-amber-100";

function GraveyardGallery({ cards, ownerId, localId, onClose, onInspect, onMove }: { cards: CardInstance[]; ownerId: string; localId: string; onClose: () => void; onInspect: (card: CardInstance) => void; onMove: (card: CardInstance, zone: "HAND" | "FIELD") => void }) {
  const editable = ownerId === localId;
  return <motion.div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Galería de cementerio"><motion.section className="max-h-[80vh] w-full max-w-4xl overflow-y-auto border border-white/15 bg-[#171311] p-5" initial={{ y: 16 }} animate={{ y: 0 }}><div className="mb-4 flex items-center justify-between"><h2 className="text-sm uppercase tracking-[0.2em]">Cementerio</h2><button type="button" className="border border-white/15 px-3 py-1 text-xs" onClick={onClose}>Cerrar</button></div><div className="flex flex-wrap gap-4">{cards.map((card) => <div key={card.instanceId} className="flex flex-col gap-2"><div role="button" tabIndex={0} onClick={() => onInspect(card)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onInspect(card); }}><GameCard card={card} definition={mockCardDefinitionsById[card.cardDefinitionId]} /></div>{editable && <div className="flex gap-1"><button type="button" className="border border-white/15 px-2 py-1 text-[10px]" onClick={() => onMove(card, "HAND")}>A mano</button><button type="button" className="border border-white/15 px-2 py-1 text-[10px]" onClick={() => onMove(card, "FIELD")}>Al campo</button></div>}</div>)}</div></motion.section></motion.div>;
}

function ContextMenu({ actions, x, y, onAction }: { actions: BoardContextAction[]; x: number; y: number; onAction: (action: BoardContextAction) => void }) {
  const labels: Record<BoardContextAction, string> = { INSPECT: "Inspeccionar", TAP: "Girar", UNTAP: "Enderezar", COUNTER: "Contador", TO_GRAVEYARD: "Enviar a Cementerio", TO_HAND: "Devolver a Mano", TO_FIELD: "Mover al Campo", DETACH: "Separar Reliquia" };
  return <div className="fixed z-50 w-48 border border-white/15 bg-[#191513] p-1 text-xs shadow-2xl" style={{ left: x, top: y }} onClick={(event) => event.stopPropagation()}>{actions.map((action) => <button key={action} type="button" className="block w-full px-3 py-2 text-left hover:bg-white/10" onClick={() => onAction(action)}>{labels[action]}</button>)}</div>;
}
