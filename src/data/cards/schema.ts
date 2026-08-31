import { z } from "zod";

const imageSchema = z.union([z.object({ board: z.string().nullable().optional(), detail: z.string().nullable().optional() }), z.string()]);
const baseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  factionId: z.string().min(1).nullable(),
  subtype: z.string().nullable(),
  image: imageSchema.nullable().optional(),
  setId: z.string().min(1),
  collectorNumber: z.string().min(1),
  rarity: z.string().min(1),
  status: z.enum(["RELEASED", "TESTING"]),
  keywords: z.array(z.string()).optional(),
});

export const cardDefinitionSchema = z.discriminatedUnion("type", [
  baseSchema.extend({ type: z.literal("CHARACTER"), cost: z.number(), attack: z.number(), health: z.number(), rulesText: z.string().nullable() }),
  baseSchema.extend({ type: z.literal("RELIC"), cost: z.number(), attackModifier: z.number().nullable(), healthModifier: z.number().nullable(), rulesText: z.string().nullable() }),
  baseSchema.extend({ type: z.literal("VERSE"), cost: z.number(), prologueText: z.string(), epilogueText: z.string(), rulesText: z.string().nullable() }),
  baseSchema.extend({ type: z.literal("ESSENCE"), essenceKind: z.enum(["BASIC", "SPECIAL"]).optional(), rulesText: z.string().nullable() }),
  baseSchema.extend({ type: z.literal("SANCTUARY"), health: z.number(), rulesText: z.string().nullable() }),
]);

export const cardCatalogSchema = z.array(cardDefinitionSchema);

export type CatalogRecord = z.infer<typeof cardDefinitionSchema>;

export function parseCardCatalog(value: unknown): CatalogRecord[] {
  return cardCatalogSchema.parse(value);
}
