# Gear Bins

A QR-code-driven inventory system for your gear bins. Scan a QR code stuck on a bin,
see everything inside it with a photo. Add new items from your phone — no backend
server, it's a static site that writes to itself via the GitHub API.

## How it works

- **`index.html`** — homepage listing all bins as tags, each with a live QR code.
- **`bins/viewer.html?bin=bin1`** — shows the contents of one bin (reads `data/bin1.json`).
- **`add/index.html?bin=bin1`** — form to add a new item + photo. Commits directly
  to your GitHub repo using the GitHub REST API, called from your phone's browser.
- **`manage/index.html?bin=bin1`** — edit or delete items already in a bin.
- **`manage-bins/index.html`** — add, rename, or delete entire bins.
- **`data/bins.json`** — the live list of bins (id + display label). Editable from
  the Manage Bins page, or by hand on GitHub.
- **`data/binN.json`** — one JSON file per bin, the source of truth for that bin's item list.
- **`images/binN/`** — photos for that bin's items.

No server, no database — GitHub Pages serves the static files, and the add/manage
pages write new commits straight to the repo via the GitHub API.

## Setup (one-time)

### 1. Create the repo and enable Pages
1. Create a new **public** GitHub repo (private repos work too, but Pages requires
   GitHub Pro/Team for private-repo Pages).
2. Push this folder's contents to the repo root.
3. In the repo: **Settings → Pages → Source → Deploy from branch → `main` / root**.
4. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`.

### 2. Point config.js at your repo
Edit `js/config.js`:
```js
const GEARBINS_CONFIG = {
  owner: "YOUR_GITHUB_USERNAME",
  repo: "YOUR_REPO_NAME",
  branch: "main"
};
```
The actual list of bins (`data/bins.json`) ships with 6 placeholder bins
(`bin1`…`bin6`) — rename or replace them from the **Manage Bins** page once the
site is live, no code editing required.

### 3. Create a GitHub token for adding items
The add form needs a **fine-grained personal access token** so it can commit on
your behalf from the browser:
1. GitHub → **Settings → Developer settings → Fine-grained tokens → Generate new token**.
2. Resource owner: your account. Repository access: **only this repo**.
3. Permissions → **Contents: Read and write**. Nothing else.
4. Set an expiration (90 days is fine — you'll just re-paste it when it expires).
5. Copy the token (starts with `github_pat_…`).

You'll paste this into the add page once; it's saved in that browser's
`localStorage` only, and is never written into the repo itself.

**Security note:** this token lives in your phone's browser storage. Anyone with
access to your unlocked phone and that browser tab could read it. Scoping the
token to just this one repo with only Contents read/write limits the blast radius
if that ever happens. Don't reuse a broad "all repos" token here.

### 4. Print your QR codes
Open `index.html` on the deployed site — each bin tag renders a live QR code
pointing at that bin's viewer page. Screenshot or print the page, cut out each
QR code, and tape it to the matching physical bin.

## Day-to-day use

**To look inside a bin:** scan its QR code → opens `viewer.html` for that bin.

**To add an item:** scan the bin's QR code → tap "+ Add Item" (or go to
`add/index.html?bin=binN` directly) → paste your token (first time only) →
take/choose a photo → fill in the name → **Save to GitHub**.

**To edit or delete an item:** from a bin's viewer page, tap **Manage** (or go to
`manage/index.html?bin=binN`) → tap ✎ to edit name/notes/photo, or ✕ to delete.

**To add, rename, or delete a whole bin:** go to `manage-bins/index.html` →
fill in a label (the bin ID auto-fills from it, editable) → **Create Bin**. This
sets up `data/{id}.json` and an `images/{id}/` folder automatically. Deleting a
bin removes it from the list and deletes its item data + photos — print a new
QR code for any bin you add, from the homepage.

The photo is downscaled to ~1280px and compressed to JPEG in the browser before
upload, so it stays small and fast to load. GitHub Pages usually reflects the
change within 30–60 seconds; refresh the page to see it.

## Notes & limits

- GitHub's Contents API caps file uploads around 1MB when using this simple
  base64 method (fine for compressed photos; the form already compresses).
- Two people editing the *same bin* or *bin list* at the *exact same second*
  could hit a merge conflict (the JSON `sha` will be stale) — just retry the save.
- Renaming a bin's ID isn't supported (it's baked into the QR code and file
  paths) — only its display label can be changed. To really rename the ID,
  create a new bin and manually move items over.
