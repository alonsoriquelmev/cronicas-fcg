"use client";

import { motion } from "motion/react";
import type { CardDefinition } from "@/domain/cards/card.types";
import type { CardInstance } from "@/domain/game/game.types";
import { supportsGenericCounter } from "./board.permissions";
import { CharacterStats, type CharacterStatsValue } from "./CharacterStats";
import { formatModifier } from "@/domain/game/game.selectors";
import { CARD_ASPECT_RATIO, CARD_SIZE_CLASSES, type CardVisualSize } from "./card.tokens";
import { CardBack } from "./CardBack";
import { CardImage } from "./CardImage";
import { getCardImageSource } from "@/data/cards/catalog";
import { CharacterStatsOverlay } from "./CharacterStatsOverlay";
import { useCardClick } from "./useCardClick";

type Props = { card: CardInstance; definition?: CardDefinition; characterStats?: CharacterStatsValue; editable?: boolean; selected?: boolean; showCharacterStats?: boolean; showGenericCounter?: boolean; onInspect?: () => void; onDoubleClick?: () => void; onContextMenu?: (event: React.MouseEvent) => void; onCounterChange?: (amount: number) => void; size?: CardVisualSize };

function DevelopmentCardFallback({ definition, characterStats }: { definition: CardDefinition; characterStats?: CharacterStatsValue }) {
  return <div className="flex h-full flex-col bg-[#30241d] p-2 text-[10px] text-zinc-200"><div className="flex items-start justify-between gap-1"><span className="font-semibold leading-tight">{definition.name}</span><span className="border border-amber-200/30 px-1 text-amber-200">{"cost" in definition ? definition.cost : "•"}</span></div><div className="my-2 flex flex-1 items-center justify-center border border-white/10 bg-gradient-to-br from-emerald-950 via-[#5d4330] to-rose-950 text-[9px] uppercase tracking-[0.18em] text-white/60">dev art</div><div className="text-[9px] uppercase tracking-widest text-amber-200/70">{definition.type}</div>{definition.type === "CHARACTER" && <CharacterStats attack={characterStats?.attack ?? definition.attack} health={characterStats?.health ?? definition.health} />}{definition.type === "RELIC" && <div className="mt-1 space-y-0.5 border-t border-white/10 pt-1">{formatModifier(definition.attackModifier) !== null && <div>ATQ {formatModifier(definition.attackModifier)}</div>}{formatModifier(definition.healthModifier) !== null && <div>PV {formatModifier(definition.healthModifier)}</div>}</div>}</div>;
}

export function GameCard({ card, definition, characterStats, editable = false, selected = false, showCharacterStats = false, showGenericCounter = true, onInspect, onDoubleClick, onContextMenu, onCounterChange, size = "md" }: Props) {
  const visible = card.faceUp && Boolean(definition);
  const hasGenericCounter = showGenericCounter && supportsGenericCounter(definition);
  const sizeClass = CARD_SIZE_CLASSES[size];
  const hasOfficialImage = Boolean(getCardImageSource(definition));
  const baseCharacterStats = definition?.type === "CHARACTER"
    ? { attack: definition.attack, health: definition.health }
    : undefined;
  const fieldCharacterStats = baseCharacterStats
    ? characterStats ?? baseCharacterStats
    : undefined;
  const clickHandlers = useCardClick(onInspect, onDoubleClick);
  return <motion.div data-testid={`game-card-${card.instanceId}`} layout whileHover={{ y: -6, scale: 1.03 }} animate={{ rotate: card.tapped ? 90 : 0 }} transition={{ type: "spring", stiffness: 350, damping: 25 }} className={`${sizeClass} relative w-auto shrink-0 cursor-pointer select-none`} style={{ aspectRatio: CARD_ASPECT_RATIO }} onPointerDownCapture={clickHandlers.onPointerDownCapture} onPointerUpCapture={clickHandlers.onPointerUpCapture} onPointerCancelCapture={clickHandlers.onPointerCancelCapture} onDoubleClick={clickHandlers.onDoubleClick} onContextMenu={onContextMenu}>
    <div className={`relative h-full w-full overflow-hidden rounded-[0.35rem] border border-white/30 ${selected ? "ring-2 ring-amber-300/70 ring-offset-1 ring-offset-black" : ""}`}>
      {visible && definition ? <CardImage definition={definition} alt={definition.name} fallback={<DevelopmentCardFallback definition={definition} characterStats={characterStats} />} /> : <CardBack label="Carta oculta" count={0} showCount={false} fill />}
      {visible && hasOfficialImage && showCharacterStats && fieldCharacterStats && baseCharacterStats && <CharacterStatsOverlay attack={fieldCharacterStats.attack} health={fieldCharacterStats.health} baseAttack={baseCharacterStats.attack} baseHealth={baseCharacterStats.health} />}
    </div>
    {hasGenericCounter && card.counter !== 0 && <span data-testid="generic-counter-badge" className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/30 bg-rose-700 text-xs font-bold">{card.counter}</span>}
    {hasGenericCounter && editable && onCounterChange && <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-1"><button aria-label="Reducir contador" className="h-5 w-5 rounded-full bg-zinc-800 text-xs" onClick={(e) => { e.stopPropagation(); onCounterChange(-1); }}>−</button><button aria-label="Aumentar contador" className="h-5 w-5 rounded-full bg-zinc-800 text-xs" onClick={(e) => { e.stopPropagation(); onCounterChange(1); }}>+</button></span>}
  </motion.div>;
}
