export const CARD_ASPECT_RATIO = "815 / 1110";

export const CARD_SIZE_CLASSES = {
  // Each visual variant preserves the previous occupied height. Its width is
  // derived from CARD_ASPECT_RATIO so the printed card can use the full surface.
  essence: "h-[5.904rem]",
  field: "h-[8.752rem]",
  hand: "h-[9.724rem]",
  sm: "h-[6.25rem]",
  verse: "h-[5.557rem]",
  sanctuary: "h-[7.64rem]",
  md: "h-[10.42rem]",
  lg: "h-[22.228rem]",
  back: "h-[6.25rem]",
} as const;

export type CardVisualSize = keyof typeof CARD_SIZE_CLASSES;
