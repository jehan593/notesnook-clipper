# Notesnook Simple Clipper

A minimal Chrome extension for clipping web pages into [Notesnook](https://notesnook.com) via its [Inbox API](https://help.notesnook.com/inbox-api/getting-started) — built as a simpler alternative to the official web clipper.

## What it does

Right-click text or images on any page to collect them into a per-tab "board." When you're ready, open the extension popup and hit **Save Note** to send everything as a single note to Notesnook.

- **Add selected text** to the board (right-click a selection).
- **Use selected text as the note title** (right-click a selection), or type a title directly in the popup.
- **Add an image** to the board (right-click an image).
- **Reorder** board items by drag-and-drop before saving.
- **Remove** individual items, or **Clear All** to reset the board for the current page.
- Saving works even with an empty board — it still saves the page link.
- Every note is tagged (optional) with a tag you configure, e.g. `web-clipper`.

## Note format

- **Title**: whatever you've typed/selected as the title, or the page's own `<title>` if none is set.
- **Content**: a timestamp + page link line, followed by each board item (text or image), each separated by a horizontal rule, in the order they appear in the board.

## Setup

1. Load the extension: go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this folder.
2. Get an Inbox API key from your Notesnook account settings (see the [Inbox API docs](https://help.notesnook.com/inbox-api/getting-started)).
3. Open the extension's options page (click the ⚙ icon in the popup, or right-click the extension icon → Options) and paste the key in.
4. Optional: create a tag (e.g. `web-clipper`) in Notesnook, right-click it → **Copy ID**, and paste the ID into the options page. Every note this extension creates will be tagged with it.

> **Note on API key storage**: the Inbox API key is saved via `chrome.storage.local`, which is not encrypted at rest — it's kept in plaintext in your browser profile, readable by anything with local access to that profile (e.g. malware, another OS user). This is standard for browser extensions (there's no OS keychain API available to them), but treat the key accordingly: it should only ever have inbox/write access, and you can revoke or rotate it from your Notesnook account settings at any time.

## Usage

1. Select text on a page and right-click → **Add selection to Notesnook board**, or **Use selection as note title**.
2. Right-click any image → **Add image to Notesnook board**.
   - These three actions register as separate context menu entries. Chrome automatically nests multiple simultaneously-visible entries from one extension under a single flyout menu — this is built-in Chrome behavior with no way to disable it, not something this extension controls.
3. Open the popup (click the extension icon) to review the board: reorder items by dragging, remove any with ×, or type a custom title directly.
4. Click **Save Note** to send it to Notesnook as one note, or **Clear All** to start over.

The board is scoped per browser tab and resets automatically if you navigate to a different URL in that tab.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (MV3) |
| `background.js` | Service worker — registers context menu items, stores board data per tab |
| `popup.html` / `popup.js` | The clip board UI and Save/Clear actions |
| `options.html` / `options.js` | Settings page for the Inbox API key and tag ID |
| `icons/` | Extension icon (16/32/48/128px) |

## Limitations

- Images are saved by reference (`<img src="...">` pointing at the original URL). The Notesnook editor automatically downloads and re-attaches these as local encrypted attachments the first time you open the note, so this is normally transparent. If the source image goes offline or requires auth *before* the note is ever opened, that download fails silently and the image is permanently lost.
- The Inbox API only creates new notes — there's no way to append to an existing note, so each save is always a new note.
- Requires Chrome/Edge (Manifest V3). Not tested on Firefox.
