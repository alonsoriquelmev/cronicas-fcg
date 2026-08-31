# Card Catalog

The runtime catalog is the single `CardDefinition` boundary used by preparation, Convex game seeding, inspection and card rendering.

## IDs and assets

- Use a printed card code as `id` when it exists, for example `MDK-066`.
- Keep the full printed value in `collectorNumber` when it contains a set total.
- Cards without a printed code need an explicit future fallback policy; do not use display names or array indexes as identity.
- Board assets follow `/cards/<faction>/<card-id>.<ext>`. WebP is the preferred final format; SVG/PNG are acceptable development fixtures.
- Caos source assets retain their original `815x1110` dimensions, which define the shared card aspect ratio.

## Pipeline

```text
data/import/cards.raw.json
        -> normalize IDs, factions, types and image paths
        -> cards:validate
        -> src/data/cards/generated/cards.generated.json
        -> CardDefinition / CardInstance / UI
```

Edit the raw manifest and run `npm run cards:build`; generated JSON is an output, not a hand-edited source. `npm run cards:validate` checks IDs, collector codes, required type fields, modifier zeros, image paths and local assets. Development cards may intentionally use a null image and the UI fallback.

Source UUID filenames are mapped in `data/import/source/caos.assets.json`. Rebuild their WebP assets from a local source directory with:

```bash
npm run cards:assets -- --manifest data/import/source/caos.assets.json --source-dir <directory>
```

Errantes source UUID filenames are mapped in `data/import/source/errantes.assets.json`; their local source images are kept under `data/import/source/Errantes` and normalized to `public/cards/errantes`.

## Development cards

`src/data/cards/catalog.ts` exposes `cardCatalog`, `cardDefinitionsById` and lookup helpers. The old mock catalog is only a compatibility facade for the sandbox and tests. The preparation flow reads the new catalog directly, preserving the existing faction, quantity, Sanctuary and Essence constraints.

The four `FIXTURE` records and their local SVGs remain development-only. Released Caos records `MDK-055` through `MDK-072` were transcribed from the provided local source images and use their normalized official fronts. Caos Essences with a structured ability are marked `SPECIAL`; the remaining resource Essences are marked `BASIC`. No Caos Sanctuary was supplied, so `caos-sanctuary-testing` remains an explicit mock definition.

Released Errantes records `MDK-091` through `MDK-108` were transcribed from the supplied local card images and use their normalized official fronts. Errantes Essences `MDK-107` and `MDK-108` are marked `SPECIAL` because they have structured abilities; `MDK-105` and `MDK-106` are `BASIC`. No Errantes Sanctuary was supplied, so `errantes-sanctuary-testing` remains an explicit mock definition.

## Mission 005B

Future imports should use the same source manifest, transcription and validation flow. The supplied images do not explicitly classify Caos Essences as `BASIC` or `SPECIAL`, so that structured field remains unset until an authoritative source confirms it; it is not inferred from rules text.
