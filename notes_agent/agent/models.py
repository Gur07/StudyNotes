from __future__ import annotations

import operator
from typing import Annotated, List, Optional, TypedDict

from pydantic import BaseModel, Field


# ── Pydantic schemas (LLM structured output) ──────────────────────────────────

class Section(BaseModel):
    id: int
    title: str
    goal: str = Field(..., description="One sentence describing what the reader should understand after this section.")
    bullets: List[str] = Field(..., min_length=3, max_length=6, description="3–6 concrete, non-overlapping subpoints.")
    target_words: int = Field(..., description="Target word count (100–400).")
    requires_research: bool = False
    requires_rag: bool = False


class NotesPlan(BaseModel):
    title: str
    subject: str
    audience: str
    sections: List[Section]


class SourceChunk(BaseModel):
    text: str
    source: str
    page: Optional[int] = None


class EvidenceItem(BaseModel):
    title: str
    url: str
    snippet: Optional[str] = None


class EvidencePack(BaseModel):
    evidence: List[EvidenceItem] = Field(default_factory=list)


class RouterDecision(BaseModel):
    needs_research: bool
    needs_rag: bool
    mode: str  # closed_book | rag_only | hybrid | open_book
    queries: List[str] = Field(default_factory=list)
    rag_queries: List[str] = Field(default_factory=list)


# ── LangGraph state ────────────────────────────────────────────────────────────

class State(TypedDict):
    raw_input: str
    topic: str
    mode: str
    needs_research: bool
    needs_rag: bool
    queries: List[str]
    rag_queries: List[str]
    context_provided: bool
    chunks: List[SourceChunk]
    evidence: List[EvidenceItem]
    plan: Optional[NotesPlan]
    sections: Annotated[List[tuple[int, str]], operator.add]
    final: str
