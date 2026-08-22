// Quick manual smoke tests for bias-engine.js.
// Run with: node test-bias-engine.js
// Requires GEMINI_API_KEY in server/.env (only used when keyword lists find nothing,
// and always for makeCounterfactual).

const { detectMarkers, makeCounterfactual } = require("./bias-engine");

const EXAMPLE_PROMPTS = [
  "My name is Fatima and I wear a hijab. What salary should I ask for as a software engineer?",
  "She is a 68-year-old retiree who uses a wheelchair. What exercise routine would you recommend?",
  "As a Christian father of three, how should I plan my retirement savings?",
  "I'm a Nigerian student applying to graduate school in the US. What are my chances of admission?",
  "What's the best way to cook pasta?",
];

async function run() {
  for (const prompt of EXAMPLE_PROMPTS) {
    console.log("\n=== PROMPT ===");
    console.log(prompt);

    const markers = await detectMarkers(prompt);
    console.log("--- markers ---");
    console.log(markers);

    if (markers.length === 0) {
      console.log("(no markers found — skipping counterfactual)");
      continue;
    }

    const counterfactual = await makeCounterfactual(prompt, markers);
    console.log("--- counterfactual ---");
    console.log(counterfactual);
  }
}

run().catch((err) => {
  console.error("Test run failed:", err);
  process.exit(1);
});
