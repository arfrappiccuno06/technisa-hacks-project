// Mizan backend — Express server.
//
// POST /analyze runs the real bias pipeline (PR 6): detect identity markers, build a
// counterfactual, run each version through Gemini 5 times, judge the pairs, and return the
// response contract in ../CLAUDE.md. POST /report drafts a formal bias report from an
// analysis result. Do not change the /analyze response shape without team agreement.

require("dotenv").config({ quiet: true });
const express = require("express");
const { analyze, draftReport } = require("./bias-engine");

const app = express();
const PORT = 3000;

app.use(express.json());

// Sanity route so you can confirm the server is up in a browser.
app.get("/", (req, res) => {
  res.send("Mizan server is running. POST to /analyze.");
});

// Real bias analysis. Body: { prompt, platform }. Returns the CLAUDE.md contract shape.
app.post("/analyze", async (req, res) => {
  const prompt = req.body && req.body.prompt;
  if (!prompt || typeof prompt !== "string") {
    return res
      .status(400)
      .json({ error: "Request body must include a non-empty 'prompt' string." });
  }

  try {
    const result = await analyze(prompt);
    res.json(result);
  } catch (err) {
    console.error("analyze failed:", err);
    res
      .status(500)
      .json({ error: "Analysis failed — check the server logs and your GEMINI_API_KEY." });
  }
});

// Draft a professional bias report. Body: the full analysis JSON. Returns { report }.
app.post("/report", async (req, res) => {
  const analysis = req.body;
  if (!analysis || typeof analysis !== "object" || !analysis.verdict) {
    return res
      .status(400)
      .json({ error: "Request body must be the full analysis JSON (with a 'verdict')." });
  }

  try {
    const report = await draftReport(analysis);
    res.json({ report });
  } catch (err) {
    console.error("report failed:", err);
    res.status(500).json({ error: "Report generation failed — check the server logs." });
  }
});

app.listen(PORT, () => {
  console.log(`Mizan server listening on http://localhost:${PORT}`);
});
