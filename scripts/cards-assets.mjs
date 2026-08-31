import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const manifestArgument = readArgument("--manifest");
const sourceDirectory = readArgument("--source-dir");

if (!manifestArgument || !sourceDirectory) {
  throw new Error("Usage: npm run cards:assets -- --manifest <file> --source-dir <directory>");
}

const root = process.cwd();
const manifestPath = path.resolve(root, manifestArgument);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const factionDirectory = String(manifest.factionId).toLowerCase();
const outputDirectory = path.join(root, "public", "cards", factionDirectory);

fs.mkdirSync(outputDirectory, { recursive: true });

for (const asset of manifest.assets) {
  const sourcePath = path.resolve(sourceDirectory, asset.sourceFile);
  const metadata = await sharp(sourcePath).metadata();

  if (metadata.width !== manifest.width || metadata.height !== manifest.height) {
    throw new Error(`${asset.sourceFile}: expected ${manifest.width}x${manifest.height}, got ${metadata.width}x${metadata.height}`);
  }

  await sharp(sourcePath)
    .webp({ quality: 95, smartSubsample: true })
    .toFile(path.join(outputDirectory, `${asset.cardId}.webp`));
}

console.log(`cards:assets OK (${manifest.assets.length} assets -> public/cards/${factionDirectory})`);
