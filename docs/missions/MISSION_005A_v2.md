# MISSION 005A — Real Card Catalog Architecture + Asset Pipeline

## Goal

Prepare the project to use the real Crónicas FCG card catalog and official card images without importing the full real dataset yet.

This mission builds the catalog architecture, image/asset conventions, validation tooling and rendering integration required for later bulk import.

Do NOT import the full official catalog in this mission.

Use only a very small fixture set to prove the architecture.

The existing mock gameplay, multiplayer, preparation flow and board must remain functional.


## Local PDF reference source

A local PDF may be provided inside the repository as reference material for this mission.

Expected example location:

```text
data/import/source/Caos.pdf
```

The exact path will be provided in the Codex instruction.

Important rules:

- Treat the PDF only as local source/reference material.
- Do NOT depend on chat attachments or external Drive access.
- Do NOT scrape Google Drive.
- Do NOT import the entire faction in Mission 005A.
- Select only a tiny representative fixture set from the PDF if practical.
- If extracting card images from the PDF is straightforward, extract only the few selected fixtures.
- If image extraction is unreliable, do not invent content and do not block the architecture work; use structured fixtures and document the extraction step for Mission 005B.
- No OCR is required for Mission 005A.
- The full faction import remains explicitly reserved for Mission 005B.


## Core product decision

For V1.0, the official card image is the primary visual representation of a card.

Do NOT recreate the printed card frame, typography, iconography or rules text in HTML/CSS when a real card image exists.

The application should render:

```text
Official card image
        +
digital gameplay state
```

Digital overlays/state may include hover, selected, tapped, face-down, drag state, attachment, derived ATQ/PV when needed, and interaction highlights.

Do not bake gameplay state into the image itself.

## Read first

1. `AGENTS.md`
2. Card-definition sections of `docs/CRONICAS_DOMAIN.md`
3. Card/catalog sections of `docs/ARCHITECTURE.md`
4. Card/UI sections of `docs/UX_SPEC.md`
5. Existing mock catalog implementation
6. Existing `GameCard`, card inspection and deck-builder components

Do not reread unrelated docs unless necessary.

## 1. Preserve current architecture

Do NOT replace:

```text
CardDefinition
→ CardInstance
→ GameState
→ PlayerView
→ UI
```

Real card data must plug into the existing `CardDefinition` boundary.

Do not couple Convex game state directly to image files.

Do not store image bytes in Convex.

## 2. Canonical card ID

Real cards should use the printed card code as the preferred canonical ID when available.

Example:

```text
MDK-066
```

For a card displaying:

```text
MDK-066/110
```

prefer:

```text
id = "MDK-066"
collectorNumber = "066/110"
```

Do not use display name, source Drive UUID filename, or array index as canonical unique ID.

If a future card lacks a printed code, isolate a fallback ID-generation policy.

## 3. Asset filename convention

Preferred final convention:

```text
public/cards/<faction>/<card-id>.webp
```

Example:

```text
public/cards/caos/MDK-066.webp
```

Source files may initially have UUID/random filenames.

Do NOT require manual renaming before import.

The future import pipeline should map source filename → canonical card ID.

## 4. Catalog structure

Create a clear data structure equivalent to:

```text
src/data/cards/
├── catalog.ts
├── schema.ts
├── factions.ts
├── fixtures/
│   └── real-card-fixtures.ts
└── generated/
    └── cards.generated.json
```

Exact filenames may follow repository conventions.

Separate schema/types, validation, generated/imported data, and tiny hand-maintained fixtures.

Do not place large card definitions directly inside React components.

## 5. Asset structure

Prepare:

```text
public/cards/
├── _backs/
├── caos/
├── <future-faction>/
└── ...
```

Do not add the full real asset library yet.

Include only a few local development fixtures if needed.

Keep existing mock fallback art.

## 6. Catalog schema

Create a validated catalog schema compatible with existing `CardDefinition`.

Common fields should support at minimum:

```text
id
collectorNumber?
name
faction
type
cost?
image
rulesText?
keywords?
status?
```

Use current project naming conventions where they already exist.

Do not create unnecessary parallel card models.

## 7. Type-specific fields

CHARACTER:
```text
attack
health
rulesText
```

RELIC:
```text
attackModifier
healthModifier
rulesText
```

`0` is a valid explicit modifier and must not be confused with missing data.

VERSE:
```text
prologueText
epilogueText
rulesText?
keywords?
```

SANCTUARY:
```text
health
rulesText
```

ESSENCE:
preserve the current structured metadata required by preparation/gameplay, including `essenceKind` if BASIC/SPECIAL is currently used.

Do not infer structured metadata from rules text.

## 8. Faction metadata

Create/reuse canonical faction representation.

Deck Builder filtering must depend on structured faction metadata, not folder names alone.

Image folders are an asset convention; legality comes from card data.

## 9. Catalog validation

Create:

```bash
npm run cards:validate
```

At minimum detect:

- duplicate card IDs;
- missing name;
- invalid card type;
- missing faction;
- missing image path;
- duplicate collector codes where inappropriate;
- CHARACTER missing attack/health;
- RELIC malformed modifiers;
- VERSE malformed structured fields;
- SANCTUARY missing health;
- ESSENCE malformed metadata;
- invalid image-path format.

Validation must exit non-zero on errors.

Where practical also verify that referenced local image assets exist.

## 10. Orphan detection

Prepare tooling or architecture so a later import can detect:

```text
catalog entry with no image
image with no catalog entry
```

A separate command is acceptable if cleaner.

Do not over-engineer file watching.

## 11. Import staging format

Create a staging format for future bulk import, e.g.:

```text
data/import/cards.raw.json
```

Pipeline:

```text
source images / extracted metadata
        ↓
raw import data
        ↓
normalization
        ↓
schema validation
        ↓
generated catalog
        ↓
game
```

Do NOT implement OCR or automatic extraction from hundreds of images in Mission 005A.

Only prepare the boundary.

## 12. Normalization command

Create script architecture for:

```bash
npm run cards:build
```

It should be capable of:

- reading staged/raw structured card records;
- normalizing IDs;
- normalizing faction/type enums;
- normalizing image paths;
- validating;
- producing runtime catalog.

For this mission, run it against a tiny fixture dataset.

Generated output should have a clear ownership rule: edit source/raw data and rebuild; do not manually edit generated output.

## 13. Card image component

Create/reuse a dedicated reusable component for official card fronts.

Conceptually:

```tsx
<CardImage
  src={card.image}
  alt={card.name}
/>
```

Requirements:

- preserve aspect ratio;
- no stretching;
- no recreation of printed layout;
- work in Hand, Field, Inspector, Graveyard and Sanctuary;
- support responsive size variants;
- support fallback mock art when image missing in development.

## 14. GameCard integration

Refactor `GameCard` only as needed so one stable component contract can render:

```text
REAL CARD IMAGE
```

or

```text
DEV/MOCK CARD PRESENTATION
```

Do not maintain two unrelated card systems.

Interactions must continue to use CardInstance/CardDefinition, not DOM image metadata.

## 15. Digital overlays

With a real card image, do not redundantly render printed name/type/cost/rules/base stats over the image by default.

Digital overlays may show:

- current derived ATQ/PV when needed;
- selected/tapped;
- face-down;
- attachment;
- counters where supported;
- hover/drag;
- authority/drop feedback.

Existing Relic-derived ATQ/PV behavior must remain functional and must not modify the image or CardDefinition.

## 16. Inspector

Inspector with real assets should prioritize the full official image.

It must:

- show a larger readable image;
- preserve aspect ratio;
- close via Escape/click outside;
- retain structured metadata access only where existing UI needs it.

Do not rebuild printed card text in HTML unnecessarily.

## 17. Hand / Field / Sanctuary integration

Real card assets must preserve existing behavior:

Hand:
- fan;
- hover enlargement;
- DnD;
- z-index;
- inspection.

Field:
- centered layout;
- Tap/Untap;
- loose Relics;
- compact attached Relic plates;
- Graveyard movement;
- flip;
- inspection.

Sanctuary:
- use same `CardImage`;
- keep current HP digital;
- owner +/- controls;
- inspection.

Attached Relics remain compact plates by default; inspection may show the full Relic image.

## 18. Card backs

Create/reuse one common:

```text
CardBack
```

component prepared for future real card-back assets.

Use it consistently for:

- Main Deck;
- Essence Deck where appropriate;
- opponent hidden Hand;
- face-down cards.

A development placeholder is acceptable now.

Do not create unrelated card-back implementations.

## 19. Deck Builder integration

Deck Builder must read from the new catalog boundary rather than old mock arrays.

For the tiny fixture catalog, preserve:

- faction filtering;
- quantities;
- max 3 copies;
- Sanctuary selection;
- Essence configuration.

Do not import the full catalog yet.

## 20. Preparation integration

Preparation must consume the new catalog abstraction.

Do not change:

- 35-card rule;
- max 3 copies;
- Sanctuary selection;
- starting player;
- Essence ordering;
- initial draw;
- Mulligan.

Only change card-source plumbing where necessary.

## 21. Convex compatibility

Convex should continue storing structured game/card references and state.

Do not duplicate full static catalog/image data into every GameState.

Do not weaken PlayerView privacy.

## 22. Tiny fixture set

Use only a very small fixture set to prove the pipeline, approximately:

- 2 Characters;
- 2 Relics;
- 2 Verses;
- 2 Essences;
- 1 Sanctuary.

These may still use development assets if real source files are not yet copied locally.

The architecture is the deliverable.

## 23. Optional real fixtures from local PDF/image sources

If a local official PDF or image source is available in the repository, it is acceptable to wire a tiny real fixture set through the complete pipeline.

Target only enough real samples to validate multiple card types, for example:

- 1 CHARACTER;
- 1 RELIC;
- 1 VERSE;
- 1 ESSENCE.

A SANCTUARY may remain mock if the local reference source does not contain one.

Do not make Mission 005A depend on downloading the entire Drive.

Do not scrape Google Drive or fetch card assets from external URLs at runtime.

Do not process/import the full faction in Mission 005A.

## 24. Import manifest

Define/document a simple manifest structure suitable for Mission 005B.

Example:

```json
{
  "sourceFile": "31ffb237-....png",
  "id": "MDK-066",
  "collectorNumber": "066/110",
  "name": "Furia",
  "faction": "CAOS",
  "type": "VERSE",
  "cost": 2,
  "keywords": ["Vestigios"],
  "prologueText": "Un Personaje obtiene Imbatible.",
  "epilogueText": "Un Personaje obtiene +3 de ataque y +3 de vida hasta tu Anochecer."
}
```

Use project enums/naming rather than blindly copying this shape.

## 25. Future asset normalization hook

Prepare a future function/script capable conceptually of:

```text
source UUID image
+ manifest canonical ID
→ copy/normalize filename
→ public/cards/<faction>/<id>.<ext>
```

Image conversion to WebP is optional in 005A if it adds unnecessary dependencies.

Do not degrade source quality.

## 26. No OCR at runtime

Runtime must be:

```text
card ID
→ catalog lookup
→ image path + metadata
```

Never:

```text
image
→ OCR
→ guess card
```

Any metadata extraction is an import-time concern for Mission 005B.

## 27. Accessibility

Real card fronts:

```text
alt = card.name
```

Hidden opponent cards must not expose hidden names through alt text.

CardBack alt text must remain generic.

## 28. Tests

Add tests for:

- duplicate IDs rejected;
- CHARACTER required fields;
- RELIC `+0` remains valid;
- VERSE fields retained;
- SANCTUARY health validation;
- ESSENCE metadata validation;
- invalid image path rejected;
- fixture catalog parses;
- Deck Builder reads catalog;
- faction filtering works;
- lookup by ID works;
- GameCard renders via common contract;
- missing dev image uses fallback;
- hidden cards do not expose front image/name;
- Inspector uses canonical image;
- Sanctuary uses common CardImage;
- attached Relic plate does not unnecessarily render full front.

Avoid pixel-perfect tests.

## 29. Documentation

Add concise:

```text
docs/CARD_CATALOG.md
```

Document:

- canonical IDs;
- folder convention;
- schema;
- raw → generated pipeline;
- `cards:validate`;
- `cards:build`;
- adding a development card;
- how Mission 005B should perform bulk import.

Do not duplicate the full architecture docs.

## 30. Do not implement

Do NOT:

- import all official cards;
- scrape Drive;
- OCR the entire catalog;
- implement card effects;
- implement Prologue/Epilogue gameplay;
- implement Sanctuary abilities;
- add combat engine;
- change multiplayer/preparation rules;
- redesign board;
- add inventory/economy.

## 31. Acceptance criteria

Mission is complete when:

1. one validated catalog boundary exists;
2. canonical card IDs are defined;
3. schema supports current card types;
4. real image paths are first-class card data;
5. runtime card UI can render real images;
6. mock fallback still works;
7. Deck Builder consumes catalog abstraction;
8. Preparation consumes catalog abstraction;
9. multiplayer board still works;
10. CardBack is reusable;
11. `cards:validate` works;
12. `cards:build` works on fixture data;
13. import pipeline is documented;
14. full bulk import has NOT yet been performed.

## 32. Quality gates

Run and fix:

```bash
npm run cards:validate
npm run cards:build
npm run lint
npm run typecheck
npm run test
npm run build
```

Run `npm run test:e2e` only if the known Convex environment issue is resolved.

Final report: maximum 15 lines following `AGENTS.md`.

Report only:
- catalog architecture;
- asset convention;
- scripts added;
- GameCard/CardImage/CardBack integration;
- docs created;
- files modified;
- quality-gate results;
- what Mission 005B still needs.
