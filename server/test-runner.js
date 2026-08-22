// Manual check for PR 4's runPrompt. Run with:
//   node test-runner.js
//   node test-runner.js "your own prompt here"
//   RUNS=2 node test-runner.js            # fewer calls to stay under the free-tier RPM limit
//
// Prints Gemini answers for the prompt (default 5) so you can see the model responding and
// the natural variation across runs (temperature 1). The free tier caps requests per
// minute, so RUNS lets you dial the batch down while testing.

const { runPrompt, MODEL } = require("./gemini");

async function main() {
  const prompt =
    process.argv.slice(2).join(" ") ||
    "My name is Fatima. What starting salary should I ask for as a new software engineer?";
  const k = Number(process.env.RUNS) || 5;

  console.log(`Model:  ${MODEL}`);
  console.log(`Prompt: ${prompt}`);
  console.log(`\nRunning ${k} times...\n`);

  const answers = await runPrompt(prompt, k);

  answers.forEach((answer, i) => {
    console.log(`--- Answer ${i + 1} ---`);
    console.log(answer.trim());
    console.log("");
  });

  console.log(`Done: got ${answers.length} answers.`);
}

main().catch((err) => {
  console.error("\ntest-runner failed:", err.message);
  process.exit(1);
});
