# Notesnook Simple Clipper

> FYI: This project is fully vibe coded.

A minimal Chrome extension for clipping web pages into [Notesnook](https://notesnook.com) via its [Inbox API](https://help.notesnook.com/inbox-api/getting-started) — a simpler alternative to the official web clipper.

## What it does

Right-click text, images, or an area of the page to collect them into a per-tab "board." When you're ready, open the extension popup and hit **Save Note** to send everything as a single note to Notesnook.

- **Add selected text** to the board (right-click a selection).
- **Add an image** to the board (right-click an image).
- **Snip an area** of the page as a screenshot (right-click anywhere → drag to select a rectangle, Esc to cancel).
- Set a custom note title directly in the popup, or leave it blank to use the page's own title.
- **Reorder** board items by drag-and-drop before saving.
- **Remove** individual items, or **Clear All** to reset the board for the current page.
- Saving works even with an empty board — it still saves the page link.

## Note format

- **Title**: `Clipper: <title>` (your custom title, or the page's `<title>` if none is set) when the board has items, or `Link: <url>` when it's saved empty.
- **Content**: a timestamp + page link line, followed by each board item (text, image, or snip), each separated by a horizontal rule, in the order they appear in the board.
- **Tags** (both optional, configured independently — see Setup):
  - Notes with anything added to the board are tagged with your "Web-Clipper" tag, if configured.
  - Notes saved empty (just the page link) are tagged with your "Links" tag, if configured.
  - There's no fallback between the two — if the relevant tag isn't configured, that note is saved untagged.

## Setup

1. Load the extension: go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select this folder.
2. Get an Inbox API key from your Notesnook account settings (see the [Inbox API docs](https://help.notesnook.com/inbox-api/getting-started)).
3. Open the extension's options page (click the ⚙ icon in the popup, or right-click the extension icon → Options) and paste the key in.
4. Optional: create a tag named `Web-Clipper` in Notesnook, right-click it → **Copy ID**, and paste the ID into the options page. Notes with anything added to the board will be tagged with it.
5. Optional: create a second tag named `Links` in Notesnook, copy its ID the same way, and paste it into the options page. Notes saved empty — just the page link — will be tagged with it instead.

> **Note on API key storage**: the Inbox API key is stored via `chrome.storage.local` in plaintext in your browser profile — readable by anything with local access (e.g. malware, another OS user). There's no OS keychain API available to extensions, so this is standard, but treat the key accordingly: give it only inbox/write access, and revoke or rotate it from your Notesnook account settings if needed.

## Usage

1. Select text on a page and right-click → **Add selection to Notesnook board**.
2. Right-click any image → **Add image to Notesnook board**.
3. Right-click anywhere on the page → **Snip an area to Notesnook board**, then drag to select a rectangle (Esc cancels).
4. Open the popup (click the extension icon) to review the board: type a custom title, reorder items by dragging, or remove any with ×.
5. Click **Save Note** to send it to Notesnook as one note, or **Clear All** to start over.

The board is scoped per browser tab and resets automatically if you navigate to a different URL in that tab.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension manifest (MV3) |
| `common.js` | Shared helper (`boardKey`) used by both `background.js` and `popup.js` |
| `background.js` | Service worker — registers context menu items, owns per-tab board storage, handles screenshot capture/crop for snips |
| `snip.js` | Injected on demand into the page to draw the drag-to-select overlay for area snips |
| `popup.html` / `popup.js` | The board review UI, note assembly, and Save/Clear actions |
| `options.html` / `options.js` | Settings page for the Inbox API key and tag IDs |
| `theme.css` | Shared color palette and styles for the popup and options page |
| `icons/` | Extension icon (16/32/48/128px) |

## Limitations

- Images added via right-click are saved by reference (`<img src="...">` pointing at the original URL). The Notesnook editor automatically downloads and re-attaches these as local encrypted attachments the first time you open the note, so this is normally transparent. If the source image goes offline or requires auth *before* the note is ever opened, that download fails silently and the image is permanently lost. Snipped screenshots aren't affected — they're saved as embedded base64 images.
- The Inbox API only creates new notes — there's no way to append to an existing note, so each save is always a new note.
- Requires Chrome/Edge (Manifest V3). Not tested on Firefox.
