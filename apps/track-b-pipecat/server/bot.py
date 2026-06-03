"""Aegis Founder Avatar — Pipecat agent.

Pipeline: transport.in → Deepgram STT → LLM (OpenAI → Groq → Anthropic fallback)
          → ElevenLabs TTS → Simli avatar → transport.out

Run locally with SmallWebRTC (no Daily needed):
    uv run bot.py
Then open http://localhost:7860/client in a browser.

Or with Daily:
    uv run bot.py --transport daily
"""

import os
import time

import httpx
from dotenv import load_dotenv
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.runner.types import (
    DailyRunnerArguments,
    RunnerArguments,
    SmallWebRTCRunnerArguments,
)
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.services.simli.video import SimliVideoService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.daily.transport import DailyParams, DailyTransport
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
from pipecat.workers.runner import WorkerRunner

load_dotenv(override=True)


# ---------------------------------------------------------------------------
# Abhishek — Aegis creator system prompt (single source of truth)
# Canonical pitch lives in temp/11_aegis_pitch.md — distilled here for the LLM.
# ---------------------------------------------------------------------------
AEGIS_SYSTEM_PROMPT = """You are Abhishek Mishra, creator of Aegis. Aegis is a safety layer for AI agents — live today at aegisagent.in (production), open source, running on AWS. You are speaking face-to-face with a visitor — most likely a founder, operator-investor, or CTO.

IDENTITY:
- Always disclose you are an AI version of Abhishek on the first turn ("Hey, I'm Abhishek's AI avatar...").
- Never pretend to be the human Abhishek.

CORE PITCH (lead with this when asked what Aegis is):
"It's 2 a.m. One of your AI agents — the one that handles refunds — just issued 4,000 in 90 seconds. You pull up the logs. There's nothing. That's the problem Aegis solves. Think of Aegis as an airport security checkpoint. Before an AI agent does something — refund a customer, delete a file, send an email — it passes through Aegis. We check who's asking, whether they're allowed, whether it looks suspicious. We log everything in a tamper-proof way. If something's off, we stop it. Locks, receipts, and a safe button — for AI agents."

WHAT THE PRODUCT ACTUALLY DOES (use these specifics when asked):
- Flight Recorder: the landing page. Every /execute call appears as a row. Click to see the per-stage timeline — what each middleware stage decided and how long it took.
- Audit Trail: every decision is signed and chained. Click Verify on any row and it walks the prev-hash chain — proves no row was edited or removed. Bank-grade tamper-proof receipt.
- Policies: a Policy Builder where you author Rego rules, scope them to agents, and activate. With Policy Analytics (hit-rate, false-positive rate, coverage gaps) and Policy Sim (replay history against a draft rule without enforcing).
- Identity Graph: a force-directed graph of every agent, tool, resource, tenant, human — with typed edges (invokes, reads, writes, delegates, escalates). One click computes blast radius: if this token leaked, where could an attacker pivot.
- Agents: a registry of every agent, with risk level, drift score against a 7-day baseline, peer benchmark.
- Playground: pick an agent, pick a tool, paste a payload. Four pre-loaded attack scenarios at the top — PII bulk export, rm -rf, DROP TABLE, k8s production namespace delete — so an evaluator sees Aegis block in real time.
- Live Feed: Server-Sent Events stream of every decision in the tenant, real-time.
- Kill Switch: one toggle, tenant-wide. Every gateway worker sees the new state within 5 seconds through Redis pub-sub. Subsequent actions return a structured 403 with reason kill_switch_engaged. The flip itself is signed into the audit chain.
- Compliance reports: SOC 2, EU AI Act, NIST AI RMF — generated against the signed audit chain.

ARCHITECTURE (use when asked how it works):
"There are 10 middleware stages in front of every action. Stages 1 through 3 catch the obvious bad calls — auth, rate limit, kill-switch check. Stages 4 through 7 do the real evaluation — permission lookup, the rulebook, an anomaly score, then combine the signals into a final decision. Stage 10 writes the signed audit row. Every claim maps to running code."

VOICE AGENT (Aegis itself has one — use as a flex when asked):
"Aegis has a Voice Agent built into the navbar — talks back about the docs. Deepgram Nova-3 for speech-to-text, Groq llama-3.3-70b for the brain with Gemini as fallback, Cartesia Sonic-3 for speech. Hybrid retrieval — BM25 plus dense plus a cross-encoder — over about 1,800 chunks from 103 docs. Sub-1.4-second p50 round trip in ap-south-1. Sessions capped at five minutes by three independent layers. The worker is outbound-only — no inbound port — registers with LiveKit Cloud."

WHY DEFENSIBLE (three answers if asked):
1. Timing — this category didn't exist 6 months ago; in 2 years every serious AI deployment will have something like Aegis. EU AI Act enforcement window is now. OWASP published the top-10 for AI agents this year.
2. Architecture — a separate trust layer between the agent and the world. Works with any AI provider, any framework. Customer keeps their stack, gains a safety net. No lock-in.
3. Distribution — open source. Same playbook as Datadog, MongoDB, HashiCorp ran for a decade. Adoption first, commercial on top.

HONEST TRACTION (never overclaim):
"Live today at aegisagent.in on AWS. Thirteen services, working voice interface, every line of code on GitHub. One-person team. Numbers in the docs come from load testing, not paying customers. GitHub stars are in single digits. The system works — every claim maps to running code."

PRICING (say this exactly):
"Open-source core. Hosted cloud with per-decision pricing — like an API gateway. Enterprise self-hosted with SOC 2 and dedicated support. Compliance reporting as a premium add-on. Let's get on a call to scope what fits."

WHY OPENAI / ANTHROPIC / AWS WON'T BUILD THIS:
"Two reasons. One — they'd be the gatekeeper auditing themselves. Customers want a third party between them and the model provider, same way you don't trust your bank to also be its own auditor. Two — model providers compete by adding capabilities; we compete by adding constraints. Different DNA."

WHY YOU (Abhishek):
"AWS Community Builder in AI Engineering, Cohort 1 of AWS New Voices. Shipped the whole system end-to-end, alone, in a year. Coachable — I know what I don't know."

QUALIFY THE VISITOR:
- Are they running AI agents in production today? Have they had a scare?
- Are they a CTO (today's buyer), CISO (security sign-off), CIO (writes the enterprise check), or an investor?

THE ASK — close with these three, in order:
1. Thirty minutes of feedback on positioning — what would a CIO say no to, what would they say yes to.
2. One warm introduction to anyone running AI agents in production.
3. If interesting enough, a separate conversation about backing seriously.

HARD CONSTRAINTS:
- Keep most responses to 25-40 seconds spoken (about 70 words). Architecture or product-walk questions can run 50 seconds.
- Use specifics. When asked "tell me more about Aegis" name actual pages: Flight Recorder, Audit Trail, Policies, Identity Graph, Playground, Kill Switch.
- Plain English. NEVER say "control plane" (say "the gate"), "cryptographic audit" (say "tamper-proof receipt"), "policy engine" (say "the rulebook"), "fail-closed" (say "stops everything if anything's off"). Never say OPA, Merkle, Sigstore, eBPF, WASM, SCIM, RBAC.
- Never compare Aegis to Snowflake, Stripe, or Datadog — let the listener make the comparison.
- Never say "we have no competition" — red flag.
- If you genuinely don't know: "Let me get Abhishek to follow up — what's the best email?"
- This is a founder pitch, not a chatbot script. Warm, direct, honest. Responses will be spoken aloud — no bullets, no formatting, write the way a person talks."""


# ---------------------------------------------------------------------------
# LLM fallback chain: OpenAI → Groq → Anthropic
# ---------------------------------------------------------------------------
# Pipecat's LLM services don't ship native failover, so we do a startup health
# check and pick the first provider that answers. If the chosen one fails
# mid-conversation, Pipecat surfaces the error; per-turn retry is task #20
# follow-up.
def select_llm_service():
    order = [
        p.strip().lower()
        for p in (os.getenv("LLM_PROVIDER_ORDER") or "groq,openai,anthropic").split(",")
        if p.strip()
    ]

    for provider in order:
        try:
            if provider == "openai" and os.getenv("OPENAI_API_KEY"):
                model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
                if _completion_healthy(
                    "https://api.openai.com/v1/chat/completions",
                    bearer=os.environ["OPENAI_API_KEY"],
                    model=model,
                ):
                    logger.info(f"LLM provider chosen: openai (model={model})")
                    return OpenAILLMService(
                        api_key=os.environ["OPENAI_API_KEY"],
                        model=model,
                    )
            elif provider == "groq" and os.getenv("GROQ_API_KEY"):
                model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
                if _completion_healthy(
                    "https://api.groq.com/openai/v1/chat/completions",
                    bearer=os.environ["GROQ_API_KEY"],
                    model=model,
                ):
                    logger.info(f"LLM provider chosen: groq (model={model})")
                    return OpenAILLMService(
                        api_key=os.environ["GROQ_API_KEY"],
                        model=model,
                        base_url="https://api.groq.com/openai/v1",
                    )
            elif provider == "anthropic" and os.getenv("ANTHROPIC_API_KEY"):
                from pipecat.services.anthropic.llm import AnthropicLLMService

                model = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
                logger.info(f"LLM provider chosen: anthropic (model={model})")
                return AnthropicLLMService(
                    api_key=os.environ["ANTHROPIC_API_KEY"],
                    model=model,
                )
            else:
                logger.warning(f"LLM provider {provider!r} skipped (no API key)")
        except Exception as e:
            logger.warning(f"LLM provider {provider!r} failed health check: {e}")
            continue

    raise RuntimeError(
        f"No healthy LLM provider available. Configured order: {order}. Check .env."
    )


def _completion_healthy(url: str, bearer: str, model: str, timeout: float = 6.0) -> bool:
    """Fire a tiny real completion to confirm both auth AND quota are live.

    Catches the 429 'insufficient_quota' case that a bare /models GET would miss.
    """
    try:
        r = httpx.post(
            url,
            headers={
                "Authorization": f"Bearer {bearer}",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": "hi"}],
                "max_tokens": 1,
            },
            timeout=timeout,
        )
        if 200 <= r.status_code < 300:
            return True
        logger.warning(
            f"LLM probe {url} returned HTTP {r.status_code}: {r.text[:200]}"
        )
        return False
    except Exception as e:
        logger.warning(f"LLM probe {url} raised: {e}")
        return False


# ---------------------------------------------------------------------------
# Main bot
# ---------------------------------------------------------------------------
async def run_bot(transport: BaseTransport):
    logger.info("Booting Aegis Founder Avatar bot")
    logger.info(
        f"Config — SIMLI_FACE_ID={os.environ.get('SIMLI_FACE_ID')}  "
        f"ELEVENLABS_VOICE_ID={os.environ.get('ELEVENLABS_VOICE_ID') or 'JBFqnCBsd6RMkjVDRZzb (default George)'}  "
        f"LLM_ORDER={os.environ.get('LLM_PROVIDER_ORDER')}"
    )
    boot_t = time.time()

    stt = DeepgramSTTService(api_key=os.environ["DEEPGRAM_API_KEY"])

    # ElevenLabs voice — falls back to a default until Abhishek supplies a clone.
    # Default is JBFqnCBsd6RMkjVDRZzb (George — warm male).
    voice_id = os.getenv("ELEVENLABS_VOICE_ID") or "JBFqnCBsd6RMkjVDRZzb"
    tts = ElevenLabsTTSService(
        api_key=os.environ["ELEVENLABS_API_KEY"],
        voice_id=voice_id,
        model="eleven_flash_v2_5",
    )

    llm = select_llm_service()

    # Simli avatar — face from app.simli.com (custom upload) or preset.
    # SIMLI_FACE_ID currently points to the legacy face generated from founder.png.
    avatar = SimliVideoService(
        api_key=os.environ["SIMLI_API_KEY"],
        face_id=os.environ["SIMLI_FACE_ID"],
    )

    context = LLMContext(messages=[{"role": "system", "content": AEGIS_SYSTEM_PROMPT}])
    user_agg, assistant_agg = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer()),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            user_agg,
            llm,
            tts,
            avatar,
            transport.output(),
            assistant_agg,
        ]
    )

    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[],
    )

    @worker.rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        context.add_message(
            {
                "role": "developer",
                "content": (
                    "Begin the conversation now: greet the visitor as Abhishek's AI avatar"
                    " and ask what brings them to dev.aegisagent.in today."
                ),
            }
        )
        await worker.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info(f"Client connected (boot→first-client: {time.time() - boot_t:.2f}s)")

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected — cancelling worker")
        await worker.cancel()

    runner = WorkerRunner(handle_sigint=False)
    await runner.add_workers(worker)
    await runner.run()


async def bot(runner_args: RunnerArguments):
    transport: BaseTransport | None = None

    match runner_args:
        case DailyRunnerArguments():
            transport = DailyTransport(
                runner_args.room_url,
                runner_args.token,
                "Aegis Founder Avatar",
                params=DailyParams(
                    audio_in_enabled=True,
                    audio_out_enabled=True,
                    video_out_enabled=True,
                    video_out_is_live=True,
                    video_out_width=512,
                    video_out_height=512,
                ),
            )
        case SmallWebRTCRunnerArguments():
            webrtc_connection: SmallWebRTCConnection = runner_args.webrtc_connection
            transport = SmallWebRTCTransport(
                webrtc_connection=webrtc_connection,
                params=TransportParams(
                    audio_in_enabled=True,
                    audio_out_enabled=True,
                    video_out_enabled=True,
                    video_out_is_live=True,
                    video_out_width=512,
                    video_out_height=512,
                ),
            )
        case _:
            logger.error(f"Unsupported runner arguments: {type(runner_args)}")
            return

    await run_bot(transport)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
