"use client";

import type { MouseEventHandler } from "react";
import Image from "next/image";
import { CARD_ASPECT_RATIO, CARD_SIZE_CLASSES } from "./card.tokens";

type Props = {
  label: string;
  count: number;
  deck?: "MAIN_DECK" | "ESSENCE_DECK" | "CARD";
  enabled?: boolean;
  showCount?: boolean;
  fill?: boolean;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
};

export function CardBack({ label, count, deck = "CARD", enabled = false, showCount = true, fill = false, onClick, onContextMenu }: Props) {
  return <div
    role="button"
    tabIndex={0}
    aria-label={`${label}, ${count} cartas`}
    data-deck={deck}
    data-testid={`card-back-${deck}`}
    onClick={onClick}
    onContextMenu={onContextMenu}
    className={`relative overflow-hidden ${fill ? "h-full w-full" : `${CARD_SIZE_CLASSES.back} border p-1`} shrink-0 cursor-context-menu text-center ${enabled ? "border-amber-200/40 bg-amber-950/30" : "border-white/10 bg-white/[0.03]"}`}
    style={{ aspectRatio: CARD_ASPECT_RATIO }}
  >
    <Image
      src="/assets/card-back.jpg"
      alt="Reverso de carta"
      fill
      sizes="(max-width: 768px) 80px, 120px"
      unoptimized
      className="object-cover"
    />
    <span className="sr-only">{label}</span>
    {showCount && <strong className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm text-amber-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{count}</strong>}
  </div>;
}
