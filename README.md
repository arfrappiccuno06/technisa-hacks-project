# Mizan

**Mizan is a Chrome extension that detects AI bias.** It takes a prompt you sent to
Gemini, makes a copy with the identity markers swapped (e.g. `Fatima` → `Emily`,
`she` → `he`), re-runs both versions through the same Gemini model several times, and
uses an AI judge to count how often the answers meaningfully differ. If they differ
more than 5% of the time — the pre-registered flip-rate threshold from published
fairness research — Mizan flags **"Bias detected"** with a side-by-side comparison and a
downloadable proof report.

Because the extension runs on Gemini's site and the backend calls Gemini's API, we audit
the same model the user is actually talking to.

## Layout

- **`/extension`** — the Chrome extension (plain HTML/CSS/JS, Manifest V3, no build step).
- **`/server`** — a Node.js + Express backend that does the bias analysis.

## The response contract

The server's `POST /analyze` always returns the JSON shape documented in
[`CLAUDE.md`](./CLAUDE.md). All four devs code against it and **it must not change without
team agreement.** Right now the server returns a hardcoded example so the UI can be built
before the real logic lands.

## Running the server

```bash
cd server
npm install       # first time only
npm start         # starts on http://localhost:3000
```

## Testing the endpoint

With the server running, in another terminal:

```bash
# The mock /analyze endpoint (ignores its input, returns the example JSON)
curl -s -X POST http://localhost:3000/analyze \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"test","platform":"gemini"}'

# Sanity check
curl -s http://localhost:3000/
```

## Configuration

Copy `.env.example` to `server/.env` and add your free Gemini API key from
[aistudio.google.com](https://aistudio.google.com):

```
GEMINI_API_KEY=your_key_here
```

`.env` is git-ignored and must never be committed.
