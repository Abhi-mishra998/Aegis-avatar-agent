# Track A — ByteHubble notes on this Tavus quickstart

This folder is `Tavus-Engineering/tavus-vibecode-quickstart`, cloned 2026-06-02. Upstream README in `README.md` is kept verbatim. ByteHubble-specific notes live here.

## How it actually runs

1. `npm install`
2. `npm run dev` → opens at `http://localhost:5173`
3. The app asks for your Tavus **API token in the UI** on the Intro screen — there is no `.env` setup needed for the dev demo. (The API key gets stored client-side via `js-cookie`.)
4. Persona, greeting, and context are also set via the Settings UI.

> Production note (per upstream): never ship the token in the frontend. We'll proxy via a backend before deployment. Out of scope for the demo build.

## What we need to customize for the ByteHubble demo

- **Create a Tavus persona** for "Suresh AI" using:
  - Photo of Suresh (Image-to-Replica → Phoenix-4)
  - System prompt from `temp/04_demo_persona.md`
  - Optional: cloned voice (Tavus supports custom TTS layers / ElevenLabs voice ID)
- **Drop the resulting `persona_id`** into `src/api/createConversation.ts` (line ~24, the `persona_id` field — default in the quickstart is `pd43ffef`).
- **Branding (task #8):** swap the Intro screen copy, drop in a ByteHubble logo, add the AI-disclosure badge from task #17.

## What's intentionally NOT changed yet

- No custom persona — we use the upstream default until we have the Tavus account + Suresh's photo.
- No .env file — quickstart doesn't use them; token entered in UI.
- No backend proxy yet — fine for local demo, required before public preview.
- No branding swap — that's task #8, after the smoke test (#7).

## Next steps

See `/Users/abhishekmishra/avatar/TODO.md` Phase 1 tasks #6 → #7 → #8.
