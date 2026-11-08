import argparse
import csv
import json
import multiprocessing as mp
import os
import queue
import re
import statistics
import threading
import time
from pathlib import Path

MODELS = ['tiny', 'base', 'small', 'vosk-small']
FIELDS = ['model','file','language','reference','transcription','wer','processing_seconds','loading_seconds','peak_rss_mb','peak_cpu_percent','error']


def normalize(text):
    # Consistent case and punctuation handling. Retains Unicode letters for Finnish.
    return ' '.join(re.findall(r'[^\W_]+', text.casefold(), flags=re.UNICODE))


def run_one(model_name, audio_path, language, result_queue, vosk_path):
    import psutil
    from jiwer import wer
    proc = psutil.Process(os.getpid())
    stop = threading.Event()
    readings = []
    proc.cpu_percent(None)
    def watch():
        while not stop.wait(0.05):
            try:
                readings.append((proc.memory_info().rss / 1048576, proc.cpu_percent(None)))
            except psutil.Error:
                break
    watcher = threading.Thread(target=watch, daemon=True)
    result = {'transcription':'', 'loading_seconds':0.0, 'processing_seconds':0.0, 'peak_rss_mb':0.0, 'peak_cpu_percent':0.0, 'error':''}
    watcher.start()
    try:
        t = time.perf_counter()
        if model_name == 'vosk-small':
            import av
            from vosk import Model, KaldiRecognizer, SetLogLevel
            SetLogLevel(-1)
            model = Model(str(vosk_path))
            result['loading_seconds'] = time.perf_counter() - t
            t = time.perf_counter()
            # Include audio decoding/resampling in the processing time.
            recognizer = KaldiRecognizer(model, 16000)
            parts = []
            with av.open(str(audio_path)) as container:
                resampler = av.audio.resampler.AudioResampler(format='s16', layout='mono', rate=16000)
                def push(data):
                    for pos in range(0, len(data), 8000):
                        if recognizer.AcceptWaveform(data[pos:pos+8000]):
                            parts.append(json.loads(recognizer.Result()).get('text',''))
                for frame in container.decode(audio=0):
                    for converted in resampler.resample(frame):
                        push(converted.to_ndarray().tobytes())
                for converted in resampler.resample(None):
                    push(converted.to_ndarray().tobytes())
            parts.append(json.loads(recognizer.FinalResult()).get('text',''))
            result['transcription'] = ' '.join(p for p in parts if p).strip()
        else:
            from faster_whisper import WhisperModel
            model = WhisperModel(model_name, device='cpu', compute_type='int8')
            result['loading_seconds'] = time.perf_counter() - t
            t = time.perf_counter()
            segments, info = model.transcribe(str(audio_path), language=language, beam_size=1)
            result['transcription'] = ' '.join(seg.text.strip() for seg in segments).strip()
        result['processing_seconds'] = time.perf_counter() - t
    except Exception as exc:
        result['error'] = f'{type(exc).__name__}: {exc}'
    finally:
        stop.set()
        watcher.join()
        readings.append((proc.memory_info().rss / 1048576, proc.cpu_percent(None)))
        result['peak_rss_mb'] = max(v[0] for v in readings)
        result['peak_cpu_percent'] = max(v[1] for v in readings)
        result_queue.put(result)


def main():
    parser = argparse.ArgumentParser(description='Local STT benchmark, Windows CPU')
    parser.add_argument('--dataset', default='samples.csv')
    parser.add_argument('--models', nargs='+', choices=MODELS, default=MODELS)
    parser.add_argument('--vosk-path', default='vosk-model-small-en-us-0.15')
    parser.add_argument('--output', default='stt_results_all.csv')
    args = parser.parse_args()
    from jiwer import wer
    dataset = Path(args.dataset).resolve()
    vosk_path = Path(args.vosk_path).resolve()
    with dataset.open(encoding='utf-8-sig', newline='') as f:
        samples = list(csv.DictReader(f))
    if not samples:
        raise SystemExit('Dataset is empty')
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    # Append each row immediately so an interrupted run retains completed results.
    with output.open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for model in args.models:
            for item in samples:
                filename = item['file'].strip()
                language = (item.get('language') or 'en').strip().lower()
                reference = item['reference'].strip()
                audio = (dataset.parent / filename).resolve()
                row = dict(model=model, file=filename, language=language, reference=reference, transcription='', wer='', processing_seconds='', loading_seconds='', peak_rss_mb='', peak_cpu_percent='', error='')
                if not audio.is_file():
                    row['error'] = f'Audio file not found: {audio}'
                elif model == 'vosk-small' and language != 'en':
                    row['error'] = 'Skipped: this Vosk model supports English only'
                elif model == 'vosk-small' and not vosk_path.is_dir():
                    row['error'] = f'Vosk model directory not found: {vosk_path}'
                else:
                    print(f'Testing {model} / {filename}', flush=True)
                    q = mp.Queue()
                    p = mp.Process(target=run_one, args=(model, audio, language, q, vosk_path))
                    p.start()
                    p.join()
                    try:
                        measurement = q.get(timeout=3)
                        row.update(measurement)
                        if not row['error']:
                            row['wer'] = round(wer(normalize(reference), normalize(row['transcription'])) * 100, 2)
                            for key in ('processing_seconds','loading_seconds','peak_rss_mb','peak_cpu_percent'):
                                row[key] = round(row[key], 2)
                    except queue.Empty:
                        row['error'] = f'Worker exited without results (exit code {p.exitcode})'
                    q.close()
                writer.writerow(row)
                f.flush()
                print(f"  WER={row['wer']} Time={row['processing_seconds']} Error={row['error']}", flush=True)
    # Weighted corpus WER, not mean of per-file percentages.
    with output.open(encoding='utf-8-sig', newline='') as f:
        rows = list(csv.DictReader(f))
    summary = output.with_name('stt_summary.csv')
    with summary.open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['model','successful_files','corpus_wer_percent','mean_processing_seconds','max_peak_rss_mb','max_peak_cpu_percent'])
        w.writeheader()
        for model in args.models:
            good = [r for r in rows if r['model'] == model and not r['error']]
            if not good:
                continue
            w.writerow(dict(model=model, successful_files=len(good), corpus_wer_percent=round(wer([normalize(r['reference']) for r in good], [normalize(r['transcription']) for r in good])*100,2), mean_processing_seconds=round(statistics.mean(float(r['processing_seconds']) for r in good),2), max_peak_rss_mb=round(max(float(r['peak_rss_mb']) for r in good),2), max_peak_cpu_percent=round(max(float(r['peak_cpu_percent']) for r in good),2)))
    print(f'Completed: {output.name} and {summary.name}')

if __name__ == '__main__':
    mp.freeze_support()
    main()
