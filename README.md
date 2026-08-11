# FitTrack

An adaptive fitness tracker: the program is computed from a detailed intake
plus every logged session, not pulled from a fixed template.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS (design tokens in `tailwind.config.ts`)
- Firebase Auth + Firestore (`lib/firebase.ts`)

## Setup

1. `npm install`
2. Create a Firebase project, enable Email/Password auth and Firestore.
3. Copy `.env.local.example` to `.env.local` and fill in your Firebase config.
4. Deploy `firestore.rules` (`firebase deploy --only firestore:rules`).
5. `npm run dev`

## Where the product logic actually lives

Everything that makes this different from a static workout template is in
`lib/`, deliberately separated from UI so it's independently testable:

- **`lib/programGenerator.ts`** — the core engine. `generateInitialProgram()`
  builds the first session from the intake profile (goals, equipment,
  experience, injuries). `computeNextPrescription()` is the Dynamic
  Progressive Overload Engine: it reads the previous session's reported RPE
  (or Beginner-mode effort rating) and whether prescribed reps were
  completed, then adjusts the next session's load up, down, or holds —
  never randomly. `detectDeload()` watches for volume plateaus, high
  sustained RPE, poor recovery scores, or a >25% week-over-week volume
  spike, and auto-inserts a lighter week.
- **`lib/exercises.ts`** — the exercise database and the Equipment Swap
  Engine (`swapExercise()`). Exercises are grouped by `swapGroup` (same
  movement pattern + primary muscle), so a swap never breaks the overload
  math, it just substitutes what's actually available.
- **`lib/voiceParser.ts`** — Voice-to-Log. Runs on the native browser
  `SpeechRecognition` API, so there's no per-request API cost. Parses two
  patterns: logging a set ("bench press 60 for 8") and logging a meal
  ("logged 2 eggs and toast").
- **`lib/microGoals.ts`** — Adaptive Habit Micro-Goals. Looks at the time-of-day
  pattern in a user's actual session history to anchor a tiny suggested habit
  to a real behavior, and only scales the goal up once a streak proves it's
  stuck (never before).
- **`lib/groq.ts`** — the AI Coach, backed by Groq (`openai/gpt-oss-120b`).
  Builds the initial program (`generateProgramWithGroq`), reshapes it from
  post-workout feedback (`adjustProgramWithGroq`), and — right before a
  session starts — generates a short briefing (`getSessionBriefingWithGroq`):
  form cues for today's exercises, what to expect based on the athlete's
  recent logged performance, and what normal post-session soreness should
  feel like. Every Groq call has a deterministic local fallback
  (`localSessionBriefing`, the overload engine, etc.) so the app still works
  end-to-end if `GROQ_API_KEY` is unset or the request fails.
- **`lib/formFeedback.ts`** — intentionally a stub. See "Roadmap" below.

## Data model

See `lib/types.ts` for the full shape. Firestore layout:

```
users/{uid}                          UserProfile
users/{uid}/sessions/{sessionId}     WorkoutSession
users/{uid}/microGoals/{goalId}      MicroGoal
users/{uid}/programState/current     ProgramState (single doc, engine output)
```

## Roadmap / what's intentionally not finished

- **AI Form Feedback (camera)** — `lib/formFeedback.ts` defines the contract
  the UI already expects. Wiring in real pose estimation (TensorFlow.js
  MoveNet/BlazePose client-side, or a hosted pose API) is a substantial
  follow-on integration — model loading, per-movement joint-angle math, and
  a camera-angle calibration step. Shipping it as fake analysis now would
  misrepresent the product, so it's flagged as Phase 2 in the UI instead.
- **Stripe Checkout** — the pricing page, upgrade CTAs, and the
  `subscriptionTier` field on `UserProfile` are in place. The actual
  Checkout Session links are placeholders (`app/pricing/page.tsx`) per your
  instruction — swap those for real links or an API route once ready.
- **RPE is currently stored per-session, not per-set** — the type
  (`SetLog.rpe`) already supports per-set granularity; the logging UI
  currently applies one effort rating to the whole session for simplicity.
  Worth revisiting once you're validating the overload logic with real
  users.
