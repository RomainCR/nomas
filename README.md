# NOMAS — 11—14 JUIN 2027

Static poster site for the NOMAS festival (11—14 Juin 2027, Isère), built with
Next.js and exported as plain HTML/CSS/JS.

The character is a hand-drawn, single-line outline. Sweeping the pointer across
it makes the part of the line the pointer passed over wobble and spring back,
like the reference video.

## Getting started

Requires Node.js 20.9+ (built and tested with Node 24).

```bash
npm install
npm run dev        # http://localhost:3000
```

## Static build

```bash
npm run build      # writes the whole site to ./out
npm run preview    # serves ./out on http://localhost:4173
```

`next.config.mjs` uses `output: "export"`, so `out/` can be dropped on any
static host (Nginx, GitHub Pages, Netlify, Vercel static, a USB stick…).

## How it works

- `app/page.tsx` — the poster layout (wordmark, character, dates).
- `app/globals.css` — the yellow `#fabb04` poster, proportioned on a 720 × 1280
  reference grid. Everything scales with the viewport and stays centred.
- `lib/artwork.ts` — generated artwork data:
  - the NOMAS wordmark as a traced vector path;
  - the character's closed centre-line plus its face marks;
  - the stroke width.
- `components/Character.tsx` — renders the outline as an SVG stroke.
  - The resting path is server-rendered, so the poster is complete without JS.
  - On pointer movement, nearby points are dragged along the pointer direction
    and released into a damped spring, which produces the local wobble.
  - Touches are handled as pointer events: pressing a finger on the poster gives
    a local "poke", dragging across the character sweeps it, and the line springs
    back — the same behaviour on mouse and touch.
  - Honours `prefers-reduced-motion`.
- Audio: a click / tap on the character plays the music (`public/assets/media.mp4`).
  The float starts with the same press; the float follows the music (it fades out
  together, starting ~55 s into the track, over 5 seconds, then silence).

- `public/fonts/` — self-hosted Roboto Bold (SIL Open Font License), subset
  for the dates.

- `public/assets/` — the `media.mp4` music and the `iserepoint.png` ISÈRE point
  illustration (moved out of the project root). The ISÈRE point floats under the
  `[ ISÈRE ]` credit on hover / touch over the credit text.

## Notes

- Colours: background `#fabb04`, foreground `#000000`.
- Text: `11—14 JUIN 2027` and `[ ISÈRE ]` (em dash, uppercase, grave accent on
  the È).
- The artwork was traced from the supplied reference capture/video; the font
  was matched against the reference metrics.
# nomas
