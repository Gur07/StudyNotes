from __future__ import annotations

import logging
import re
import time
from typing import List

from langchain_community.vectorstores import FAISS
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_tavily import TavilySearch
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .llm import get_chat_llm, get_embedding_model
from .models import (
    EvidenceItem,
    EvidencePack,
    NotesPlan,
    RouterDecision,
    SourceChunk,
    State,
)
import os

logger = logging.getLogger("notes_agent.nodes")

# ── Prompts ────────────────────────────────────────────────────────────────────

ROUTER_SYSTEM = """You are a routing module for a notes generator.

You receive a topic or question, and optionally a source document (PDF, transcript, article).
Decide what retrieval is needed BEFORE planning the notes.

Modes:
- closed_book (needs_research=false, needs_rag=false):
  No source document provided and topic is evergreen or conceptual.
- rag_only (needs_research=false, needs_rag=true):
  Source document is provided and it contains everything needed — no web lookup required.
- hybrid (needs_research=true, needs_rag=true):
  Source document is provided BUT it references external tools, models, or recent facts
  that are missing or underspecified in the document itself.
- open_book (needs_research=true, needs_rag=false):
  No source document provided and topic depends on recent facts, tools, or current events.

Rules:
- Set needs_rag=true ONLY if context_provided=true. Never set needs_rag=true otherwise.
- Set needs_research=true if the topic or document mentions specific tools, libraries,
  recent models, or contains gaps like "see paper", "refer to docs", "latest version".
- If context_provided=false, ignore rag entirely and decide only between closed_book and open_book.

If needs_research=true:
- Output 3–8 high-signal web search queries scoped to what is missing or underspecified.
- Prefer queries that fill gaps, not queries that restate what is already in the source.
- If the topic says "latest", "current", "as of now", reflect that in the queries.

If needs_rag=true:
- Output 4 semantic search queries for retrieving relevant chunks from the source document.
- Each query should target a distinct concept, section, or idea likely present in the document.
- Write them as natural phrases or questions, not keywords — they will be embedded and matched
  against chunk embeddings (e.g. "how does attention mechanism work" not "attention mechanism").
- Cover the full scope of the topic so retrieval is broad enough for comprehensive notes.
"""

RESEARCH_SYSTEM = """You are a research synthesizer for a notes generator.

Given raw web search results, produce a deduplicated list of EvidenceItem objects
that will be used to fill gaps in the source material or supplement missing context.

Rules:
- Only include items with a non-empty url.
- Prefer authoritative sources: official docs, academic papers, reputable technical blogs.
- Exclude SEO-heavy listicles, paywalled articles, or low-signal forum posts.
- If a published date is explicitly present in the result payload, keep it as YYYY-MM-DD.
  If missing or unclear, set published_at=null. Do NOT guess.
- Keep snippets short and focused on the claim they support.
- Deduplicate by URL.
"""

ORCH_SYSTEM = """You are an expert notes planner.
Your job is to produce a comprehensive, structured outline for notes on a given topic.

Hard requirements:
- Create exactly 4 sections suitable for the topic and audience.
- Each section must include:
  1) goal (1 sentence — what the reader will understand after this section)
  2) 2–5 bullets that are concrete, specific, and non-overlapping
  3) target word count (100–400)

Quality bar:
- Sections should flow logically: concepts first, details middle, summary + questions last.
- Always include at least one summary section and one practice questions section.
- Bullets should extract, explain, and connect ideas — not just restate headings.

Grounding rules:
- Mode closed_book:
  - Build the plan entirely from the topic. No external evidence needed.
- Mode rag_only:
  - Use retrieved chunks as the primary source of truth.
  - Mark sections that draw from chunks as requires_rag=True.
  - Do not introduce claims not present in the chunks.
- Mode hybrid:
  - Use chunks as the primary source, evidence to fill gaps or add context.
  - Mark sections using chunks as requires_rag=True.
  - Mark sections using web evidence as requires_research=True.
- Mode open_book:
  - Build the plan entirely from web evidence.
  - Mark all sections as requires_research=True.
  - If evidence is empty or insufficient, include a section that explicitly flags missing sources.

Output must strictly match the NotesPlan schema.
"""

WORKER_SYSTEM = """You are an expert note-taker and educator.
Write ONE section of structured study notes in Markdown.

Hard constraints:
- Follow the provided Goal and cover ALL Bullets in order (do not skip or merge bullets).
- Stay close to Target words (±15%).
- Output ONLY the section content in Markdown (no document title H1, no extra commentary).
- Start with a '## <Section Title>' heading.

Grounding policy:
- If requires_rag=true:
  - Draw primarily from the provided source chunks.
  - cite inline as (Source: {chunk.source}, p.{chunk.page}) where page is available.
  - Do NOT introduce claims not present in the chunks.
- If requires_research=true:
  - Use web evidence to fill gaps or add context.
  - Cite as a Markdown link: ([Source](URL)).
  - Only use URLs provided in Evidence. If not supported, write: "Not found in provided sources."
- If mode == closed_book:
  - No citations needed. Use evergreen reasoning only.

Style:
- Clear headings, short paragraphs, bullet points for lists of facts or steps.
- Highlight key terms in **bold** on first use.
- Prefer concrete examples over abstract descriptions.
- End each section with a one-line takeaway prefixed with > (blockquote).
"""

# ── Helpers ────────────────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    text = re.sub(r"\n+", "\n", text)
    text = re.sub(r" +",  " ", text)
    text = re.sub(r"\t",  " ", text)
    return text.strip()


def _tavily_search(query: str, max_results: int = 5) -> List[dict]:
    tool = TavilySearch(max_results=max_results)
    response = tool.invoke({"query": query})

    results = response.get("results", [])

    normalized: List[dict] = []
    for r in results or []:
        normalized.append(
            {
                "title": r.get("title") or "",
                "url": r.get("url") or "",
                "snippet": r.get("content") or r.get("snippet") or "",
                "published_at": r.get("published_date") or r.get("published_at"),
                "source": r.get("source"),
            }
        )
    return normalized

# ── Nodes ──────────────────────────────────────────────────────────────────────

def router_node(state: State) -> dict:
    logger.info("[router] ▶ starting — deciding mode and queries ...")

    llm      = get_chat_llm()          # rate-limited inside get_chat_llm()
    decider = llm.with_structured_output(RouterDecision)
    decision = decider.invoke([
        SystemMessage(content=ROUTER_SYSTEM),
        HumanMessage(content=(
            f"Topic: {state['topic']}\n"
            f"context_provided: {state['context_provided']}\n\n"
            f"Raw input preview (first 500 chars):\n{state['raw_input'][:500]}"
        )),
    ])

    result = {
        "mode":           decision.mode,
        "needs_research": decision.needs_research,
        "needs_rag":      decision.needs_rag,
        "queries":        decision.queries,
        "rag_queries":    decision.rag_queries[:4],
    }

    logger.info(
        f"[router] ✓ done — mode={decision.mode} | "
        f"needs_research={decision.needs_research} | needs_rag={decision.needs_rag} | "
        f"web_queries={len(result['queries'])} | rag_queries={len(result['rag_queries'])}"
    )
    return result


def research_node(state: State) -> dict:
    queries = (state.get("queries", []) or [])
    max_results = 6

    raw_results: List[dict] = []

    for q in queries:
        raw_results.extend(_tavily_search(q, max_results=max_results))

    if not raw_results:
        return {"evidence": []}
    llm      = get_chat_llm()
    extractor = llm.with_structured_output(EvidencePack)
    pack = extractor.invoke(
        [
            SystemMessage(content=RESEARCH_SYSTEM),
            HumanMessage(content=f"Raw results:\n{raw_results}"),
        ]
    )

    # Deduplicate by URL
    dedup = {}
    for e in pack.evidence:
        if e.url:
            dedup[e.url] = e
    logger.info(f"[research] ✓ done — {len(dedup)} unique evidence items retained")
    return {"evidence": list(dedup.values())}


def rag_node(state: State) -> dict:
    raw_input   = _clean_text(state.get("raw_input", ""))
    rag_queries = (state.get("rag_queries") or [])[:3]

    if not raw_input or not rag_queries:
        logger.info("[rag] ✓ skipped — no raw_input or rag_queries")
        return {"chunks": []}

    logger.info("[rag] ▶ starting — chunking input text ...")
    splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=100)
    docs     = splitter.create_documents([raw_input])
    logger.info(f"[rag]   {len(docs)} chunks created")

    logger.info("[rag]   building FAISS vectorstore (local embeddings — no API call) ...")
    vectorstore = FAISS.from_documents(docs, get_embedding_model())
    logger.info("[rag]   vectorstore ready")

    seen: set        = set()
    retrieved: List[SourceChunk] = []

    for i, query in enumerate(rag_queries, 1):
        logger.info(f"[rag]   similarity search ({i}/{len(rag_queries)}): '{query}'")
        for doc in vectorstore.similarity_search(query, k=4):
            text = doc.page_content.strip()
            if text not in seen:
                seen.add(text)
                retrieved.append(SourceChunk(
                    text=text,
                    source=doc.metadata.get("source", "raw_input"),
                    page=doc.metadata.get("page"),
                ))

    logger.info(f"[rag] ✓ done — {len(retrieved)} unique chunks retrieved")
    return {"chunks": retrieved}


def orchestrator_node(state: State) -> dict:
    logger.info("[orchestrator] ▶ starting — generating notes plan ...")

    llm     = get_chat_llm()
    planner = llm.with_structured_output(NotesPlan)

    evidence = state.get("evidence", [])
    chunks = state.get("chunks", [])
    mode = state.get("mode", "closed_book")

    plan = planner.invoke(
        [
            SystemMessage(content=ORCH_SYSTEM),
            HumanMessage(
                content=(
                    f"Topic: {state['topic']}\n"
                    f"Mode: {mode}\n\n"
                    f"Retrieved chunks (primary source; may be empty):\n"
                    f"{[c.model_dump() for c in chunks][:20]}\n\n"
                    f"Web evidence (gap-filling only; may be empty):\n"
                    f"{[e.model_dump() for e in evidence][:12]}"
                )
            ),
        ]
    )

    logger.info(
        f"[orchestrator] ✓ done — plan '{plan.title}' | "
        f"{len(plan.sections)} sections | waiting 15s before workers ..."
    )
    time.sleep(15)   # breathing room: 4 RPM = 1 call per 15s
    return {"plan": plan}


def worker_node(state: State) -> dict:
    sections  = state["plan"].sections
    chunks    = state.get("chunks", [])
    evidence  = state.get("evidence", [])
    total     = len(sections)

    logger.info(f"[worker] ▶ starting — writing {total} sections sequentially ...")

    sections_out = []

    for i, section in enumerate(sections, 1):
        logger.info(f"[worker]   section ({i}/{total}): '{section.title}' ...")

        bullets_text = "\n- " + "\n- ".join(section.bullets)

        chunk_text = ""
        if chunks and section.requires_rag:
            chunk_text = "\n".join(
                f"- [{c.source}{f', p.{c.page}' if c.page else ''}]: {c.text}"
                for c in chunks[:12]
            )

        evidence_text = ""
        if evidence and section.requires_research:
            evidence_text = "\n".join(
                f"- {e.title} | {e.url}" for e in evidence[:12]
            )

        llm = get_chat_llm()
        section_md = llm.invoke([
            SystemMessage(content=WORKER_SYSTEM),
            HumanMessage(content=(
                f"Document title: {state['plan'].title}\n"
                f"Subject: {state['plan'].subject}\n"
                f"Audience: {state['plan'].audience}\n"
                f"Topic: {state['topic']}\n"
                f"Mode: {state['mode']}\n\n"
                f"Section title: {section.title}\n"
                f"Goal: {section.goal}\n"
                f"Target words: {section.target_words}\n"
                f"requires_rag: {section.requires_rag}\n"
                f"requires_research: {section.requires_research}\n"
                f"Bullets:{bullets_text}\n\n"
                f"Source chunks:\n{chunk_text}\n\n"
                f"Web evidence:\n{evidence_text}\n"
            )),
        ]).content.strip()

        sections_out.append((section.id, section_md))
        logger.info(f"[worker]   section ({i}/{total}) ✓ — {len(section_md.split())} words written")

    logger.info(f"[worker] ✓ done — all {total} sections complete")
    return {"sections": sections_out}


def reducer_node(state: State) -> dict:
    logger.info("[reducer] ▶ merging sections ...")
    plan    = state["plan"]
    ordered = [md for _, md in sorted(state["sections"], key=lambda x: x[0])]
    body    = "\n\n".join(ordered).strip()
    final_md = f"# {plan.title}\n\n{body}\n"
    logger.info(f"[reducer] ✓ done — final doc {len(final_md.split())} words")
    return {"final": final_md}


# ── Routing conditions ─────────────────────────────────────────────────────────

def route_after_router(state: State) -> str:
    if state["needs_research"]:
        return "research"
    if state["needs_rag"]:
        return "rag"
    return "orchestrator"


def route_after_research(state: State) -> str:
    return "rag" if state["needs_rag"] else "orchestrator"
