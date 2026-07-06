/* =====================================================================
   ODDLY: admin panel
   Working copy lives in localStorage. "Export products.js" writes the
   file your live site actually reads.
   ===================================================================== */
(function () {
  "use strict";

  const KEY = "oddly_products_v1";
  const COLORS = ["#7B5CF0", "#FF5436", "#64BC26", "#2FB6E8", "#FFB021", "#FF5FA8"];

  /* ---------- state ---------- */
  let products = load();
  let editing = null; // index being edited, or null when adding
  let chosenColor = COLORS[0];
  let listQuery = "";

  function load() {
    let saved;
    try {
      saved = localStorage.getItem(KEY);
    } catch (e) {
      // storage blocked (private browsing, disabled cookies, etc.)
      setTimeout(() => toast("Local storage is blocked here — your edits won't be saved"), 0);
      return JSON.parse(JSON.stringify(ODDLY_PRODUCTS));
    }
    if (!saved) return JSON.parse(JSON.stringify(ODDLY_PRODUCTS)); // seed from products.js
    try {
      return JSON.parse(saved);
    } catch (e) {
      setTimeout(() => toast("Saved product data was corrupted — reverted to defaults"), 0);
      return JSON.parse(JSON.stringify(ODDLY_PRODUCTS));
    }
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(products));
    } catch (e) {
      toast("Couldn't save — storage is full or blocked. Export products.js now so you don't lose this.");
    }
    renderStats();
  }

  /* ---------- elements ---------- */
  const form = document.getElementById("form");
  const rowsEl = document.getElementById("rows");
  const statsEl = document.getElementById("stats");
  const previewEl = document.getElementById("preview-card");
  const catSelect = document.getElementById("cat-select");
  const swatchesEl = document.getElementById("swatches");
  const titleEl = document.getElementById("editor-title");
  const saveBtn = document.getElementById("btn-save");
  const cancelBtn = document.getElementById("btn-cancel");
  const newBtn = document.getElementById("btn-new");
  const urlInput = form.elements.url;
  const refreshBtn = document.getElementById("btn-refresh");
  const imageUrlInput = document.getElementById("image-url-input");
  const photoInput = document.getElementById("photo-input");
  const photoAttached = document.getElementById("photo-attached");
  const photoThumb = document.getElementById("photo-thumb");
  const btnRemovePhoto = document.getElementById("btn-remove-photo");
  const ghModal = document.getElementById("gh-modal");
  const ghForm = document.getElementById("gh-form");

  const money = (n) => "$" + Number(n || 0).toFixed(2).replace(/\.00$/, "");
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cleanUrl = (value) => {
    const v = String(value || "").trim();
    if (!v) return "";
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
  };
  // Accepts http(s) URLs and data:image URIs (from the photo uploader); rejects
  // everything else (javascript:, data:text/html, etc.) so a bad paste can't
  // end up as an <img src>.
  const isSafeImageUrl = (value) => /^https?:\/\//i.test(value) || /^data:image\//i.test(value);
  // Normalizes the common shorthand people paste into the Image URL field:
  // protocol-relative ("//cdn...") and bare hosts ("cdn.shop.com/x.jpg").
  const normalizeImageUrl = (value) => {
    const v = String(value || "").trim();
    if (!v) return "";
    if (/^data:image\//i.test(v)) return v;
    if (v.startsWith("//")) return "https:" + v;
    if (/^https?:\/\//i.test(v)) return v;
    if (/^[\w-]+(\.[\w-]+)+(\/|$)/i.test(v)) return "https://" + v;
    return v;
  };
  const decodeHtml = (value) =>
    String(value || "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  const humanizeSlug = (url) => {
    try {
      const path = new URL(url).pathname.replace(/\/+$/, "").split("/").filter(Boolean).pop() || "Product";
      return decodeURIComponent(path).replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    } catch (e) {
      return "Product";
    }
  };
  const extractMeta = (html, names) => {
    for (const name of names) {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"));
      if (m) return decodeHtml(m[1].trim());
    }
    return "";
  };
  const extractLinkImage = (html) => {
    const m = html.match(/<link[^>]+rel=["'](?:image_src|preload|icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i);
    return m ? decodeHtml(m[1].trim()) : "";
  };
  const extractJsonLdImage = (html) => {
    const m = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    if (!m) return "";
    for (const script of m) {
      try {
        const json = JSON.parse(script.replace(/<script[^>]*>|<\/script>/gi, ""));
        const image = json.image || (json.product && json.product.image) || (json['@graph'] && json['@graph'].find((item) => item.image)?.image);
        if (image) return Array.isArray(image) ? image[0] : image;
      } catch (err) {
        continue;
      }
    }
    return "";
  };
  const extractTitle = (html) => {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m ? decodeHtml(m[1].trim()) : "";
  };
  const extractPrice = (html) => {
    const m = html.match(/\$(\d+(?:\.\d{1,2})?)/);
    return m ? Number(m[1]) : 0;
  };
  // r.jina.ai's proxy usually answers with its "Reader" format (a plain-text/
  // markdown extraction), not raw HTML, so the <meta>/<title> regexes above
  // often find nothing. These two cover that common case.
  const extractMarkdownTitle = (text) => {
    const m = text.match(/^Title:\s*"?([^"\n]+?)"?\s*$/m);
    return m ? decodeHtml(m[1].trim()) : "";
  };
  const extractMarkdownImage = (text) => {
    const m = text.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/);
    return m ? m[1] : "";
  };
  async function importProductFromUrl(product, opts = {}) {
    const { forceImage = false } = opts;
    const url = product.url && product.url !== "#" ? cleanUrl(product.url) : "";
    if (!url) return product;
    const proxyUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, "")}`;
    try {
      const res = await fetch(proxyUrl, { headers: { Accept: "text/html,application/xhtml+xml" } });
      if (!res.ok) throw new Error("fetch failed");
      const html = await res.text();
      const title = extractMeta(html, ["og:title", "twitter:title"]) || extractTitle(html) || extractMarkdownTitle(html);
      let image =
        extractMeta(html, ["og:image", "twitter:image"]) ||
        extractLinkImage(html) ||
        extractJsonLdImage(html) ||
        extractMarkdownImage(html) ||
        "";
      const blurb = extractMeta(html, ["description", "og:description", "twitter:description"]) || "";
      const price = extractPrice(html);
      const host = new URL(url).hostname.replace(/^www\./, "");
      // Normalize image URL to an absolute, secure URL if possible
      try {
        if (image && image.startsWith("//")) image = "https:" + image;
        else if (image && image.startsWith("/")) image = new URL(image, url).href;
        else if (image && !/^https?:\/\//i.test(image)) image = new URL(image, url).href;
      } catch (err) {
        // leave image as-is if URL resolution fails
      }
      if (image && !isSafeImageUrl(image)) image = ""; // drop anything that isn't a plain http(s) image URL

      return {
        ...product,
        name: product.name || title || humanizeSlug(url),
        blurb: product.blurb || blurb.replace(/\s+/g, " ").slice(0, 140),
        price: product.price || price || 0,
        store: product.store || host,
        image: (forceImage ? image || product.image : product.image || image) || undefined,
        url,
      };
    } catch (e) {
      const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (error) { return "Store"; } })();
      return {
        ...product,
        name: product.name || humanizeSlug(url),
        store: product.store || host,
        url,
      };
    }
  }
  const tint = (hex) => {
    const h = hex.replace("#", "");
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},0.14)`;
  };

  /* ---------- build category dropdown + swatches ---------- */
  // Add an explicit empty option so new imports don't default to the first
  // real category (previously 'Desk'). Users can choose a category manually.
  catSelect.innerHTML = '<option value="">Uncategorized</option>' +
    ODDLY_CATEGORIES.filter((c) => c !== "All")
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");

  function renderSwatches() {
    swatchesEl.innerHTML =
      COLORS.map(
        (c) =>
          `<button type="button" class="sw${c === chosenColor ? " is-active" : ""}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`
      ).join("") +
      `<label class="sw sw--custom" title="Custom colour">🎨<input type="color" id="custom-color" value="${chosenColor}"></label>`;
  }
  swatchesEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-color]");
    if (!b) return;
    chosenColor = b.dataset.color;
    renderSwatches();
    updatePreview();
  });
  swatchesEl.addEventListener("input", (e) => {
    if (e.target.id === "custom-color") {
      chosenColor = e.target.value.toUpperCase();
      renderSwatches();
      updatePreview();
    }
  });

  /* ---------- form <-> object ---------- */
  function formData() {
    const f = new FormData(form);
    const p = {
      name: (f.get("name") || "").trim(),
      blurb: (f.get("blurb") || "").trim(),
      price: parseFloat(f.get("price")) || 0,
      cat: f.get("cat"),
      emoji: (f.get("emoji") || "").trim() || "🎁",
      c: chosenColor,
      store: (f.get("store") || "").trim(),
      url: cleanUrl(f.get("url")) || "#",
      sponsored: f.get("sponsored") === "on",
    };
    const img = normalizeImageUrl(f.get("image"));
    if (img && isSafeImageUrl(img)) p.image = img;
    return p;
  }

  function fillForm(p) {
    form.name.value = p.name || "";
    form.blurb.value = p.blurb || "";
    form.price.value = p.price != null ? p.price : "";
    form.cat.value = p.cat || "";
    form.emoji.value = p.emoji || "";
    form.store.value = p.store || "";
    form.image.value = p.image || "";
    form.url.value = p.url && p.url !== "#" ? cleanUrl(p.url) : "";
    form.sponsored.checked = !!p.sponsored;
    chosenColor = p.c || COLORS[0];
    renderSwatches();
    syncPhotoUI();
  }

  /* ---------- upload-a-photo (resized in-browser, stored as data URI) ---------- */
  // A data: URI image means "no hosting needed" — it lives directly in the
  // product record — but it's long and unreadable, so once one is attached we
  // hide the raw URL box behind a small thumbnail + remove button instead.
  function syncPhotoUI() {
    const isPhoto = /^data:image\//i.test(form.image.value || "");
    photoAttached.hidden = !isPhoto;
    imageUrlInput.closest(".fld").hidden = isPhoto;
    if (isPhoto) photoThumb.src = form.image.value;
  }
  function resizePhotoFile(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Couldn't read that file"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Couldn't decode that image"));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height / width) * maxDim);
              width = maxDim;
            } else {
              width = Math.round((width / height) * maxDim);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  if (photoInput) {
    photoInput.addEventListener("change", async () => {
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      toast("Processing photo…");
      try {
        form.image.value = await resizePhotoFile(file, 900, 0.82);
        syncPhotoUI();
        updatePreview();
        toast("Photo attached — save to keep it");
      } catch (e) {
        toast(e.message || "Couldn't process that photo");
      } finally {
        photoInput.value = "";
      }
    });
  }
  if (btnRemovePhoto) {
    btnRemovePhoto.addEventListener("click", () => {
      form.image.value = "";
      syncPhotoUI();
      updatePreview();
    });
  }

  // If an <img> fails to load (hotlink-blocked, dead link, CORS…), swap it
  // for the product's emoji instead of leaving a blank box.
  function attachImageFallback(container) {
    container.querySelectorAll("img[data-fallback]").forEach((img) => {
      img.addEventListener(
        "error",
        () => {
          const span = document.createElement("span");
          span.textContent = img.dataset.fallback || "🎁";
          img.replaceWith(span);
        },
        { once: true }
      );
    });
  }

  /* ---------- live preview ---------- */
  function previewCard(p) {
    const media = p.image ? `<img src="${esc(p.image)}" alt="" data-fallback="${esc(p.emoji || "🎁")}">` : esc(p.emoji || "🎁");
    const badge = p.sponsored
      ? `<span class="card__badge">★ Sponsored</span>`
      : `<span class="card__cat">${esc(p.cat)}</span>`;
    return `<div class="card${p.sponsored ? " is-sponsored" : ""}" style="--_c:${p.c}">
      <div class="card__media" style="background:${tint(p.c)}">${media}${badge}</div>
      <div class="card__body">
        <div class="card__name">${esc(p.name) || "Product name"}</div>
        <div class="card__blurb">${esc(p.blurb) || "Your quirky one-liner goes here."}</div>
        <div class="card__row"><span class="card__price">${money(p.price)}</span>
        <span class="card__store">${esc(p.store) || "Store"}</span></div>
      </div></div>`;
  }
  function updatePreview() {
    previewEl.innerHTML = previewCard(formData());
    attachImageFallback(previewEl);
  }
  form.addEventListener("input", updatePreview);
  urlInput.addEventListener("paste", () => {
    setTimeout(() => updatePreview(), 50);
  });

  // Refresh metadata for the current form URL without saving
  async function refreshFormMetadata() {
    const base = formData();
    if (!base.url || base.url === "#") {
      toast("No link to fetch");
      return;
    }
    toast("Fetching metadata…");
    const p = await importProductFromUrl(base, { forceImage: true });
    fillForm(p);
    updatePreview();
    toast("Metadata updated — edit and save when ready");
  }
  if (refreshBtn) refreshBtn.addEventListener("click", refreshFormMetadata);

  /* ---------- list ---------- */
  function renderRows() {
    const q = listQuery.trim().toLowerCase();
    const items = products
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => !q || (p.name + " " + p.store + " " + p.cat).toLowerCase().includes(q));

    if (!items.length) {
      rowsEl.innerHTML = `<p class="empty-list">No products${q ? " match “" + esc(q) + "”" : " yet, add one on the left"}.</p>`;
      return;
    }
    rowsEl.innerHTML = items
      .map(({ p, i }) => {
        const media = p.image ? `<img src="${esc(p.image)}" alt="" data-fallback="${esc(p.emoji || "🎁")}">` : esc(p.emoji || "🎁");
        return `<div class="row${p.sponsored ? " is-sponsored" : ""}">
        <div class="row__media" style="background:${tint(p.c)}">${media}</div>
        <div class="row__info">
          <div class="row__name">${p.sponsored ? '<span class="star">★</span>' : ""}${esc(p.name)}</div>
          <div class="row__sub">${money(p.price)} · ${esc(p.cat)} · ${esc(p.store)}</div>
        </div>
        <div class="row__actions">
          <button class="icon-btn" data-edit="${i}" title="Edit">✎</button>
          <button class="icon-btn" data-refresh="${i}" title="Refresh metadata">🔁</button>
          <button class="icon-btn del" data-del="${i}" title="Delete">🗑</button>
        </div>
      </div>`;
      })
      .join("");
    attachImageFallback(rowsEl);
  }

  rowsEl.addEventListener("click", (e) => {
    const ed = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
    const rf = e.target.closest("[data-refresh]");
    if (ed) startEdit(+ed.dataset.edit);
    if (del) {
      const i = +del.dataset.del;
      if (confirm(`Delete “${products[i].name}”?`)) {
        products.splice(i, 1);
        if (editing === i) resetForm();
        persist();
        renderRows();
        toast("Deleted");
      }
    }
    if (rf) {
      const i = +rf.dataset.refresh;
      refreshProduct(i);
    }
  });

  document.getElementById("list-search").addEventListener("input", (e) => {
    listQuery = e.target.value;
    renderRows();
  });

  // Refresh a single product's metadata (save immediately)
  async function refreshProduct(i) {
    if (!products[i]) return;
    const p0 = products[i];
    if (!p0.url || p0.url === "#") {
      toast("No link for this product");
      return;
    }
    toast(`Refreshing ${p0.name || 'product'}…`);
    const updated = await importProductFromUrl(p0, { forceImage: true });
    products[i] = { ...products[i], ...updated };
    persist();
    renderRows();
    toast("Product refreshed");
  }

  /* ---------- add / edit ---------- */
  function startEdit(i) {
    editing = i;
    fillForm(products[i]);
    titleEl.textContent = "Edit product";
    saveBtn.textContent = "Save changes";
    saveBtn.setAttribute("aria-label", "Save changes to this product");
    cancelBtn.hidden = false;
    newBtn.hidden = false;
    updatePreview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetForm() {
    editing = null;
    form.reset();
    chosenColor = COLORS[0];
    renderSwatches();
    titleEl.textContent = "Add a product";
    saveBtn.textContent = "Add product";
    saveBtn.removeAttribute("aria-label");
    cancelBtn.hidden = true;
    newBtn.hidden = true;
    syncPhotoUI();
    updatePreview();
  }
  cancelBtn.addEventListener("click", resetForm);
  newBtn.addEventListener("click", resetForm);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const base = formData();
    if (!base.name && !base.url) {
      toast("Add a name or paste a product link");
      return;
    }
    toast(base.url && base.url !== "#" ? "Fetching product details…" : "Saving product…");
    const p = await importProductFromUrl(base);
    if (!p.name) {
      toast("Name is required");
      return;
    }
    if (editing != null) {
      products[editing] = p;
      toast("Saved ✓");
    } else {
      products.unshift(p);
      toast("Added ✓");
    }
    persist();
    renderRows();
    resetForm();
  });

  /* ---------- stats ---------- */
  function renderStats() {
    const sp = products.filter((p) => p.sponsored).length;
    statsEl.innerHTML = `<b>${products.length}</b> products · <b>${sp}</b> sponsored`;
  }

  /* ---------- export / copy ---------- */
  function buildFile() {
    return (
      "/* =====================================================================\n" +
      "   ODDLY: product data engine  (generated by the admin panel)\n" +
      "   Edit here or in admin.html. `sponsored: true` = paying merchant.\n" +
      "   ===================================================================== */\n\n" +
      "const ODDLY_CATEGORIES = " +
      JSON.stringify(ODDLY_CATEGORIES) +
      ";\n\nconst ODDLY_PRODUCTS = " +
      JSON.stringify(products, null, 2) +
      ";\n"
    );
  }
  document.getElementById("btn-export").addEventListener("click", () => {
    const blob = new Blob([buildFile()], { type: "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products.js";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Downloaded. Replace assets/js/products.js, then push");
  });
  document.getElementById("btn-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(buildFile());
      toast("products.js copied to clipboard");
    } catch (e) {
      toast("Copy failed. Use Export instead");
    }
  });

  /* ---------- publish straight to GitHub ---------- */
  const GH_KEY = "oddly_gh_settings_v1";
  function loadGithubConfig() {
    try {
      const saved = localStorage.getItem(GH_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }
  function saveGithubConfig(cfg) {
    try {
      localStorage.setItem(GH_KEY, JSON.stringify(cfg));
      return true;
    } catch (e) {
      toast("Couldn't save GitHub settings — storage is full or blocked");
      return false;
    }
  }
  function openGithubSettings() {
    const cfg = loadGithubConfig() || {};
    ghForm.owner.value = cfg.owner || "";
    ghForm.repo.value = cfg.repo || "";
    ghForm.branch.value = cfg.branch || "main";
    ghForm.path.value = cfg.path || "assets/js/products.js";
    ghForm.token.value = cfg.token || "";
    ghModal.classList.add("open");
    ghModal.setAttribute("aria-hidden", "false");
  }
  function closeGithubSettings() {
    ghModal.classList.remove("open");
    ghModal.setAttribute("aria-hidden", "true");
  }
  const btnGhSettings = document.getElementById("btn-gh-settings");
  if (btnGhSettings) btnGhSettings.addEventListener("click", openGithubSettings);
  ghModal.querySelectorAll("[data-gh-close]").forEach((el) => el.addEventListener("click", closeGithubSettings));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ghModal.classList.contains("open")) closeGithubSettings();
  });

  ghForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const cfg = {
      owner: ghForm.owner.value.trim(),
      repo: ghForm.repo.value.trim(),
      branch: ghForm.branch.value.trim() || "main",
      path: ghForm.path.value.trim() || "assets/js/products.js",
      token: ghForm.token.value.trim(),
    };
    if (!cfg.owner || !cfg.repo || !cfg.token) {
      toast("Repo owner, repo name and token are all required");
      return;
    }
    if (saveGithubConfig(cfg)) {
      toast("GitHub settings saved");
      closeGithubSettings();
    }
  });
  const btnGhForget = document.getElementById("btn-gh-forget");
  if (btnGhForget) {
    btnGhForget.addEventListener("click", () => {
      try {
        localStorage.removeItem(GH_KEY);
      } catch (e) {}
      ghForm.reset();
      toast("GitHub token forgotten");
    });
  }

  // base64-encode a unicode string for the GitHub Contents API
  function b64EncodeUnicode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  async function publishToGithub() {
    const cfg = loadGithubConfig();
    if (!cfg || !cfg.owner || !cfg.repo || !cfg.token) {
      toast("Connect a GitHub repo first");
      openGithubSettings();
      return;
    }
    const apiBase = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
    const ghHeaders = {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/vnd.github+json",
    };
    toast("Publishing to GitHub…");
    try {
      let sha;
      const getRes = await fetch(`${apiBase}?ref=${encodeURIComponent(cfg.branch)}`, { headers: ghHeaders });
      if (getRes.ok) {
        sha = (await getRes.json()).sha;
      } else if (getRes.status !== 404) {
        const body = await getRes.json().catch(() => ({}));
        throw new Error(body.message || `Couldn't read the current file (${getRes.status})`);
      }
      const putRes = await fetch(apiBase, {
        method: "PUT",
        headers: { ...ghHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Update products.js via ODDLY admin (${new Date().toISOString()})`,
          content: b64EncodeUnicode(buildFile()),
          branch: cfg.branch,
          ...(sha ? { sha } : {}),
        }),
      });
      if (!putRes.ok) {
        const body = await putRes.json().catch(() => ({}));
        throw new Error(body.message || `GitHub rejected the update (${putRes.status})`);
      }
      toast("Published ✓ — live once GitHub Pages rebuilds");
    } catch (e) {
      toast(`Publish failed: ${e.message}`);
    }
  }
  const btnPublish = document.getElementById("btn-publish");
  if (btnPublish) {
    btnPublish.addEventListener("click", async () => {
      btnPublish.disabled = true;
      try {
        await publishToGithub();
      } finally {
        btnPublish.disabled = false;
      }
    });
  }

  /* ---------- toast ---------- */
  let tt;
  const toastEl = document.getElementById("toast");
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(tt);
    tt = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  /* ---------- boot ---------- */
  renderSwatches();
  resetForm();
  renderRows();
  renderStats();
})();
