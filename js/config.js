// ============================================================
// GEAR BINS — config
// The list of bins itself now lives in data/bins.json (editable
// live from the "Manage Bins" page). This file just points at
// your GitHub repo.
// ============================================================

const GEARBINS_CONFIG = {
  // Your GitHub username and repo name, e.g. "spencer" / "gear-bins"
  owner: "YOUR_GITHUB_USERNAME",
  repo: "YOUR_REPO_NAME",
  branch: "main"
};

// Fetch the current bin list as plain data (used by read-only pages:
// index.html, bins/viewer.html). Cache-busted so renames/adds show up
// without waiting on a stale cache.
async function loadBinsPublic(relativePrefix = "") {
  const res = await fetch(`${relativePrefix}data/bins.json?_=${Date.now()}`);
  if (!res.ok) return [];
  return res.json();
}
