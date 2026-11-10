# Lumina Studio V83.3 — Modular Start Screen + about:blank

**PRIVATE LOCAL COPY — PERSONAL VERSION:** this includes your previously saved Gemini configuration. Do not upload this ZIP or its contents to GitHub, Netlify, or any publicly accessible host. Use only on trusted local/private infrastructure.

## Deploy to GitHub Pages

1. Extract this entire ZIP. Do not upload just index.html; the folders are required.
2. Upload `index.html`, `css/`, `js/`, `workspace/`, and `library/` to the **root** of your repository.
3. In Settings > Pages, set **Deploy from a branch**, choose your branch (usually main), and folder `/ (root)`.
4. Open the GitHub Pages URL. Allow a popup for the site if you want the `about:blank` workspace. Lumina shows its start screen. Click **Launch Lumina in about:blank** to open the separate workspace. Automatic blank launch is optional and off by default; Chrome may block pop-ups without a user click.
5. Enter your Gemini key in the launcher **for your personal session**. Never commit an API key or upload a personal build to a public repository.

## Directory overview

- `index.html`: launcher page
- `css/launcher.css`: launcher styling
- `js/launcher.js`: launcher, diagnostics, blank-tab opening, floating workspace
- `js/config.js`: intentionally blank public configuration
- `workspace/index.html`: Lumina UI and controls
- `css/workspace.css`: workspace styles
- `js/app-core.js`: AI/chat/editor/project/test logic
- `js/privacy.js`: privacy overlay
- `js/recovery.js`: snapshot recovery
- `js/library.js`: Library UI, sandbox navigation and save bridge
- `library/blackjack/index.html`: original Blackjack UI
- `library/blackjack/blackjack.css`: Blackjack styling
- `library/blackjack/storage-bridge.js`: isolated save adapter
- `library/blackjack/ui-layout.js`: blackjack HUD layout
- `library/blackjack/blackjack.js`: gameplay, betting, sound, and cleaning shift

## Important behavior

- This modular version requires the site files to be served by HTTP(S); simply opening index.html from disk may not allow fetch() to load workspace files.
- An `about:blank` tab is opened synchronously when possible and then populated from the hosted files. The URL remains `about:blank`; assets are downloaded from the GitHub Pages origin.
- Popup policies apply to about:blank tabs. The main Launch button uses a user click; automatic opening must be enabled explicitly.
- Blackjack runs in a sandboxed frame **without allow-same-origin**. Its permitted balance and labor-progress storage keys are bridged to the parent. On-site persistence depends on browser storage permissions and can vary with privacy modes.
- Public repository sources and deployed assets are always inspectable. Renaming UI labels or files cannot guarantee a network filter will allow the site.
- GitHub Pages is static hosting: it cannot securely hide a Gemini key. For a shared/public site, use a separately secured backend or have each user supply their own key.

## Local test via HTTP

From the extracted folder, run `python -m http.server 8000`, then visit http://localhost:8000/?launcher=1.

## Upgrading individual components

- Edit Blackjack in library/blackjack/; no need to rebuild the launcher.
- Edit the Library in js/library.js and workspace/index.html.
- Edit chat/editor/test logic in js/app-core.js.
- Keep css and JS asset paths relative to the GitHub repository root. Do not remove the base URL injected by the launcher into about:blank.

No server-side secret storage is included.

## Reproducible checks

Run `python tests/check_structure.py` and `node tests/check_bridge.js` from the project root. The Chromium smoke test is documented in `V83_TEST_REPORT.json`.

## V83.1 — Starter tab close behavior

- Normal browser-opened launcher tabs **cannot be automatically closed** by webpage JavaScript. After the `about:blank` workspace is confirmed ready, the launcher gives a Ctrl+W / Cmd+W instruction instead of retrying a blocked `window.close()`.
- If the launcher itself was opened as a script-created tab (conservatively identified by an opener and single history entry), one close attempt is still made, with a manual fallback.
- The separate Lumina workspace is never closed by the launcher. `Start in this tab` remains available when a single-tab workflow is preferred (the URL stays visible).
- This is a browser limitation, not an error loading the workspace.

## V83.3 — Restore start screen + blank-tab launch

- The launcher stays visible when you open the site. It no longer replaces itself with the workspace.
- **Launch Lumina in about:blank** is the primary button. Click to create the blank workspace and populate it with the modular assets.
- Optional auto-open uses a new preference (off by default) to avoid inheriting the V83.2 single-tab setting. Automatic pop-ups may be blocked.
- The original starter tab is auto-closed only when the browser allows it. Manually opened browser tabs normally cannot be closed by a website; use Ctrl+W / Cmd+W.
- **Start in this tab** stays as a fallback; it does not display `about:blank` in the URL.
- Keep the personal ZIP private because the embedded Gemini key can be extracted; use only the keyless public package on GitHub Pages.
