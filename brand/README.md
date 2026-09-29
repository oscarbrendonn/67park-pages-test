# Browser and share icons

The in-game wordmark remains `67park-logo.png` (1065 × 330). Do not replace it
with the square browser artwork: the HUD and studio still use the wide logo.

The old favicon pointed directly at that wide image and had no Apple touch
icon. A square share-sheet thumbnail could consequently crop the wordmark.
The versioned `67park-icon-*-v1.png` files contain the complete original logo,
centered with 6% horizontal insets on opaque cream (`#fff9ec`). No letters or
colors were redrawn. Sizes are 32, 180, 192 and 512 pixels; all four together
are approximately 111 KiB, not a new set of game textures.

Eleven game/studio entry pages declare square PNG favicons, the 180-pixel
Apple touch icon, and a 512-pixel Open Graph/Twitter image. Versioned image
URLs avoid reusing the old wide favicon URL; Safari may still retain its own
page metadata cache. No service worker or app-install behavior was added.

Reproduce and verify from the repository root:

```sh
node qa/brand-icons.mjs --write
npm test
node qa/brand-icons.browser.mjs
```

The build only lays out the existing artwork and performs an idempotent HTML
head migration. Tests assert dimensions, complete brand colors, opaque safe
insets, actual browser head parsing and preserved game imports/body/title.
The image checks and metadata checks are mandatory in the existing release
gate; the complete foundation/recovery tests remain mandatory too.

Local checks passed on 20 September 2026: all four decoded images and all 11
pages. Visual previews at 32, 60, 94 and 180 pixels show the complete wordmark.
The physical iPhone native share sheet has not been tested; browser previews
are not a substitute for that device check. The browser-extension cursor icon
can override favicons during interactive QA, so the clean headless browser
is used for the metadata assertions.

Apple reference: [Configuring Web Applications — Specifying a Webpage Icon](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).
