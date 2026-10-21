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

# Chatterbox pins torch==2.6.0, and PyPI serves the CUDA wheel. The server has no GPU,
# so replace that wheel with the CPU build after the package install.
RUN pip install --no-cache-dir -e ".[chatterbox]" \
    && pip install --no-cache-dir --force-reinstall --index-url https://download.pytorch.org/whl/cpu \
        torch==2.6.0 torchaudio==2.6.0

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "/app/app"]
