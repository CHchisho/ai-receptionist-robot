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

#### STT_PROVIDER=whisper (faster-whisper)

`STT_PROVIDER=mock` (default) needs nothing extra. To use real transcription:

1. Install `ffmpeg` and make sure it's on `PATH` (used to decode uploaded audio):
   - Windows: `choco install ffmpeg` (or download from ffmpeg.org and add `bin/` to `PATH`)
   - macOS: `brew install ffmpeg`
   - Linux: `apt install ffmpeg`
2. Set `STT_PROVIDER=whisper` in `.env`. The `faster-whisper` model (size from
   `WHISPER_MODEL_SIZE`, default `base`) downloads automatically from Hugging Face
   the first time it's used and is cached locally — no manual model file needed.

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
    stt/           base + mock + faster-whisper (STT_PROVIDER=whisper)
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
    voice/         microphone capture, STT upload client, TTS playback
  shared/          HTTP client, config, types
```

**Workflow:**

`ReceptionPage` → `POST /api/v1/conversation/ask` `{ text }`
→ `ConversationService.ask`
→ mock RAG (empty chunks) → mock LLM (`"AI answer"`) → mock TTS synthesizes audio for the answer
→ JSON `{ answer, audio_base64, sources }` → chat UI, which auto-plays `audio_base64` via `ttsClient.playAudio` so the visitor hears the reply immediately

**Voice input workflow:**

`RecordButton` → `useMicrophone` captures audio via `MediaRecorder`
→ `POST /api/v1/conversation/transcribe` (multipart file upload)
→ `MockSttProvider.transcribe` → `{ text }`
→ recognised text is passed into the same `ask()` flow as typed input
