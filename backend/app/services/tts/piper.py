"""Piper adapter — implement when local TTS is available."""


class PiperTtsProvider:
    def synthesize(self, text: str) -> bytes:
        raise NotImplementedError("Piper TTS provider is not implemented yet")
