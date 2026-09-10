# AI Receptionist (Lena)

Tablet web app and local backend for the Nokia Espoo Innovation Garage receptionist.

## Quick start

Use two terminals.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/api/docs

#### TTS_PROVIDER=piper

`TTS_PROVIDER=mock` (default) needs nothing extra. To use real speech synthesis:

1. Download a voice (both files are required, matching names):
   ```
   python -m piper.download_voices en_US-lessac-medium
   ```
   This saves `en_US-lessac-medium.onnx` (model) and `en_US-lessac-medium.onnx.json`
   (config) into the current directory — see the [voice list](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/VOICES.md)
   for other languages/voices.
2. Set `TTS_PROVIDER=piper` and `PIPER_MODEL_PATH=/path/to/en_US-lessac-medium.onnx`
   in `.env` (the `.onnx.json` file must sit next to it with the same base name).

### Frontend

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Open http://localhost:5173

Staff settings: http://localhost:5173/admin

Vite proxies `/api` to the backend, so both processes must be running.

## Layout

```
backend/app/
  api/v1/          HTTP routes
  core/            settings and composition
  schemas/         request/response models
  services/        conversation orchestration
    llm/           base + mock now, Ollama later
    rag/           base + mock now, Qdrant later
    stt/           base + mock now, faster-whisper later
    tts/           base + mock + Piper (TTS_PROVIDER=piper)
    navigation/    structured indoor directions (later)
```

Each provider folder is the same swap pattern:

- `base.py` — interface (`Protocol`) that `ConversationService` calls
- `mock.py` — empty/stub implementation
- `piper.py` / `ollama.py` / … — real adapter; wired later via `.env` (`TTS_PROVIDER=piper`, etc.)

```
frontend/src/
  app/             router
  pages/           reception (/) and admin (/admin)
  features/
    conversation/  chat UI and ask API
    voice/         microphone / STT / TTS stubs
  shared/          HTTP client, config, types
```

**Workflow:**

`ReceptionPage` → `POST /api/v1/conversation/ask` `{ text }`
→ `ConversationService.ask`
→ mock RAG (empty chunks) → mock LLM (`"AI answer"`) → mock TTS synthesizes audio for the answer
→ JSON `{ answer, audio_base64, sources }` → chat UI, which auto-plays `audio_base64` via `ttsClient.playAudio` so the visitor hears the reply immediately
