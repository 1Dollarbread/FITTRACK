// AI Form Feedback — Phase 2 module.
//
// This is intentionally a stub. Real-time pose estimation (e.g. TensorFlow.js
// MoveNet/BlazePose running client-side, or a hosted pose API) is a
// substantial integration on its own — model loading, joint-angle math per
// movement, and a calibration step for camera angle. Wiring it in now with
// fake analysis would misrepresent what the product does.
//
// The contract below is what the UI (app/log/page.tsx) already expects, so
// swapping this stub for a real model is a drop-in change with no other
// file needing to move.

export interface FormFeedbackFrame {
  timestamp: number;
  cue: string; // e.g. "Knees tracking slightly inward"
  severity: "info" | "warning";
}

export interface FormFeedbackSession {
  exerciseId: string;
  frames: FormFeedbackFrame[];
}

/**
 * Placeholder entry point. Once a pose model is wired in, this should:
 *   1. Read frames from the passed video element
 *   2. Run pose estimation per frame
 *   3. Compute joint angles for the given exercise pattern (squat depth,
 *      knee valgus, back rounding on hinges, etc.)
 *   4. Emit FormFeedbackFrame cues in real time via the callback
 */
export function startFormAnalysis(
  _videoEl: HTMLVideoElement,
  _exerciseId: string,
  _onCue: (frame: FormFeedbackFrame) => void
): { stop: () => void } {
  // eslint-disable-next-line no-console
  console.info(
    "AI Form Feedback is not yet active — this is a Phase 2 feature. See lib/formFeedback.ts."
  );
  return { stop: () => {} };
}
