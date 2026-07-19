const INBOX_URL = "https://inbox.notesnook.com/";

const titleInputEl = document.getElementById("title-input");
const titleRemoveBtn = document.getElementById("title-remove-btn");
const listEl = document.getElementById("board-list");
const emptyHintEl = document.getElementById("empty-hint");
const saveBtn = document.getElementById("save-btn");
const clearBtn = document.getElementById("clear-btn");
const statusEl = document.getElementById("status");
const optionsLink = document.getElementById("options-link");
const settingsIconBtn = document.getElementById("settings-icon-btn");
const setupWarningEl = document.getElementById("setup-warning");

let currentTab = null;
let boardItems = [];
let customTitle = "";
let dragFromIndex = null;
let titleSaveTimeout = null;

function boardKey(tabId) {
  return `board-${tabId}`;
}

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = kind || "";
}

async function loadBoard() {
  const key = boardKey(currentTab.id);
  const data = await chrome.storage.local.get(key);
  const board = data[key];
  const matches = board && board.url === currentTab.url;
  boardItems = matches ? board.items : [];
  customTitle = matches ? board.customTitle || "" : "";
}

async function persistBoard() {
  const key = boardKey(currentTab.id);
  await chrome.storage.local.set({
    [key]: {
      url: currentTab.url,
      title: currentTab.title,
      customTitle,
      items: boardItems,
    },
  });
  chrome.action.setBadgeText({
    tabId: currentTab.id,
    text: boardItems.length ? String(boardItems.length) : "",
  });
}

async function clearBoard() {
  clearTimeout(titleSaveTimeout);
  await chrome.storage.local.remove(boardKey(currentTab.id));
  chrome.action.setBadgeText({ tabId: currentTab.id, text: "" });
  boardItems = [];
  customTitle = "";
}

function renderTitle() {
  titleInputEl.value = customTitle;
  titleRemoveBtn.hidden = !customTitle;
}

function renderBoard() {
  listEl.innerHTML = "";
  emptyHintEl.style.display = boardItems.length ? "none" : "block";
  clearBtn.disabled = boardItems.length === 0 && !customTitle;

  boardItems.forEach((item, index) => {
    const row = document.createElement("li");
    row.className = "board-item";
    row.draggable = true;

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "⠿";

    const preview = document.createElement("div");
    preview.className = "item-preview";
    if (item.type === "text") {
      preview.textContent =
        item.content.length > 100 ? item.content.slice(0, 100) + "…" : item.content;
    } else if (item.type === "image") {
      const img = document.createElement("img");
      img.src = item.content;
      preview.appendChild(img);
    }

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.title = "Remove";
    removeBtn.addEventListener("click", async () => {
      boardItems.splice(index, 1);
      await persistBoard();
      renderBoard();
    });

    row.addEventListener("dragstart", () => {
      dragFromIndex = index;
      row.classList.add("dragging");
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
    });
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });
    row.addEventListener("drop", async (e) => {
      e.preventDefault();
      row.classList.remove("drag-over");
      if (dragFromIndex === null || dragFromIndex === index) return;
      const [moved] = boardItems.splice(dragFromIndex, 1);
      boardItems.splice(index, 0, moved);
      dragFromIndex = null;
      await persistBoard();
      renderBoard();
    });

    row.appendChild(handle);
    row.appendChild(preview);
    row.appendChild(removeBtn);
    listEl.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, "&quot;");
}

function buildContentHtml() {
  const timestamp = new Date().toLocaleString();
  const parts = [
    `<p>${escapeHtml(timestamp)} — <a href="${escapeAttr(currentTab.url)}">${escapeHtml(
      currentTab.url
    )}</a></p>`,
  ];
  for (const item of boardItems) {
    parts.push("<hr>");
    if (item.type === "text") {
      parts.push(`<p>${escapeHtml(item.content).replace(/\n/g, "<br>")}</p>`);
    } else if (item.type === "image") {
      parts.push(`<p><img src="${escapeAttr(item.content)}" /></p>`);
    }
  }
  return parts.join("\n");
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  if (!tab || !tab.url || !/^https?:\/\//.test(tab.url)) {
    titleInputEl.value = "This page can't be saved.";
    titleInputEl.disabled = true;
    saveBtn.disabled = true;
    clearBtn.disabled = true;
    return;
  }

  await loadBoard();
  renderTitle();
  renderBoard();
  await refreshApiKeyStatus();
}

function handleTitleInput() {
  customTitle = titleInputEl.value;
  titleRemoveBtn.hidden = !customTitle;
  clearBtn.disabled = boardItems.length === 0 && !customTitle;
  clearTimeout(titleSaveTimeout);
  titleSaveTimeout = setTimeout(persistBoard, 250);
}

async function resetTitle() {
  clearTimeout(titleSaveTimeout);
  customTitle = "";
  await persistBoard();
  renderTitle();
  renderBoard();
}

async function clearAll() {
  await clearBoard();
  renderTitle();
  renderBoard();
  setStatus("Cleared.");
}

async function refreshApiKeyStatus() {
  const { inboxApiKey } = await chrome.storage.local.get("inboxApiKey");
  const hasKey = Boolean(inboxApiKey);
  settingsIconBtn.hidden = !hasKey;
  setupWarningEl.hidden = hasKey;
}

async function save() {
  if (!currentTab) return;

  const { inboxApiKey, webClipperTagId, webClipperLinksTagId } = await chrome.storage.local.get([
    "inboxApiKey",
    "webClipperTagId",
    "webClipperLinksTagId",
  ]);
  if (!inboxApiKey) {
    setStatus("Set your Inbox API key first.", "error");
    return;
  }

  saveBtn.disabled = true;
  setStatus("Saving...");

  const tagIds = [];
  if (boardItems.length === 0 && webClipperLinksTagId) {
    tagIds.push(webClipperLinksTagId);
  } else if (webClipperTagId) {
    tagIds.push(webClipperTagId);
  }

  try {
    const response = await fetch(INBOX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: inboxApiKey,
      },
      body: JSON.stringify({
        title: customTitle || currentTab.title || currentTab.url,
        type: "note",
        source: "notesnook-simple-clipper",
        version: 1,
        content: {
          type: "html",
          data: buildContentHtml(),
        },
        ...(tagIds.length ? { tagIds } : {}),
      }),
    });

    if (response.ok) {
      setStatus("Saved to Notesnook.", "success");
      await clearBoard();
      renderTitle();
      renderBoard();
    } else if (response.status === 401 || response.status === 403) {
      setStatus("Invalid API key. Check options.", "error");
    } else {
      const body = await response.text();
      setStatus(`Failed to save (${response.status}).`, "error");
      console.error("Notesnook inbox error:", body);
    }
  } catch (err) {
    setStatus("Network error. Try again.", "error");
    console.error(err);
  } finally {
    saveBtn.disabled = false;
  }
}

saveBtn.addEventListener("click", save);
clearBtn.addEventListener("click", clearAll);
optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
settingsIconBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
titleRemoveBtn.addEventListener("click", resetTitle);
titleInputEl.addEventListener("input", handleTitleInput);

init();
