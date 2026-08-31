"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import type { CardDefinition } from "@/domain/cards/card.types";
import { getCardImageSource, type CardImageVariant } from "@/data/cards/catalog";

type Props = { definition?: CardDefinition | null; variant?: CardImageVariant; alt: string; fallback: ReactNode; className?: string };

export function CardImage({ definition, variant = "board", alt, fallback, className = "" }: Props) {
  const imageSrc = getCardImageSource(definition, variant);
  if (!imageSrc) return <div data-testid="card-image-fallback" className={`relative h-full w-full ${className}`}>{fallback}</div>;
  return <div data-testid="card-image-front" className={`relative h-full w-full overflow-hidden ${className}`}><Image src={imageSrc} alt={alt} fill sizes="(max-width: 768px) 160px, 240px" unoptimized className="object-contain" /></div>;
}
