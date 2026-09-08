/** Send recorded audio to POST /api/v1/conversation/transcribe when STT exists. */
export async function transcribeAudio(_audio: Blob): Promise<string> {
  throw new Error("Speech-to-text client is not implemented yet");
}
