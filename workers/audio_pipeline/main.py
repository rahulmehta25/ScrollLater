"""ScrollLater audio pipeline worker.

Watches `audio_jobs` where status='queued', renders narration via ElevenLabs,
uploads the MP3 to Google Cloud Storage, and marks the job 'ready' with an
`audio_gs_url`.

Designed to run on Cloud Run Jobs (long-lived) or via Cloud Scheduler hitting
a Cloud Run service that invokes `run_once()`.

Environment:
    DATABASE_URL              postgresql://... pointing at the Cloud SQL `scrolllater` DB
    ELEVENLABS_API_KEY        ElevenLabs API key
    ELEVENLABS_NARRATOR_AGENT_ID  Conversational agent id (default: agent_2001kpfrb0zrektav0a1vrtpjhsj)
    GCS_AUDIO_BUCKET          Destination bucket (default: scrolllater-audio-us-east1)
    POLL_INTERVAL_SECONDS     Loop delay when running as a long-lived worker (default 15)
    MAX_JOBS_PER_RUN          Cap per `run_once()` invocation (default 10)
"""
from __future__ import annotations

import asyncio
import logging
import os
import signal
from datetime import datetime
from typing import Optional

import asyncpg
import httpx
from google.cloud import storage

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
log = logging.getLogger("scrolllater.audio")

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.environ.get(
    "ELEVENLABS_VOICE_ID",
    "pNInz6obpgDQGcFmaJgB",  # Adam, ElevenLabs default narrator
)
ELEVENLABS_MODEL = os.environ.get("ELEVENLABS_MODEL", "eleven_turbo_v2_5")
GCS_BUCKET = os.environ.get("GCS_AUDIO_BUCKET", "scrolllater-audio-us-east1")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL_SECONDS", "15"))
MAX_JOBS_PER_RUN = int(os.environ.get("MAX_JOBS_PER_RUN", "10"))


def _normalize_dsn(dsn: str) -> str:
    if dsn.startswith("postgresql+asyncpg://"):
        return "postgresql://" + dsn[len("postgresql+asyncpg://"):]
    return dsn


async def _claim_next_job(conn: asyncpg.Connection) -> Optional[asyncpg.Record]:
    """Atomically claim the oldest queued job."""
    return await conn.fetchrow(
        """
        WITH next AS (
            SELECT id FROM audio_jobs
             WHERE status = 'queued'
             ORDER BY queued_at ASC
             LIMIT 1
             FOR UPDATE SKIP LOCKED
        )
        UPDATE audio_jobs aj
           SET status = 'running', started_at = now()
          FROM next
         WHERE aj.id = next.id
         RETURNING aj.id, aj.entry_id, aj.voice_agent_id
        """,
    )


async def _load_entry_text(conn: asyncpg.Connection, entry_id: str) -> Optional[str]:
    row = await conn.fetchrow(
        "SELECT ai_summary, content FROM entries WHERE id = $1",
        entry_id,
    )
    if not row:
        return None
    return (row["ai_summary"] or row["content"] or "").strip() or None


async def _render_narration(text: str) -> bytes:
    """Call ElevenLabs text-to-speech and return raw MP3 bytes."""
    if not ELEVENLABS_API_KEY:
        raise RuntimeError("ELEVENLABS_API_KEY not set")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "accept": "audio/mpeg",
        "content-type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": ELEVENLABS_MODEL,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.8},
    }
    async with httpx.AsyncClient(timeout=120) as client:
        res = await client.post(url, headers=headers, json=payload)
        res.raise_for_status()
        return res.content


def _upload_to_gcs(blob_name: str, data: bytes) -> str:
    client = storage.Client()
    bucket = client.bucket(GCS_BUCKET)
    blob = bucket.blob(blob_name)
    blob.upload_from_string(data, content_type="audio/mpeg")
    return f"gs://{GCS_BUCKET}/{blob_name}"


async def _finalize_ready(
    conn: asyncpg.Connection, job_id: str, audio_url: str, duration_s: Optional[int]
) -> None:
    await conn.execute(
        """
        UPDATE audio_jobs
           SET status = 'ready',
               audio_gs_url = $2,
               duration_seconds = $3,
               completed_at = now()
         WHERE id = $1
        """,
        job_id,
        audio_url,
        duration_s,
    )


async def _finalize_failed(conn: asyncpg.Connection, job_id: str, err: str) -> None:
    await conn.execute(
        """
        UPDATE audio_jobs
           SET status = 'failed',
               error_message = $2,
               completed_at = now()
         WHERE id = $1
        """,
        job_id,
        err[:2000],
    )


async def _process_one(pool: asyncpg.Pool) -> bool:
    async with pool.acquire() as conn:
        async with conn.transaction():
            job = await _claim_next_job(conn)
        if not job:
            return False
        job_id = str(job["id"])
        log.info("processing audio_job %s", job_id)

        try:
            text = await _load_entry_text(conn, job["entry_id"])
            if not text:
                await _finalize_failed(conn, job_id, "entry text is empty")
                return True
            mp3 = await _render_narration(text)
            ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            blob_name = f"{job['entry_id']}/{ts}-{job_id}.mp3"
            audio_url = _upload_to_gcs(blob_name, mp3)
            # Rough duration estimate: ~16KB / second for 128kbps MP3
            duration_s = max(1, len(mp3) // 16000)
            await _finalize_ready(conn, job_id, audio_url, duration_s)
            log.info("audio_job %s ready -> %s", job_id, audio_url)
            return True
        except Exception as e:  # noqa: BLE001 — top-level handler for worker
            log.exception("audio_job %s failed", job_id)
            await _finalize_failed(conn, job_id, str(e))
            return True


async def run_once() -> int:
    """Drain up to MAX_JOBS_PER_RUN queued jobs and return how many were processed."""
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        raise RuntimeError("DATABASE_URL not set")
    pool = await asyncpg.create_pool(dsn=_normalize_dsn(dsn), min_size=1, max_size=4)
    processed = 0
    try:
        for _ in range(MAX_JOBS_PER_RUN):
            did_work = await _process_one(pool)
            if not did_work:
                break
            processed += 1
    finally:
        await pool.close()
    return processed


async def run_forever() -> None:
    stop_event = asyncio.Event()

    def _stop(*_: object) -> None:
        log.info("stop signal received")
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, _stop)
        except NotImplementedError:
            pass  # e.g. on Windows

    while not stop_event.is_set():
        try:
            count = await run_once()
            log.info("drained %s jobs; sleeping %ss", count, POLL_INTERVAL)
        except Exception:
            log.exception("worker tick errored; continuing")
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=POLL_INTERVAL)
        except asyncio.TimeoutError:
            continue


if __name__ == "__main__":
    mode = os.environ.get("WORKER_MODE", "forever")
    if mode == "once":
        asyncio.run(run_once())
    else:
        asyncio.run(run_forever())
