export const FACTION_IDS = ["ORDEN", "INSTINTO", "FORJA", "CAOS", "VALOR", "ERRANTES"] as const;
export type FactionId = (typeof FACTION_IDS)[number] | (string & {});

export const factionLabels: Record<string, string> = {
  ORDEN: "Orden",
  INSTINTO: "Instinto",
  FORJA: "Forja",
  CAOS: "Caos",
  VALOR: "Valor",
  ERRANTES: "Errantes",
};
