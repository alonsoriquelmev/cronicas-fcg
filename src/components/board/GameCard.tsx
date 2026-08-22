"use client";

import { motion } from "motion/react";
import type { CardDefinition } from "@/domain/cards/card.types";
import type { CardInstance } from "@/domain/game/game.types";

type Props = { card: CardInstance; definition?: CardDefinition; editable?: boolean; selected?: boolean; onInspect?: () => void; onDoubleClick?: () => void; onContextMenu?: (event: React.MouseEvent) => void; onCounterChange?: (amount: number) => void; size?: "sm" | "md" | "lg" };

export function GameCard({ card, definition, editable = false, selected = false, onInspect, onDoubleClick, onContextMenu, onCounterChange, size = "md" }: Props) {
  const visible = card.faceUp && definition;
  const supportsGenericCounter = definition !== undefined && definition.type !== "SANCTUARY";
  const sizeClass = size === "sm" ? "w-20" : size === "lg" ? "w-64" : "w-32";
  return <motion.div layout whileHover={{ y: -6, scale: 1.03 }} animate={{ rotate: card.tapped ? 90 : 0 }} transition={{ type: "spring", stiffness: 350, damping: 25 }} className={`${sizeClass} relative shrink-0 cursor-pointer select-none border ${selected ? "border-amber-200 ring-2 ring-amber-300/40" : "border-white/15"} bg-[#201a16] p-1.5 shadow-xl`} style={{ aspectRatio: "5 / 7" }} onClick={onInspect} onDoubleClick={onDoubleClick} onContextMenu={onContextMenu}>
    {visible ? <div className="flex h-full flex-col bg-[#30241d] p-2 text-[10px] text-zinc-200">
      <div className="flex items-start justify-between gap-1"><span className="font-semibold leading-tight">{definition.name}</span><span className="border border-amber-200/30 px-1 text-amber-200">{"cost" in definition ? definition.cost : "•"}</span></div>
      <div className="my-2 flex flex-1 items-center justify-center border border-white/10 bg-gradient-to-br from-emerald-950 via-[#5d4330] to-rose-950 text-[9px] uppercase tracking-[0.18em] text-white/60">dev art</div>
      <div className="text-[9px] uppercase tracking-widest text-amber-200/70">{definition.type}</div>
      {definition.type === "CHARACTER" && <div className="mt-1 flex justify-between border-t border-white/10 pt-1"><span>ATQ {definition.attack}</span><span>PV {definition.health}</span></div>}
      {definition.type === "SANCTUARY" && <div className="mt-1 border-t border-white/10 pt-1">PV {definition.health}</div>}
      {definition.type === "RELIC" && <div className="mt-1 border-t border-white/10 pt-1">{definition.attackModifier ? `ATQ +${definition.attackModifier}` : `PV +${definition.healthModifier}`}</div>}
    </div> : <div className="flex h-full items-center justify-center bg-[#29201d] text-center text-[9px] uppercase tracking-[0.2em] text-amber-100/60">Crónicas<br />FCG</div>}
    {supportsGenericCounter && card.counter !== 0 && <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/30 bg-rose-700 text-xs font-bold">{card.counter}</span>}
    {supportsGenericCounter && editable && onCounterChange && <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 gap-1"><button aria-label="Reducir contador" className="h-5 w-5 rounded-full bg-zinc-800 text-xs" onClick={(e) => { e.stopPropagation(); onCounterChange(-1); }}>−</button><button aria-label="Aumentar contador" className="h-5 w-5 rounded-full bg-zinc-800 text-xs" onClick={(e) => { e.stopPropagation(); onCounterChange(1); }}>+</button></span>}
  </motion.div>;
}
