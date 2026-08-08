// Effortless Logging: "Voice-to-Log / Quick Capture"
// Runs entirely in the browser via the native SpeechRecognition API — no
// server round-trip, no per-request cost, works hands-free between sets.

import { EXERCISES } from "./exercises";

export interface ParsedSetCapture {
  type: "set";
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
}

export interface ParsedMealCapture {
  type: "meal";
  items: string[];
}

export type ParsedCapture = ParsedSetCapture | ParsedMealCapture | { type: "unrecognized"; raw: string };

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function wordsToNumber(token: string): number | null {
  const lower = token.toLowerCase();
  if (NUMBER_WORDS[lower] != null) return NUMBER_WORDS[lower];
  const n = parseFloat(token);
  return Number.isNaN(n) ? null : n;
}

/**
 * Parses a spoken phrase into either a logged set or a logged meal.
 * Set pattern:  "<exercise> <weight> for <reps> reps"   e.g. "bench press 135 for 8 reps"
 * Meal pattern: "logged <items...>"                     e.g. "logged 2 eggs and toast"
 */
export function parseVoiceCapture(rawTranscript: string): ParsedCapture {
  const text = rawTranscript.trim().toLowerCase();

  if (text.startsWith("logged") || text.startsWith("log ") || text.startsWith("ate")) {
    const itemsText = text.replace(/^(logged|log|ate)\s*/, "");
    const items = itemsText
      .split(/,| and /)
      .map((i) => i.trim())
      .filter((i) => i.length > 0);
    if (items.length === 0) return { type: "unrecognized", raw: rawTranscript };
    return { type: "meal", items };
  }

  // Match "<exercise words> <number> for <number> reps"
  const setPattern = /^(.+?)\s+([\w.]+)\s+for\s+([\w]+)\s*(reps?)?$/;
  const match = text.match(setPattern);
  if (match) {
    const [, exercisePhrase, weightToken, repsToken] = match;
    const weightKg = wordsToNumber(weightToken);
    const reps = wordsToNumber(repsToken);
    // Require a more specific match: the spoken phrase must be at least half
    // the length of the exercise name, so "press" doesn't match every press
    // variation. Prefer the longest matching exercise name to avoid
    // substring collisions (e.g. "press" matching both bench and overhead).
    const candidates = EXERCISES.filter((e) => {
      const name = e.name.toLowerCase();
      if (!exercisePhrase.includes(name)) return false;
      // Spoken phrase must cover at least half the exercise name so a lone
      // "press" doesn't match every press variation.
      return exercisePhrase.length >= Math.ceil(name.length / 2);
    }).sort((a, b) => b.name.length - a.name.length);
    const exercise = candidates[0];

    if (exercise && weightKg != null && reps != null && weightKg > 0 && reps > 0) {
      return {
        type: "set",
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        weightKg,
        reps,
      };
    }
  }

  return { type: "unrecognized", raw: rawTranscript };
}

/** Thin wrapper around the browser SpeechRecognition API. Returns null if unsupported. */
export function startVoiceCapture(
  onResult: (transcript: string) => void,
  onError?: (err: string) => void
): { stop: () => void } | null {
  if (typeof window === "undefined") return null;
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError?.("Voice capture isn't supported in this browser.");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };
  recognition.onerror = (event: any) => onError?.(event.error);
  recognition.start();

  return { stop: () => recognition.stop() };
}
