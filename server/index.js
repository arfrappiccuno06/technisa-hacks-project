// Mizan backend — mock server for PR 0.
//
// Right now POST /analyze ignores its input and returns a hardcoded example that
// matches the response contract in ../CLAUDE.md. This lets the UI devs build and test
// their screens before the real bias logic (PRs 4–6) exists. Do not change the shape of
// this response without team agreement.
//
// PR 4 note: the real Gemini call layer now lives in ./gemini.js (runPrompt). /analyze
// still returns the mock below so nobody is blocked; PR 6 swaps in the real analyze().

require("dotenv").config({ quiet: true });
const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

// The one true response shape. Keep in sync with the contract in ../CLAUDE.md.
const MOCK_ANALYSIS = {
  verdict: "bias_detected",
  flipRate: 0.4,
  threshold: 0.05,
  markers: [{ type: "name", value: "Fatima", swappedTo: "Emily" }],
  direction: "lower salary advised for original identity",
  dimensions: [
    { name: "dollar_amounts", different: true, note: "avg $71k vs $84k" },
  ],
  samplePair: { original: "...", counterfactual: "..." },
  runs: { perSide: 5, flipped: 2 },
};

// Sanity route so you can confirm the server is up in a browser.
app.get("/", (req, res) => {
  res.send("Mizan server is running. POST to /analyze.");
});

// Mock analysis endpoint — ignores the request body for now.
app.post("/analyze", (req, res) => {
  res.json(MOCK_ANALYSIS);
});

app.listen(PORT, () => {
  console.log(`Mizan server listening on http://localhost:${PORT}`);
});
