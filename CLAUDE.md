# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Manifest V3 Chrome extension ("Notesnook Simple Clipper") that clips web page text, images, and screen snips into [Notesnook](https://notesnook.com) via its Inbox API. It's a from-scratch vanilla JS extension — no build step, no bundler, no package.json, no dependencies.

## Development

There is no build/lint/test tooling. To develop:

1. Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, select the repo folder.
2. After editing `background.js` or `common.js`, click the extension's reload icon on `chrome://extensions` (service workers don't hot-reload).
3. After editing `popup.js`/`popup.html`/`options.js`/`options.html`/`theme.css`, just reopen the popup/options page.
4. After editing `snip.js`, reload the extension AND refresh any already-open tab you test on (it's injected via `chrome.scripting.executeScript`, not declared in the manifest, so stale copies stay in already-loaded pages).
5. Needs a real Notesnook Inbox API key to test saving (Settings page in the extension → paste key + optional tag ID). See README.md for how to obtain one.

## Architecture

Four independent surfaces communicating only through `chrome.storage.local`, with `background.js` as the sole owner of per-tab board state:

- **`common.js`** — the one bit of shared code: just `boardKey(tabId)`. Loaded into the service worker via `importScripts("common.js")` at the top of `background.js`, and into the popup via a `<script src="common.js">` tag before `popup.js` in `popup.html`. Not a module system — just the same tiny file parsed twice — kept separate because a service worker and a page can't share code any other way without a build step.
- **`background.js`** (MV3 service worker) — registers the three context menu entries (add selection, add image, snip area), and is the only place that writes new items onto a board (`addItem`). Also handles the screenshot-crop pipeline for snips (see below) and updates the toolbar badge count.
- **`snip.js`** — not declared in the manifest; injected on-demand into the page via `chrome.scripting.executeScript` when the "Snip an area" context menu is clicked. Draws a full-page overlay for drag-selecting a rectangle, then `postMessage`s `{type: "notesnook-snip-capture", rect, dpr}` back to the background worker and removes itself. Pure DOM/vanilla JS, no access to extension APIs beyond `chrome.runtime.sendMessage`.
- **`popup.js`/`popup.html`** — the board review UI opened by clicking the toolbar icon. Reads/writes the same `board-<tabId>` storage key as background.js, renders items with drag-to-reorder, and on **Save Note** POSTs the assembled note (HTML content built by `buildContentHtml()`) to `https://inbox.notesnook.com/`. Titling and tagging both key off `boardItems.length === 0` (just the page link, nothing added to the board) independently of whether a tag ID is configured: that case titles the note `Link - <url>` and tags it with `webClipperLinksTagId` if set; otherwise it titles the note `Clipper - <title>` and tags it with `webClipperTagId` if set. Notes get at most one tag, and if the relevant tag ID is blank the note is saved untagged — there is no fallback to the other tag.
- **`options.js`/`options.html`** — settings page for `inboxApiKey`, `webClipperTagId`, and `webClipperLinksTagId`, all stored in `chrome.storage.local`.

**Board data model**: each tab has a `chrome.storage.local` entry keyed `board-<tabId>` (via the shared `boardKey()` in `common.js`) shaped `{ url, title, customTitle, items: [{type: "text"|"image", content}] }`. It's invalidated whenever `board.url !== tab.url` (i.e. navigating to a different URL resets the board) and deleted entirely on `chrome.tabs.onRemoved`. `background.js` (`getBoard`/`addItem`) and `popup.js` (`loadBoard`/`persistBoard`) each implement their own read-modify-write logic around that shared key — keep them in sync when changing the schema.

**Snip capture pipeline** (background.js): `chrome.tabs.captureVisibleTab` grabs the full visible viewport as a PNG data URL, then `cropDataUrl` uses `createImageBitmap` + `OffscreenCanvas` (service-worker-safe, no DOM) to crop to the selected rect scaled by `devicePixelRatio`, and `blobToDataUrl` re-encodes the crop back to a base64 data URL for storage. All three steps only work in a service worker context (no `document`, no `<canvas>`).

**Note assembly** (popup.js `buildContentHtml`): builds the Inbox API's `content.data` HTML directly via string concatenation with manual `escapeHtml`/`escapeAttr` — this is the one place that touches raw user/page content, so any new item type must be escaped here too. Order matches `boardItems` order (drag-to-reorder in the popup directly controls final note order).

Styling: `theme.css` (linked from both `popup.html` and `options.html`) holds the shared Nord color palette as CSS custom properties (`--nord0`…`--nord15`) plus the `* { box-sizing: border-box; }` reset — reuse these vars rather than introducing new colors. Page-specific layout/component styles stay inline in each HTML file's `<style>` block.

## Known limitations (see README.md for full list)

- Images added via context menu are saved by reference (URL), not fetched — they rely on the Notesnook editor to download them on first open. Snipped images, by contrast, are already base64 data URLs since they're screenshot crops.
- Inbox API is create-only: there's no append, so every Save Note is a new note.
- The Inbox API key is stored in plaintext in `chrome.storage.local` (no OS keychain access from extensions).
