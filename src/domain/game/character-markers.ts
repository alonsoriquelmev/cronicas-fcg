export const CHARACTER_MARKER_KINDS = [
  "IMBATIBLE",
  "MITICA",
  "DEVASTAR",
  "ENTRENAMIENTO",
] as const;

export type CharacterMarkerKind = (typeof CHARACTER_MARKER_KINDS)[number];

export type CharacterMarker = {
  markerId: string;
  kind: CharacterMarkerKind;
};

export const CHARACTER_MARKER_LABELS: Record<CharacterMarkerKind, string> = {
  IMBATIBLE: "Imbatible",
  MITICA: "Mitica",
  DEVASTAR: "Devastar",
  ENTRENAMIENTO: "Entrenamiento",
};

export function isCharacterMarkerKind(value: unknown): value is CharacterMarkerKind {
  return typeof value === "string" && CHARACTER_MARKER_KINDS.includes(value as CharacterMarkerKind);
}
