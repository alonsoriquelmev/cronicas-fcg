import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const rawPath = path.join(root, "data", "import", "cards.raw.json");
const generatedPath = path.join(root, "src", "data", "cards", "generated", "cards.generated.json");
const imagePattern = /^\/cards\/[a-z0-9_-]+\/[A-Za-z0-9._-]+\.(?:webp|png|jpe?g|svg)$/i;
const cardTypes = new Set(["CHARACTER", "RELIC", "VERSE", "ESSENCE", "SANCTUARY"]);

function readRaw() {
  const parsed = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  if (!parsed || !Array.isArray(parsed.cards)) throw new Error("cards.raw.json must contain a cards array");
  return parsed.cards;
}

function normalizeImage(value, factionId, id) {
  if (value === null || value === undefined) return { board: null, detail: null };
  if (typeof value === "string") return { board: value, detail: value };
  return { board: value.board === undefined ? `/cards/${factionId.toLowerCase()}/${id}.webp` : value.board, detail: value.detail === undefined ? value.board ?? null : value.detail };
}

function normalizeCard(record) {
  const id = String(record.id ?? "").trim();
  const rawFactionId = record.factionId ?? record.faction;
  const factionId = rawFactionId === null || rawFactionId === undefined ? null : String(rawFactionId).trim().toUpperCase();
  const type = String(record.type ?? "").trim().toUpperCase();
  const normalized = { ...record, id, factionId, type, image: normalizeImage(record.image, factionId, id) };
  delete normalized.faction;
  return normalized;
}

export function validateCards(cards, { checkAssets = true } = {}) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const collectors = new Map();
  const assetRoot = path.join(root, "public");
  for (const card of cards) {
    if (!card.id) errors.push("missing card id");
    if (ids.has(card.id)) errors.push(`duplicate card id: ${card.id}`);
    ids.add(card.id);
    if (!card.name) errors.push(`${card.id}: missing name`);
    if (!cardTypes.has(card.type)) errors.push(`${card.id}: invalid card type ${card.type}`);
    if (!card.factionId && card.type !== "SANCTUARY") errors.push(`${card.id}: missing faction`);
    if (!card.collectorNumber) errors.push(`${card.id}: missing collector number`);
    if (card.collectorNumber && collectors.has(`${card.setId}:${card.collectorNumber}`)) errors.push(`${card.id}: duplicate collector code`);
    collectors.set(`${card.setId}:${card.collectorNumber}`, card.id);
    if (!card.image || typeof card.image !== "object") errors.push(`${card.id}: missing image object`);
    for (const key of ["board", "detail"]) {
      const imagePath = card.image?.[key];
      if (imagePath !== null && imagePath !== undefined && !imagePattern.test(imagePath)) errors.push(`${card.id}: invalid image path ${imagePath}`);
      if (checkAssets && imagePath && !fs.existsSync(path.join(assetRoot, imagePath.slice(1)))) errors.push(`${card.id}: missing image asset ${imagePath}`);
    }
    if (!card.image?.board) warnings.push(`${card.id}: no board image; development fallback will be used`);
    if (card.type === "CHARACTER" && (!Number.isFinite(card.attack) || !Number.isFinite(card.health))) errors.push(`${card.id}: CHARACTER requires attack and health`);
    if (card.type === "RELIC" && ((card.attackModifier !== null && !Number.isFinite(card.attackModifier)) || (card.healthModifier !== null && !Number.isFinite(card.healthModifier)))) errors.push(`${card.id}: RELIC modifiers must be numeric or null`);
    if (card.type === "VERSE" && (typeof card.prologueText !== "string" || typeof card.epilogueText !== "string")) errors.push(`${card.id}: VERSE requires prologueText and epilogueText`);
    if (card.type === "SANCTUARY" && !Number.isFinite(card.health)) errors.push(`${card.id}: SANCTUARY requires health`);
    if (card.type === "ESSENCE" && card.essenceKind !== undefined && !["BASIC", "SPECIAL"].includes(card.essenceKind)) errors.push(`${card.id}: invalid essenceKind`);
  }
  return { errors, warnings };
}

export function buildCatalog() {
  return readRaw().map(normalizeCard);
}

export function runValidation() {
  const result = validateCards(buildCatalog());
  for (const warning of result.warnings) console.warn(`WARN ${warning}`);
  for (const error of result.errors) console.error(`ERROR ${error}`);
  if (result.errors.length) process.exitCode = 1;
  else console.log(`cards:validate OK (${buildCatalog().length} cards)`);
  return result;
}

export function runBuild() {
  const cards = buildCatalog();
  const result = validateCards(cards);
  if (result.errors.length) {
    for (const error of result.errors) console.error(`ERROR ${error}`);
    process.exitCode = 1;
    return;
  }
  fs.mkdirSync(path.dirname(generatedPath), { recursive: true });
  fs.writeFileSync(generatedPath, `${JSON.stringify(cards, null, 2)}\n`, "utf8");
  console.log(`cards:build OK (${cards.length} cards -> ${path.relative(root, generatedPath)})`);
}

if (process.argv[1] === new URL(import.meta.url).pathname.replaceAll("/", path.sep)) {
  const command = process.argv[2];
  if (command === "validate") runValidation();
  else if (command === "build") runBuild();
  else throw new Error("Usage: node scripts/cards-pipeline.mjs <validate|build>");
}
