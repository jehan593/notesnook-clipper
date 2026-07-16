const apiKeyInput = document.getElementById("api-key");
const tagIdInput = document.getElementById("tag-id");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");

async function load() {
  const { inboxApiKey, webClipperTagId } = await chrome.storage.local.get([
    "inboxApiKey",
    "webClipperTagId",
  ]);
  if (inboxApiKey) apiKeyInput.value = inboxApiKey;
  if (webClipperTagId) tagIdInput.value = webClipperTagId;
}

async function save() {
  const apiKey = apiKeyInput.value.trim();
  const tagId = tagIdInput.value.trim();
  await chrome.storage.local.set({
    inboxApiKey: apiKey,
    webClipperTagId: tagId,
  });
  statusEl.textContent = "Saved.";
  setTimeout(() => (statusEl.textContent = ""), 2000);
}

saveBtn.addEventListener("click", save);
load();
