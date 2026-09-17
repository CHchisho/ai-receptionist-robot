# AI Receptionist (Lena)

Tablet web app and local backend for the Nokia Espoo Innovation Garage receptionist.

## Quick start (Docker)

This is the supported way to run the full voice pipeline on any machine:
speech → Whisper STT → Qdrant retrieval → Ollama LLM → Piper TTS → on-screen text + audio.

```powershell
copy .env.example .env
docker compose up --build
```

Open http://localhost:5173

API docs: http://localhost:8000/api/docs

The first start downloads models into Docker volumes (Ollama LLM, embedding model, Whisper, Piper).
That can take several minutes depending on the network. Later starts reuse the cache.

On startup the backend indexes files in `knowledge/documents` into Qdrant. Add or remove sources in http://localhost:5173/admin.

Hot reload: backend (`uvicorn --reload`) and frontend (Vite) watch bind-mounted source.
On Windows, polling is enabled so edits are picked up inside Docker Desktop.

### Settings

All configuration lives in the project-root `.env` (see `.env.example`). Docker Compose, the FastAPI backend, and Vite read that file. Compose only overrides hostnames and model paths that differ inside containers (`OLLAMA_BASE_URL`, `QDRANT_URL`, `PIPER_MODEL_PATH`, Vite proxy target).

## Local start without Docker

Use the same project-root `.env`. Two terminals if you are iterating on a single service without Compose.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/api/docs

Set `LLM_PROVIDER=ollama` and install [Ollama](https://ollama.com) locally. On API start the backend waits for Ollama and pulls `OLLAMA_MODEL` if needed.

#### STT_PROVIDER=whisper (faster-whisper)

`STT_PROVIDER=mock` needs nothing extra. For real transcription install `ffmpeg` on `PATH`, then set `STT_PROVIDER=whisper`. The model downloads from Hugging Face on first load.

#### TTS_PROVIDER=piper

`TTS_PROVIDER=mock` needs nothing extra. For real speech set `TTS_PROVIDER=piper` and `PIPER_MODEL_PATH`. Missing `.onnx` / `.onnx.json` files are downloaded on startup (`en_US-lessac-medium` from the path file name).

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

Staff: http://localhost:5173/admin — knowledge sources (add/remove file or URL, reindex, view chunks), chat history, and visitor feedback. App SQLite: `knowledge/app.sqlite`.

Vite proxies `/api` to the backend (`VITE_API_PROXY_TARGET`, default `http://localhost:8000`).

## Layout

```
backend/app/
  api/v1/          HTTP routes
  core/            settings, composition, startup bootstrap
  schemas/         request/response models
  services/        conversation orchestration
    llm/           base + mock + Ollama (`LLM_PROVIDER=ollama`)
    rag/           base + mock + Qdrant (`RAG_PROVIDER=qdrant`)
    stt/           base + mock + faster-whisper (`STT_PROVIDER=whisper`)
    tts/           base + mock + Piper (`TTS_PROVIDER=piper`)
    navigation/    structured indoor directions (later)
```

Each provider folder is the same swap pattern:

- `base.py` — interface (`Protocol`) that `ConversationService` calls
- `mock.py` — empty/stub implementation
- `piper.py` / `ollama.py` / … — real adapter, selected via `.env`

```
frontend/src/
  app/             router
  pages/           reception (/) and admin (/admin)
  features/
    conversation/  chat UI and ask API
    knowledge/     admin source CRUD
    history/       admin chat traces
    voice/         microphone capture, STT upload client, TTS playback
  shared/          HTTP client, config, types
```

**Workflow:**

`ReceptionPage` → `POST /api/v1/conversation/ask` `{ text }`
→ `ConversationService.ask`
→ Qdrant (or mock RAG) → Ollama (or mock LLM) → Piper (or mock TTS)
→ JSON `{ answer, audio_base64, sources, links }` → chat UI, which auto-plays `audio_base64` via `ttsClient.playAudio` so the visitor hears the reply immediately

`links` are approved URLs from retrieved sources (for QR). `sources` are the text chunks used as context.

**Voice input workflow:**

`RecordButton` → `useMicrophone` captures audio via `MediaRecorder`
→ `POST /api/v1/conversation/transcribe` (multipart file upload)
→ Whisper (or mock STT) → `{ text }`
→ recognised text is passed into the same `ask()` flow as typed input
