from __future__ import annotations

import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agent.graph import build_graph, run

# ── App setup ──────────────────────────────────────────────────────────────────

app = FastAPI(title="Notes Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Single compiled graph instance — shared across requests
_app, _checkpointer = build_graph(db_path=os.getenv("CHECKPOINT_DB", "checkpoints.db"))


# ── Request / Response schemas ─────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    topic: str
    raw_input: Optional[str] = ""
    context_provided: Optional[bool] = False
    resume: Optional[bool] = True


class GenerateResponse(BaseModel):
    final_md:       str
    mode:           str
    needs_research: bool
    needs_rag:      bool


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    """
    Trigger the notes agent. Returns the final markdown and metadata.
    Same topic + resume=True will hit the checkpoint and skip completed nodes.
    """
    try:
        state = run(
            topic=req.topic,
            raw_input=req.raw_input or "",
            context_provided=req.context_provided or False,
            resume=req.resume if req.resume is not None else True,
            app=_app,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    plan = state.get("plan")
    return {
        "final_md":       state.get("final", ""),
        "mode":           state.get("mode", ""),
        "needs_research": state.get("needs_research", False),
        "needs_rag":      state.get("needs_rag", False),
    }


@app.get("/state/{topic}")
def get_state(topic: str):
    """
    Inspect the saved checkpoint state for a given topic.
    Useful for debugging or checking partial runs.
    """
    import hashlib
    thread_id = hashlib.md5(topic.encode()).hexdigest()[:12]
    config    = {"configurable": {"thread_id": thread_id}}
    snapshot  = _app.get_state(config)
    if not snapshot or not snapshot.values:
        raise HTTPException(status_code=404, detail="No checkpoint found for this topic.")
    v = snapshot.values
    return {
        "topic":          topic,
        "thread_id":      thread_id,
        "mode":           v.get("mode"),
        "needs_research": v.get("needs_research"),
        "needs_rag":      v.get("needs_rag"),
        "chunks_count":   len(v.get("chunks", [])),
        "evidence_count": len(v.get("evidence", [])),
        "sections_count": len(v.get("sections", [])),
        "has_final":      bool(v.get("final")),
    }
