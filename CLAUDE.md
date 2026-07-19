# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Manifest V3 Chrome extension ("Notesnook Simple Clipper") that clips web page text, images, and screen snips into [Notesnook](https://notesnook.com) via its Inbox API. It's a from-scratch vanilla JS extension — no build step, no bundler, no package.json, no dependencies.

## Development

There is no build/lint/test tooling. To develop:

1. Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, select the repo folder.
2. After editing `background.js`, click the extension's reload icon on `chrome://extensions` (service workers don't hot-reload).
3. After editing `popup.js`/`popup.html`/`options.js`/`options.html`, just reopen the popup/options page.
4. After editing `snip.js`, reload the extension AND refresh any already-open tab you test on (it's injected via `chrome.scripting.executeScript`, not declared in the manifest, so stale copies stay in already-loaded pages).
5. Needs a real Notesnook Inbox API key to test saving (Settings page in the extension → paste key + optional tag ID). See README.md for how to obtain one.

## Architecture

Four independent surfaces communicating only through `chrome.storage.local`, with `background.js` as the sole owner of per-tab board state:

- **`background.js`** (MV3 service worker) — registers the three context menu entries (add selection, add image, snip area), and is the only place that writes new items onto a board (`addItem`). Also handles the screenshot-crop pipeline for snips (see below) and updates the toolbar badge count.
- **`snip.js`** — not declared in the manifest; injected on-demand into the page via `chrome.scripting.executeScript` when the "Snip an area" context menu is clicked. Draws a full-page overlay for drag-selecting a rectangle, then `postMessage`s `{type: "notesnook-snip-capture", rect, dpr}` back to the background worker and removes itself. Pure DOM/vanilla JS, no access to extension APIs beyond `chrome.runtime.sendMessage`.
- **`popup.js`/`popup.html`** — the board review UI opened by clicking the toolbar icon. Reads/writes the same `board-<tabId>` storage key as background.js, renders items with drag-to-reorder, and on **Save Note** POSTs the assembled note (HTML content built by `buildContentHtml()`) to `https://inbox.notesnook.com/`. Tagging: notes get exactly one tag. `webClipperLinksTagId` is used when `boardItems.length === 0` (just the page link, nothing added to the board); otherwise `webClipperTagId` is used. If `boardItems` is empty but no links tag is configured, it falls back to `webClipperTagId`.
- **`options.js`/`options.html`** — settings page for `inboxApiKey`, `webClipperTagId`, and `webClipperLinksTagId`, all stored in `chrome.storage.local`.

**Board data model**: each tab has a `chrome.storage.local` entry keyed `board-<tabId>` shaped `{ url, title, customTitle, items: [{type: "text"|"image", content}] }`. It's invalidated whenever `board.url !== tab.url` (i.e. navigating to a different URL resets the board) and deleted entirely on `chrome.tabs.onRemoved`. Both `background.js` (`getBoard`/`addItem`) and `popup.js` (`loadBoard`/`persistBoard`) implement this read-modify-write pattern independently — keep them in sync when changing the schema.

**Snip capture pipeline** (background.js): `chrome.tabs.captureVisibleTab` grabs the full visible viewport as a PNG data URL, then `cropDataUrl` uses `createImageBitmap` + `OffscreenCanvas` (service-worker-safe, no DOM) to crop to the selected rect scaled by `devicePixelRatio`, and `blobToDataUrl` re-encodes the crop back to a base64 data URL for storage. All three steps only work in a service worker context (no `document`, no `<canvas>`).

**Note assembly** (popup.js `buildContentHtml`): builds the Inbox API's `content.data` HTML directly via string concatenation with manual `escapeHtml`/`escapeAttr` — this is the one place that touches raw user/page content, so any new item type must be escaped here too. Order matches `boardItems` order (drag-to-reorder in the popup directly controls final note order).

Styling in `popup.html`/`options.html` uses a hardcoded Nord color palette via CSS custom properties (`--nord0`…`--nord15`) — reuse these vars rather than introducing new colors.

## Known limitations (see README.md for full list)

- Images added via context menu are saved by reference (URL), not fetched — they rely on the Notesnook editor to download them on first open. Snipped images, by contrast, are already base64 data URLs since they're screenshot crops.
- Inbox API is create-only: there's no append, so every Save Note is a new note.
- The Inbox API key is stored in plaintext in `chrome.storage.local` (no OS keychain access from extensions).
