/** Split a reply into speakable pieces. A piece stays whole, including its closing punctuation. */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const pieces = trimmed
    .split(/\n+/)
    .flatMap((block) => block.split(/(?<=[.!?])\s+/))
    .map((piece) => piece.trim())
    .filter(Boolean);

  return pieces.length > 0 ? pieces : [trimmed];
}
