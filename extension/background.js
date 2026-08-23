// Mizan background service worker — relays prompts from the content script to the server.
console.log("Mizan background service worker loaded");

const ANALYZE_URL = "http://localhost:3000/analyze";
const REPORT_URL = "http://localhost:3000/report";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || (message.type !== "MIZAN_ANALYZE" && message.type !== "MIZAN_REPORT")) {
    return undefined;
  }

  (async () => {
    try {
      const isReport = message.type === "MIZAN_REPORT";
      const res = await fetch(isReport ? REPORT_URL : ANALYZE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isReport
            ? message.analysis
            : { prompt: message.prompt, platform: "gemini" }
        ),
      });

      if (!res.ok) {
        sendResponse({ ok: false, error: `Server responded with status ${res.status}` });
        return;
      }

      const data = await res.json();
      sendResponse({ ok: true, data });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
  })();

  return true; // keep the message channel open for the async sendResponse above
});
