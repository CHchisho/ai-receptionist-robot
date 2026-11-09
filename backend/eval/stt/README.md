# STT model evaluation

One-off comparison of Whisper (tiny, base, small) and Vosk small on four English phrases (`samples.csv`). Metrics are word error rate, processing time, peak RSS and peak CPU.

| File | Contents |
| --- | --- |
| `samples.csv` | Audio file, language, reference text |
| `stt_summary.csv` | Corpus WER and resource use per model |
| `stt_results_all.csv` | Per-file transcription, WER and timings |

Numbers come from commit `d921bd3` on `feature/stt-model-evaluation` (2026-11-08, CPU). The benchmark scripts stay in that commit; this branch only keeps the result tables.
