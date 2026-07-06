# ODDLY

A search engine / discovery marketplace for gloriously strange products, a
weird.shopping-style platform. People search for odd, giftable things; weird-product
shops pay to get listed. Plain HTML/CSS/JS, no framework, free to host on GitHub Pages.

## How money comes in (3 lines, one site)

1. **Paid listings**: merchants pay a flat monthly fee to be listed / featured.
   A product with `sponsored: true` shows first and gets the gold badge. (See the
   pricing tiers on the page: Free / $19 Featured / $49 Spotlight.)
2. **Affiliate**: every product's outbound link can carry your affiliate tag. Links
   are correctly marked `rel="sponsored nofollow noopener"`. Most Shopify stores now
   run affiliate programs, so this stacks on top of listings.
3. **Your app**: for stores with no affiliate program, your own Shopify app can
   handle tracking/payment; those products just become another paid listing here.

## The "simple CRM": changing products

Everything is one file: **`assets/js/products.js`**. To add or change a product,
edit a block:

```js
{
  name: "USB Pet Rock",
  blurb: "Does nothing. Draws no power. Emotionally available.",
  price: 14,
  cat: "Desk",            // one of ODDLY_CATEGORIES
  emoji: "🪨",             // placeholder, or set image below
  image: "https://…/photo.jpg",   // optional real product photo (overrides emoji)
  c: "#7B5CF0",           // accent colour for the card
  store: "DeskVoid",      // merchant name
  url: "https://store.com/product?aff=YOURTAG",  // outbound + your affiliate tag
  sponsored: true         // true = a paying merchant (ranks first, gold badge)
}
```

Change `image` and `name`, save, refresh, done. No build step.

### Or use the admin panel (no code): `admin.html`

Open **`admin.html`** in your browser for a click-in editor:

- Add / edit / delete products with a form + **live preview**
- Toggle **Sponsored** (paying merchants), pick accent colours, set emoji or image
- Paste a store link and hit **Refresh metadata** to pull the name/image/price/store
  automatically (works even when the fetch proxy returns "reader" text instead of
  raw HTML — the image is picked out of the markdown either way)
- If a product photo won't load (a store blocking hotlinking, a dead link), the
  card falls back to the emoji instead of showing a blank tile
- No good image to link to? **Upload a photo** — it's resized in your browser and
  stored directly with the product, no image hosting required
- Your work **auto-saves in the browser** (localStorage) as you go — this is why
  the admin panel needs no backend or database, it's a free static site
- To publish: either hit **🚀 Publish** (connect a repo once under **⚙ GitHub**,
  using a personal access token) to push `products.js` straight to GitHub, or hit
  **⬇ Export products.js** (or **Copy JS**) and push the file yourself. Either way,
  that's what live visitors see — localStorage is just your private workspace.

Bookmark `admin.html`; it's marked `noindex` so search engines ignore it. The
GitHub token is stored only in your own browser's localStorage — use a
fine-grained token scoped to just this repo, and don't set it up on a shared
computer.

## How clicking works

Clicking a product opens a **detail view inside ODDLY's own frame** (your branding),
then a **“Visit store →”** button sends the shopper to the merchant with your
affiliate/tracking link. People stay on your platform first, leave on your terms.

## Structure

```
index.html
assets/css/styles.css      playful neo-brutalist design
assets/js/products.js      the whole product database (edit this)
assets/js/app.js           search, filters, surprise-me, product detail modal
```

## Run / deploy

- Local preview: open `index.html`, or run `python -m http.server` in this folder.
- Deploy free: push to GitHub, enable **Settings → Pages → main branch**. Live in ~1 min.

## Rename it

“ODDLY” is a placeholder. Search-replace the name in `index.html` and swap the
favicon/logo text. Pick a real domain when you're ready.
