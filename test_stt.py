
from faster_whisper import WhisperModel
from jiwer import wer
import psutil
import time
import csv
import threading
import re

# Test configuration
MODELS = ["small"]
AUDIO_FILE = "TK1.m4a"

REFERENCE = (
    "Hello, welcome to Nokia Innovation Garage. "
    "How can I help you today?"
)

process = psutil.Process()


def normalize_text(text):
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    return " ".join(text.split())


def benchmark(model_name):
    print(f"\nTesting Whisper {model_name}...")

    start_load = time.perf_counter()

    model = WhisperModel(
        model_name,
        device="cpu",
        compute_type="int8"
    )

    loading_time = time.perf_counter() - start_load

    # RAM after model loading (MB)
    ram_mb = process.memory_info().rss / (1024 ** 2)

    # Monitor resources during transcription
    samples = []
    stop_event = threading.Event()

    def monitor():
        process.cpu_percent(interval=None)

        while not stop_event.wait(0.1):
            cpu = process.cpu_percent(interval=None)
            ram = process.memory_info().rss / (1024 ** 2)
            samples.append((cpu, ram))

    monitor_thread = threading.Thread(target=monitor)

    start = time.perf_counter()
    monitor_thread.start()

    try:
        segments, info = model.transcribe(
            AUDIO_FILE,
            language="en",
            beam_size=1
        )

        transcription = " ".join(
            segment.text.strip() for segment in segments
        )
    finally:
        stop_event.set()
        monitor_thread.join()

    processing_time = time.perf_counter() - start

    error_rate = wer(
        normalize_text(REFERENCE),
        normalize_text(transcription)
    ) * 100

    max_cpu = max((x[0] for x in samples), default=0)
    peak_ram = max(
        [ram_mb] + [x[1] for x in samples]
    )

    result = {
        "model": model_name,
        "loading_time_s": round(loading_time, 2),
        "processing_time_s": round(processing_time, 2),
        "wer_percent": round(error_rate, 2),
        "peak_ram_mb": round(peak_ram, 2),
        "max_cpu_percent": round(max_cpu, 2),
        "transcription": transcription
    }

    print("Transcription:", transcription)
    print("Processing time:", result["processing_time_s"], "s")
    print("WER:", result["wer_percent"], "%")
    print("Peak RAM:", result["peak_ram_mb"], "MB")
    print("Max CPU:", result["max_cpu_percent"], "%")

    return result


results = []

for model_name in MODELS:
    results.append(benchmark(model_name))

with open("stt_results.csv", "w", newline="", encoding="utf-8-sig") as file:
    writer = csv.DictWriter(
        file,
        fieldnames=results[0].keys()
    )
    writer.writeheader()
    writer.writerows(results)

print("\nBenchmark completed!")
print("Results saved to stt_results.csv")
