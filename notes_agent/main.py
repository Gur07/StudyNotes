"""Entry point — run with: uvicorn main:app --reload"""
import logging
import os

from dotenv import load_dotenv
load_dotenv()

# ── Logging setup (do this before any imports that use loggers) ────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%H:%M:%S",
)

# ── Pre-load embedding model at startup (not on first request) ─────────────────
from agent.llm import warmup_embeddings
warmup_embeddings()

from api.server import app  # noqa: F401 — uvicorn targets this
