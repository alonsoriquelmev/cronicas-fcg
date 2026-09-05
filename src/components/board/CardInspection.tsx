"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import type { CardDefinition } from "@/domain/cards/card.types";
import type { CardInstance } from "@/domain/game/game.types";
import { GameCard } from "./GameCard";

export function CardInspection({ card, definition, onClose }: { card: CardInstance | null; definition?: CardDefinition; onClose: () => void }) {
  useEffect(() => { if (!card) return; const handle = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", handle); return () => window.removeEventListener("keydown", handle); }, [card, onClose]);
  const inspectionCard = card?.tapped ? { ...card, tapped: false } : card;
  return <AnimatePresence>{inspectionCard && <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label="Inspeccion de carta"><motion.div initial={{ scale: 0.9, y: 12 }} animate={{ scale: 1, y: 0 }}><GameCard card={inspectionCard} definition={definition} size="lg" /></motion.div></motion.div>}</AnimatePresence>;
}
