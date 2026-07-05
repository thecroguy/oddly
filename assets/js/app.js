/* =====================================================================
   ODDLY: app logic: render, search, filter, surprise, in-site detail
   ===================================================================== */
(function () {
  "use strict";

  const feed = document.getElementById("feed");
  const chipsWrap = document.getElementById("chips");
  const countEl = document.getElementById("count");
  const emptyEl = document.getElementById("empty");
  const searchInput = document.getElementById("search");

  let activeCat = "All";
  let query = "";

  function loadProducts() {
    try {
      const saved = localStorage.getItem("oddly_products_v1");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ODDLY_PRODUCTS;
  }
  const productsData = loadProducts();

  /* ---------- helpers ---------- */
  const money = (n) => "$" + Number(n).toFixed(2).replace(/\.00$/, "");
  const tint = (hex) => {
    // light tint of the product colour for the emoji tile
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16),
      g = parseInt(h.slice(2, 4), 16),
      b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},0.14)`;
  };

  /* ---------- filtering ---------- */
  function visible() {
    const q = query.trim().toLowerCase();
    return productsData.filter((p) => {
      const inCat = activeCat === "All" || p.cat === activeCat;
      const inQ =
        !q ||
        (p.name + " " + p.blurb + " " + p.store + " " + p.cat)
          .toLowerCase()
          .includes(q);
      return inCat && inQ;
    }).sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0));
  }

  /* ---------- card ---------- */
  function cardHTML(p, i) {
    const media = p.image
      ? `<img src="${p.image}" alt="${p.name}" loading="lazy">`
      : p.emoji;
    const badge = p.sponsored
      ? `<span class="card__badge">★ Sponsored</span>`
      : `<span class="card__cat">${p.cat}</span>`;
    return `
      <button class="card${p.sponsored ? " is-sponsored" : ""}" data-i="${i}" style="--_c:${p.c}">
        <div class="card__media" style="background:${tint(p.c)}">${media}${badge}</div>
        <div class="card__body">
          <div class="card__name">${p.name}</div>
          <div class="card__blurb">${p.blurb}</div>
          <div class="card__row">
            <span class="card__price">${money(p.price)}</span>
            <span class="card__store">${p.store}</span>
          </div>
        </div>
      </button>`;
  }

  function render() {
    const list = visible();
    feed.innerHTML = list.map((p) => cardHTML(p, productsData.indexOf(p))).join("");
    countEl.textContent =
      list.length + (list.length === 1 ? " strange thing" : " strange things");
    emptyEl.classList.toggle("show", list.length === 0);
  }

  /* ---------- chips ---------- */
  function buildChips() {
    chipsWrap.innerHTML = ODDLY_CATEGORIES.map(
      (c) =>
        `<button class="chip${c === activeCat ? " is-active" : ""}" data-cat="${c}">${c}</button>`
    ).join("");
  }
  chipsWrap.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    activeCat = b.dataset.cat;
    buildChips();
    render();
  });

  /* ---------- search ---------- */
  let t;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(t);
    query = e.target.value;
    t = setTimeout(render, 120);
  });

  /* ---------- in-site product detail (modal) ---------- */
  const modal = document.getElementById("modal");
  const mBody = document.getElementById("modal-content");
  function openProduct(p) {
    const media = p.image
      ? `<img src="${p.image}" alt="${p.name}">`
      : p.emoji;
    mBody.innerHTML = `
      <button class="modal__close" data-close aria-label="Close">✕</button>
      <div class="modal__media" style="background:${tint(p.c)}">${media}</div>
      <div class="modal__body">
        <div class="modal__badges">
          ${p.sponsored ? '<span class="pill" style="background:var(--gold)">★ Sponsored</span>' : ""}
          <span class="pill">${p.cat}</span>
        </div>
        <h3 class="modal__name">${p.name}</h3>
        <p class="modal__blurb">${p.blurb}</p>
        <div class="modal__price">${money(p.price)}</div>
        <div class="modal__store">Sold by <strong>${p.store}</strong></div>
        <div class="modal__actions">
          <a class="btn btn--brand" href="${p.url || "#"}" target="_blank" rel="sponsored nofollow noopener">
            Visit store &rarr;
          </a>
          <p class="modal__note">You'll be taken to ${p.store}. We may earn a commission.</p>
        </div>
      </div>`;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
  feed.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    openProduct(productsData[+card.dataset.i]);
  });
  modal.addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined || e.target.classList.contains("modal__scrim"))
      closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  /* ---------- surprise me ---------- */
  function surprise() {
    const list = visible();
    if (!list.length) return;
    const pick = list[Math.floor(Math.random() * list.length)];
    const el = feed.querySelector(`[data-i="${ODDLY_PRODUCTS.indexOf(pick)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("is-surprise");
    void el.offsetWidth; // restart animation
    el.classList.add("is-surprise");
    setTimeout(() => el.classList.remove("is-surprise"), 1400);
  }
  document.querySelectorAll("[data-surprise]").forEach((b) =>
    b.addEventListener("click", surprise)
  );

  /* ---------- mobile nav ---------- */
  const nav = document.getElementById("nav");
  const burger = document.getElementById("burger");
  if (burger) burger.addEventListener("click", () => nav.classList.toggle("open"));

  /* ---------- forms (placeholder) ---------- */
  document.querySelectorAll("[data-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const box = form.closest(".submit__box");
      if (box) box.classList.add("done");
      form.reset();
    });
  });

  /* ---------- year ---------- */
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- boot ---------- */
  buildChips();
  render();
})();
