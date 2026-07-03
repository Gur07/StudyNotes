from __future__ import annotations
from dotenv import load_dotenv
load_dotenv()
import itertools
import logging
import os
import threading
import time
from typing import List

from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI

logger = logging.getLogger("notes_agent.llm")

# ── Gemini key pool ────────────────────────────────────────────────────────────

def _load_keys() -> List[str]:
    env = os.getenv("GEMINI_KEYS", "")
    if env:
        return [k.strip() for k in env.split(",") if k.strip()]
    raise ValueError("GEMINI_KEYS env var is not set.")
    

_key_pool = itertools.cycle(_load_keys())


# ── Rate limiter: 4 calls per minute ──────────────────────────────────────────

_rate_lock = threading.Lock()
_call_timestamps: List[float] = []

RPM_LIMIT   = 4
WINDOW_SECS = 60


def _wait_for_slot() -> None:
    """Block until a call slot is available under the RPM limit."""
    with _rate_lock:
        while True:
            now = time.time()
            # evict timestamps outside the rolling window
            _call_timestamps[:] = [t for t in _call_timestamps if now - t < WINDOW_SECS]

            if len(_call_timestamps) < RPM_LIMIT:
                _call_timestamps.append(time.time())
                return

            # oldest call expires at this time
            wait = WINDOW_SECS - (now - _call_timestamps[0]) + 0.5
            logger.info(f"[rate-limiter] RPM cap ({RPM_LIMIT}/min) reached — waiting {wait:.1f}s ...")
            time.sleep(wait)


def get_chat_llm() -> ChatGoogleGenerativeAI:
    """Return a Gemini chat LLM. Blocks here if rate limit is reached."""
    _wait_for_slot()
    key = next(_key_pool)
    logger.debug(f"[llm] acquired slot — key suffix ...{key[-6:]}")
    return ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        google_api_key=key,
        temperature=0.3,
    )


# ── Sentence Transformers embedding (loaded once at startup) ───────────────────

_embeddings: HuggingFaceEmbeddings | None = None
_embed_lock = threading.Lock()


def get_embedding_model() -> HuggingFaceEmbeddings:
    """Return the shared embedding model. Downloads weights on first call only."""
    global _embeddings
    if _embeddings is not None:
        return _embeddings
    with _embed_lock:
        if _embeddings is None:
            model_name = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
            logger.info(f"[embeddings] loading '{model_name}' (first time — may take ~30s) ...")
            _embeddings = HuggingFaceEmbeddings(
                model_name=model_name,
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True},
            )
            logger.info("[embeddings] model ready ✓")
    return _embeddings


def warmup_embeddings() -> None:
    """Call at server startup to pre-load the embedding model."""
    get_embedding_model()
