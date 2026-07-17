const MENU_ADD_TEXT = "notesnook-add-text";
const MENU_ADD_IMAGE = "notesnook-add-image";
const MENU_SNIP = "notesnook-snip";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ADD_TEXT,
    title: "Add selection to Notesnook board",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: MENU_ADD_IMAGE,
    title: "Add image to Notesnook board",
    contexts: ["image"],
  });
  chrome.contextMenus.create({
    id: MENU_SNIP,
    title: "Snip an area to Notesnook board",
    contexts: ["page"],
  });
});

function boardKey(tabId) {
  return `board-${tabId}`;
}

async function getBoard(tab) {
  const key = boardKey(tab.id);
  const data = await chrome.storage.local.get(key);
  const board = data[key];
  if (board && board.url === tab.url) return board;
  return { url: tab.url, title: tab.title, customTitle: "", items: [] };
}

async function addItem(tab, item) {
  const board = await getBoard(tab);
  board.items.push(item);
  await chrome.storage.local.set({ [boardKey(tab.id)]: board });
  chrome.action.setBadgeText({ tabId: tab.id, text: String(board.items.length) });
  chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#5e81ac" });
}

async function startSnip(tab) {
  if (!tab || !tab.id) return;
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["snip.js"],
  });
}

async function blobToDataUrl(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

async function cropDataUrl(dataUrl, rect, dpr) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const sx = Math.round(rect.x * dpr);
  const sy = Math.round(rect.y * dpr);
  const sw = Math.round(rect.width * dpr);
  const sh = Math.round(rect.height * dpr);

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

  const outBlob = await canvas.convertToBlob({ type: "image/png" });
  return blobToDataUrl(outBlob);
}

async function handleSnipCapture(tab, rect, dpr) {
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
  const cropped = await cropDataUrl(dataUrl, rect, dpr);
  await addItem(tab, { type: "image", content: cropped });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "notesnook-snip-capture" && sender.tab) {
    handleSnipCapture(sender.tab, message.rect, message.dpr).catch((err) =>
      console.error("Notesnook snip capture failed:", err)
    );
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  if (info.menuItemId === MENU_ADD_TEXT && info.selectionText) {
    addItem(tab, { type: "text", content: info.selectionText });
  } else if (info.menuItemId === MENU_ADD_IMAGE && info.srcUrl) {
    addItem(tab, { type: "image", content: info.srcUrl });
  } else if (info.menuItemId === MENU_SNIP) {
    startSnip(tab).catch((err) => console.error("Notesnook snip start failed:", err));
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(boardKey(tabId));
});
