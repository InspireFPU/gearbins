// ============================================================
// GEAR BINS — GitHub Contents API helper
// Talks directly to api.github.com from the browser using a
// personal access token the user pastes in (stored only in
// this browser's localStorage, never committed to the repo).
// ============================================================

const GH_TOKEN_KEY = "gearbins_gh_pat";

const GithubApi = {
  getToken() {
    return localStorage.getItem(GH_TOKEN_KEY) || "";
  },
  setToken(token) {
    localStorage.setItem(GH_TOKEN_KEY, token.trim());
  },
  clearToken() {
    localStorage.removeItem(GH_TOKEN_KEY);
  },

  _headers(token) {
    return {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  },

  _contentsUrl(path) {
    const { owner, repo } = GEARBINS_CONFIG;
    return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  },

  // Fetch a file's decoded text content + sha (sha is needed to update it).
  // Returns { content: string|null, sha: string|null } — content is null if file doesn't exist yet.
  async getFile(path) {
    const token = this.getToken();
    const res = await fetch(this._contentsUrl(path) + `?ref=${GEARBINS_CONFIG.branch}`, {
      headers: this._headers(token)
    });
    if (res.status === 404) return { content: null, sha: null };
    if (!res.ok) throw new Error(`GitHub read failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    // content comes back base64-encoded, possibly with newlines
    const decoded = decodeURIComponent(
      atob(data.content.replace(/\n/g, ""))
        .split("")
        .map(c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return { content: decoded, sha: data.sha };
  },

  // Fetch a file's raw base64 content + sha, without decoding — safe for
  // binary files (images). Returns null if the file doesn't exist.
  async getFileRaw(path) {
    const token = this.getToken();
    const res = await fetch(this._contentsUrl(path) + `?ref=${GEARBINS_CONFIG.branch}`, {
      headers: this._headers(token)
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub read failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    return { base64: data.content.replace(/\n/g, ""), sha: data.sha };
  },

  // Fetch just a file's sha (safe for binary files — doesn't attempt to decode content).
  // Returns null if the file doesn't exist.
  async getFileSha(path) {
    const token = this.getToken();
    const res = await fetch(this._contentsUrl(path) + `?ref=${GEARBINS_CONFIG.branch}`, {
      headers: this._headers(token)
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub read failed (${res.status}): ${await res.text()}`);
    const data = await res.json();
    return data.sha;
  },

  // Create or update a text file (e.g. JSON) at `path`.
  async putTextFile(path, textContent, message, sha) {
    const token = this.getToken();
    const base64 = btoa(unescape(encodeURIComponent(textContent)));
    return this._put(path, base64, message, sha, token);
  },

  // Create or update a binary file (e.g. a JPEG) from a base64 string (no data: prefix).
  async putBinaryFile(path, base64Content, message, sha) {
    const token = this.getToken();
    return this._put(path, base64Content, message, sha, token);
  },

  // Delete a file at `path`. Requires its current sha (fetch via getFile first).
  async deleteFile(path, message, sha) {
    const token = this.getToken();
    const res = await fetch(this._contentsUrl(path), {
      method: "DELETE",
      headers: { ...this._headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ message, sha, branch: GEARBINS_CONFIG.branch })
    });
    if (!res.ok) throw new Error(`GitHub delete failed (${res.status}): ${await res.text()}`);
    return res.json();
  },

  async _put(path, base64Content, message, sha, token) {
    const body = {
      message,
      content: base64Content,
      branch: GEARBINS_CONFIG.branch
    };
    if (sha) body.sha = sha;

    const res = await fetch(this._contentsUrl(path), {
      method: "PUT",
      headers: { ...this._headers(token), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`GitHub write failed (${res.status}): ${await res.text()}`);
    return res.json();
  }
};

// Convert a File (image) to a base64 string stripped of the data: prefix,
// downscaling it first so bin JSON pages stay fast to load.
async function fileToCompressedBase64(file, maxDim = 1280, quality = 0.8) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > height && width > maxDim) {
    height = Math.round(height * (maxDim / width));
    width = maxDim;
  } else if (height > maxDim) {
    width = Math.round(width * (maxDim / height));
    height = maxDim;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);

  const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
  return compressedDataUrl.split(",")[1]; // strip "data:image/jpeg;base64,"
}
