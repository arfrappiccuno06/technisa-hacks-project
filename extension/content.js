// Mizan content script — injects the floating "M" button on gemini.google.com.
(function () {
  const BUTTON_ID = "mizan-floating-button";
  const FALLBACK_ID = "mizan-fallback-box";

  if (document.getElementById(BUTTON_ID)) {
    return;
  }

  // Candidate selectors for the user's last message, tried in order since Gemini's
  // DOM structure can change. Falls back to the paste box if none match.
  const USER_MESSAGE_SELECTORS = [
    "user-query .query-text",
    "[data-test-id='user-query'] .query-text",
    "user-query-content",
    ".query-text",
  ];

  function cleanExtractedText(text) {
    // Belt-and-braces fallback in case a visible "You said" prefix slips through.
    return text.replace(/^you\s*said[:\s\u200b\u00a0]*/i, "").trim();
  }

  function extractVisibleText(node) {
    // Gemini embeds a hidden accessibility label ("You said") as a separate element
    // inside the same container — strip those out before reading the visible text.
    const clone = node.cloneNode(true);
    clone
      .querySelectorAll('[class*="visually-hidden"], [class*="sr-only"], [aria-hidden="true"]')
      .forEach((el) => el.remove());
    return cleanExtractedText(clone.textContent);
  }

  function findLastUserMessage() {
    for (const selector of USER_MESSAGE_SELECTORS) {
      const nodes = document.querySelectorAll(selector);
      if (nodes.length > 0) {
        const text = extractVisibleText(nodes[nodes.length - 1]);
        if (text) {
          return text;
        }
      }
    }
    return null;
  }

  function analyzePrompt(prompt) {
    console.log("Mizan analyzing prompt:", prompt);
    chrome.runtime.sendMessage({ type: "MIZAN_ANALYZE", prompt }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Mizan: could not reach background worker —", chrome.runtime.lastError.message);
        return;
      }
      if (!response || !response.ok) {
        console.error("Mizan: analyze request failed —", response && response.error);
        return;
      }
      console.log("Mizan analysis result:", response.data);
    });
  }

  function showFallbackBox() {
    let box = document.getElementById(FALLBACK_ID);
    if (box) {
      box.style.display = "flex";
      return;
    }

    box = document.createElement("div");
    box.id = FALLBACK_ID;
    Object.assign(box.style, {
      position: "fixed",
      bottom: "84px",
      right: "24px",
      width: "260px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      padding: "12px",
      background: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
      zIndex: "2147483647",
      fontFamily: "Arial, sans-serif",
    });

    const label = document.createElement("div");
    label.textContent = "Couldn't find your message — paste it here:";
    label.style.fontSize = "12px";
    label.style.color = "#374151";

    const textarea = document.createElement("textarea");
    textarea.rows = 4;
    Object.assign(textarea.style, {
      width: "100%",
      boxSizing: "border-box",
      fontSize: "13px",
      resize: "vertical",
    });

    const analyzeButton = document.createElement("button");
    analyzeButton.textContent = "Analyze";
    Object.assign(analyzeButton.style, {
      alignSelf: "flex-end",
      padding: "6px 12px",
      background: "#4f46e5",
      color: "#ffffff",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
    });

    analyzeButton.addEventListener("click", () => {
      const text = textarea.value.trim();
      if (!text) {
        return;
      }
      analyzePrompt(text);
      box.style.display = "none";
    });

    box.appendChild(label);
    box.appendChild(textarea);
    box.appendChild(analyzeButton);
    document.body.appendChild(box);
  }

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.textContent = "M";
  button.setAttribute("aria-label", "Mizan bias check");

  Object.assign(button.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    border: "none",
    background: "#4f46e5",
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: "bold",
    fontFamily: "Arial, sans-serif",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
    zIndex: "2147483647",
  });

  button.addEventListener("click", () => {
    console.log("Mizan clicked");
    const prompt = findLastUserMessage();
    if (prompt) {
      analyzePrompt(prompt);
    } else {
      console.warn("Mizan: no user message found on the page, showing fallback input");
      showFallbackBox();
    }
  });

  document.body.appendChild(button);
})();

