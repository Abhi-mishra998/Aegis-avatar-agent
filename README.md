# 🛡️ Aegis Voice Avatar Agent

> Real-time conversational AI avatar with streaming speech, reasoning, and lip-synced video — built on **Tavus**, **Pipecat**, **Deepgram**, **OpenAI / Groq**, **ElevenLabs**, **Simli**, and **Daily WebRTC**.

The avatar persona is **Abhishek Mishra**, founder of [Aegis](https://dev.aegisagent.in) — a runtime safety layer between AI agents and the world they act on. Visitors can talk to the avatar in their browser and get a live, voice-to-voice founder pitch.

[**Live Demo →**](https://dev.aegisagent.in)  ·  [**Video Walkthrough →**](https://drive.google.com/drive/folders/1cAnCFmF6SEqaqTbiijuj0HyGwXmy1lhZ?usp=sharing)  ·  [**Engineering Deep Dive →**](https://projectsphere.hashnode.dev/i-built-a-runtime-firewall-for-ai-agents)  ·  [**Docs →**](https://docs.aegisagent.in)

> ⚠️ **Synthetic media disclosure.** Every conversation uses an AI-generated likeness with explicit self-consent. Do not point the cloning pipeline at anyone else's face or voice without written permission. Required by EU AI Act Art. 50(4) and US FCC robocall rules.

---

## 🎥 Demo & Resources

| | |
|---|---|
| 🌐 **Live demo** | [dev.aegisagent.in](https://dev.aegisagent.in) |
| 🎬 **Video walkthrough** | [Google Drive folder](https://drive.google.com/drive/folders/1cAnCFmF6SEqaqTbiijuj0HyGwXmy1lhZ?usp=sharing) |
| 📝 **Engineering deep dive** | [*"I built a runtime firewall for AI agents"*](https://projectsphere.hashnode.dev/i-built-a-runtime-firewall-for-ai-agents) |
| 🛡️ **Aegis platform** | [dev.aegisagent.in](https://dev.aegisagent.in) |
| 📚 **Aegis docs** | [docs.aegisagent.in](https://docs.aegisagent.in) |

---

## 🧭 What's in here

Two parallel implementations of the same product, kept side-by-side so you can compare an "all-in-one" vendor stack against a fully composable one.

| | **Track A — Tavus CVI** | **Track B — Pipecat (composable)** |
|---|---|---|
| **Path** | `apps/track-a-tavus/` | `apps/track-b-pipecat/` |
| **Stack** | Tavus CVI (Phoenix-4 render, Raven perception, Sparrow turn-taking) over Daily WebRTC | Pipecat agent: Deepgram STT → OpenAI / Groq LLM → ElevenLabs TTS → Simli avatar over Daily |
| **Frontend** | React + Vite + TypeScript + Tailwind | React client (in `server/` repo) |
| **Cost** | ~$0.32 / min (Free tier: 25 min/mo) | ~$0.05 – $0.15 / min (BYO providers) |
| **Latency** | ~600 ms utterance-to-utterance | ~750 – 950 ms voice-to-voice |
| **Use when** | You want a face-to-face demo today with a single API key | You want provider control, voice + face cloning, lower per-minute cost |

Strategy, research, and the deep "why" behind every decision lives in **[AGENTS.md](./AGENTS.md)**. Live punch-list lives in **[TODO.md](./TODO.md)**.

---

## 🏗️ Architecture

```
Browser (mic + cam, WebRTC)
   │
   ▼
Orchestrator  (Tavus CVI  |  Pipecat agent)
   ├─ VAD + turn detection      (Silero / Sparrow)
   ├─ STT       streaming       (Deepgram / Raven)
   ├─ LLM       streaming       (OpenAI / Groq / Anthropic)
   ├─ TTS       streaming       (ElevenLabs / Cartesia)
   └─ Avatar    audio → video   (Simli / HeyGen / Tavus Phoenix-4)
   │
   ▼
Browser renders lip-synced avatar video + audio
```

**End-to-end target:** voice-to-voice ≤ 1 second. Every service streams — nothing waits for a full response before the next stage starts.

---

## 🚀 Quickstart — Track A (Tavus CVI)

```bash
cd apps/track-a-tavus
cp .env.example .env.local
# fill in VITE_TAVUS_API_KEY, VITE_TAVUS_PERSONA_ID, VITE_TAVUS_REPLICA_ID
npm install
npm run dev
```

Open `http://localhost:5173`, grant mic + camera, and start talking.

**To regenerate the replica / persona for your own pitch:**
1. Create an Image-to-Replica from a clear frontal portrait at [platform.tavus.io](https://platform.tavus.io).
2. Create a persona, paste in your system prompt, and link the replica.
3. Drop the two IDs into `.env.local`.

---

## 🛠️ Quickstart — Track B (Pipecat + Deepgram + LLM + ElevenLabs + Simli)

Requires **Python 3.11+** and [`uv`](https://github.com/astral-sh/uv).

```bash
cd apps/track-b-pipecat/server
cp .env.example.bytehubble .env
# fill in DEEPGRAM, OPENAI (or GROQ / ANTHROPIC), ELEVENLABS, SIMLI, DAILY keys
uv sync
uv run bot.py
```

The agent starts a Daily room and prints the join URL. Open it in two browsers (one is "you", one is "the avatar") to test.

Provider failover order is configurable via `LLM_PROVIDER_ORDER` (default: `groq,openai,anthropic`).

---

## 🔐 Required environment variables

> **Never commit `.env` or `.env.local`.** The repo's `.gitignore` blocks every variant — only `*.example` files pass through. Rotate any key you suspect has leaked.

### Track A — `apps/track-a-tavus/.env.local`

```ini
VITE_TAVUS_API_KEY=
VITE_TAVUS_PERSONA_ID=
VITE_TAVUS_REPLICA_ID=
VITE_ELEVENLABS_VOICE_ID=   # optional, for custom voice
```

### Track B — `apps/track-b-pipecat/server/.env`

```ini
# STT
DEEPGRAM_API_KEY=
CARTESIA_API_KEY=

# LLM (failover chain)
OPENAI_API_KEY=
GROQ_API_KEY=
ANTHROPIC_API_KEY=

# TTS / voice clone
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Avatar face
SIMLI_API_KEY=
SIMLI_FACE_ID=
HEYGEN_API_KEY=
HEYGEN_AVATAR_ID=

# Transport
DAILY_API_KEY=
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Runtime
LLM_PROVIDER_ORDER=groq,openai,anthropic
LOG_LEVEL=info
```

---

## 🧱 Guardrails (apply to every change in this repo)

1. **Clone-self-only for the demo.** No third-party likeness without written consent on file.
2. **Always render the AI-disclosure label** in the UI (synthetic-media badge). Required by **EU AI Act Art. 50(4)** (effective 2 Aug 2026) and **US FCC robocall rules** (in force today).
3. **Latency instrumentation is non-negotiable.** Every pipeline logs STT / LLM TTFT / TTS TTFA / render TTFx and end-to-end voice-to-voice. If you add a service, you add its timing.
4. **Never log raw audio / video frames** or the cloned voice / face artifacts outside ephemeral pipeline state.
5. **Secrets stay in `.env`.** Use `.env.example` for the shape, never the values.

---

## 📁 Project layout

```
.
├── AGENTS.md                # canonical brief — read first
├── README.md                # this file
├── TODO.md                  # live punch-list
├── apps/
│   ├── track-a-tavus/       # Tavus CVI (React + Vite + TS)
│   └── track-b-pipecat/
│       └── server/          # Pipecat agent (Python 3.11+, uv)
└── temp/                    # research artifacts (pitch script, provider verification)
```

---

## 📊 Status

Pre-revenue prototype. Both tracks run end-to-end locally. Next milestones tracked in [TODO.md](./TODO.md).

---

## 💼 Author

**Abhishek Mishra** — founder of [Aegis](https://dev.aegisagent.in).

- 🛡️ Platform: [dev.aegisagent.in](https://dev.aegisagent.in)
- 📚 Docs: [docs.aegisagent.in](https://docs.aegisagent.in)
- 📝 Engineering writeup: [*"I built a runtime firewall for AI agents"*](https://projectsphere.hashnode.dev/i-built-a-runtime-firewall-for-ai-agents)

---

## 📄 License

Private — not for redistribution.
