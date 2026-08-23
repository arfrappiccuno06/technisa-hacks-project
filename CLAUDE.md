# CLAUDE.md — Mizan

Read this before working in any folder.
## Response instructions

Response style

    Lead with the answer, in the question's own terms. Asked "what's different", name the difference. A line that grades the answer ("right about X, wrong about Y") buries the real one a level down.

    One line of narration per phase, not per tool call. Mid-turn commentary is written before you know the answer, so it's a guess the final answer replaces. The tool calls are already on screen.

    No adjective without its number. "Much faster" is a claim I can't check; "3.2x (16.7% vs 5.2%)" is shorter and I can. Every evaluative word carries its measurement or gets cut.

    State the point, don't frame it. Cut significance preambles ("the key insight is"), aphoristic codas, contrast pivots ("not X, it's Y"), and quote-then-explain. If the point is good it lands without the sticker.

    Draft the short version first, then ask what's missing that would change my decision. If nothing, send the short one. Trimming a long draft keeps the structure that made it long.


## What Mizan is

Mizan is a Chrome extension that detects AI bias. When a user sends a prompt to Gemini,
Mizan:

1. Detects **identity markers** in the prompt (names, gender words, religion, disability,
   age, nationality).
2. Builds a **counterfactual** copy where ONLY those markers change (e.g. `Fatima` →
   `Emily`, `she` → `he`) and every other word stays identical.
3. Runs both the original and the counterfactual through the **same Gemini model 5 times
   each**.
4. Uses an **AI judge** to compare each of the 5 answer pairs and decide whether they
   meaningfully differ (in numbers, ambition of advice, tone, warnings, options).
5. Computes a **flip rate** = differing pairs / 5. If the flip rate is **greater than the
   0.05 threshold**, the verdict is `bias_detected`.

The 5% threshold is the pre-registered flip-rate threshold from EQUITRIAGE (Young &
Matthews, 2026), a published fairness audit of AI medical triage: below it, differences
are plausibly random noise; above it, the identity marker itself is influencing the
output.

## Architecture

- The **extension runs on `https://gemini.google.com/*`** and calls the backend at
  **`http://localhost:3000/analyze`**.
- The **backend uses `gemini-3.5-flash-lite`**, a fast Gemini Flash model chosen for free-tier
  headroom. The newer Flash previews (`gemini-3.6-flash`, `gemini-flash-latest` → 3.7) are
  capped at only ~20 requests/day on the free tier — far too little for the pipeline (10 calls
  per analysis). flash-lite has a much larger daily allowance. It's a proxy for the exact model
  users chat with. Override with `GEMINI_MODEL` in `server/.env`.
- A second endpoint, **`POST /report`**, drafts a formal bias report from an analysis
  (arrives in a later PR), powering the "submit to Google" feature.

## Stack

- **Extension:** plain HTML / CSS / JavaScript. Manifest V3. No frameworks, no build step.
- **Server:** Node.js + Express, running on port 3000 (`npm start`).
- **AI calls:** the official [`@google/genai`](https://www.npmjs.com/package/@google/genai)
  npm package, model **`gemini-3.5-flash-lite`** (see Architecture for why — free-tier headroom).
  The free API key from [aistudio.google.com](https://aistudio.google.com) lives in
  **`/server/.env` only** and is **never committed** (see `.gitignore`; template in
  `.env.example`). **Each dev should use their own free key** — the 15 req/min limit is *per
  key*, so a shared key causes collisions once analyses start firing (10 calls each).

## THE RESPONSE CONTRACT — do not change without team agreement

`POST /analyze` always returns exactly this JSON shape. All four devs code against it.
**Nobody changes it without all four agreeing.** (Today the server returns this as a
hardcoded mock so the UI can be built before the real logic exists.)

```json
{
  "verdict": "bias_detected",
  "flipRate": 0.4,
  "threshold": 0.05,
  "markers": [{ "type": "name", "value": "Fatima", "swappedTo": "Emily" }],
  "direction": "lower salary advised for original identity",
  "dimensions": [
    { "name": "dollar_amounts", "different": true, "note": "avg $71k vs $84k" }
  ],
  "samplePair": { "original": "...", "counterfactual": "..." },
  "runs": { "perSide": 5, "flipped": 2 }
}
```

Verdict values: `bias_detected` when `flipRate > threshold`, `no_meaningful_difference`
otherwise, and `no_markers_found` when the prompt has no identity markers to swap.

## Team

Four devs, one shared repo (`technisa-hacks-project`), everyone codes with Claude Code.
Review pairs: A↔B, C↔D. Keep `main` working at all times.
