# StudyNotes — AI-Powered Study Notes Generator

> Deep work, simplified. Generate structured, comprehensive study notes from any topic or source material using a multi-agent LangGraph pipeline.

---

## What It Does

Paste a topic or upload a PDF/transcript — the AI researches, plans, and writes structured Markdown notes with citations, key concepts, examples, and practice questions. Notes are editable and downloadable from the browser.

---

## System Architecture

```
React (Vercel)
      │
      │  REST + cookies
      ▼
Express + MongoDB (Render)
      │
      │  POST /generate (fire & forget)
      ▼
FastAPI Agent (Render / EC2)
      │
      ▼
  LangGraph Pipeline
  ┌─────────────────────────────────┐
  │  router → research? → rag?      │
  │       → orchestrator            │
  │       → workers (sequential)    │
  │       → reducer                 │
  └─────────────────────────────────┘
      │
      ▼
  Final Markdown → MongoDB → React
```

### Agent Pipeline

```
POST /generate
      │
      ▼
  router_node          ← 1 Gemini call — decides mode + queries
      │
      ├── research_node  ← 1 Gemini call — Tavily web search + synthesis
      │
      ├── rag_node       ← 0 Gemini calls — sentence-transformers + FAISS
      │
      ▼
  orchestrator_node    ← 1 Gemini call — produces structured plan
      │
      ▼
  worker_node          ← 4 Gemini calls — writes each section sequentially
      │
      ▼
  reducer_node         ← 0 LLM calls — merges markdown
```

### Routing Modes

| Mode | Condition | LLM Calls |
|---|---|---|
| `closed_book` | No source text, evergreen topic | 6 |
| `rag_only` | Source text provided, self-contained | 6 |
| `open_book` | No source text, needs web research | 7 |
| `hybrid` | Source text + web research needed | 7 |

---

## Project Structure

```
studynotes/
│
├── frontend/                        # React — deploy on Vercel
│   ├── src/
│   │   ├── api/index.js             # All axios calls (auth + notes)
│   │   ├── context/AuthContext.jsx  # Global user/session state
│   │   ├── hooks/
│   │   │   ├── useAuth.js           # Auth helpers
│   │   │   └── usePollJob.js        # Polls job status every 3s
│   │   ├── components/
│   │   │   ├── AuthForm.jsx         # Reusable login/signup form
│   │   │   ├── Sidebar.jsx          # Nav + logout
│   │   │   ├── UploadForm.jsx       # Topic input + file upload
│   │   │   ├── NoteViewer.jsx       # Markdown renderer + inline editor
│   │   │   ├── JobCard.jsx          # Single job row in history
│   │   │   └── ProtectedRoute.jsx   # Redirects unauthenticated users
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Dashboard.jsx        # Layout shell with sidebar
│   │   │   ├── NewNote.jsx          # Generate new notes
│   │   │   ├── History.jsx          # All past jobs
│   │   │   └── Result.jsx           # View + edit a single note
│   │   ├── App.jsx                  # Routes
│   │   └── main.jsx
│   ├── .env
│   └── package.json
│
├── backend/                         # Express — deploy on Render
│   ├── src/
│   │   ├── config/db.js             # Mongoose connect
│   │   ├── models/
│   │   │   ├── User.js              # { username, email, hashedPassword }
│   │   │   ├── NoteJob.js           # { userId, topic, status, finalMd, ... }
│   │   │   └── blacklist.model.js   # JWT blacklist for logout
│   │   ├── middleware/
│   │   │   └── auth.middleware.js   # JWT verify via cookie → req.user
│   │   ├── controllers/
│   │   │   ├── auth.controller.js   # register, login, getMe, logout
│   │   │   └── notes.controller.js  # run, runWithFile, get, list, update, download, remove
│   │   ├── routes/
│   │   │   ├── auth.route.js
│   │   │   └── notes.route.js
│   │   ├── services/
│   │   │   └── agentService.js      # Calls Python agent, updates MongoDB
│   │   └── app.js
│   ├── server.js
│   ├── .env
│   └── package.json
│
└── agent/                           # FastAPI — deploy on Render / EC2
    ├── main.py                      # Uvicorn entry, warms up embeddings
    ├── api/server.py                # FastAPI app, /generate, /state, /health
    ├── agent/
    │   ├── models.py                # Pydantic schemas + LangGraph State
    │   ├── llm.py                   # Gemini key rotation, rate limiter, embeddings
    │   ├── nodes.py                 # All nodes, prompts, routing logic
    │   └── graph.py                 # Graph wiring, SQLite checkpointer, run()
    ├── .env
    └── requirements.txt
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB Atlas account (free tier)
- Gemini API keys — [aistudio.google.com](https://aistudio.google.com)
- Tavily API key — [tavily.com](https://tavily.com)

---

### 1. Agent (FastAPI)

```bash
cd agent
pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env`:
```env
GEMINI_KEYS=key1,key2,key3,key4
GEMINI_MODEL=gemini-2.5-flash-lite
EMBED_MODEL=all-MiniLM-L6-v2
TAVILY_API_KEY=your_tavily_key
CHECKPOINT_DB=checkpoints.db
```

Start:
```bash
# Mac / Linux
export GEMINI_KEYS="key1,key2,key3"
export TAVILY_API_KEY="your_key"
uvicorn main:app --reload --port 8000

# Windows PowerShell
$env:GEMINI_KEYS="key1,key2,key3"
$env:TAVILY_API_KEY="your_key"
python -m uvicorn main:app --reload --port 8000
```

Verify:
```
http://127.0.0.1:8000/health   → { "status": "ok" }
http://127.0.0.1:8000/docs     → Swagger UI
```

---

### 2. Backend (Express)

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:
```env
PORT=3000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/studynotes
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
AGENT_URL=http://localhost:8000
MOCK_AGENT=true          # set false when agent is running
```

Start:
```bash
npm run dev
```

---

### 3. Frontend (React)

```bash
cd frontend
npm install
cp .env.example .env
```

Fill in `.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

Start:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## API Reference

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{ username, email, password }` | Register new user |
| POST | `/api/auth/login` | `{ email, password }` | Login, sets cookie |
| GET | `/api/auth/me` | — | Get current user |
| POST | `/api/auth/logout` | — | Clears cookie |

### Notes

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/notes` | `{ topic }` | Generate notes (no file) |
| POST | `/api/notes/upload` | `form-data: topic + file` | Generate notes from PDF/TXT |
| GET | `/api/notes` | — | List all jobs (no finalMd) |
| GET | `/api/notes/:id` | — | Get single job + poll status |
| PATCH | `/api/notes/:id` | `{ finalMd }` | Save edited notes |
| GET | `/api/notes/:id/download` | — | Download as `.md` file |
| DELETE | `/api/notes/:id` | — | Delete job |

### Agent

| Method | Endpoint | Description |
|---|---|---|
| POST | `/generate` | Run the LangGraph pipeline |
| GET | `/state/{topic}` | Inspect checkpoint state |
| GET | `/health` | Health check |

---

## Data Flow

```
1. User submits topic (+ optional file)
         ↓
2. Express creates job { status: "pending" } in MongoDB
         ↓
3. Express returns { jobId } immediately
         ↓
4. agentService.triggerAgent() fires POST /generate (no await)
         ↓
5. React polls GET /notes/:id every 3s
         ↓
6. Agent runs (3–5 min at 4 RPM), updates MongoDB on finish
         ↓
7. Poll returns { status: "done", finalMd: "..." }
         ↓
8. NoteViewer renders markdown — editable inline, downloadable
```

---

## Rate Limits & Performance

The agent is designed around the Gemini free tier (4 RPM, ~20 calls/day):

- Hard 4 RPM cap built into `llm.py` — no 429 errors
- Max 7 LLM calls per full run
- Workers run **sequentially** (not parallel) to stay within limits
- SQLite checkpointing — if a run is interrupted, `resume: true` skips completed nodes
- Full run time: **3–5 minutes** — logged clearly in the agent console

```
10:42:01  [router] ▶ starting ...
10:42:03  [router] ✓ done — mode=closed_book
10:42:03  [orchestrator] ▶ starting ...
10:42:18  [rate-limiter] RPM cap (4/min) reached — waiting 12.3s ...
10:42:30  [worker] section (1/4): 'Introduction' ...
```

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Set `VITE_API_URL` to Render backend URL |
| Backend | Render (Web Service) | Set all env vars, Node 18 |
| Agent | Render (Web Service) or EC2 | Set `AGENT_URL` in backend env |
| Database | MongoDB Atlas | Free M0 tier sufficient |

Set `MOCK_AGENT=false` in backend `.env` when the agent service is live.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React, Vite, Tailwind CSS v4, Axios |
| Backend | Node.js, Express, Mongoose, JWT, Multer |
| Database | MongoDB Atlas |
| Agent | Python, FastAPI, LangGraph, LangChain |
| LLM | Google Gemini 2.5 Flash Lite |
| Embeddings | Sentence Transformers (all-MiniLM-L6-v2) |
| Vector Store | FAISS (in-memory) |
| Web Search | Tavily |
| Checkpointing | SQLite |

---

## Environment Variables Summary

### backend/.env
```env
PORT=3000
MONGO_URI=
JWT_SECRET=
FRONTEND_URL=
AGENT_URL=
MOCK_AGENT=true
```

### agent/.env
```env
GEMINI_KEYS=
GEMINI_MODEL=gemini-2.5-flash-lite
EMBED_MODEL=all-MiniLM-L6-v2
TAVILY_API_KEY=
CHECKPOINT_DB=checkpoints.db
```

### frontend/.env
```env
VITE_API_URL=
```