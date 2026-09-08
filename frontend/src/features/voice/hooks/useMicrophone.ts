/**
 * Browser microphone capture. Wire MediaRecorder output to STT later.
 */
export function useMicrophone() {
  return {
    isSupported: typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
    start: async () => {
      throw new Error("Voice capture is not implemented yet");
    },
    stop: () => undefined,
  };
}
