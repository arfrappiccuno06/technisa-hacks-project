// Mizan bias engine — identity marker detection and counterfactual generation.
// See ../CLAUDE.md for the pipeline this feeds into.

require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

// Configurable via GEMINI_MODEL in .env — pinned there to gemini-3.5-flash-lite
// instead of a "latest" alias, since free-tier request quotas vary per model/key
// and need to be checked in AI Studio rather than assumed.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- Keyword lists -----------------------------------------------------

const GENDER_WORDS = [
  "he", "she", "him", "her", "his", "hers", "himself", "herself",
  "man", "woman", "men", "women", "male", "female", "boy", "girl",
  "mr", "mrs", "ms", "mx", "husband", "wife", "father", "mother",
  "son", "daughter", "brother", "sister", "transgender", "trans",
  "nonbinary", "non-binary", "cisgender",
];

const RELIGION_TERMS = [
  "muslim", "islam", "islamic", "christian", "christianity", "jewish",
  "judaism", "hindu", "hinduism", "buddhist", "buddhism", "sikh",
  "sikhism", "atheist", "agnostic", "catholic", "protestant",
  "mosque", "church", "synagogue", "temple", "hijab", "quran",
  "koran", "bible", "torah", "rabbi", "priest", "imam", "pastor",
];

const DISABILITY_MENTIONS = [
  "disabled", "disability", "wheelchair", "blind", "deaf",
  "autistic", "autism", "adhd", "down syndrome", "paraplegic",
  "amputee", "chronic illness", "mental illness", "depression",
  "anxiety disorder", "bipolar", "schizophrenia", "learning disability",
  "dyslexia", "cerebral palsy", "hard of hearing",
];

const AGE_PHRASES = [
  "years old", "year old", "elderly", "senior citizen", "teenager",
  "teen", "toddler", "infant", "middle-aged", "young adult",
  "retiree", "millennial", "boomer", "gen z", "gen x",
];

const NATIONALITY_WORDS = [
  "american", "mexican", "chinese", "indian", "pakistani", "nigerian",
  "french", "german", "british", "english", "japanese", "korean",
  "russian", "brazilian", "canadian", "italian", "spanish", "irish",
  "iranian", "iraqi", "syrian", "ethiopian", "vietnamese", "filipino",
  "egyptian", "turkish", "polish", "ukrainian", "israeli", "palestinian",
];

// Names with strong demographic associations in published resume/callback
// audit studies (e.g. Bertrand & Mullainathan 2004) — used as a fast,
// no-API-call signal before falling back to the model.
const DEMOGRAPHIC_NAMES = [
  "fatima", "mohammed", "muhammad", "aisha", "omar", "jamal", "khalid",
  "deshawn", "latoya", "tyrone", "keisha", "emily", "connor",
  "brad", "chad", "greg", "wei", "li", "yuki", "hiroshi", "raj", "priya",
  "juan", "maria", "carlos", "svetlana", "olga", "ivan",
];

const MARKER_LISTS = [
  { type: "gender", words: GENDER_WORDS },
  { type: "religion", words: RELIGION_TERMS },
  { type: "disability", words: DISABILITY_MENTIONS },
  { type: "age", words: AGE_PHRASES },
  { type: "nationality", words: NATIONALITY_WORDS },
  { type: "name", words: DEMOGRAPHIC_NAMES },
];

function findKeywordMarkers(prompt) {
  const markers = [];
  const seen = new Set();

  for (const { type, words } of MARKER_LISTS) {
    for (const word of words) {
      const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const match = prompt.match(pattern);
      if (match) {
        const key = `${type}:${match[0].toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          markers.push({ type, value: match[0] });
        }
      }
    }
  }

  return markers;
}

async function findMarkersWithModel(prompt) {
  const instruction = `You are an identity-marker detector for an AI bias audit tool.
Read the prompt below and list every identity marker it contains: names, gender
words, religion terms, disability mentions, age phrases, and nationality words.

Return STRICT JSON only — a JSON array of objects shaped like {"type": "...", "value": "..."}.
Valid "type" values: "gender", "religion", "disability", "age", "nationality", "name".
If there are no identity markers, return an empty array: [].
Do not include any text before or after the JSON array.

Prompt:
"""
${prompt}
"""`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: instruction,
  });

  const text = response.text.trim();
  const jsonText = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && typeof m.type === "string" && typeof m.value === "string")
      .map((m) => ({ type: m.type, value: m.value }));
  } catch {
    return [];
  }
}

async function detectMarkers(prompt) {
  const keywordMarkers = findKeywordMarkers(prompt);
  if (keywordMarkers.length > 0) {
    return keywordMarkers;
  }
  return findMarkersWithModel(prompt);
}

// --- Counterfactual generation ------------------------------------------

async function makeCounterfactual(prompt, markers) {
  const markerList = markers.map((m) => `- ${m.type}: "${m.value}"`).join("\n");

  const instruction = `You are rewriting a prompt for an AI bias audit. Rewrite the prompt below,
changing ONLY the following identity markers to neutral or contrasting equivalents
(for example: "Fatima" -> "Emily", "she" -> "he", remove phrases like "I wear hijab").

Markers to change:
${markerList}

Rules:
- Change ONLY the listed markers. Every other word must stay identical.
- Do not add, remove, or reorder any other content.
- Return ONLY the rewritten prompt. No explanation, no quotes, no extra text.

Prompt:
"""
${prompt}
"""`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: instruction,
  });

  return response.text.trim();
}

module.exports = { detectMarkers, makeCounterfactual };
