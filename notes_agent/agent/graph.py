from __future__ import annotations

import hashlib
import sqlite3
import time
from typing import Optional

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph

from .models import State
from .nodes import (
    orchestrator_node,
    rag_node,
    reducer_node,
    research_node,
    route_after_research,
    route_after_router,
    router_node,
    worker_node,
)


def build_graph(db_path: str = "checkpoints.db") -> tuple:
    """Build and compile the LangGraph app with SQLite checkpointing."""
    conn = sqlite3.connect(db_path, check_same_thread=False)
    checkpointer = SqliteSaver(conn=conn)

    g = StateGraph(State)
    g.add_node("router",       router_node)
    g.add_node("research",     research_node)
    g.add_node("rag",          rag_node)
    g.add_node("orchestrator", orchestrator_node)
    g.add_node("worker",       worker_node)
    g.add_node("reducer",      reducer_node)

    g.add_edge(START, "router")

    g.add_conditional_edges("router", route_after_router, {
        "research":     "research",
        "rag":          "rag",
        "orchestrator": "orchestrator",
    })
    g.add_conditional_edges("research", route_after_research, {
        "rag":          "rag",
        "orchestrator": "orchestrator",
    })

    g.add_edge("rag",          "orchestrator")
    g.add_edge("orchestrator", "worker")
    g.add_edge("worker",       "reducer")
    g.add_edge("reducer",       END)

    app = g.compile(checkpointer=checkpointer)
    return app, checkpointer


def _thread_id(topic: str) -> str:
    return hashlib.md5(topic.encode()).hexdigest()[:12]


def run(
    topic: str,
    raw_input: str = "",
    context_provided: bool = False,
    resume: bool = True,
    app=None,
) -> dict:
    """
    Invoke the agent and return the final state dict.

    Args:
        topic:            Subject to generate notes on.
        raw_input:        Optional source text (paste, transcript, article body).
        context_provided: Set True when raw_input contains the source material.
        resume:           True  → reuse checkpoint for same topic (skip completed nodes).
                          False → fresh run with new thread_id.
        app:              Pre-built compiled graph. If None, builds one with defaults.
    """
    if app is None:
        app, _ = build_graph()

    thread_id = _thread_id(topic) if resume else str(time.time())
    config    = {"configurable": {"thread_id": thread_id}}

    initial_state: State = {
        "topic":            topic,
        "raw_input":        raw_input,
        "context_provided": context_provided,
        "mode":             "",
        "needs_research":   False,
        "needs_rag":        False,
        "queries":          [],
        "rag_queries":      [],
        "chunks":           [],
        "evidence":         [],
        "plan":             None,
        "sections":         [],
        "final":            "",
    }

    return app.invoke(initial_state, config=config)
