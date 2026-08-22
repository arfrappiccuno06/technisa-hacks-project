# Mizan extension

The Chrome extension (Manifest V3, plain HTML/CSS/JS, no build step) lives here. It runs
on `https://gemini.google.com/*`, grabs the user's prompt, sends it to the backend at
`http://localhost:3000/analyze`, and shows the bias verdict in a results panel.

This is a placeholder — the extension itself is built in later PRs:

- **PR 1** — a minimal MV3 extension that injects a floating "M" button.
- **PR 2** — grab the user's message and POST it to the server.
- **PR 3** — the results panel (verdict banner, flip-rate bar, side-by-side answers).
- **PR 7** — the proof report + "submit to Google".
- **PR 8 / 10** — wire everything to the real server, demo mode, polish.

## Loading it in Chrome (once files exist)

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and pick this `/extension` folder.
4. After any change: click the refresh icon on the extension card, then reload the Gemini
   tab.

See [`../CLAUDE.md`](../CLAUDE.md) for the architecture and the `/analyze` response
contract.
