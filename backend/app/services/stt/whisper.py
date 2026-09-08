"""faster-whisper adapter — implement when local STT is available."""


class WhisperSttProvider:
    def transcribe(self, audio: bytes) -> str:
        raise NotImplementedError("Whisper STT provider is not implemented yet")
