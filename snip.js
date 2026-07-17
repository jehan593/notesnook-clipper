(() => {
  const existing = document.getElementById("notesnook-snip-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "notesnook-snip-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(46, 52, 64, 0.35)",
    cursor: "crosshair",
    zIndex: "2147483647",
  });

  const hint = document.createElement("div");
  hint.textContent = "Drag to select an area to capture • Esc to cancel";
  Object.assign(hint.style, {
    position: "fixed",
    top: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "6px 12px",
    background: "#2e3440",
    color: "#eceff4",
    fontFamily: "ui-monospace, monospace",
    fontSize: "12px",
    borderRadius: "6px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  });
  overlay.appendChild(hint);

  const box = document.createElement("div");
  Object.assign(box.style, {
    position: "fixed",
    boxSizing: "border-box",
    boxShadow: [
      "inset 0 0 0 1px #000000",
      "inset 0 0 0 3px #ffffff",
      "inset 0 0 0 4px #000000",
      "0 1px 6px rgba(0, 0, 0, 0.6)",
    ].join(", "),
    background: "rgba(255, 255, 255, 0.12)",
    display: "none",
  });
  overlay.appendChild(box);

  document.documentElement.appendChild(overlay);

  let startX = 0;
  let startY = 0;
  let dragging = false;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function cleanup() {
    document.removeEventListener("keydown", onKeyDown, true);
    overlay.remove();
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      cleanup();
    }
  }

  function currentRect(clientX, clientY) {
    const x1 = clamp(startX, 0, window.innerWidth);
    const y1 = clamp(startY, 0, window.innerHeight);
    const x2 = clamp(clientX, 0, window.innerWidth);
    const y2 = clamp(clientY, 0, window.innerHeight);
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
  }

  overlay.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    box.style.display = "block";
    box.style.left = `${startX}px`;
    box.style.top = `${startY}px`;
    box.style.width = "0px";
    box.style.height = "0px";
  });

  overlay.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const rect = currentRect(e.clientX, e.clientY);
    box.style.left = `${rect.x}px`;
    box.style.top = `${rect.y}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  });

  overlay.addEventListener("mouseup", (e) => {
    if (!dragging) return;
    dragging = false;
    const rect = currentRect(e.clientX, e.clientY);
    if (rect.width < 4 || rect.height < 4) {
      cleanup();
      return;
    }
    cleanup();
    const dpr = window.devicePixelRatio || 1;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        chrome.runtime.sendMessage({ type: "notesnook-snip-capture", rect, dpr });
      });
    });
  });

  document.addEventListener("keydown", onKeyDown, true);
})();
