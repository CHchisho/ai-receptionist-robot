FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/models/hf

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg espeak-ng curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml ./
COPY app ./app

# Install with CUDA-enabled PyTorch so Chatterbox and Whisper can use the GPU (RTX 2060).
# PyPI already serves CUDA wheels for torch 2.6.0 — no CPU override needed.
RUN pip install --no-cache-dir -e ".[chatterbox]"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app/app"]
