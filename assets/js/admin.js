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
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return JSON.parse(JSON.stringify(ODDLY_PRODUCTS)); // seed from products.js
  }
  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(products));
    } catch (e) {}
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

  const money = (n) => "$" + Number(n || 0).toFixed(2).replace(/\.00$/, "");
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>\"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const cleanUrl = (value) => {
    const v = String(value || "").trim();
    if (!v) return "";
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
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
  const extractTitle = (html) => {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m ? decodeHtml(m[1].trim()) : "";
  };
  const extractPrice = (html) => {
    const m = html.match(/\$(\d+(?:\.\d{1,2})?)/);
    return m ? Number(m[1]) : 0;
  };
  async function importProductFromUrl(product) {
    const url = product.url && product.url !== "#" ? cleanUrl(product.url) : "";
    if (!url) return product;
    const proxyUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, "")}`;
    try {
      const res = await fetch(proxyUrl, { headers: { Accept: "text/html,application/xhtml+xml" } });
      if (!res.ok) throw new Error("fetch failed");
      const html = await res.text();
      const title = extractMeta(html, ["og:title", "twitter:title"]) || extractTitle(html);
      const image = extractMeta(html, ["og:image", "twitter:image"]) || "";
      const blurb = extractMeta(html, ["description", "og:description", "twitter:description"]) || "";
      const price = extractPrice(html);
      const host = new URL(url).hostname.replace(/^www\./, "");
      return {
        ...product,
        name: product.name || title || humanizeSlug(url),
        blurb: product.blurb || blurb.replace(/\s+/g, " ").slice(0, 140),
        price: product.price || price || 0,
        store: product.store || host,
        image: product.image || image || undefined,
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
  catSelect.innerHTML = ODDLY_CATEGORIES.filter((c) => c !== "All")
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
    const img = (f.get("image") || "").trim();
    if (img) p.image = img;
    return p;
  }

  function fillForm(p) {
    form.name.value = p.name || "";
    form.blurb.value = p.blurb || "";
    form.price.value = p.price != null ? p.price : "";
    form.cat.value = p.cat || ODDLY_CATEGORIES[1];
    form.emoji.value = p.emoji || "";
    form.store.value = p.store || "";
    form.image.value = p.image || "";
    form.url.value = p.url && p.url !== "#" ? cleanUrl(p.url) : "";
    form.sponsored.checked = !!p.sponsored;
    chosenColor = p.c || COLORS[0];
    renderSwatches();
  }

  /* ---------- live preview ---------- */
  function previewCard(p) {
    const media = p.image ? `<img src="${esc(p.image)}" alt="">` : esc(p.emoji || "🎁");
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
  }
  form.addEventListener("input", updatePreview);

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
        const media = p.image ? `<img src="${esc(p.image)}" alt="">` : esc(p.emoji || "🎁");
        return `<div class="row${p.sponsored ? " is-sponsored" : ""}">
        <div class="row__media" style="background:${tint(p.c)}">${media}</div>
        <div class="row__info">
          <div class="row__name">${p.sponsored ? '<span class="star">★</span>' : ""}${esc(p.name)}</div>
          <div class="row__sub">${money(p.price)} · ${esc(p.cat)} · ${esc(p.store)}</div>
        </div>
        <div class="row__actions">
          <button class="icon-btn" data-edit="${i}" title="Edit">✎</button>
          <button class="icon-btn del" data-del="${i}" title="Delete">🗑</button>
        </div>
      </div>`;
      })
      .join("");
  }

  rowsEl.addEventListener("click", (e) => {
    const ed = e.target.closest("[data-edit]");
    const del = e.target.closest("[data-del]");
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
  });

  document.getElementById("list-search").addEventListener("input", (e) => {
    listQuery = e.target.value;
    renderRows();
  });

  /* ---------- add / edit ---------- */
  function startEdit(i) {
    editing = i;
    fillForm(products[i]);
    titleEl.textContent = "Edit product";
    saveBtn.textContent = "Save changes";
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
    cancelBtn.hidden = true;
    newBtn.hidden = true;
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
