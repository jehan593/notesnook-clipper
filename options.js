const apiKeyInput = document.getElementById("api-key");
const tagIdInput = document.getElementById("tag-id");
const linksTagIdInput = document.getElementById("links-tag-id");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");

async function load() {
  const { inboxApiKey, webClipperTagId, webClipperLinksTagId } = await chrome.storage.local.get([
    "inboxApiKey",
    "webClipperTagId",
    "webClipperLinksTagId",
  ]);
  if (inboxApiKey) apiKeyInput.value = inboxApiKey;
  if (webClipperTagId) tagIdInput.value = webClipperTagId;
  if (webClipperLinksTagId) linksTagIdInput.value = webClipperLinksTagId;
}

async function save() {
  const apiKey = apiKeyInput.value.trim();
  const tagId = tagIdInput.value.trim();
  const linksTagId = linksTagIdInput.value.trim();
  await chrome.storage.local.set({
    inboxApiKey: apiKey,
    webClipperTagId: tagId,
    webClipperLinksTagId: linksTagId,
  });
  statusEl.textContent = "Saved.";
  setTimeout(() => (statusEl.textContent = ""), 2000);
}

saveBtn.addEventListener("click", save);
load();
