// Mizan — Gemini call layer (PR 4).
//
// The one place that talks to Gemini. Exposes runPrompt(prompt, k), which sends the same
// prompt k times in parallel and returns the k answers. PR 6's bias engine reuses this to
// get 5 answers for the original prompt and 5 for the counterfactual.
//
// We use the latest Gemini Flash model on purpose: it's the same model family the user is
// chatting with on gemini.google.com, so we audit what they actually experience.

require("dotenv").config({ quiet: true });
const { GoogleGenAI } = require("@google/genai");

// Gemini Flash. We default to gemini-3.6-flash: the newest alias
// (gemini-flash-latest -> 3.7-flash) has a tiny free tier (5/min, 20/day), and 2.5-flash
// is retired for new keys. 3.6-flash is Google's recommended stable Flash, capable enough
// to judge, with a far more generous free daily allowance. Override via GEMINI_MODEL.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// How long to wait before the single retry (ms). Helps ride out brief rate limits.
const RETRY_DELAY_MS = 1500;

// One client per API key. Set GEMINI_API_KEY (required) and, optionally,
// GEMINI_API_KEY_2 from a SEPARATE Google account/project — free-tier quota is per
// project, so a second key doubles our requests/minute (5 -> 10). One key still works.
let clients;
function getClients() {
  if (!clients) {
    const keys = [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(
      Boolean
    );
    if (keys.length === 0) {
      throw new Error(
        "GEMINI_API_KEY is missing. Add it to server/.env (see .env.example)."
      );
    }
    clients = keys.map((apiKey) => new GoogleGenAI({ apiKey }));
  }
  return clients;
}

// Round-robin across the configured keys to spread load. On a retry the counter has
// already advanced, so the second attempt naturally lands on the other key (failover).
let rr = 0;
function nextClient() {
  const list = getClients();
  return list[rr++ % list.length];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// One Gemini call. On any failure (including rate limits) wait briefly and retry once,
// then give up and rethrow.
async function callOnce(prompt, attempt = 1) {
  try {
    const response = await nextClient().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { temperature: 1 },
    });
    return response.text ?? "";
  } catch (err) {
    if (attempt === 1) {
      await sleep(RETRY_DELAY_MS);
      return callOnce(prompt, 2);
    }
    throw err;
  }
}

// Send `prompt` to Gemini `k` times in parallel; resolve to an array of k answer strings.
// Rejects if any single call still fails after its one retry.
async function runPrompt(prompt, k) {
  const calls = Array.from({ length: k }, () => callOnce(prompt));
  return Promise.all(calls);
}

module.exports = { runPrompt, MODEL };
