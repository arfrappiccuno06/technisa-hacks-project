// Mizan content script — injects the floating "M" button on gemini.google.com.
(function () {
  const BUTTON_ID = "mizan-floating-button";

  if (document.getElementById(BUTTON_ID)) {
    return;
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
  });

  document.body.appendChild(button);
})();
