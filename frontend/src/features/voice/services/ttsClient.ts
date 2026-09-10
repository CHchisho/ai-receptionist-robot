/** Decode base64 PCM/WAV audio from the ask response and play it in the browser. */
export async function playAudio(audioBase64: string): Promise<void> {
  const binary = atob(audioBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  try {
    await audio.play();
  } finally {
    audio.addEventListener("ended", () => URL.revokeObjectURL(url));
  }
}
