/* =====================================================================
   ODDLY: product data engine
   ---------------------------------------------------------------------
   This is the whole "database" for now. To add a product, copy a block
   and fill it in. `sponsored: true` = a paying merchant (shows first,
   gets the gold badge). Swap `emoji` for a real photo by setting
   `image: "https://..."`. `url` is the outbound link to the store's
   product page (add your affiliate / tracking params there).
   ===================================================================== */

const ODDLY_CATEGORIES = [
  "All", "Desk", "Kitchen", "Home", "Gadgets", "Wearable", "Pets", "WTF",
];

const ODDLY_PRODUCTS = [
  { name: "USB Pet Rock", blurb: "Does nothing. Draws no power. Emotionally available.", price: 14, cat: "Desk", emoji: "🪨", c: "#7B5CF0", store: "DeskVoid", url: "#", sponsored: true },
  { name: "Screaming Goat Button", blurb: "Press for instant catharsis.", price: 12, cat: "WTF", emoji: "🐐", c: "#FF5436", store: "YellShop", url: "#", sponsored: true },
  { name: "Levitating Moon Lamp", blurb: "Physics you can gift.", price: 46, cat: "Gadgets", emoji: "🌙", c: "#2FB6E8", store: "GravityGoods", url: "#", sponsored: true },
  { name: "Emergency Googly Eyes (500pk)", blurb: "Fix anything with a stare.", price: 9, cat: "WTF", emoji: "👀", c: "#FFB021", store: "StickEye", url: "#", sponsored: true },
  { name: "Toaster Weather Stamp", blurb: "Breakfast forecast, literally.", price: 34, cat: "Gadgets", emoji: "🌦️", c: "#2FB6E8", store: "ToastCast", url: "#", sponsored: true },
  { name: "Left-Handed Spatula", blurb: "For the 10% who've suffered long enough.", price: 16, cat: "Kitchen", emoji: "🍳", c: "#64BC26", store: "SouthpawSupply", url: "#" },
  { name: "Bread-Scented Candle", blurb: "Carbs without consequences.", price: 22, cat: "Home", emoji: "🕯️", c: "#FFB021", store: "LoafLab", url: "#" },
  { name: "Cat-Butt Tissue Holder", blurb: "Pulls a tissue from… you know.", price: 19, cat: "WTF", emoji: "🐈", c: "#FF5FA8", store: "MeowMinded", url: "#" },
  { name: "Nap Desk Pillow", blurb: "Meetings are just horizontal now.", price: 28, cat: "Desk", emoji: "😴", c: "#2FB6E8", store: "ClockOut", url: "#" },
  { name: "Self-Stirring Mug", blurb: "For when stirring is too much.", price: 24, cat: "Kitchen", emoji: "☕", c: "#7B5CF0", store: "LazyBrew", url: "#" },
  { name: "Ramen Restaurant Socks", blurb: "Warm feet, questionable appetite.", price: 13, cat: "Wearable", emoji: "🧦", c: "#FFB021", store: "SoleFood", url: "#" },
  { name: "Inflatable Unicorn Horn for Cats", blurb: "Consent not included.", price: 11, cat: "Pets", emoji: "🦄", c: "#FF5FA8", store: "MythicPets", url: "#" },
  { name: "Mini Zen Desk Garden", blurb: "Rake away your deadlines.", price: 21, cat: "Desk", emoji: "🏜️", c: "#64BC26", store: "CalmCube", url: "#" },
  { name: "Bigfoot Air Freshener", blurb: "Cryptid-approved car scent.", price: 8, cat: "WTF", emoji: "👣", c: "#7B5CF0", store: "CryptidCo", url: "#" },
  { name: "Glow Constellation Ceiling Kit", blurb: "Sky, but rent-friendly.", price: 18, cat: "Home", emoji: "✨", c: "#2FB6E8", store: "NightRent", url: "#" },
  { name: "Pizza-Scented Shower Gel", blurb: "Clean, but make it Italian.", price: 15, cat: "Home", emoji: "🍕", c: "#FF5436", store: "SudsAndSauce", url: "#" },
  { name: "Rubber Chicken Keychain", blurb: "Squeak included. Purpose optional.", price: 7, cat: "WTF", emoji: "🐔", c: "#FFB021", store: "CluckCharm", url: "#" },
  { name: "Tiny Finger Hands (10pk)", blurb: "Small hands. Big commitment.", price: 10, cat: "WTF", emoji: "🖐️", c: "#FF5FA8", store: "LilMitts", url: "#" },
  { name: "Avocado Slicer Sword", blurb: "Overkill, beautifully executed.", price: 17, cat: "Kitchen", emoji: "🥑", c: "#64BC26", store: "GuacGuard", url: "#" },
  { name: "Desk Vacuum Mini", blurb: "Eats crumbs, restores dignity.", price: 14, cat: "Desk", emoji: "🧹", c: "#7B5CF0", store: "CrumbBuster", url: "#" },
];
