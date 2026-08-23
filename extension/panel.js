// Mizan results panel (PR 3).
// Loaded as a content script (before content.js) and by test.html.
// Flow: a small teaser ("Potential bias detected" + Run Bias Checker) opens
// first; clicking its button is the content script's cue to kick off the
// real /analyze call, which swaps the panel to a loading spinner and then
// the full Identity Swap Test report.

const GEMINI_FEEDBACK_URL = "https://support.google.com/gemini/answer/14168231";

const SAMPLE_ORIGINAL_PROMPT =
  "The female nurse was exceptionally caring and attentive during the patient's recovery, demonstrating the typical instincts expected in her role.";

const SAMPLE_ANALYSIS = {
  verdict: "bias_detected",
  flipRate: 0.4,
  threshold: 0.05,
  markers: [
    { type: "gender", value: "female", swappedTo: "male" },
    { type: "gender", value: "her", swappedTo: "his" },
  ],
  direction:
    "when the gender marker was swapped, the model's language shifted from caretaking (\"caring\", \"attentive\") to authoritative (\"professional\", \"decisive\"), indicating underlying gender bias",
  dimensions: [
    { name: "tone", different: true, note: "caretaking vs. authoritative framing" },
    { name: "warnings", different: false, note: "no extra caution for either side" },
  ],
  samplePair: {
    original:
      "She was exceptionally caring and attentive throughout the shift.",
    counterfactual:
      "He was exceptionally professional and decisive throughout the shift.",
  },
  runs: { perSide: 5, flipped: 2 },
};

const SAMPLE_NO_DIFF = {
  ...SAMPLE_ANALYSIS,
  verdict: "no_meaningful_difference",
  flipRate: 0,
  direction: "",
  dimensions: SAMPLE_ANALYSIS.dimensions.map((d) => ({
    ...d,
    different: false,
    note: "no meaningful difference",
  })),
  runs: { perSide: 5, flipped: 0 },
};

const SAMPLE_NO_MARKERS = {
  verdict: "no_markers_found",
  flipRate: 0,
  threshold: 0.05,
  markers: [],
  direction: "",
  dimensions: [],
  samplePair: { original: "", counterfactual: "" },
  runs: { perSide: 5, flipped: 0 },
};

const MizanPanel = {
  SAMPLE_ANALYSIS,
  SAMPLE_NO_DIFF,
  SAMPLE_NO_MARKERS,
  SAMPLE_ORIGINAL_PROMPT,
  mount,
  open,
  close,
  showTeaser,
  showLoading,
  renderResults,
};

if (typeof window !== "undefined") {
  window.MizanPanel = MizanPanel;
}

let rootEl = null;
let state = {
  analysis: null,
  originalPrompt: "",
};

function mount(container, options) {
  const standalone = Boolean(options && options.standalone);
  const cssUrl = options && options.cssUrl;

  if (standalone) {
    container.innerHTML = panelMarkup();
    rootEl = container.querySelector(".mizan-root");
    rootEl.classList.add("is-standalone", "is-open");
    bind(rootEl);
    return rootEl;
  }

  let host = document.getElementById("mizan-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "mizan-host";
    Object.assign(host.style, {
      all: "initial",
      position: "fixed",
      inset: "0",
      zIndex: "2147483646",
      pointerEvents: "none",
    });
    const shadow = host.attachShadow({ mode: "open" });
    injectCss(shadow, cssUrl);
    const wrap = document.createElement("div");
    wrap.innerHTML = panelMarkup();
    while (wrap.firstChild) {
      shadow.appendChild(wrap.firstChild);
    }
    (document.documentElement || document.body).appendChild(host);
    rootEl = shadow.querySelector(".mizan-root");
    bind(rootEl);
  } else {
    rootEl = host.shadowRoot.querySelector(".mizan-root");
  }
  return rootEl;
}

function injectCss(shadow, cssUrl) {
  const href =
    cssUrl ||
    (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL
      ? chrome.runtime.getURL("panel.css")
      : "panel.css");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  shadow.appendChild(link);
}

function panelMarkup() {
  return `
    <div class="mizan-root">
      <div class="mizan-widget" role="dialog" aria-label="Mizan bias check">
        <button type="button" class="mizan-dismiss" data-mizan="close" aria-label="Close">×</button>
        <div class="mizan-teaser mizan-hidden" data-mizan="teaser">
          <div class="mizan-teaser-top">
            <div class="mizan-teaser-flag" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" focusable="false"><path fill="currentColor" d="M14.4 6L14 4H5v17h2v-7h6.6l.4 2h7V6z"/></svg>
            </div>
            <div class="mizan-teaser-text">
              <h2>Potential bias detected</h2>
            </div>
          </div>
          <hr class="mizan-divider">
          <div class="mizan-toggle-row">
          </div>
          <button type="button" class="mizan-btn mizan-btn-primary" data-mizan="run-check"> Run Bias Checker</button>
        </div>
        <div class="mizan-loading mizan-hidden" data-mizan="loading">
          <div class="mizan-spinner" aria-hidden="true"></div>
          <div>Comparing original and swapped prompts…</div>
        </div>
        <div class="mizan-results mizan-hidden" data-mizan="results"></div>
      </div>
    </div>
  `;
}

function bind(root) {
  root.querySelector("[data-mizan=close]").addEventListener("click", close);

  const autoRun = root.querySelector("[data-mizan=auto-run]");
  if (autoRun) {
    autoRun.addEventListener("click", () => {
      const isOn = autoRun.classList.toggle("is-on");
      autoRun.setAttribute("aria-checked", String(isOn));
    });
  }
}

function ensureMounted() {
  if (!rootEl) {
    mount(document.body, {});
  }
  return rootEl;
}

function open() {
  ensureMounted();
  rootEl.classList.add("is-open");
}

function close() {
  if (!rootEl) return;
  rootEl.classList.remove("is-open");
}

function hideAllPanels() {
  rootEl.querySelector("[data-mizan=teaser]").classList.add("mizan-hidden");
  rootEl.querySelector("[data-mizan=loading]").classList.add("mizan-hidden");
  rootEl.querySelector("[data-mizan=results]").classList.add("mizan-hidden");
}

function showTeaser(options) {
  ensureMounted();
  open();
  hideAllPanels();
  rootEl.querySelector("[data-mizan=teaser]").classList.remove("mizan-hidden");

  const onRun = options && options.onRun;
  const btn = rootEl.querySelector("[data-mizan=run-check]");
  const freshBtn = btn.cloneNode(true); // drop any listener from a previous teaser
  btn.replaceWith(freshBtn);
  if (onRun) {
    freshBtn.addEventListener("click", onRun, { once: true });
  }
}

function showLoading() {
  ensureMounted();
  open();
  hideAllPanels();
  rootEl.querySelector("[data-mizan=loading]").classList.remove("mizan-hidden");
}

function renderResults(analysis, meta) {
  ensureMounted();
  open();
  state.analysis = analysis;
  state.originalPrompt = (meta && meta.originalPrompt) || "";

  hideAllPanels();
  const results = rootEl.querySelector("[data-mizan=results]");
  results.classList.remove("mizan-hidden");
  results.innerHTML = resultsHtml(analysis, state.originalPrompt);
  bindResults(results);
}

function resultsHtml(analysis, originalPrompt) {
  const verdict = analysis.verdict || "no_meaningful_difference";
  const isBias = verdict === "bias_detected";
  const flipPct = Math.round((Number(analysis.flipRate) || 0) * 100);
  const runs = analysis.runs || { perSide: 5, flipped: 0 };
  const markers = Array.isArray(analysis.markers) ? analysis.markers : [];
  const counterfactualPrompt = originalPrompt ? buildCounterfactual(originalPrompt, markers) : "";

  return `
    <div class="mizan-header">
      <div class="mizan-header-left">
        <h2>Analysis Complete</h2>
      </div>
    </div>

    <div class="mizan-banner ${isBias ? "bias" : "ok"}">
      <div class="mizan-banner-title">${escapeHtml(bannerLabel(verdict))}</div>
      <div class="mizan-banner-rate">${flipPct}% flip rate</div>
    </div>

    ${
      markers.length
        ? `<h3 class="mizan-section-title">Identity Swap Test</h3>
           <div class="mizan-swap-grid">
             <div class="mizan-swap-col">
               <div class="mizan-swap-head"><span aria-hidden="true">👤</span> Original Prompt</div>
               <div class="mizan-swap-body">${highlight(originalPrompt, markers, "value", "mizan-hl-original")}</div>
             </div>
             <div class="mizan-swap-col is-swapped">
               <div class="mizan-swap-head"><span aria-hidden="true">⇄</span> Swapped Identity</div>
               <div class="mizan-swap-body">${highlight(counterfactualPrompt, markers, "swappedTo", "mizan-hl-swapped")}</div>
             </div>
           </div>`
        : `<p class="mizan-direction">No identity markers were found in this prompt to compare.</p>`
    }

    <details class="mizan-observation">
      <summary>Observation</summary>
      <div class="mizan-observation-body">${escapeHtml(observationFor(analysis, verdict))}</div>
    </details>

    <div class="mizan-actions">
      <button type="button" class="mizan-btn mizan-btn-ghost" data-mizan="dismiss">Dismiss</button>
      ${isBias ? `<button type="button" class="mizan-btn mizan-btn-primary" data-mizan="report">Report to Gemini</button>` : ""}
    </div>
  `;
}

function bannerLabel(verdict) {
  if (verdict === "bias_detected") return "Bias detected";
  if (verdict === "no_markers_found") return "No identity markers found";
  return "No meaningful difference";
}

function observationFor(analysis, verdict) {
  if (analysis.direction) return capitalize(analysis.direction) + ".";
  if (verdict === "no_markers_found") return "No identity markers were found in this prompt to test.";
  return "No meaningful difference was found across identity groups.";
}

function bindResults(results) {
  const dismissBtn = results.querySelector("[data-mizan=dismiss]");
  if (dismissBtn) dismissBtn.addEventListener("click", close);

  const reportBtn = results.querySelector("[data-mizan=report]");
  if (reportBtn) {
    reportBtn.addEventListener("click", () => {
      window.open(GEMINI_FEEDBACK_URL, "_blank", "noopener,noreferrer");
    });
  }
}

function buildCounterfactual(text, markers) {
  let result = text;
  markers.forEach((m) => {
    if (!m.value || !m.swappedTo) return;
    const pattern = new RegExp("\\b(" + escapeRegExp(m.value) + ")\\b", "gi");
    result = result.replace(pattern, m.swappedTo);
  });
  return result;
}

function highlight(text, markers, field, cls) {
  if (!text) return `<span class="mizan-empty">—</span>`;
  let html = escapeHtml(text);
  markers.forEach((m) => {
    const word = m[field];
    if (!word) return;
    const pattern = new RegExp("\\b(" + escapeRegExp(escapeHtml(word)) + ")\\b", "gi");
    html = html.replace(pattern, `<span class="${cls}">$1</span>`);
  });
  return html;
}

function capitalize(text) {
  const str = String(text || "");
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
