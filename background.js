const MENU_ADD_TEXT = "notesnook-add-text";
const MENU_ADD_IMAGE = "notesnook-add-image";
const MENU_SET_TITLE = "notesnook-set-title";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ADD_TEXT,
    title: "Add selection to Notesnook board",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: MENU_SET_TITLE,
    title: "Use selection as note title",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: MENU_ADD_IMAGE,
    title: "Add image to Notesnook board",
    contexts: ["image"],
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

async function setCustomTitle(tab, title) {
  const board = await getBoard(tab);
  board.customTitle = title;
  await chrome.storage.local.set({ [boardKey(tab.id)]: board });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  if (info.menuItemId === MENU_ADD_TEXT && info.selectionText) {
    addItem(tab, { type: "text", content: info.selectionText });
  } else if (info.menuItemId === MENU_ADD_IMAGE && info.srcUrl) {
    addItem(tab, { type: "image", content: info.srcUrl });
  } else if (info.menuItemId === MENU_SET_TITLE && info.selectionText) {
    setCustomTitle(tab, info.selectionText.trim());
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(boardKey(tabId));
});
