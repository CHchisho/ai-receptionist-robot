
import av
import csv
import json
import time
import threading
import psutil

from vosk import Model, KaldiRecognizer, SetLogLevel
from jiwer import wer

MODEL_PATH = "vosk-model-small-en-us-0.15"
AUDIO_FILE = "TK1.m4a"

REFERENCE = (
    "Hello, welcome to Nokia Innovation Garage. "
    "How can I help you today?"
)

SetLogLevel(-1)
process = psutil.Process()

# Convert M4A audio to 16 kHz mono PCM in memory
print("Preparing audio...")

container = av.open(AUDIO_FILE)
resampler = av.audio.resampler.AudioResampler(
    format="s16",
    layout="mono",
    rate=16000
)

audio_chunks = []

for frame in container.decode(audio=0):
    for converted in resampler.resample(frame):
        audio_chunks.append(
            converted.to_ndarray().tobytes()
        )

for converted in resampler.resample(None):
    audio_chunks.append(
        converted.to_ndarray().tobytes()
    )

container.close()
audio_data = b"".join(audio_chunks)

print("Loading Vosk model...")
load_start = time.perf_counter()

model = Model(MODEL_PATH)

loading_time = time.perf_counter() - load_start
print(f"Model loaded in {loading_time:.2f} s")

recognizer = KaldiRecognizer(model, 16000)

samples = []
stop_event = threading.Event()

def monitor():
    process.cpu_percent(interval=None)

    while not stop_event.wait(0.05):
        samples.append((
            process.cpu_percent(interval=None),
            process.memory_info().rss / (1024 ** 2)
        ))

monitor_thread = threading.Thread(target=monitor)

print("Starting transcription...")
start = time.perf_counter()
monitor_thread.start()

parts = []

try:
    for i in range(0, len(audio_data), 8000):
        chunk = audio_data[i:i + 8000]

        if recognizer.AcceptWaveform(chunk):
            result = json.loads(recognizer.Result())
            parts.append(result.get("text", ""))

    final_result = json.loads(recognizer.FinalResult())
    parts.append(final_result.get("text", ""))

finally:
    stop_event.set()
    monitor_thread.join()

processing_time = time.perf_counter() - start
transcription = " ".join(parts).strip()

error_rate = wer(
    REFERENCE.lower(),
    transcription.lower()
) * 100

peak_ram = max(
    [process.memory_info().rss / (1024 ** 2)]
    + [x[1] for x in samples]
)

max_cpu = max(
    (x[0] for x in samples),
    default=0
)

print("\n--- VOSK RESULTS ---")
print("Transcription:", transcription)
print(f"Loading time: {loading_time:.2f} s")
print(f"Processing time: {processing_time:.2f} s")
print(f"WER: {error_rate:.2f} %")
print(f"Peak RAM: {peak_ram:.2f} MB")
print(f"Max CPU: {max_cpu:.2f} %")

result = {
    "model": "vosk-small-en-us-0.15",
    "loading_time_s": round(loading_time, 2),
    "processing_time_s": round(processing_time, 2),
    "wer_percent": round(error_rate, 2),
    "peak_ram_mb": round(peak_ram, 2),
    "max_cpu_percent": round(max_cpu, 2),
    "transcription": transcription
}

with open(
    "vosk_results.csv",
    "w",
    newline="",
    encoding="utf-8-sig"
) as file:
    writer = csv.DictWriter(
        file,
        fieldnames=result.keys()
    )
    writer.writeheader()
    writer.writerow(result)

print("\nBenchmark completed!")
print("Results saved to vosk_results.csv")
