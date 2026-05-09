const openCatalog = document.querySelector("#openCatalog");
const closeCatalog = document.querySelector("#closeCatalog");
const catalogModal = document.querySelector("#catalogModal");
const contactForm = document.querySelector(".contact-form");
const catalogSection = document.querySelector("#katalog");
const catalogLinks = document.querySelectorAll("[data-catalog-trigger]");
const catalogCurrent = document.querySelector("#catalogCurrent");
const catalogEmpty = document.querySelector("#catalogEmpty");
const previewGrid = document.querySelector("#catalogPreviewGrid");
const topMlFilter = document.querySelector("#topMlFilter");
const topBrandFilter = document.querySelector("#topBrandFilter");
const topSeriesFilter = document.querySelector("#topSeriesFilter");
const topSearchFilter = document.querySelector("#topSearchFilter");
const topCategoryFilter = document.querySelector("#topCategoryFilter");
const resetTopFilters = document.querySelector("#resetTopFilters");
const catalogPagination = document.querySelector("#catalogPagination");
const instagramFeed = document.querySelector("#instagramFeed");
const instagramFeedLovely = document.querySelector("#instagramFeedLovely");

const PRODUCTS_KEY = "albiProducts";
const CONTENT_KEY = "albiSiteContent";
const METRICS_KEY = "albiMetrics";
const BANNERS_KEY = "albiBanners";
const OFFERS_KEY = "albiOffers";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Tilda static CDN → küçük WebP (optim). Diğer kaynaklar (data:, yerel yüklemeler) aynen kalır. */
const tildaThumbnailSrc = (originalUrl, maxEdgePx = 520) => {
  if (!originalUrl || typeof originalUrl !== "string") return originalUrl;
  const trimmed = originalUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/optim\.tildacdn\.com/i.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "static.tildacdn.com") return trimmed;
    const pathname = u.pathname;
    const lastSlash = pathname.lastIndexOf("/");
    if (lastSlash <= 0) return trimmed;
    const dir = pathname.slice(0, lastSlash);
    const file = pathname.slice(lastSlash + 1);
    if (!file) return trimmed;
    const edge = Math.min(Math.max(Number(maxEdgePx) || 520, 80), 2048);
    return `https://optim.tildacdn.com${dir}/-/resize/${edge}x${edge}/-/format/webp/${file}.webp`;
  } catch {
    return trimmed;
  }
};

const IG_FEED_DEFAULTS = [
  { id: "kalipso_albi_turkey", profileUrl: "https://www.instagram.com/kalipso_albi_turkey/" },
  { id: "lovely_albi_kalipso", profileUrl: "https://www.instagram.com/lovely_albi_kalipso/" },
];

const parseInstagramFeedPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return IG_FEED_DEFAULTS.map((d) => ({ ...d, items: [] }));
  }
  if (payload.version === 2 && Array.isArray(payload.accounts)) {
    const mapById = Object.fromEntries(
      payload.accounts.filter((a) => a && typeof a.id === "string").map((a) => [a.id, a])
    );
    return IG_FEED_DEFAULTS.map((def) => {
      const row = mapById[def.id];
      const items = row && Array.isArray(row.items) ? row.items : [];
      const profileUrl = String(row?.profile_url || def.profileUrl).trim() || def.profileUrl;
      return { id: def.id, profileUrl, items };
    });
  }
  if (Array.isArray(payload.items)) {
    return [
      {
        id: "kalipso_albi_turkey",
        profileUrl: "https://www.instagram.com/kalipso_albi_turkey/",
        items: payload.items,
      },
      { ...IG_FEED_DEFAULTS[1], items: [] },
    ];
  }
  return IG_FEED_DEFAULTS.map((d) => ({ ...d, items: [] }));
};

const renderInstagramFeedInto = (container, items, profileUrl) => {
  if (!container) return;
  const profile = String(profileUrl || "").trim() || IG_FEED_DEFAULTS[0].profileUrl;
  if (!Array.isArray(items) || !items.length) {
    const cards = Array.from({ length: 4 }, () => {
      return `
      <a class="instagram-card instagram-card-placeholder" href="${profile}" target="_blank" rel="noopener noreferrer">
        <span class="instagram-card-ph-visual" aria-hidden="true"></span>
        <p class="instagram-card-ph-caption">Güncel görseller yüklendiğinde burada görünür. Şimdilik profilimizi Instagram üzerinden açabilirsiniz.</p>
      </a>`;
    }).join("");
    container.innerHTML = cards;
    return;
  }

  container.innerHTML = items
    .slice(0, 4)
    .map((item) => {
      const image = escapeHtml(item.image || "");
      const permalink = escapeHtml(item.permalink || profile);
      const caption = escapeHtml(item.caption || "Instagram paylaşımını görüntüle");
      const shortCaption = caption.length > 95 ? `${caption.slice(0, 95)}...` : caption;
      return `
      <a class="instagram-card" href="${permalink}" target="_blank" rel="noopener noreferrer">
        <img src="${image}" alt="Instagram paylaşımı" loading="lazy" decoding="async" referrerpolicy="no-referrer" />
        <p>${shortCaption}</p>
      </a>
    `;
    })
    .join("");
};

const loadInstagramFeed = async () => {
  if (!instagramFeed && !instagramFeedLovely) return;
  try {
    const feedUrl = new URL("instagram-feed.json", document.baseURI);
    feedUrl.searchParams.set("ts", String(Date.now()));
    const response = await fetch(feedUrl.toString(), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const rows = parseInstagramFeedPayload(payload);
    renderInstagramFeedInto(instagramFeed, rows[0]?.items || [], rows[0]?.profileUrl);
    renderInstagramFeedInto(instagramFeedLovely, rows[1]?.items || [], rows[1]?.profileUrl);
  } catch (e) {
    console.warn("[instagram] feed yüklenemedi:", e);
    renderInstagramFeedInto(instagramFeed, [], IG_FEED_DEFAULTS[0].profileUrl);
    renderInstagramFeedInto(instagramFeedLovely, [], IG_FEED_DEFAULTS[1].profileUrl);
  }
};

/** Ana slider/banner için 16:9 WebP (piksel yükü düşük, görünür kalite yeterli). */
const tildaBannerSrc = (originalUrl) => {
  if (!originalUrl || typeof originalUrl !== "string") return originalUrl;
  const trimmed = originalUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/optim\.tildacdn\.com/i.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "static.tildacdn.com") return trimmed;
    const pathname = u.pathname;
    const lastSlash = pathname.lastIndexOf("/");
    if (lastSlash <= 0) return trimmed;
    const dir = pathname.slice(0, lastSlash);
    const file = pathname.slice(lastSlash + 1);
    if (!file) return trimmed;
    return `https://optim.tildacdn.com${dir}/-/resize/1400x788/-/format/webp/${file}.webp`;
  } catch {
    return trimmed;
  }
};

const defaultProducts = [
  { id: "albi-277", name: "Gel Polish ALBI 277", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6337-3435-4664-b335-633061616235/81682812.jpg", categories: ["gel-polish", "new"] },
  { id: "albi-278", name: "Gel Polish ALBI 278", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6433-6565-4362-a135-306536386532/44963215.jpg", categories: ["gel-polish", "new"] },
  { id: "albi-279", name: "Gel Polish ALBI 279", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3063-6531-4065-b164-396664653831/79328829.jpg", categories: ["gel-polish"] },
  { id: "albi-280", name: "Gel Polish ALBI 280", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6635-3231-4132-b736-343939333634/30513505.jpg", categories: ["gel-polish"] },
  { id: "albi-281", name: "Gel Polish ALBI 281", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3565-6266-4765-a335-383136636264/45772877.jpg", categories: ["gel-polish"] },
  { id: "albi-silk-cat-4", name: "Gel Polish ALBI SILK CAT 4", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3965-3837-4030-a464-323166343438/97761522.jpg", categories: ["gel-polish"], series: "SILK CAT" },
  { id: "albi-282", name: "Gel Polish ALBI 282", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3133-6234-4639-b831-393364643535/44585962.jpg", categories: ["gel-polish"] },
  { id: "albi-283", name: "Gel Polish ALBI 283", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3533-3864-4161-a135-643630316130/56945487.jpg", categories: ["gel-polish"] },
  { id: "albi-284", name: "Gel Polish ALBI 284", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3330-6662-4666-b035-316665623935/56328849.jpg", categories: ["gel-polish"] },
  { id: "albi-285", name: "Gel Polish ALBI 285", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3464-3863-4838-a532-623364666536/64364061.jpg", categories: ["gel-polish"] },
  { id: "albi-286", name: "Gel Polish ALBI 286", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6566-6465-4639-b331-623032356439/99635969.jpg", categories: ["gel-polish"] },
  { id: "albi-287", name: "Gel Polish ALBI 287", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3737-6565-4435-b064-396665646336/74200617.jpg", categories: ["gel-polish"] },
  { id: "albi-288", name: "Gel Polish ALBI 288", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6330-3331-4439-b664-363236356662/76174966.jpg", categories: ["gel-polish"] },
  { id: "albi-289", name: "Gel Polish ALBI 289", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6563-6133-4134-b831-373565626637/56678384.jpg", categories: ["gel-polish"] },
  { id: "albi-290", name: "Gel Polish ALBI 290", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3962-6139-4936-a235-396164363136/22186619.jpg", categories: ["gel-polish"] },
  { id: "albi-291", name: "Gel Polish ALBI 291", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3130-3564-4465-b161-396462383665/81313340.jpg", categories: ["gel-polish"] },
  { id: "albi-292", name: "Gel Polish ALBI 292", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3432-3731-4865-b932-303830356665/21146424.jpg", categories: ["gel-polish"] },
  { id: "albi-293", name: "Gel Polish ALBI 293", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6365-6338-4634-b266-326363646633/63865715.jpg", categories: ["gel-polish"] },
  { id: "albi-294", name: "Gel Polish ALBI 294", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6238-3036-4930-b636-653230373033/99250900.jpg", categories: ["gel-polish"] },
  { id: "albi-295", name: "Gel Polish ALBI 295", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6263-3964-4562-b766-636232663336/55833687.jpg", categories: ["gel-polish"] },
  { id: "albi-296", name: "Gel Polish ALBI 296", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6261-3239-4433-b032-363538616235/33122418.jpg", categories: ["gel-polish"] },
  { id: "albi-297", name: "Gel Polish ALBI 297", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6238-3165-4462-b136-313533366437/14528330.jpg", categories: ["gel-polish"] },
  { id: "albi-001", name: "Gel Polish ALBI 001", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3661-3339-4634-a663-383231626362/78847045.jpg", categories: ["gel-polish"] },
  { id: "albi-002", name: "Gel Polish ALBI 002", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3539-3438-4339-b234-646437643535/68299071.jpg", categories: ["gel-polish"] },
  { id: "albi-003", name: "Gel Polish ALBI 003", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3232-3534-4339-a166-636664306165/76591472.jpg", categories: ["gel-polish"] },
  { id: "albi-004", name: "Gel Polish ALBI 004", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3538-3761-4236-a535-373637393233/57462128.jpg", categories: ["gel-polish"] },
  { id: "albi-005", name: "Gel Polish ALBI 005", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6461-3466-4837-a431-626364313933/28092881.jpg", categories: ["gel-polish"] },
  { id: "albi-006", name: "Gel Polish ALBI 006", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6235-3266-4562-b762-616234646162/21700724.jpg", categories: ["gel-polish"] },
  { id: "albi-007", name: "Gel Polish ALBI 007", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3238-3261-4033-b435-396336636332/37095631.jpg", categories: ["gel-polish"] },
  { id: "albi-008", name: "Gel Polish ALBI 008", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6664-3162-4738-b734-326666393665/76459078.jpg", categories: ["gel-polish"] },
  { id: "albi-009", name: "Gel Polish ALBI 009", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6161-3530-4334-b432-396263623831/65335273.jpg", categories: ["gel-polish"] },
  { id: "albi-010", name: "Gel Polish ALBI 010", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6434-3931-4166-b935-393630386631/51860516.jpg", categories: ["gel-polish"] },
  { id: "albi-011", name: "Gel Polish ALBI 011", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6233-6262-4636-b939-613965333864/74780312.jpg", categories: ["gel-polish"] },
  { id: "albi-016", name: "Gel Polish ALBI 016", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3562-3731-4131-b039-663763663039/43922439.jpg", categories: ["gel-polish"] },
  { id: "albi-017", name: "Gel Polish ALBI 017", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3630-3062-4332-a466-366339633038/71080897.jpg", categories: ["gel-polish", "special-offers"] },
  { id: "albi-018", name: "Gel Polish ALBI 018", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6433-6131-4631-a361-663565393937/74858740.jpg", categories: ["gel-polish"] },
  { id: "albi-019", name: "Gel Polish ALBI 019", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6263-3438-4961-b337-313963306237/44549673.jpg", categories: ["gel-polish"] },
  { id: "albi-020", name: "Gel Polish ALBI 020", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6435-6264-4562-b031-313037653762/51338677.jpg", categories: ["gel-polish"] },
  { id: "albi-022", name: "Gel Polish ALBI 022", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6136-3737-4961-b962-633463393138/17949688.jpg", categories: ["gel-polish"] },
  { id: "albi-023", name: "Gel Polish ALBI 023", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3038-6265-4266-b232-306162366433/48791189.jpg", categories: ["gel-polish"] },
  { id: "albi-025", name: "Gel Polish ALBI 025", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3239-3832-4562-a637-663637636333/11543889.jpg", categories: ["gel-polish"] },
  { id: "albi-026", name: "Gel Polish ALBI 026", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3533-3131-4537-b738-613462646537/58499442.jpg", categories: ["gel-polish"] },
  { id: "albi-027", name: "Gel Polish ALBI 027", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3536-6263-4339-b763-636166626133/61457952.jpg", categories: ["gel-polish"] },
  { id: "albi-028", name: "Gel Polish ALBI 028", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3064-6439-4465-b334-393138346135/27082722.jpg", categories: ["gel-polish"] },
  { id: "albi-029", name: "Gel Polish ALBI 029", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3633-3162-4536-b535-313963363937/23518357.jpg", categories: ["gel-polish"] },
  { id: "albi-039", name: "Gel Polish ALBI 039", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3039-3838-4332-b661-323466353432/33082586.jpg", categories: ["gel-polish"] },
  { id: "albi-040", name: "Gel Polish ALBI 040", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3564-3864-4265-a134-343436353261/91737974.jpg", categories: ["gel-polish"] },
  { id: "albi-041", name: "Gel Polish ALBI 041", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6431-6565-4465-b838-303730373466/38709612.jpg", categories: ["gel-polish"] },
  { id: "albi-042", name: "Gel Polish ALBI 042", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3130-6335-4462-a264-633439303164/62022815.jpg", categories: ["gel-polish"] },
  { id: "albi-043", name: "Gel Polish ALBI 043", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3965-3632-4263-a436-396138633363/27019503.jpg", categories: ["gel-polish"] },
  { id: "albi-044", name: "Gel Polish ALBI 044", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6364-6536-4365-b363-383736623435/42740036.jpg", categories: ["gel-polish"] },
  { id: "albi-045", name: "Gel Polish ALBI 045", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6435-6161-4465-a533-653934623363/88064634.jpg", categories: ["gel-polish"] },
  { id: "albi-046", name: "Gel Polish ALBI 046", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6631-3164-4565-a664-623331333863/90888881.jpg", categories: ["gel-polish"] },
  { id: "albi-047", name: "Gel Polish ALBI 047", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3635-3138-4566-b830-336563306131/72580598.jpg", categories: ["gel-polish"] },
  { id: "albi-048", name: "Gel Polish ALBI 048", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3635-3138-4566-b830-336563306131/72580598.jpg", categories: ["gel-polish"] },
  { id: "albi-049", name: "Gel Polish ALBI 049", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3466-6134-4430-a331-346633323930/34225011.jpg", categories: ["gel-polish"] },
  { id: "albi-050-060", name: "Gel Polish ALBI 050-060", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3139-3131-4939-b933-666366343666/50-60.jpg", categories: ["gel-polish"] },
  { id: "albi-061-065", name: "Gel Polish ALBI 061-065", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3132-3964-4639-b066-343864636132/61-65.jpg", categories: ["gel-polish"] },
  { id: "albi-066-072", name: "Gel Polish ALBI 066-072", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3835-3266-4465-a135-666534383537/66-72.jpg", categories: ["gel-polish"] },
  { id: "albi-073-078", name: "Gel Polish ALBI 073-078", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6163-3162-4162-a631-643663303033/73-78.jpg", categories: ["gel-polish"] },
  { id: "albi-079-084", name: "Gel Polish ALBI 079-084", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3537-3765-4135-a138-643064383566/79-84.jpg", categories: ["gel-polish"] },
  { id: "albi-085-091", name: "Gel Polish ALBI 085-091", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6366-3165-4465-a134-653761343738/85-91.jpg", categories: ["gel-polish"] },
  { id: "albi-092-097", name: "Gel Polish ALBI 092-097", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3630-3863-4862-a162-643937303866/92-97.jpg", categories: ["gel-polish"] },
  { id: "albi-100-107", name: "Gel Polish ALBI 100-107", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6364-6639-4133-b635-373930643930/100-107.jpg", categories: ["gel-polish"] },
  { id: "albi-108-114", name: "Gel Polish ALBI 108-114", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6139-6265-4234-b338-323232656134/108-114.jpg", categories: ["gel-polish"] },
  { id: "albi-115-120", name: "Gel Polish ALBI 115-120", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6163-6135-4162-b165-376635656561/115-120.jpg", categories: ["gel-polish"] },
  { id: "albi-121-127", name: "Gel Polish ALBI 121-127", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3731-6238-4432-a536-376363383361/121-127.jpg", categories: ["gel-polish"] },
  { id: "albi-128-135", name: "Gel Polish ALBI 128-135", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3866-6131-4634-b531-383862363132/128-135.jpg", categories: ["gel-polish"] },
  { id: "albi-136-142", name: "Gel Polish ALBI 136-142", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3235-3238-4736-b839-353366613935/136-142.jpg", categories: ["gel-polish"] },
  { id: "albi-143-151", name: "Gel Polish ALBI 143-151", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3061-3863-4230-b835-663661653032/91904699.jpg", categories: ["gel-polish", "special-offers"] },
  { id: "albi-153-158", name: "Gel Polish ALBI 153-158", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3435-3765-4432-b738-643439366631/153-158.jpg", categories: ["gel-polish"] },
  { id: "albi-159-169", name: "Gel Polish ALBI 159-169", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3938-6437-4031-a338-346336663961/64615977.jpg", categories: ["gel-polish", "special-offers"] },
  { id: "albi-170-179", name: "Gel Polish ALBI 170-179", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3864-3565-4336-b063-633561633433/170-179.jpg", categories: ["gel-polish"] },
  { id: "albi-200-206", name: "Gel Polish ALBI 200-206", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6162-3361-4334-b233-366463343834/200-206.jpg", categories: ["gel-polish"] },
  { id: "albi-210-216", name: "Gel Polish ALBI 210-216", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3632-3639-4532-a536-396431313961/210-216.jpg", categories: ["gel-polish"] },
  { id: "albi-217-223", name: "Gel Polish ALBI 217-223", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3230-3461-4638-b736-613564346666/217-223.jpg", categories: ["gel-polish"] },
  { id: "albi-224-229", name: "Gel Polish ALBI 224-229", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3737-3963-4336-b066-333264616631/224-229.jpg", categories: ["gel-polish"] },
  { id: "albi-236-239", name: "Gel Polish ALBI 236-239", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6134-6530-4437-b236-666561373431/236-239.jpg", categories: ["gel-polish"] },
  { id: "albi-247-251", name: "Gel Polish ALBI 247-251", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3530-6539-4231-a365-303438366464/247-251.jpg", categories: ["gel-polish"] },
  { id: "albi-252-261", name: "Gel Polish ALBI 252-261", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3132-3039-4435-b061-623933376664/252-261.jpg", categories: ["gel-polish"] },
  { id: "albi-262-269", name: "Gel Polish ALBI 262-269", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3861-3432-4064-b037-623031393637/262-269.jpg", categories: ["gel-polish"] },
  { id: "albi-270-276", name: "Gel Polish ALBI 270-276", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3138-6263-4365-b131-626565343731/270-276.jpg", categories: ["gel-polish"] },
  { id: "albi-323-329", name: "Gel Polish ALBI 323-329", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3939-3662-4161-b436-643739313438/323-329.jpg", categories: ["gel-polish"] },
  { id: "albi-330-336", name: "Gel Polish ALBI 330-336", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6639-3566-4663-a265-343436396661/330-336.jpg", categories: ["gel-polish"] },
  { id: "albi-337-341", name: "Gel Polish ALBI 337-341", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3163-3866-4739-b039-383036623130/337-341.jpg", categories: ["gel-polish"] },
  { id: "albi-348-352", name: "Gel Polish ALBI 348-352", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3236-6537-4864-b032-653365633865/348-352.jpg", categories: ["gel-polish"] },
  { id: "albi-353-357", name: "Gel Polish ALBI 353-357", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3032-6463-4135-b565-613834663732/image-03-06-22-12-12.jpeg", categories: ["gel-polish"] },
  { id: "albi-364-368", name: "Gel Polish ALBI 364-368", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6533-6361-4465-b264-643665323739/364-368.jpg", categories: ["gel-polish"] },
  { id: "albi-373-381", name: "Gel Polish ALBI 373-381", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3433-3333-4365-b730-633761323464/373-381.jpg", categories: ["gel-polish"] },
  { id: "albi-390-396", name: "Gel Polish ALBI 390-396", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3565-3263-4665-a462-303239363038/390-396.jpg", categories: ["gel-polish"] },
  { id: "albi-397-404", name: "Gel Polish ALBI 397-404", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6635-3437-4664-a262-663331383762/397-404.jpg", categories: ["gel-polish"] },
  { id: "albi-419-423", name: "Gel Polish ALBI 419-423", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6336-3332-4361-a463-366363633063/419-423.jpg", categories: ["gel-polish"] },
  { id: "albi-424-428", name: "Gel Polish ALBI 424-428", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6162-3236-4535-a532-663830373961/424-428.jpg", categories: ["gel-polish"] },
  { id: "albi-429-433", name: "Gel Polish ALBI 429-433", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3963-3431-4565-b464-623233363738/429-433.jpg", categories: ["gel-polish"] },
  { id: "albi-prizmatic", name: "Gel Polish ALBI Prizmatic", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3939-3939-4965-b966-373931633536/32693815.jpg", categories: ["gel-polish"] },
  { id: "albi-butterfly-violet", name: "Gel Polish ALBI Butterfly VIOLET", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6333-6638-4530-b431-373537663939/80449815.jpg", categories: ["gel-polish", "new"] },
  { id: "albi-butterfly-gold", name: "Gel Polish ALBI Butterfly GOLD", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6533-3462-4532-b833-366464353636/45046794.jpg", categories: ["gel-polish", "new"] },
  { id: "albi-butterfly-rose", name: "Gel Polish ALBI Butterfly ROSE", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3431-3063-4238-a563-393137386465/33139853.jpg", categories: ["gel-polish", "new"] },
  { id: "albi-butterfly-green", name: "Gel Polish ALBI Butterfly GREEN", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3037-3330-4336-a434-633163366131/30835479.jpg", categories: ["gel-polish", "new"] },
  { id: "hypnotic-collection", name: "HYPNOTIC COLLECTION", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3437-6261-4138-b036-353933393134/39813479.jpg", categories: ["gel-polish", "new"] },
  { id: "french-manicure-kit", name: "French manicure kit", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6265-3432-4565-a433-343161636534/17491542.jpg", categories: ["gel-polish", "new"] },
  { id: "albi-butterfly-blue", name: "Gel Polish ALBI Butterfly BLUE", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6261-6639-4433-b132-393938393666/17859021.jpg", categories: ["gel-polish", "new"] },
  { id: "albi-342-347", name: "Gel Polish ALBI 342-347", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild6666-3132-4139-b535-336264626338/IMG_0669.jpg", categories: ["gel-polish", "new"] },
  { id: "albi-099", name: "Gel Polish ALBI 099", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6361-3337-4661-b335-343339333665/26362474.png", categories: ["gel-polish"] },
  { id: "albi-cat-5d", name: "Gel Polish ALBI Cat 5D", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3065-3032-4136-b132-616365363664/33328796.jpg", categories: ["gel-polish"] },
  { id: "albi-shine-cat", name: "Gel Polish ALBI Shine Cat", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6530-6233-4530-b334-656336376235/75993941.jpg", categories: ["gel-polish"] },
  { id: "albi-star-1-10", name: "Gel Polish ALBI Star 1-10", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3061-6639-4432-b961-313663626332/87885818.jpg", categories: ["gel-polish"] },
  { id: "albi-star-11-19", name: "Gel Polish ALBI Star 11-19", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor6136-3732-4962-b839-666432616332/57152986.jpg", categories: ["gel-polish"] },
  { id: "base-coat-flex", name: "Base Coat FLEX", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3332-3666-4431-b134-393139303332/instasaver-613215040.jpg", categories: ["base-coat"] },
  { id: "base-rubber", name: "Base RUBBER", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3366-3239-4632-b865-663535323261/base_rubber.jpg", categories: ["base-coat"] },
  { id: "pedicure-base-coat-lite", name: "Pedicure Base Coat LITE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3930-6438-4964-a230-363661343937/IMG_7407.jpg", categories: ["base-coat"] },
  { id: "base-coat-secret-milk", name: "Base Coat SECRET MILK", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3935-3837-4338-b532-356561656437/albi_cover1-1280x128.jpg", categories: ["base-coat"] },
  { id: "base-coat-secret-rose", name: "Base Coat SECRET ROSE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6363-3631-4135-b737-653639623932/37199198.jpg", categories: ["base-coat"] },
  { id: "base-coat-secret-beige", name: "Base Coat SECRET BEIGE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6565-3139-4665-a431-376231326666/71758041.jpg", categories: ["base-coat"] },
  { id: "base-coat-neon", name: "Base Coat NEON", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3264-3066-4662-b334-373030303363/53052930.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-neon-lemon", name: "Base Coat NEON Lemon", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3137-6166-4633-a430-663966366533/90255051.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-neon-coral", name: "Base Coat NEON Coral", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3239-6634-4630-b832-303339633337/58031039.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-neon-mango", name: "Base Coat NEON Mango", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6562-6366-4565-b536-666438323739/39369013.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-neon-lime", name: "Base Coat NEON Lime", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3530-3631-4435-a530-613636333531/21411719.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-neon-yellow", name: "Base Coat NEON Yellow", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3961-3037-4030-b136-653664303838/37468721.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-neon-pink", name: "Base Coat NEON Pink", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6166-3831-4531-b661-303134663838/19738003.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-potal-rose", name: "Base Coat POTAL Rose", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3565-6537-4361-a238-393535653839/43676346.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-potal-milk", name: "Base Coat POTAL Milk", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3737-3838-4466-a634-353230643565/35434161.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-yogurt-1", name: "Base Coat YOGURT 1", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3265-3133-4166-b336-643031393163/1_2.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-yogurt-2", name: "Base Coat YOGURT 2", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3231-6666-4233-b531-363062633264/2_2.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-yogurt-3", name: "Base Coat YOGURT 3", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild6266-3134-4231-b231-336262303063/3_2.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-yogurt-4", name: "Base Coat YOGURT 4", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3662-3232-4936-b934-646332383337/4_2.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-yogurt-5", name: "Base Coat YOGURT 5", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild6533-3238-4435-b236-323361326361/5_2.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-yogurt-6", name: "Base Coat YOGURT 6", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild6632-3136-4434-b632-326564366239/6_2.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-yogurt-7", name: "Base Coat YOGURT 7", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3132-3061-4236-b630-666462396135/7_2.jpg", categories: ["base-coat", "new"] },
  { id: "base-coat-yogurt-8", name: "Base Coat YOGURT 8", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild6135-3938-4466-b134-323232316137/8_1.jpg", categories: ["base-coat", "new"] },
  { id: "top-coat-no-wipe", name: "Top Coat NO WIPE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6230-3561-4963-b733-356233636563/76736726.jpg", categories: ["top-coat"] },
  { id: "top-coat-no-wipe-uv-filter", name: "Top Coat NO WIPE with UV-filter", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3534-3333-4036-a162-633436316466/RM0A4340.jpg", categories: ["top-coat"] },
  { id: "top-coat-velvet", name: "Top Coat VELVET", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild6636-6538-4337-b132-626362383866/instasaver-613215040.jpg", categories: ["top-coat"] },
  { id: "top-coat-shine", name: "Top Coat SHINE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3764-3435-4262-a636-353630383236/50915875.jpg", categories: ["top-coat"] },
  { id: "top-coat-smuzy", name: "Top Coat SMUZY", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6265-3237-4139-b634-643666313934/67056214.jpg", categories: ["top-coat", "new"] },
  { id: "top-coat-potal", name: "Top Coat POTAL", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3963-3332-4638-a435-646539313761/IMG_4325.jpg", categories: ["top-coat"] },
  { id: "top-coat-color-sweet-pink", name: "Top Coat COLOR Sweet pink", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6637-6131-4334-a661-333934343161/95401483.jpg", categories: ["top-coat", "new"] },
  { id: "top-coat-color-naked", name: "Top Coat COLOR Naked", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3638-6631-4264-b932-666562303333/41992704.jpg", categories: ["top-coat", "new"] },
  { id: "top-coat-color-real-natural", name: "Top Coat COLOR Real natural", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3530-3230-4563-b266-636537343532/22005565.jpg", categories: ["top-coat", "new"] },
  { id: "top-coat-color-fiery-red", name: "Top Coat COLOR Fiery red", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3564-6365-4633-b435-333865366262/97114048.jpg", categories: ["top-coat", "new"] },
  { id: "top-coat-color-cherry-bomb", name: "Top Coat COLOR Cherry bomb", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3433-6130-4533-a335-336530306633/70114642.jpg", categories: ["top-coat", "new"] },
  { id: "top-coat-color-deep-wine", name: "Top Coat COLOR Deep wine", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6562-3833-4534-a263-306537333338/85113242.jpg", categories: ["top-coat", "new"] },
  { id: "kalipso-top-flakes-velor-15", name: "TOP FLAKES VELOR, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/\u0432\u0435\u0440\u043b\u044e\u0440-\u043c\u0430\u0442\u043e\u0432-1--600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-snow-flakes-15", name: "TOP SNOW FLAKES WITHOUT STICKY LAYER, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/\u0441\u043d\u0435\u0436\u043d\u044b\u0435-\u0445\u043b\u043e\u043f--600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-snow-flakes-velor-15", name: "TOP SNOW FLAKES VELOR WITHOUT STICKY LAYER, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/\u0441\u043d\u0435\u0436\u043d\u044b\u0435-\u0445\u043b\u043e\u043f-\u0432\u0435\u043b\u044e\u0440-2--600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-bond-primer-non-acid-10", name: "BOND & PRIMER NON ACID ACID FREE PRIMER, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/bond-primer-scaled-1-600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-primer-universal-acid-10", name: "PRIMER UNIVERSAL ACID PRIMER, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/primer-unuv-scaled-1-600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-nail-prep-dehydrator-10", name: "NAIL PREP NAIL DEHYDRATOR, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/nail-prep-600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-rubber-base-gel-10", name: "RUBBER BASE GEL , 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/ruber-scaled-1-600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-base-gel-fiber-10", name: "BASE GEL FIBER, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/fiber-600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-base-gel-extra-10", name: "BASE GEL EXTRA, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/extra-1-scaled-1-600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-top-gel-rubber-10", name: "TOP GEL RUBBER, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/top-rubber-scaled-1-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-no-cleanse-10", name: "TOP NO CLEANSE, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/04/no-cleance-scaled-1-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-gel-crystal-no-cleanse-10", name: "TOP GEL CRYSTAL NO CLEANSE, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/04/crystal-no-cl-scaled-1-1-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-gel-velor-premium-10", name: "MATTE TOP FOR GEL POLISH TOP GEL VELOR PREMIUM, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/04/veluor-prem-scaled-1-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-glitter-01-10", name: "TOP GLITTER WITHOUT STICKY 01, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/04/glitter-01-10ml-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-glitter-02-10", name: "TOP GLITTER WITHOUT STICKY LAYER TOP 02, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/\u0422\u0420\u0410\u0424\u041e\u0420\u0415\u0422-2--600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-snow-pixel-10", name: "TOP WITHOUT STICKY LAYER TOP SNOW PIXEL, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/snow-\u043a\u043e\u043f\u0438\u044f-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-white-pixel-10", name: "TOP WITHOUT STICKY LAYER TOP WHITE PIXEL, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/whiteIMG_7385-\u043a\u043e\u043f\u0438\u044f-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-pixel-01-10", name: "TOP WITHOUT STICKY LAYER TOP PIXEL 01, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/01-2-scaled-1-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-pixel-02-10", name: "TOP WITHOUT STICKY LAYER TOP PIXEL 02, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/02-scaled-2-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-crash-silver-10", name: "TOP WITHOUT STICKY LAYER TOP CRASH SILVER, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/Silver-\u043a\u043e\u043f\u0438\u044f-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-crash-holography-10", name: "TOP WITHOUT STICKY LAYER TOP CRASH HOLOGRAPHY, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/holografy-\u043a\u043e\u043f\u0438\u044f-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-foil-gel-15", name: "FOIL GEL , 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/0-foil--600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-top-glass-no-cleanse-10", name: "TOP GLASS NO CLEANSE, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3-copy-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-rubber-base-gel-15", name: "RUBBER BASE GEL , 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/baza-ruber-15-600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-base-gel-fiber-15", name: "BASE GEL FIBER, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/baza-ruber-15-600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-base-gel-extra-15", name: "BASE GEL EXTRA, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/baza-jekstra-15-600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-top-gel-rubber-15", name: "TOP GEL RUBBER, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/top-ruber-15-1-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-no-cleanse-15", name: "TOP NO CLEANSE, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/04/top-bez-l-sl-15-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-gel-crystal-no-cleanse-15", name: "TOP GEL CRYSTAL NO CLEANSE, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/04/top-kristal-bez-l-sl-15-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-gel-velor-classic-matt-15", name: "TOP GEL VELOR CLASSIC MATT TOP ,15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/04/top-veljur-klassik-15-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-glitter-without-sticky-01-15", name: "TOP GLITTER WITHOUT STICKY LAYER 01, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/glitter-01-15ml-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-glitter-without-sticky-02-15", name: "TOP GLITTER WITHOUT STICKY LAYER  02, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/\u0422\u0420\u0410\u0424\u041e\u0420\u0415\u0422-2-1-1-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-french-without-sticky-15", name: "TOP FRENCH WITHOUT STICKY LAYER , 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/04--600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-flakes-without-sticky-15", name: "TOP FLAKES WITHOUT STICKY LAYER, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/07-1-2-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-glitter-03-15", name: "TOP GLITTER WITHOUT STICKY LAYER TOP GLITTER 03, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/03-e1643193166779-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-prism-cat-eyes-10", name: "TOP WITHOUT STICKY LAYER TOP PRISM CAT EYE\u2019S 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/CAT-TOP-PRISM-7-\u043a\u043e\u043f\u0438\u044f-scaled-1-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-glass-no-cleanse-15", name: "TOP GLASS NO CLEANSE, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/\u0442\u043e\u043f-glass-15\u043c\u043b-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-rubber-base-gel-30", name: "RUBBER BASE GEL , 30 ML", brand: "Kalipso", size: "30 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/baza-ruber-30-600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-base-gel-fiber-30", name: "BASE GEL FIBER, 30 ML", brand: "Kalipso", size: "30 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/IMG_2738-600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-base-gel-extra-30", name: "BASE GEL EXTRA, 30 ML", brand: "Kalipso", size: "30 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/IMG_2738--600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-top-gel-rubber-30", name: "TOP GEL RUBBER, 30 ML", brand: "Kalipso", size: "30 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/04/top-ruber-30-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-no-cleanse-30", name: "TOP NO CLEANSE, 30 ML", brand: "Kalipso", size: "30 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/04/top-bez-l-sl-30-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-gel-crystal-no-cleanse-30", name: "TOP GEL CRYSTAL NO CLEANSE, 30 ML", brand: "Kalipso", size: "30 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/04/top-kristal-bez-l-sl-30-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-top-glass-no-cleanse-30", name: "TOP GLASS NO CLEANSE, 30 ML", brand: "Kalipso", size: "30 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/\u0442\u043e\u043f-glass-30-600x600.jpg", categories: ["top-coat"] },
  { id: "kalipso-neon-color-base-01-15", name: "NEON COLOR BASE NO. 01, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/01-\u043d\u0435\u043e\u043d-\u0437\u0430\u043f\u0447\u0430\u0441\u0442\u0438--600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-neon-color-base-03-15", name: "NEON COLOR BASE NO. 03, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/03-\u043d\u0435\u043e\u043d-\u0437\u0430\u043f\u0447\u0430\u0441\u0442\u0438-2--600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-neon-color-base-05-15", name: "NEON COLOR BASE NO. 05, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/05-\u043d\u0435\u043e\u043d-\u0437\u0430\u043f\u0447\u0430\u0441\u0442\u0438-2--600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-neon-color-base-06-15", name: "NEON COLOR BASE NO. 06, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/06-1-\u043d\u0435\u043e\u043d-\u0437\u0430\u043f\u0447\u0430\u0441\u0442\u0438-2--600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-neon-color-base-07-15", name: "NEON COLOR BASE NO. 07, 15 ML", brand: "Kalipso", size: "15 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/05/07-\u043d\u0435\u043e\u043d-\u0437\u0430\u043f\u0447\u0430\u0441\u0442\u0438-2--600x600.jpg", categories: ["base-coat"] },
  { id: "kalipso-crystal-clear-hard-gel-50", name: "CRYSTAL CLEAR HARD GEL 50 ML", brand: "Kalipso", size: "50 ml", image: "https://vo-kalipso.com/wp-content/uploads/2023/02/Untitled-300x300.jpg", categories: ["building-gel"] },
  { id: "kalipso-cover-milk-tea-hard-gel-50", name: "COVER MILK TEA HARD GEL 50 ML", brand: "Kalipso", size: "50 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/milk-tea3-300x300.jpg", categories: ["building-gel"] },
  { id: "kalipso-cover-tan-hard-gel-50", name: "COVER TAN HARD GEL 50 ML", brand: "Kalipso", size: "50 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/tan1-300x300.jpg", categories: ["building-gel"] },
  { id: "kalipso-cover-dusty-rose-hard-gel-50", name: "COVER DUSTY ROSE HARD GEL 50 ML", brand: "Kalipso", size: "50 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/dust-rose-300x300.jpg", categories: ["building-gel"] },
  { id: "kalipso-cover-milk-pink-hard-gel-50", name: "COVER MILK PINK HARD GEL 50 ML", brand: "Kalipso", size: "50 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/Milk-pink-300x300.jpg", categories: ["building-gel"] },
  { id: "kalipso-cover-natural-milk-hard-gel-50", name: "COVER NATURAL MILK HARD GEL 50 ML", brand: "Kalipso", size: "50 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/05/Untitled555-300x300.jpg", categories: ["building-gel"] },
  { id: "kalipso-crystal-clear-hard-gel-180", name: "CRYSTAL CLEAR HARD GEL 180 ML", brand: "Kalipso", size: "180 ml", image: "https://vo-kalipso.com/wp-content/uploads/2023/02/Untitled180-300x300.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-new", name: "Sculptural gel ALBI NEW", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3132-3932-4539-b866-616230316333/IMG_2628.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-new-ivory", name: "Sculptural gel ALBI NEW IVORY", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3136-3830-4231-b630-643765646338/58529377.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-new-clear", name: "Sculptural gel ALBI NEW CLEAR", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3666-3931-4266-b335-336365646261/26641182.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-new-milky-rose", name: "Sculptural gel ALBI NEW MILKY ROSE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3338-3131-4335-b335-383037383766/30975319.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-new-ice-cream", name: "Sculptural gel ALBI NEW ICE CREAM", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3938-3739-4932-b931-333136636365/61760044.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-new-sky", name: "Sculptural gel ALBI NEW SKY", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3232-6232-4237-b531-396133353538/53912596.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-shine-tea-rose", name: "Sculptural gel ALBI SHINE TEA ROSE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3031-6134-4133-a630-623034323230/18721dlt5s4lj1vt5s41.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-shine-pink", name: "Sculptural gel ALBI SHINE PINK", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild6431-3734-4336-b033-373665643335/IMG_5854.PNG", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-shine-nude", name: "Sculptural gel ALBI SHINE NUDE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3065-3536-4634-b065-373131346438/lss5ntre6hwuezc2ohtm.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-shine-natural", name: "Sculptural gel ALBI SHINE NATURAL", brand: "ALBI", size: "30 ml", image: "https://static.tildacdn.com/tild3238-6439-4338-a262-316138306363/9vgs63igvl2e8rkhlqrc.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-shine-french", name: "Sculptural gel ALBI SHINE FRENCH", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild6663-3162-4666-a433-626131656265/vmu3lsf9ln4yp2i7rqi3.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-shine-cream", name: "Sculptural gel ALBI SHINE CREAM", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3066-3133-4331-a665-636630663064/gpvoughmc3edzg2zc12x.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-shine-milk", name: "Sculptural gel ALBI SHINE MILK", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3738-6238-4262-b338-303439653034/_.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-papaya", name: "Sculptural gel ALBI PAPAYA", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3235-3431-4666-b861-396466613935/46344736.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-peach", name: "Sculptural gel ALBI PEACH", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3833-3736-4366-b233-396339373765/87841160.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-banana", name: "Sculptural gel ALBI BANANA", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3536-3963-4237-a261-623765376665/51058518.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-aqua", name: "Sculptural gel ALBI AQUA", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6237-3662-4331-b437-633163646436/71998450.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-cloud", name: "Sculptural gel ALBI CLOUD", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3762-3534-4033-b165-313434326365/75630950.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-orchid", name: "Sculptural gel ALBI ORCHID", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3861-3461-4733-b864-666461646539/46891927.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-azure", name: "Sculptural gel ALBI AZURE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3733-6365-4531-a637-353966353437/20544292.jpg", categories: ["building-gel"] },
  { id: "cream-gel-albi-beige", name: "Cream gel ALBI BEIGE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3266-6566-4663-b533-343434666338/__Beige.jpg", categories: ["building-gel"] },
  { id: "cream-gel-albi-rose", name: "Cream gel ALBI ROSE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3334-6335-4732-a564-653933623564/__Rose.jpg", categories: ["building-gel"] },
  { id: "cream-gel-albi-milk", name: "Cream gel ALBI MILK", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild6138-3239-4363-b865-363834336238/__Milk.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-innocent", name: "Sculptural gel ALBI INNOCENT", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3939-6239-4938-a630-326663313736/inocent.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-demure", name: "Sculptural gel ALBI DEMURE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3632-3231-4162-b939-643334313536/demure.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-champagne", name: "Sculptural gel ALBI CHAMPAGNE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3439-6131-4163-a537-646636373632/champagne.jpg", categories: ["building-gel"] },
  { id: "sculptural-gel-albi-gentle", name: "Sculptural gel ALBI GENTLE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/tild3237-3130-4461-b730-633930343639/gentle.jpg", categories: ["building-gel"] },
  { id: "liquid-polygel-albi-caramel", name: "Liquid polygel ALBI CARAMEL", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6232-6661-4534-b133-616666353136/50636988.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-silver-ice", name: "Liquid polygel ALBI SILVER ICE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3665-6630-4032-b437-363431616362/71133146.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-08", name: "Liquid polygel ALBI 08", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3366-3962-4666-b864-346432383164/98871218.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-pearly-nude", name: "Liquid polygel ALBI PEARLY NUDE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6135-3361-4535-b566-326564303833/91767649.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-pearly-natural", name: "Liquid polygel ALBI PEARLY NATURAL", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3266-6432-4664-a262-633765636330/15689916.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-pearly-white", name: "Liquid polygel ALBI PEARLY WHITE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6137-6430-4037-b134-653539336532/95500756.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-pearly-rose", name: "Liquid polygel ALBI PEARLY ROSE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6334-3235-4436-b833-396135346437/47566952.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-red-01", name: "Liquid polygel ALBI RED 01 Fiery red", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6539-3538-4439-b634-613538343038/24731764.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-red-02", name: "Liquid polygel ALBI RED 02 Cherry bomb", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3039-3162-4632-a235-656536396663/90471515.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-red-03", name: "Liquid polygel ALBI RED 03 Deep wine", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3334-6664-4130-a636-333663303637/73570605.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-nude-inspire", name: "Liquid polygel ALBI NUDE INSPIRE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6334-3263-4163-b831-356561656163/46249595.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-nude-almond-milk", name: "Liquid polygel ALBI NUDE ALMOND MILK", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6233-3966-4064-b630-313530663231/38837929.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-nude-blossom", name: "Liquid polygel ALBI NUDE BLOSSOM", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3431-3737-4436-a539-386631643561/64494633.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-nude-sensitive", name: "Liquid polygel ALBI NUDE SENSITIVE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3066-3163-4436-b334-633130386665/94529523.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-nude-cashmere", name: "Liquid polygel ALBI NUDE CASHMERE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3266-3762-4537-a564-323032616264/88412456.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-nude-toffee", name: "Liquid polygel ALBI NUDE TOFFEE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6262-3030-4634-b630-663763383662/18276568.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-nude-candy-cotton", name: "Liquid polygel ALBI NUDE CANDY COTTON", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6534-3835-4130-b061-646263643766/69191638.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-nude-inhale", name: "Liquid polygel ALBI NUDE INHALE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3235-3936-4430-b333-323337656561/23830650.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-tea-rose", name: "Liquid polygel ALBI TEA ROSE", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6665-3039-4434-b862-386437343962/44662733.png", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-07", name: "Liquid polygel ALBI 07", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3963-3539-4534-b434-316433303935/41456175.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-06", name: "Liquid polygel ALBI 06", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6461-3763-4766-b462-653239653438/50780759.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-05", name: "Liquid polygel ALBI 05", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6162-6161-4131-b561-306537636430/25083730.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-04", name: "Liquid polygel ALBI 04", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6432-3731-4062-b062-386439623936/38587303.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-03", name: "Liquid polygel ALBI 03", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3235-3466-4364-b362-373661303030/56196036.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-02", name: "Liquid polygel ALBI 02", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3537-3837-4537-b365-623261633264/55065288.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-01", name: "Liquid polygel ALBI 01", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3162-6366-4435-b039-343939363964/84899061.jpg", categories: ["liquid-polygel"] },
  { id: "liquid-polygel-albi-summer-01", name: "Liquid polygel ALBI SUMMER COLLECTION 01", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3162-6366-4435-b039-343939363964/84899061.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-summer-02", name: "Liquid polygel ALBI SUMMER COLLECTION 02", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6364-6534-4665-b864-626632333865/15799987.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-summer-03", name: "Liquid polygel ALBI SUMMER COLLECTION 03", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3737-3132-4134-b461-303034393539/39073489.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-summer-04", name: "Liquid polygel ALBI SUMMER COLLECTION 04", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6432-3731-4062-b062-386439623936/38587303.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-summer-05", name: "Liquid polygel ALBI SUMMER COLLECTION 05", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6162-6161-4131-b561-306537636430/25083730.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-summer-06", name: "Liquid polygel ALBI SUMMER COLLECTION 06", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor6461-3763-4766-b462-653239653438/50780759.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-summer-07", name: "Liquid polygel ALBI SUMMER COLLECTION 07", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3537-3465-4137-b432-353932306639/82170588.jpg", categories: ["liquid-polygel", "new"] },
  { id: "liquid-polygel-albi-summer-08", name: "Liquid polygel ALBI SUMMER COLLECTION 08", brand: "ALBI", size: "15 ml", image: "https://static.tildacdn.com/stor3366-3962-4666-b864-346432383164/98871218.jpg", categories: ["liquid-polygel", "new"] },
  { id: "cuticle-oil-albi-almond", name: "Cuticle oil ALBI Almond", brand: "ALBI", size: "30 ml", image: "https://static.tildacdn.com/stor3762-3838-4630-a465-393063663633/92347093.jpg", categories: ["nail-skin-care"] },
  { id: "kalipso-cuticle-oil-pencil-cherry-4", name: "CUTICLE OIL IN PENCIL \u201cCHERRY\u201d, 4 ML", brand: "Kalipso", size: "4 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/04/IMG_3507-\u043a\u043e\u043f\u0438\u044f-600x600.jpg", categories: ["nail-skin-care"] },
  { id: "kalipso-cuticle-oil-pencil-osmanthus-4", name: "CUTICLE OIL IN PENCIL \u201cOSMANTHUS\u201d, 4 ML", brand: "Kalipso", size: "4 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/04/IMG_3499-\u043a\u043e\u043f\u0438\u044f-600x600.jpg", categories: ["nail-skin-care"] },
  { id: "kalipso-cuticle-oil-pencil-rose-4", name: "CUTICLE OIL IN PENCIL \u201cROSE\u201d, 4 ML", brand: "Kalipso", size: "4 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/04/IMG_3502-\u043a\u043e\u043f\u0438\u044f-600x600.jpg", categories: ["nail-skin-care"] },
  { id: "kalipso-cuticle-oil-pencil-aloe-4", name: "CUTICLE OIL IN PENCIL \u201cALOE\u201d, 4 ML", brand: "Kalipso", size: "4 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/04/1-300x300.webp", categories: ["nail-skin-care"] },
  { id: "kalipso-cuticle-oil-pencil-pineapple-4", name: "CUTICLE OIL IN PENCIL \u201cPINEAPPLE\u201d, 4 ML", brand: "Kalipso", size: "4 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/06/IMG_3498-\u043a\u043e\u043f\u0438\u044f\u0430\u043d\u0430\u043d\u0430\u0441-600x600.jpg", categories: ["nail-skin-care"] },
  { id: "kalipso-cuticle-oil-pencil-watermelon-4", name: "CUTICLE OIL IN PENCIL \u201cWATERMELON\u201d, 4 ML", brand: "Kalipso", size: "4 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/06/IMG_3505-\u043a\u043e\u043f\u0438\u044f\u0430\u0440\u0431\u0443\u0437-600x600.jpg", categories: ["nail-skin-care"] },
  { id: "kalipso-cuticle-oil-pencil-blueberry-4", name: "CUTICLE OIL IN PENCIL \u201cBLUEBERRY\u201d, 4 ML", brand: "Kalipso", size: "4 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/06/IMG_3508-\u043a\u043e\u043f\u0438\u044f\u0433\u043e\u043b\u0443\u0431\u0438\u043a\u0430-600x600.jpg", categories: ["nail-skin-care"] },
  { id: "kalipso-cuticle-oil-pencil-strawberry-4", name: "CUTICLE OIL IN PENCIL \u201cSTRAWBERRY\u201d, 4 ML", brand: "Kalipso", size: "4 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/06/IMG_3503-\u043a\u043e\u043f\u0438\u044f\u043a\u043b\u0443\u0431\u043d\u0438\u043a\u0430-600x600.jpg", categories: ["nail-skin-care"] },
  { id: "kalipso-refill-cuticle-oil-strawberry-30", name: "Refill Cuticle Oil Strawberry 30 ml", brand: "Kalipso", size: "30 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/klubnika-krasivye-kartinki-44-300x300.jpg", categories: ["nail-skin-care"] },
  { id: "kalipso-watercolor-drops-red-8", name: "WATERCOLOR DROPS RED, 8 ML", brand: "Kalipso", size: "8 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/\u041a\u0440\u0430\u0441\u043d\u044b\u0435-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-watercolor-drops-green-8", name: "WATERCOLOR DROPS GREEN, 8 ML", brand: "Kalipso", size: "8 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/\u0437\u0435\u043b\u0435\u043d\u044b\u0435-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-water-color-drops-blue-8", name: "WATER COLOR DROPS BLUE, 8 ML", brand: "Kalipso", size: "8 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/\u0433\u043e\u043b\u0443\u0431\u044b\u0435-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-water-color-drops-white-8", name: "WATER COLOR DROPS WHITE, 8 ML", brand: "Kalipso", size: "8 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/white-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-water-color-drops-black-8", name: "WATER COLOR DROPS BLACK, 8 ML", brand: "Kalipso", size: "8 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/1-2-\u0447\u0435\u0440\u043d\u044b\u0435--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-spider-gel-black-5", name: "SPIDER GEL VOICE OF KALIPSO, BLACK, 5 ML", brand: "Kalipso", size: "5 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/img_3936-copy-2-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-spider-gel-white-5", name: "SPIDER GEL VOICE OF KALIPSO, WHITE, 5 ML", brand: "Kalipso", size: "5 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/img_-3936-1-1-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-paste-gel-stamping-gold-5", name: "PASTE GEL & STAMPING VOICE OF KALIPSO, GOLD, 5 ML", brand: "Kalipso", size: "5 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/2-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-paste-gel-stamping-silver-5", name: "PASTE GEL & STAMPING VOICE OF KALIPSO, SILVER, 5 ML", brand: "Kalipso", size: "5 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/7-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-gel-paint-black-5", name: "GEL PAINT VOICE OF KALIPSO, BLACK, 5 ML", brand: "Kalipso", size: "5 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/img_3936-copy-4-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-gel-paint-white-5", name: "GEL PAINT VOICE OF KALIPSO, WHITE, 5 ML", brand: "Kalipso", size: "5 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/img_-3936-1-2-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-gel-paint-silver-5", name: "GEL PAINT VOICE OF KALIPSO, SILVER, 5 ML", brand: "Kalipso", size: "5 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/3--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-gel-paint-metal-effect-silver-5", name: "GEL PAINT VOICE OF KALIPSO METAL EFFECT, SILVER, 5 ML", brand: "Kalipso", size: "5 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/4--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-gel-paint-metal-effect-beige-gold-5", name: "GEL PAINT VOICE OF KALIPSO, METAL EFFECT, BIEGE GOLD, 5 ML", brand: "Kalipso", size: "5 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/6--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-gel-paint-metal-effect-rose-gold-5", name: "GEL PAINT VOICE OF KALIPSO, METAL EFFECT, ROSE GOLD, 5 ML", brand: "Kalipso", size: "5 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/5--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-paste-gel-stamping-black-5", name: "PASTE GEL & STAMPING VOICE OF KALIPSO, BLACK, 5 ML", brand: "Kalipso", size: "5 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/1-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-collapsible-brush-acrylic-12", name: "Collapsible brush for acrylic No. 12", brand: "Kalipso", size: "No. 12", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/1600-5-600x600.jpg", categories: ["firca"] },
  { id: "kalipso-flat-beveled-brush-no-2", name: "FLAT BEVELED BRUSH VOICE OF KALIPSO No. 2", brand: "Kalipso", size: "No. 2", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/sk2-600x600.jpg", categories: ["firca"] },
  { id: "kalipso-straight-flat-brush-kalipso-no-4", name: "STRAIGHT FLAT BRUSH VOICE OF KALIPSO No. 4", brand: "Kalipso", size: "No. 4", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/pr4-600x600.jpg", categories: ["nail-files"] },
  { id: "kalipso-straight-flat-brush-cosmolac-no-4", name: "STRAIGHT FLAT BRUSH COSMOLAC No. 4", brand: "Cosmolac", size: "No. 4", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/pryam4-600x600.jpeg", categories: ["nail-files"] },
  { id: "kalipso-ombre-design-brush", name: "OMBRE DESIGN BRUSH VOICE OF KALIPSO", brand: "Kalipso", size: "1 pc", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/IMG_8721--600x600.jpg", categories: ["firca"] },
  { id: "kalipso-brush-set-design-3pcs", name: "VOICE OF KALIPSO BRUSH SET FOR DESIGN, 3PCS", brand: "Kalipso", size: "3 pcs", image: "https://vo-kalipso.com/wp-content/uploads/2024/03/nabor-kistey-voice-of-kalipso-dlya-dizayna-3sht-2-600x600.jpg", categories: ["firca"] },
  { id: "gel-polish-albi-143-151", name: "Gel polish Albi 143-151", brand: "ALBI", size: "SUMMER COLLECTION", image: "https://static.tildacdn.com/stor3061-3863-4230-b835-663661653032/91904699.jpg", categories: ["gel-polish", "special-offers"] },
  { id: "gel-polish-albi-159-169", name: "Gel polish Albi 159-169", brand: "ALBI", size: "SUMMER COLLECTION", image: "https://static.tildacdn.com/stor3938-6437-4031-a338-346336663961/64615977.jpg", categories: ["gel-polish", "special-offers"] },
  { id: "special-offer-sculptural-gel-albi-new-milky-rose", name: "1+1 Sculptural gel ALBI NEW MILKY ROSE", brand: "ALBI", size: "30 ml", image: "https://static.tildacdn.com/stor3338-3131-4335-b335-383037383766/30975319.jpg", categories: ["building-gel", "special-offers"] },
  { id: "kalipso-vok-022", name: "VOICE OF KALIPSO GEL POLISH №022, 10 ML warm gray shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok22-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-024", name: "VOICE OF KALIPSO GEL POLISH №024, 10 ML delicate peach shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok24-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-034", name: "VOICE OF KALIPSO GEL POLISH №034, 10 ML grey-plum shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok34-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-049", name: "VOICE OF KALIPSO GEL POLISH №049, 10 ML light gray shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok49-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-051", name: "VOICE OF KALIPSO GEL POLISH №051, 10 ML Liquid foil", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok51-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-053", name: "VOICE OF KALIPSO GEL POLISH №053, 10 ML Glitter", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok53-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-060", name: "VOICE OF KALIPSO GEL POLISH №060, 10 ML dark blue-gray shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok60-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-091", name: "VOICE OF KALIPSO GEL POLISH №091, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok91-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-093", name: "VOICE OF KALIPSO GEL POLISH №093, 10 ML warm rich pink shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok93-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-097", name: "VOICE OF KALIPSO GEL POLISH №097, 10 ML deep red shade with red glitter", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok97-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-108", name: "VOICE OF KALIPSO GEL POLISH №108, 10 ML black-blue shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok108-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-112", name: "VOICE OF KALIPSO GEL POLISH №112, 10 ML lilac shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok112-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-120", name: "VOICE OF KALIPSO GEL POLISH №120, 10 ML Small silver flakes with a pink tint", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok120-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-132", name: "VOICE OF KALIPSO GEL POLISH №132, 10 ML dark burgundy shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok132-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-133", name: "VOICE OF KALIPSO GEL POLISH №133, 10 ML bright peach shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok133-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-134", name: "VOICE OF KALIPSO GEL POLISH №134, 10 ML juicy powdery pink shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok134-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-152", name: "VOICE OF KALIPSO GEL POLISH №152, 10 ML deep yellow shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok152-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-153", name: "VOICE OF KALIPSO GEL POLISH №153, 10 ML light green shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok153-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-157", name: "VOICE OF KALIPSO GEL POLISH №157, 10 ML bright light coral shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok157-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-164", name: "VOICE OF KALIPSO GEL POLISH №164, 10 ML rich green shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok164-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-166", name: "VOICE OF KALIPSO GEL POLISH №166, 10 ML pink shade with a green tint", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok166-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-167", name: "VOICE OF KALIPSO GEL POLISH №167, 10 ML pearlescent shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok167-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-174", name: "VOICE OF KALIPSO GEL POLISH №174, 10 ML Olive shade with shimmer", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok174-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-182", name: "VOICE OF KALIPSO GEL POLISH №182, 10 ML juicy dark blue shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok182-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-183", name: "VOICE OF KALIPSO GEL POLISH №183, 10 ML raspberry shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok183-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-185", name: "VOICE OF KALIPSO GEL POLISH №185, 10 ML gray-green shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok185-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-188", name: "VOICE OF KALIPSO GEL POLISH №188, 10 ML deep dark blue shade with shimmer", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok188-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-190", name: "VOICE OF KALIPSO GEL POLISH №190, 10 ML black shade with glitter", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok190-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-198", name: "VOICE OF KALIPSO GEL POLISH №198, 10 ML warm pink shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok198-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-205", name: "VOICE OF KALIPSO GEL POLISH №205, 10 ML dark blue shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok205-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-210", name: "VOICE OF KALIPSO GEL POLISH №210, 10 ML light olive shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/VOK210-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-215", name: "VOICE OF KALIPSO GEL POLISH №215, 10 ML noble orange shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok215-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-216", name: "VOICE OF KALIPSO GEL POLISH №216, 10 ML khaki shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/VOK216-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-217", name: "VOICE OF KALIPSO GEL POLISH №217, 10 ML dark blue shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok217-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-220", name: "VOICE OF KALIPSO GEL POLISH №220, 10 ML dark mustard shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok220-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-221", name: "VOICE OF KALIPSO GEL POLISH №221, 10 ML dark gray-green shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok221-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-225", name: "VOICE OF KALIPSO GEL POLISH №225, 10 ML light wine shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok225-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-227", name: "VOICE OF KALIPSO GEL POLISH №227, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok227-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-230", name: "VOICE OF KALIPSO GEL POLISH №230, 10 ML olive shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok230-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-233", name: "VOICE OF KALIPSO GEL POLISH №233, 10 ML pink pearl shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok233-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-235", name: "VOICE OF KALIPSO GEL POLISH №235, 10 ML bleached khaki shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok235-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-239", name: "VOICE OF KALIPSO GEL POLISH №239, 10 ML juicy light green shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/VOK239-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-242", name: "VOICE OF KALIPSO GEL POLISH №242, 10 ML gray shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok242-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-244", name: "VOICE OF KALIPSO GEL POLISH №244, 10 ML cool bleached pink shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok244-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-262", name: "VOICE OF KALIPSO GEL POLISH №262, 10 ML olive shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok262-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-281", name: "VOICE OF KALIPSO GEL POLISH №281, 10 ML Dark blue with glitter", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok281-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-285", name: "VOICE OF KALIPSO GEL POLISH №285, 10 ML Liquid foil", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok285-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-286", name: "VOICE OF KALIPSO GEL POLISH №286, 10 ML Liquid foil", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok286-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-288", name: "VOICE OF KALIPSO GEL POLISH №288, 10 ML Liquid foil", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok288-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-291", name: "VOICE OF KALIPSO GEL POLISH №291, 10 ML Liquid foil", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok291-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-307", name: "VOICE OF KALIPSO GEL POLISH №307, 10 ML Delicate pale pink translucent shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/VOK307-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-324", name: "VOICE OF KALIPSO GEL POLISH №324, 10 ML dark grey shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3246265149539-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vitrage-02", name: "GEL POLISH VOICE OF KALIPSO VITRAGE 02, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/02--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-gp-001", name: "GEL POLISH №001, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok1-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-gp-002", name: "GEL POLISH №002, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok2-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-gp-003", name: "GEL POLISH №003, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok3-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-gp-004", name: "GEL POLISH №004, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/004-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-gp-005", name: "GEL POLISH №005, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok5-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-006", name: "VOICE OF KALIPSO GEL POLISH №006, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok6-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-007", name: "VOICE OF KALIPSO GEL POLISH №007, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok7-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-008", name: "VOICE OF KALIPSO GEL POLISH №008, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok8-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-009", name: "VOICE OF KALIPSO GEL POLISH №009, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok9-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-010", name: "VOICE OF KALIPSO GEL POLISH №010, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok10-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-011", name: "VOICE OF KALIPSO GEL POLISH №011, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok11-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-012", name: "VOICE OF KALIPSO GEL POLISH №012, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok12-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-013", name: "VOICE OF KALIPSO GEL POLISH №013, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok13-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-014", name: "VOICE OF KALIPSO GEL POLISH №014, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok14-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-015", name: "VOICE OF KALIPSO GEL POLISH №015, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok15-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-016", name: "VOICE OF KALIPSO GEL POLISH №016, 10 ML ivory shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok16-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-017", name: "VOICE OF KALIPSO GEL POLISH №017, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok17-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-018", name: "VOICE OF KALIPSO GEL POLISH №018, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok18-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-019", name: "VOICE OF KALIPSO GEL POLISH №019, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok19-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-020", name: "VOICE OF KALIPSO GEL POLISH №020, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok20-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-021", name: "VOICE OF KALIPSO GEL POLISH №021, 10 ML peach shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok21-1-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-023", name: "VOICE OF KALIPSO GEL POLISH №023, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok23-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-025", name: "VOICE OF KALIPSO GEL POLISH №025, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok25-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-026", name: "VOICE OF KALIPSO GEL POLISH №026, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok26-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-027", name: "VOICE OF KALIPSO GEL POLISH №027, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok27-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-028", name: "VOICE OF KALIPSO GEL POLISH №028, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok28-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-029", name: "VOICE OF KALIPSO GEL POLISH №029, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok29-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-030", name: "VOICE OF KALIPSO GEL POLISH №030, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok30-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-031", name: "VOICE OF KALIPSO GEL POLISH №031, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok31-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-032", name: "VOICE OF KALIPSO GEL POLISH №032, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok32-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-033", name: "VOICE OF KALIPSO GEL POLISH №033, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok33-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-035", name: "VOICE OF KALIPSO GEL POLISH №035, 10 ML chocolate shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok35-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-036", name: "VOICE OF KALIPSO GEL POLISH №036, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok36-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-037", name: "VOICE OF KALIPSO GEL POLISH №037, 10 ML light pink shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok37-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-038", name: "VOICE OF KALIPSO GEL POLISH №038, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok38-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-039", name: "VOICE OF KALIPSO GEL POLISH №039, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok39-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-040", name: "VOICE OF KALIPSO GEL POLISH №040, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok40-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-041", name: "VOICE OF KALIPSO GEL POLISH №041, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok41-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-042", name: "VOICE OF KALIPSO GEL POLISH №042, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok42-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-043", name: "VOICE OF KALIPSO GEL POLISH №043, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok43-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-044", name: "VOICE OF KALIPSO GEL POLISH №044, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok44-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-045", name: "VOICE OF KALIPSO GEL POLISH №045, 10 ML light raspberry shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok45-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-046", name: "VOICE OF KALIPSO GEL POLISH №046, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok46-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-047", name: "VOICE OF KALIPSO GEL POLISH №047, 10 ML shiny pink shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok47-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-048", name: "VOICE OF KALIPSO GEL POLISH №048, 10 ML juicy lilac shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok48-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-050", name: "VOICE OF KALIPSO GEL POLISH №050, 10 ML Cool light purple with fine shimmer", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok50-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-052", name: "VOICE OF KALIPSO GEL POLISH №052, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok52-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-054", name: "VOICE OF KALIPSO GEL POLISH №054, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok54-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-055", name: "VOICE OF KALIPSO GEL POLISH №055, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok55-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-056", name: "VOICE OF KALIPSO GEL POLISH №056, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok56-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-057", name: "VOICE OF KALIPSO GEL POLISH №057, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok57-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-058", name: "VOICE OF KALIPSO GEL POLISH №058, 10 ML light purple shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok58-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-059", name: "VOICE OF KALIPSO GEL POLISH №059, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok59-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-061", name: "VOICE OF KALIPSO GEL POLISH №061, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok61-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-062", name: "VOICE OF KALIPSO GEL POLISH №062, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok62-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-063", name: "VOICE OF KALIPSO GEL POLISH №063, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok63-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-064", name: "VOICE OF KALIPSO GEL POLISH №064, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok64-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-065", name: "VOICE OF KALIPSO GEL POLISH №065, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok65-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-066", name: "VOICE OF KALIPSO GEL POLISH №066, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok66-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-067", name: "VOICE OF KALIPSO GEL POLISH №067, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok67-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-068", name: "VOICE OF KALIPSO GEL POLISH №068, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok68-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-069", name: "VOICE OF KALIPSO GEL POLISH №069, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok69-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-070", name: "VOICE OF KALIPSO GEL POLISH №070, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok70-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-071", name: "VOICE OF KALIPSO GEL POLISH №071, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok71-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-072", name: "VOICE OF KALIPSO GEL POLISH №072, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok72-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-073", name: "VOICE OF KALIPSO GEL POLISH №073, 10 ML Glitter", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/4-1-1-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-074", name: "VOICE OF KALIPSO GEL POLISH №074, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok74-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-075", name: "VOICE OF KALIPSO GEL POLISH №075, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok75-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-076", name: "VOICE OF KALIPSO GEL POLISH №076, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok76-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-077", name: "VOICE OF KALIPSO GEL POLISH №077, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok77-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-078", name: "VOICE OF KALIPSO GEL POLISH №078, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok78-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-079", name: "VOICE OF KALIPSO GEL POLISH №079, 10 ML turquoise shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok79-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-080", name: "VOICE OF KALIPSO GEL POLISH №080, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok80-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-081", name: "VOICE OF KALIPSO GEL POLISH №081, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok81-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-082", name: "VOICE OF KALIPSO GEL POLISH №082, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok82-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-083", name: "VOICE OF KALIPSO GEL POLISH №083, 10 ML dark wine shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok83-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-084", name: "VOICE OF KALIPSO GEL POLISH №084, 10 ML dark blue pearl shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok84-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-085", name: "VOICE OF KALIPSO GEL POLISH №085, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok85-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-086", name: "VOICE OF KALIPSO GEL POLISH №086, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok86-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-087", name: "VOICE OF KALIPSO GEL POLISH №087, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok87-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-088", name: "VOICE OF KALIPSO GEL POLISH №088, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok88-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-089", name: "VOICE OF KALIPSO GEL POLISH №089, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok89-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-090", name: "VOICE OF KALIPSO GEL POLISH №090, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok90-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-092", name: "VOICE OF KALIPSO GEL POLISH №092, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok92-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-094", name: "VOICE OF KALIPSO GEL POLISH №094, 10 ML scarlet shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok94-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-095", name: "VOICE OF KALIPSO GEL POLISH №095, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok95-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-096", name: "VOICE OF KALIPSO GEL POLISH №096, 10 ML juicy raspberry shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok96-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-098", name: "VOICE OF KALIPSO GEL POLISH №098, 10 ML Pink glitter", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/98--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-099", name: "VOICE OF KALIPSO GEL POLISH №099, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok99-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-100", name: "VOICE OF KALIPSO GEL POLISH №100, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/01/vok100-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-101", name: "VOICE OF KALIPSO GEL POLISH №101, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok101-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-102", name: "VOICE OF KALIPSO GEL POLISH №102, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok102-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-103", name: "VOICE OF KALIPSO GEL POLISH №103, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok103-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-104", name: "VOICE OF KALIPSO GEL POLISH №104, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok104-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-105", name: "VOICE OF KALIPSO GEL POLISH №105, 10 ML plum shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok105-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-106", name: "VOICE OF KALIPSO GEL POLISH №106, 10 ML Dark blue with sparkles", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok106-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-107", name: "VOICE OF KALIPSO GEL POLISH №107, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok107-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-109", name: "VOICE OF KALIPSO GEL POLISH №109, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok109-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-110", name: "VOICE OF KALIPSO GEL POLISH №110, 10 ML cool light lilac shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok110-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-111", name: "VOICE OF KALIPSO GEL POLISH №111, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok111-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-113", name: "VOICE OF KALIPSO GEL POLISH №113, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok113-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-114", name: "VOICE OF KALIPSO GEL POLISH №114, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok114-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-115", name: "VOICE OF KALIPSO GEL POLISH №115, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/115-1-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-116", name: "VOICE OF KALIPSO GEL POLISH №116, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok116-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-117", name: "VOICE OF KALIPSO GEL POLISH №117, 10 ML dark plum shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok117-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-118", name: "VOICE OF KALIPSO GEL POLISH №118, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok118-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-119", name: "VOICE OF KALIPSO GEL POLISH №119, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok119-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-121", name: "VOICE OF KALIPSO GEL POLISH №121, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok121-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-122", name: "VOICE OF KALIPSO GEL POLISH №122, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok122-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-123", name: "VOICE OF KALIPSO GEL POLISH №123, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok123-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-124", name: "VOICE OF KALIPSO GEL POLISH №124, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok124-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-125", name: "VOICE OF KALIPSO GEL POLISH №125, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok125-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-126", name: "VOICE OF KALIPSO GEL POLISH №126, 10 ML dark burgundy shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok126-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-127", name: "VOICE OF KALIPSO GEL POLISH №127, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok127-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-128", name: "VOICE OF KALIPSO GEL POLISH №128, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok128-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-129", name: "VOICE OF KALIPSO GEL POLISH №129, 10 ML deep dark purple shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok129-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-130", name: "VOICE OF KALIPSO GEL POLISH №130, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok130-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-131", name: "VOICE OF KALIPSO GEL POLISH №131, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok131-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-135", name: "VOICE OF KALIPSO GEL POLISH №135, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok135-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-136", name: "VOICE OF KALIPSO GEL POLISH №136, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok136-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-137", name: "VOICE OF KALIPSO GEL POLISH №137, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok137-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-138", name: "VOICE OF KALIPSO GEL POLISH №138, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok138-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-139", name: "VOICE OF KALIPSO GEL POLISH №139, 10 ML shade of black coffee", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok139-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-140", name: "VOICE OF KALIPSO GEL POLISH №140, 10 ML translucent milky shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok140-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-141", name: "VOICE OF KALIPSO GEL POLISH №141, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok141-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-142", name: "VOICE OF KALIPSO GEL POLISH №142, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok142-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-143", name: "VOICE OF KALIPSO GEL POLISH №143, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok143-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-144", name: "VOICE OF KALIPSO GEL POLISH №144, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok144-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-145", name: "VOICE OF KALIPSO GEL POLISH №145, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok145-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-146", name: "VOICE OF KALIPSO GEL POLISH №146, 10 ML gray-green shade with fine shimmer", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok146-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-147", name: "VOICE OF KALIPSO GEL POLISH №147, 10 ML Warm silver glitter", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok147-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-148", name: "VOICE OF KALIPSO GEL POLISH №148, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok148-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-149", name: "VOICE OF KALIPSO GEL POLISH №149, 10 ML juicy light green shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok149-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-150", name: "VOICE OF KALIPSO GEL POLISH №150, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok150-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-151", name: "VOICE OF KALIPSO GEL POLISH №151, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok151-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-154", name: "VOICE OF KALIPSO GEL POLISH №154, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok154-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-155", name: "VOICE OF KALIPSO GEL POLISH №155, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok155-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-156", name: "VOICE OF KALIPSO GEL POLISH №156, 10 ML scarlet shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok156-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-158", name: "VOICE OF KALIPSO GEL POLISH №158, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok158-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-159", name: "VOICE OF KALIPSO GEL POLISH №159, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok159-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-160", name: "VOICE OF KALIPSO GEL POLISH №160, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok160-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-161", name: "VOICE OF KALIPSO GEL POLISH №161, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/VOK161-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-162", name: "VOICE OF KALIPSO GEL POLISH №162, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok162-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-163", name: "VOICE OF KALIPSO GEL POLISH №163, 10 ML Light green shade with shimmer", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok163-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-165", name: "VOICE OF KALIPSO GEL POLISH №165, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok165-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-168", name: "VOICE OF KALIPSO GEL POLISH №168 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok168-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-169", name: "VOICE OF KALIPSO GEL POLISH №169 10 ML deep dark purple shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok169-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-170", name: "VOICE OF KALIPSO GEL POLISH №170 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok170-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-171", name: "VOICE OF KALIPSO GEL POLISH №171 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok171-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-172", name: "VOICE OF KALIPSO GEL POLISH №172 10 ML dark blue, almost black shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok172-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-173", name: "VOICE OF KALIPSO GEL POLISH №173 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok173-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-175", name: "VOICE OF KALIPSO GEL POLISH №175 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok175-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-176", name: "VOICE OF KALIPSO GEL POLISH №176 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok176-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-177", name: "VOICE OF KALIPSO GEL POLISH №177 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok177-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-178", name: "VOICE OF KALIPSO GEL POLISH №178,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok178-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-179", name: "VOICE OF KALIPSO GEL POLISH №179,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok179-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-180", name: "VOICE OF KALIPSO GEL POLISH №180,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok180-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-181", name: "VOICE OF KALIPSO GEL POLISH №181,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok181-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-184", name: "VOICE OF KALIPSO GEL POLISH №184,10 ML light gray shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok184-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-186", name: "VOICE OF KALIPSO GEL POLISH №186,10 ML dark green shade with shimmer", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok186-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-187", name: "VOICE OF KALIPSO GEL POLISH №187,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok187-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-189", name: "VOICE OF KALIPSO GEL POLISH №189 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/VOK189--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-191", name: "VOICE OF KALIPSO GEL POLISH №191 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok191-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-224", name: "VOICE OF KALIPSO GEL POLISH № 224 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok224-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-226", name: "VOICE OF KALIPSO GEL POLISH № 226 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok226-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-228", name: "VOICE OF KALIPSO GEL POLISH № 228 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok228-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-229", name: "VOICE OF KALIPSO GEL POLISH № 229 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok229-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-231", name: "VOICE OF KALIPSO GEL POLISH № 231 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok231-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-232", name: "VOICE OF KALIPSO GEL POLISH № 232 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/VOK232-1-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-234", name: "VOICE OF KALIPSO GEL POLISH № 234 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok234-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-236", name: "VOICE OF KALIPSO GEL POLISH № 236 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/VOK236-1-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-237", name: "VOICE OF KALIPSO GEL POLISH № 237 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok237-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-238", name: "VOICE OF KALIPSO GEL POLISH № 238 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/02/vok238-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-240", name: "VOICE OF KALIPSO GEL POLISH № 240 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok240-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-241", name: "VOICE OF KALIPSO GEL POLISH № 241 ,10 ML dark gray shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok241-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-243", name: "VOICE OF KALIPSO GEL POLISH № 243 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok243-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-245", name: "VOICE OF KALIPSO GEL POLISH № 245 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok245-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-246", name: "VOICE OF KALIPSO GEL POLISH № 246 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok246-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-247", name: "VOICE OF KALIPSO GEL POLISH № 247 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok247-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-248", name: "VOICE OF KALIPSO GEL POLISH № 248 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok248-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-249", name: "VOICE OF KALIPSO GEL POLISH № 249 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok249-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-250", name: "VOICE OF KALIPSO GEL POLISH № 250 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok250-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-251", name: "VOICE OF KALIPSO GEL POLISH № 251 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok251-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-252", name: "VOICE OF KALIPSO GEL POLISH № 252 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok252-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-253", name: "VOICE OF KALIPSO GEL POLISH № 253 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/253-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-254", name: "VOICE OF KALIPSO GEL POLISH № 254 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok254-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-255", name: "VOICE OF KALIPSO GEL POLISH № 255 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok255-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-256", name: "VOICE OF KALIPSO GEL POLISH № 256 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok256-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-257", name: "VOICE OF KALIPSO GEL POLISH № 257 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok257-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-258", name: "VOICE OF KALIPSO GEL POLISH № 258 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/VOK258-копия-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-259", name: "VOICE OF KALIPSO GEL POLISH № 259 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok259-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-260", name: "VOICE OF KALIPSO GEL POLISH № 260 ,10 ML neon yellow shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok260-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-261", name: "VOICE OF KALIPSO GEL POLISH № 261 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok261-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-263", name: "VOICE OF KALIPSO GEL POLISH № 263 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/VOK263-1-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-264", name: "VOICE OF KALIPSO GEL POLISH № 264 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok264-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-265", name: "VOICE OF KALIPSO GEL POLISH № 265 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok265-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-266", name: "VOICE OF KALIPSO GEL POLISH № 266 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok266-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-267", name: "VOICE OF KALIPSO GEL POLISH № 267 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok267-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-268", name: "VOICE OF KALIPSO GEL POLISH № 268 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok268-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-269", name: "VOICE OF KALIPSO GEL POLISH № 269 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok269-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-270", name: "VOICE OF KALIPSO GEL POLISH № 270 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok270-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-271", name: "VOICE OF KALIPSO GEL POLISH № 271 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok271-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-272", name: "VOICE OF KALIPSO GEL POLISH № 272 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok272-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-273", name: "VOICE OF KALIPSO GEL POLISH № 273 ,10 ML shade with glitter", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/273-1--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-274", name: "VOICE OF KALIPSO GEL POLISH № 274 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok274-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-275", name: "VOICE OF KALIPSO GEL POLISH № 275 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok275-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-276", name: "VOICE OF KALIPSO GEL POLISH № 276 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok276-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-277", name: "VOICE OF KALIPSO GEL POLISH № 277 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok277-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-278", name: "VOICE OF KALIPSO GEL POLISH № 278 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok278-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-279", name: "VOICE OF KALIPSO GEL POLISH № 279 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok279-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-280", name: "VOICE OF KALIPSO GEL POLISH № 280 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok280-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-282", name: "VOICE OF KALIPSO GEL POLISH № 282 ,10 ML Dark purple shade with fine shimmer", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok282-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-283", name: "VOICE OF KALIPSO GEL POLISH № 283 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok283-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-284", name: "VOICE OF KALIPSO GEL POLISH № 284 ,10 ML Liquid foil", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok284-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-287", name: "VOICE OF KALIPSO GEL POLISH № 287 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok287-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-289", name: "VOICE OF KALIPSO GEL POLISH № 289 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok289-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-290", name: "VOICE OF KALIPSO GEL POLISH № 290 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok290-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-292", name: "VOICE OF KALIPSO GEL POLISH № 292 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok292-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-293", name: "VOICE OF KALIPSO GEL POLISH № 293 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok293-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-294", name: "VOICE OF KALIPSO GEL POLISH № 294 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok294-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-295", name: "VOICE OF KALIPSO GEL POLISH № 295 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok295-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-296", name: "VOICE OF KALIPSO GEL POLISH № 296 ,10 ML Malachite shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/2961-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-297", name: "VOICE OF KALIPSO GEL POLISH № 297 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok297-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-298", name: "VOICE OF KALIPSO GEL POLISH № 298 ,10 ML Glitter", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok298-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-299", name: "VOICE OF KALIPSO GEL POLISH № 299 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok299-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-300", name: "VOICE OF KALIPSO GEL POLISH № 300 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok300-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-301", name: "VOICE OF KALIPSO GEL POLISH № 301 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok301-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-302", name: "VOICE OF KALIPSO GEL POLISH № 302 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok302-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-303", name: "VOICE OF KALIPSO GEL POLISH № 303 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok303-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-304", name: "VOICE OF KALIPSO GEL POLISH № 304 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/vok304-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-305", name: "VOICE OF KALIPSO GEL POLISH № 305 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/VOK305-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-306", name: "VOICE OF KALIPSO GEL POLISH № 306 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/VOK306-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-308", name: "VOICE OF KALIPSO GEL POLISH № 308 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/VOK308-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-309", name: "VOICE OF KALIPSO GEL POLISH № 309 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/VOK309-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-310", name: "VOICE OF KALIPSO GEL POLISH № 310 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/VOK310-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-311", name: "VOICE OF KALIPSO GEL POLISH № 311 ,10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2021/03/VOK311-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vok-312", name: "VOICE OF KALIPSO GEL POLISH №312, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3126265174987-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-313", name: "VOICE OF KALIPSO GEL POLISH №313, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3136120334884-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-314", name: "VOICE OF KALIPSO GEL POLISH №314, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3146265147633-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-315", name: "VOICE OF KALIPSO GEL POLISH №315, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3156265150244-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-316", name: "VOICE OF KALIPSO GEL POLISH №316, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3166120359729-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-317", name: "VOICE OF KALIPSO GEL POLISH №317, 10 ML light yellow shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3176120362426-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-318", name: "VOICE OF KALIPSO GEL POLISH №318, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3186265150388-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-319", name: "VOICE OF KALIPSO GEL POLISH №319, 10 ML lilac shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3196265146850-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-320", name: "VOICE OF KALIPSO GEL POLISH №320, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3206265147606-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-321", name: "VOICE OF KALIPSO GEL POLISH №321, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3216265150216-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-322", name: "VOICE OF KALIPSO GEL POLISH №322, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3226265150362-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-323", name: "VOICE OF KALIPSO GEL POLISH №323, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3236265149619-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-325", name: "VOICE OF KALIPSO GEL POLISH №325, 10 ML purple shade", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3256265150332-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-326", name: "VOICE OF KALIPSO GEL POLISH №326, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/3266265147591-600x600.webp", categories: ["gel-polish"] },
  { id: "kalipso-vok-327", name: "VOICE OF KALIPSO GEL POLISH №327, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/327-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vitrage-03", name: "GEL POLISH VOICE OF KALIPSO VITRAGE 03, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/03--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-vitrage-05", name: "GEL POLISH VOICE OF KALIPSO VITRAGE 05, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/05--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-cats-eye-02", name: "GEL POLISH VOICE OF KALIPSO CAT\u2019S EYE 02, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/\u043a\u0435\u0442-02--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-cats-eye-04", name: "GEL POLISH VOICE OF KALIPSO CAT\u2019S EYE 04, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/\u043a\u0435\u0442-04--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-cats-eye-01", name: "GEL POLISH VOICE OF KALIPSO CAT\u2019S EYE 01, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2025/10/\u043a\u0435\u0442-01--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-cats-eye-03", name: "GEL POLISH VOICE OF KALIPSO CAT\u2019S EYE 03, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2025/10/\u043a\u0435\u0442-03--600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-cats-eye-05", name: "GEL POLISH VOICE OF KALIPSO CAT\u2019S EYE 05, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2025/10/5350290342185924923-600x600.jpg", categories: ["gel-polish"] },
  { id: "kalipso-silver-cat", name: "GEL POLISH VOICE OF KALIPSO SILVER CAT, 10 ML", brand: "Kalipso", size: "10 ml", image: "https://vo-kalipso.com/wp-content/uploads/2024/02/\u043a\u043e\u0448\u043a\u0430-222-600x600.jpg", categories: ["gel-polish"] },
  { id: "albi-450-454", name: "Gel Polish ALBI 450-454", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/tild3835-3466-4133-b639-636464643730/3U1A0103.jpg", categories: ["gel-polish"] },
  { id: "albi-455-459", name: "Gel Polish ALBI 455-459", brand: "ALBI", size: "10 ml", image: "https://static.tildacdn.com/stor3030-3836-4464-b734-346536626531/78881655.jpg", categories: ["gel-polish", "new"] },

  { id: "lovely-lash-560", name: "Brown Rili Cookie İpek Kirpik — 6 sıra karışık", brand: "LOVELY", size: "6 sıra", color: "Kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L23450_1_card_37725_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-lash-473", name: "Rili Brown Toffee İpek Kirpik — 6 sıra karışık", brand: "LOVELY", size: "6 sıra", color: "Kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L23107_1_card_37713_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-lash-853", name: "Rili Karamel Kahverengi İpek Kirpik — 16 sıra karışık (indirimli)", brand: "LOVELY", size: "16 sıra", color: "Karamel", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/L24332_1_card_37977_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-lash-179", name: "Koyu kahverengi Rili Choco İpek Kirpik — 6 sıra karışık", brand: "LOVELY", size: "6 sıra", color: "Koyu kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L11522_1_card_37351_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-lash-923", name: "LASHY Shok — koyu kahverengi kirpik, 20 sıra", brand: "LOVELY", size: "20 sıra", color: "Koyu kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/2025/09/10/b8ae2047b82cf76df84b48a24d97dfab5e178cfa_24708_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lashy"] },
  { id: "lovely-lash-924", name: "LASHY Shok — koyu kahverengi kirpik, 20 sıra MIX", brand: "LOVELY", size: "20 sıra", color: "Koyu kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/2025/09/10/b8ae2047b82cf76df84b48a24d97dfab5e178cfa_24717_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lashy"] },
  { id: "lovely-lash-471", name: "Brown Rili Toffee İpek Kirpik — 16 sıra", brand: "LOVELY", size: "16 sıra", color: "Kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L23003_1_card_37709_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-lash-512", name: "LOVELY Siena kahverengi kirpik — 16 sıra karışık", brand: "LOVELY", size: "16 sıra", color: "Kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L23348_1_card_37718_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-lash-555", name: "Brown Rili Cookie İpek Kirpik — 16 sıra", brand: "LOVELY", size: "16 sıra", color: "Kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L23356_1_card_37721_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-lash-511", name: "LOVELY Siena kahverengi kirpik — 16 sıra", brand: "LOVELY", size: "16 sıra", color: "Kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L23347_1_card_37715_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-lash-472", name: "Rili Toffee kahverengi kirpik seti — 16 sıra karışık", brand: "LOVELY", size: "16 sıra", color: "Kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L23083_1_card_37711_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-lash-1004", name: "LOVELY Valencia kahverengi kirpik — 16 sıra karışık", brand: "LOVELY", size: "16 sıra", color: "Kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/2026/02/09/7c5ba80f56a9fb615b5af5a3e8455078a92adbb9_38240_webp.webp", categories: ["ipek-kirpik", "new", "lovely", "lovely-lovely"] },
  { id: "lovely-lash-427", name: "Koyu kahverengi LOVELY Monaco kirpik — 16 sıra MIX", brand: "LOVELY", size: "16 sıra", color: "Koyu kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L11813_1_card_37362_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-lash-559", name: "Brown Rili Cookie İpek Kirpik — 16 sıra karışık", brand: "LOVELY", size: "16 sıra", color: "Kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L23429_1_card_37723_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-lash-426", name: "Koyu kahverengi LOVELY Monaco kirpik — 16 sıra", brand: "LOVELY", size: "16 sıra", color: "Koyu kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L11728_1_card_37359_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-lash-178", name: "Koyu kahverengi Rili Choco İpek Kirpik — 16 sıra karışık", brand: "LOVELY", size: "16 sıra", color: "Koyu kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L11503_1_card_37349_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-lash-981", name: "Koyu kahverengi LOVELY Bordèu kirpik — 16 sıra MIX", brand: "LOVELY", size: "16 sıra", color: "Koyu kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/2025/11/25/c4153eeba85a39f9401a59e998692c4135f65be9_25286_webp.webp", categories: ["ipek-kirpik", "new", "lovely", "lovely-lovely"] },
  { id: "lovely-lash-177", name: "Koyu kahverengi Rili Choco İpek Kirpik — 16 sıra", brand: "LOVELY", size: "16 sıra", color: "Koyu kahverengi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L11420_1_card_37347_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },

  { id: "lovely-catalog-deluxe-20-mix", name: "Muhteşem Lüks Siyah Kirpikler - 20 Sıra - Karışık", brand: "LOVELY", size: "20 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L09920_1_card_37153_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-catalog-silicone-20-orange", name: "DÜŞÜK FİYATLI Siyah Kirpikler, Sevimli \"Silikon\" Serisi - 20 Sıra (Turuncu)", brand: "LOVELY", size: "20 sıra", color: "Turuncu", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L10022_1_card_25392_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-catalog-deluxe-20", name: "Muhteşem Lüks Siyah Kirpikler - 20 Sıra", brand: "LOVELY", size: "20 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L09919_1_card_37147_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-catalog-rili-6-mix", name: "Rili Siyah Kirpikler - 6 Sıra - Karışık", brand: "LOVELY", size: "6 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L19655_1_card_37435_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-catalog-deluxe-16-mix", name: "Muhteşem Lüks Siyah Kirpikler - 16 Sıra - Karışık", brand: "LOVELY", size: "16 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/2025/10/27/d82f2e3cf72603deebd1b77daeb68d1ad4c0a7db_25244_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-catalog-silicone-6-mini", name: "Güzel Siyah Kirpikler, \"Silikon\" Serisi - 6 Sıra - MİNİ", brand: "LOVELY", size: "6 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/card/TMi7ZhxDEyFqGPYfxydF_38253_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-catalog-lashy-ultra-20-mix", name: "LASHY Ultra Siyah Kirpikler - 20 Sıra - Karışık", brand: "LOVELY", size: "20 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L20431_1_card_37450_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lashy"] },
  { id: "lovely-catalog-silicone-6-mini-mix", name: "Güzel Siyah Kirpikler, \"Silikon\" Serisi - 6 Çeşit - MİNİ KARIŞIM", brand: "LOVELY", size: "6 çeşit", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/card/ud3eqw4TKy6Z4bzwNvBg_38494_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-catalog-lashy-ultra-20", name: "LASHY Ultra Siyah Kirpikler - 20 Sıra", brand: "LOVELY", size: "20 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L20308_1_card_37448_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lashy"] },
  { id: "lovely-catalog-silicone-16-mix", name: "Güzel Siyah Kirpikler, \"Silikon\" Serisi - 16 Çeşit - Karışık", brand: "LOVELY", size: "16 çeşit", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L19518_1_card_37430_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-catalog-silicone-16", name: "Güzel Siyah Kirpikler, \"Silikon\" Serisi - 16 Sıra", brand: "LOVELY", size: "16 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L19473_1_card_23933_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-catalog-silicone-20-mix", name: "Güzel Siyah Kirpikler, \"Silikon\" Serisi - 20 Sıra - Karışık", brand: "LOVELY", size: "20 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L09925_1_card_37164_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-catalog-rili-16-mix", name: "Rili Siyah Kirpikler - 16 Sıra - Karışık", brand: "LOVELY", size: "16 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L10017_1_card_37341_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-catalog-silicone-20", name: "Güzel Siyah Kirpikler, \"Silikon\" Serisi - 20 Sıra", brand: "LOVELY", size: "20 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L09924_1_card_37159_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-lovely"] },
  { id: "lovely-catalog-rili-16", name: "Rili Siyah Kirpikler - 16 Sıra", brand: "LOVELY", size: "16 sıra", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L10016_1_card_37337_webp.webp", categories: ["ipek-kirpik", "lovely", "lovely-rili"] },
  { id: "lovely-supply-mikrobrasi", name: "Mikrofırçalar", brand: "LOVELY", size: "Küçük / Orta", color: "Çoklu", image: "https://admin.lovely-professional.ru/storage/media-cache/2025/10/14/3b6b0b96008b83e26dadfe48efe44c397763db2b_25079_webp.webp", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-paket-2635", name: "LOVELY kağıt çanta (26×35)", brand: "LOVELY", size: "26×35 cm", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L40128_1_card_37828_webp.webp", categories: ["kirpik-markali"] },
  { id: "lovely-supply-kolco-klei-1", name: "Yapıştırıcı halkası #1", brand: "LOVELY", size: "Adet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/card/j76n79ffb2D6JNjJkOjO_3326_webp.webp", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-nylon-brush-50", name: "Siyah naylon fırçalar (50 adet)", brand: "LOVELY", size: "50 adet", color: "Siyah", image: "https://admin.lovely-professional.ru/storage/media-cache/2025/10/14/a0c1e752c2c8900b99b24782377fd3c4072ac3dd_25042_webp.webp", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-paket-kagit", name: "LOVELY kağıt çanta", brand: "LOVELY", size: "Standart", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/card/pAGHKn9OEaLtTUgu7Ydh_2813_webp.webp", categories: ["kirpik-markali"] },
  { id: "lovely-supply-silikon-firca", name: "Silikon kirpik fırçası", brand: "LOVELY", size: "Çoklu renk", color: "Çoklu", image: "", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-tape-48mm", name: "LOVELY markalı bant (48 mm)", brand: "LOVELY", size: "48 mm", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L88046_1_card_37881_webp.webp", categories: ["kirpik-markali"] },
  { id: "lovely-supply-dez-wipes", name: "Dezenfektan mendiller (100 adet)", brand: "LOVELY", size: "100 adet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L52010_1_card_37831_webp.webp", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-palet-headband", name: "Kafa bandı için yedek tablet", brand: "LOVELY", size: "Yedek parça", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30064_1_card_37728_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-paket-3040", name: "LOVELY paket (30×40)", brand: "LOVELY", size: "30×40 cm", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L40116_1_card_37827_webp.webp", categories: ["kirpik-markali"] },
  { id: "lovely-supply-silikon-palet", name: "LOVELY silikon yapıştırıcı tableti", brand: "LOVELY", size: "Tablet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30592_1_card_37803_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-paket-2530", name: "LOVELY küçük paket (25×30)", brand: "LOVELY", size: "25×30 cm", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L400111_1_card_37820_webp.webp", categories: ["kirpik-markali"] },
  { id: "lovely-supply-rili-palet-mavi", name: "Riley mavi palet", brand: "LOVELY", size: "Tablet", color: "Mavi", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30602_1_card_37816_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-rili-paket", name: "Riley paketi", brand: "LOVELY", size: "Standart", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L88044_1_card_37880_webp.webp", categories: ["kirpik-markali"] },
  { id: "lovely-supply-mannequin-head", name: "LOVELY kirpik uzatma manken kafası", brand: "LOVELY", size: "Manken", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/card/TjSYyaJmbnS4xUhhXv3C_3325_webp.webp", categories: ["kirpik-ekipman"] },
  { id: "lovely-supply-diamond-brush", name: "LOVELY «Elmas» kirpik fırçası", brand: "LOVELY", size: "Çoklu model", color: "Çoklu", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L70050_1_card_37857_webp.webp", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-glue-palet", name: "LOVELY tutkal paleti", brand: "LOVELY", size: "Palet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/2025/09/09/92c00dd649b7786d89945a1575e295e6dae4739d_24444_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-rili-palet-kirmizi", name: "Riley kırmızı palet", brand: "LOVELY", size: "Tablet", color: "Kırmızı", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30600_1_card_37814_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-rili-palet-yesil", name: "Riley yeşil palet", brand: "LOVELY", size: "Tablet", color: "Yeşil", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30601_1_card_37815_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-plastic-tape-9m", name: "Plastik bant, 9 m", brand: "LOVELY", size: "9 m", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30125_1_card_37756_webp.webp", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-steam-converter", name: "LOVELY buhar dönüştürücü", brand: "LOVELY", size: "Cihaz", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30123_1_card_37749_webp.webp", categories: ["kirpik-ekipman"] },

  { id: "lovely-supply-kagit-bant-9m", name: "Kağıt bant, 9 m", brand: "LOVELY", size: "9 m", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30124_1_card_37752_webp.webp", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-kirpik-temizleme-fircasi", name: "LOVELY kirpik temizleme fırçası", brand: "LOVELY", size: "Adet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L70046_1_card_37848_webp.webp", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-poset-klipsi", name: "Poşet klipsi", brand: "LOVELY", size: "Adet", color: "Çoklu", image: "https://admin.lovely-professional.ru/storage/media-cache/card/PpBndfEkz47lDlj8RVKz_2970_webp.webp", categories: ["kirpik-ek-malzemeler"] },
  { id: "lovely-supply-kirpik-fircasi-tup", name: "LOVELY kirpik fırçası (tüp)", brand: "LOVELY", size: "Tüp", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30551_1_card_37779_webp.webp", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-lash-organizer", name: "LOVELY kirpik uzmanı organizatörü", brand: "LOVELY", size: "Standart", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L60025_1_card_37838_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-tutkal-acacigi", name: "LOVELY tutkal açacağı", brand: "LOVELY", size: "Adet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L70039_1_card_37842_webp.webp", categories: ["kirpik-ekipman"] },
  { id: "lovely-supply-lashy-kirpik-tableti", name: "LASHY kirpik tableti", brand: "LOVELY", size: "Tablet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30593_1_card_37807_webp.webp", categories: ["kirpik-markali", "kirpik-tablet-stand"] },
  { id: "lovely-supply-pincet-standi", name: "LOVELY cımbız standı", brand: "LOVELY", size: "Standart", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/2026/03/17/43d55a21576f72b860816f34a7e5d69a7ac26aef_38470_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-multi-tutkal-paleti", name: "Çoklu yapıştırıcı paleti", brand: "LOVELY", size: "Palet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/card/8ZOPE9SkqE1ThP8jGSbs_3901_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-rili-sari-tablet", name: "Riley sarı tablet", brand: "LOVELY", size: "Tablet", color: "Sarı", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30591_1_card_37802_webp.webp", categories: ["kirpik-markali", "kirpik-tablet-stand"] },
  { id: "lovely-supply-kirpik-tableti-no2", name: "LOVELY kirpik tableti No. 2", brand: "LOVELY", size: "Tablet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30082_1_card_37733_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-vinil-cikartma", name: "Vinil çıkartmalar (1 yaprak)", brand: "LOVELY", size: "1 yaprak", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30126_1_card_37760_webp.webp", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-kirpik-tableti-no1", name: "LOVELY kirpik tableti No. 1", brand: "LOVELY", size: "Tablet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30142_1_card_37764_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-naylon-kirpik-fircasi-adet", name: "Naylon kirpik fırçası", brand: "LOVELY", size: "Adet", color: "Çoklu", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30223_1_card_37768_webp.webp", categories: ["kirpik-sarf"] },
  { id: "lovely-supply-kirpik-pedi-3-2mm", name: "LOVELY kirpik uzatma pedi #3 (2 mm)", brand: "LOVELY", size: "2 mm", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30607_1_card_37817_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-termal-tutkal-cantasi", name: "Tutkal saklama termal çantası", brand: "LOVELY", size: "Standart", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30071_1_card_37730_webp.webp", categories: ["kirpik-ek-malzemeler"] },
  { id: "lovely-supply-duzenleyici-kutu", name: "LOVELY düzenleyici kutu", brand: "LOVELY", size: "Standart", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30596_1_card_37811_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-tutkal-saklama-kutusu", name: "LOVELY tutkal saklama kutusu", brand: "LOVELY", size: "Standart", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30540_1_card_37776_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-renkli-kirpik-tableti-siyah", name: "LOVELY siyah renkli kirpik tableti", brand: "LOVELY", size: "Tablet", color: "Çoklu", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30365_1_card_37772_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-termo-higrometre", name: "LOVELY termo-higrometre", brand: "LOVELY", size: "Cihaz", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/card/8wxg2hSFOg7co25sDWuw_3152_webp.webp", categories: ["kirpik-ekipman"] },
  { id: "lovely-supply-tablet-kaydiragi", name: "LOVELY tablet kaydırağı", brand: "LOVELY", size: "Standart", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30085_1_card_37741_webp.webp", categories: ["kirpik-tablet-stand"] },

  { id: "lovely-supply-lashbox-5-tablet", name: "LOVELY Lashbox (5 tablet)", brand: "LOVELY", size: "5 tablet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30084_1_card_37737_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-lashboard-egitim", name: "LOVELY LashBoard eğitimi", brand: "LOVELY", size: "Standart", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L40079_1_card_37821_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-tablet-kafa-bandi", name: "LOVELY tablet kafa bandı", brand: "LOVELY", size: "Standart", color: "Çoklu", image: "https://admin.lovely-professional.ru/storage/media-cache/2025/07/23/f2ba85da6ae0142aaa08459677fa315d290a55af_24094_webp.webp", categories: ["kirpik-tekstil", "kirpik-tablet-stand"] },
  { id: "lovely-supply-kirpik-tableti-no3", name: "LOVELY kirpik tableti No. 3", brand: "LOVELY", size: "Tablet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30083_1_card_37735_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "lovely-supply-kirpik-makasi", name: "Kirpik makası", brand: "LOVELY", size: "Standart", color: "Çoklu", image: "https://admin.lovely-professional.ru/storage/media-cache/2025/06/26/18dd216226d66e148c73cd2b671b8e0c8538b94c_24074_webp.webp", categories: ["kirpik-ekipman"] },
  { id: "lovely-supply-kolajen-bantlar-1-cift", name: "Kolajen bantlar (1 çift)", brand: "LOVELY", size: "1 çift", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L30094_1_card_37744_webp.webp", categories: ["kirpik-alt-izolasyon"] },
  { id: "lovely-supply-hidrojel-izolasyon-pedi", name: "LOVELY kirpik izolasyonu için hidrojel pedler", brand: "LOVELY", size: "Standart", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/2025/05/27/fe862b95d5a9ed9a58ac12cbc8062d3c2ae8a62e_23748_webp.webp", categories: ["kirpik-alt-izolasyon"] },
  { id: "lovely-supply-lashbox-10-tablet", name: "LOVELY Lashbox (10 tablet)", brand: "LOVELY", size: "10 tablet", color: "", image: "https://admin.lovely-professional.ru/storage/media-cache/cards_and_offers_images/05.05.2025/L70027_1_card_37839_webp.webp", categories: ["kirpik-tablet-stand"] },
  { id: "mio-gel-gel-lak-br-1-brilliant-01", name: "Jel oje. BR-1. Parlak No. 1", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/587/60htsip5f8zu1pe383sv56jnqhn1v469.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-br-2-brilliant-02", name: "Jel oje. BR-2. Parlak No. 2", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c73/r0xta033tv8p1gq9pfzcthxhjfdwn5bc.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-br-3-brilliant-03", name: "Jel oje. BR-3. Parlak No. 3", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a93/dv1la08nrcan5jole3vcdj3ey11emox0.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-01-khameleon-01", name: "Jel oje. CH-01. Bukalemun No. 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0b7/u3wnm2fvwydy0x22p8f4kuijibwtqgsh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-02-khameleon-02", name: "Jel oje. CH-02. Bukalemun No. 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c38/d0yirv32uwwhmzdpzdw7jf99gcwbrnyj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-03-khameleon-03", name: "Jel oje. CH-03. Bukalemun No. 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/fee/3zii5eye6pdv015mbq43q1g97smqmcui.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-04-khameleon-04", name: "Jel oje. CH-04. Bukalemun No. 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/214/q3q1nzc1vbd8t1ktdpf0efoddtd9xops.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-05-khameleon-05", name: "Jel oje. CH-05. Bukalemun No. 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/578/lxhhpf3irzl8ifc94kimte7xr314m4o3.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-06-khameleon-06", name: "Jel oje. CH-06. Bukalemun No. 06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8cd/b5n8brvggl0zt47apuy09rs0ukn65np6.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-07-khameleon-07", name: "Jel oje. CH-07. Bukalemun No. 07", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/97b/gxv0z4wc9om9i70nftkvzsbfyhv1acsr.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-08-khameleon-08", name: "Jel oje. CH-08. Bukalemun No. 08", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f87/bfrhirlyquhhb21djh71zcc6ptkbz8nm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-09-khameleon-09", name: "Jel oje. CH-09. Bukalemun No. 09", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b90/o5eugbqcdzs2qqsp9cq06g9ei97fh1fg.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-10-khameleon-10", name: "Jel oje. CH-10. Bukalemun No. 10", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/108/vz5z5ell6ijrjkf73kaqdmrt7ri1wp0s.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-11-khameleon-11", name: "Jel oje. CH-11. Bukalemun No. 11", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/662/gbcl731rpzuzh4b58q7i9b7592iyryeh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-12-khameleon-12", name: "Jel oje. CH-12. Bukalemun No. 12", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e40/lnixsyjw78sy6bpueoadp3ao6b3gwdzr.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ch-13-khameleon-13", name: "Jel oje. CH-13. Bukalemun No. 13", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/784/0f0sazu0u4y3yf710m7n04moji09xech.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-dl-1-delicate-01", name: "Jel oje. DL-1. Hassas No. 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/6eb/op1utu0v2c9w9nlr6pij5wqi6dub0hhm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-dl-2-delicate-02", name: "Jel oje. DL-2. Hassas No. 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f87/gxkkyc2tbigypifgfo2k7s5dxgl1o6cd.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-dl-4-delicate-04", name: "Jel oje. DL-4. Hassas No. 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e82/2g4i6dt2g8otkym1dbhdfp1ddnqnsphl.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-dl-6-delicate-06", name: "Jel oje. DL-6. Hassas No. 06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b08/1bqnm6m56v4xe4jbtcon9x8tpaski40z.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-dl-8-delicate-08", name: "Jel oje. DL-8. Hassas No. 08", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/964/ey7buls7y5miy1jabk920iilzh9kni9t.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ggd-01-glitter-gel-01", name: "Jel oje. GGD-01. Simli Jel #01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/077/0pzwdqjmo76chhrddkphhzixbdckshnv.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ggd-02-glitter-gel-02", name: "Jel oje. GGD-02. Simli Jel #02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/9d7/ffm55h0h4tcpfjzrknjtb6wyj3f7e9cc.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ggd-03-glitter-gel-03", name: "Jel oje. GGD-03. Simli Jel #03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/36e/hroh3znwcwcwaxhu6lm44nztc4nsyrsq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ggd-04-glitter-gel-04", name: "Jel oje. GGD-04. Simli Jel #04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f0c/n99nw324wgi3ah9wd33gknfbqcvh37ox.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ggd-05-glitter-gel-05", name: "Jel oje. GGD-05. Simli Jel #05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/228/lrae8os3exkuye6cnlghbvy4hp73z55q.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ggd-06-glitter-gel-06", name: "Jel oje. GGD-06. Simli Jel #06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ec5/iuh56l13ebrvefov574keppv2jxj6aza.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-01-glitter-gel-01", name: "Jel oje. GG-01. Simli Jel No. 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ab5/965nxyg1u91lw0kcnqb6jozz0fegvte5.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-02-glitter-gel-02", name: "Jel oje. GG-02. Simli Jel No. 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/716/dc67m5qi2w9rk15ztcado2qr01idf0zx.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-03-glitter-gel-03", name: "Jel oje. GG-03. Simli Jel No. 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0d2/op3t9z3vcxi9u0hlwqjg73rz6gl4yxct.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-04-glitter-gel-04", name: "Jel oje. GG-04. Simli Jel No. 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a67/fm974iphoy1mquaacbai3houtpl8bilt.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-05-glitter-gel-05", name: "Jel oje. GG-05. Simli Jel No. 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d0b/p7anfafz85u1d0jgh3a0mk9od75bd71q.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-06-glitter-gel-06", name: "Jel oje. GG-06. Simli Jel No. 06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0a5/4zcav5jbnuy7ue0nrubq11xf1th8wwep.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-07-glitter-gel-07", name: "Jel oje. GG-07. Simli Jel No. 07", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/cc7/g1yoez5ub6uoz3a4za59x6rg24b66i41.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-08-glitter-gel-08", name: "Jel oje. GG-08. Simli Jel No. 08", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/4da/v222e62k4xb1v2ykwo8kogwnqcq2s0nr.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-09-glitter-gel-09", name: "Jel oje. GG-09. Simli Jel No. 09", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0be/yr7qez9f2x8rj709jec09et4ffeiceen.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-10-glitter-gel-10", name: "Jel oje. GG-10. Simli Jel No. 10", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d0c/xd2gezvyxw3ctr9v5v56kwoapgetamyc.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-11-glitter-gel-11", name: "Jel oje. GG-11. Simli Jel No. 11", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/47b/nqyxz6b2uzfcicdyze2t7hjmv443ol7g.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-12-glitter-gel-12", name: "Jel oje. GG-12. Simli Jel No. 12", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b49/fzuz4makko2jb6nyx45nd31dqyw9a5cu.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-13-glitter-gel-13", name: "Jel oje. GG-13. Simli Jel No. 13", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e36/0lwm3ti2f7xmop2hodzk2w8g6k0af92l.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-14-glitter-gel-14", name: "Jel oje. GG-14. Simli Jel No. 14", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/7d2/d8e4psa0g9n0il2oqx0b5nzp3r50hxro.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gg-15-glitter-gel-15", name: "Jel oje. GG-15. Simli Jel No. 15", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a41/5buk0po82wuslvlf0dq2uwro107cgasz.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gn-01-golden-nude-01", name: "Jel oje. GN-01. Altın Nude No. 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/228/y6etg5z882vyp3y0mr28pk7pmrlnnzav.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gn-02-golden-nude-02", name: "Jel oje. GN-02. Altın Nude No. 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c23/wgw2mw42980sbvqr0kqa1lrgf2b6if7z.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gn-03-golden-nude-03", name: "Jel oje. GN-03. Altın Nude No. 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/678/wu0wyxuer9dt0mv8e40xf0ab4dr3ymdp.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gn-04-golden-nude-04", name: "Jel oje. GN-04. Altın Nude No. 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/cb9/d221gg650qr2iqjgiv0snhabd3a5q8x3.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gn-05-golden-nude-05", name: "Jel oje. GN-05. Altın Nude No. 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e99/h5bqviea49v59umqd44pq5y3gqj6fm4z.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-n-01-neon-01", name: "Jel oje. N-01. Neon No. 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ed2/q0r79wcpjup2asdoy6x5mrhbq5gcu40t.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-n-02-neon-02", name: "Jel oje. N-02. Neon No. 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/fcb/mcanpnyokm0a97wwt19o05uftt0e85zx.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-n-03-neon-03", name: "Jel oje. N-03. Neon No. 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b0e/sjtqktr8y2f26997orcfhu9vjjswf9u9.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-n-04-neon-04", name: "Jel oje. N-04. Neon No. 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/721/ulqu1kxydet27dnhiyak904y78k2qytx.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pl-01-platinum-01", name: "Jel oje. PL-01. Platin No. 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/334/zwbjn3nuuls0xsder6heu0m79sig944f.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pl-02-platinum-02", name: "Jel oje. PL-02. Platin No. 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a09/mbvvfx5z02y0ttgedirkiwjds6dt6d5k.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pl-03-platinum-03", name: "Jel oje. PL-03. Platin No. 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c52/h0gmopcwr6wsvsfqxiq0u9i8xmt3ljpr.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pl-04-platinum-04", name: "Jel oje. PL-04. Platin No. 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/98b/3oam8t4719z8quch2jftrljk0ya7yaz1.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pl-05-platinum-05", name: "Jel oje. PL-05. Platin No. 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/1ce/q0uf6pjg0ogqqut3nb0iv84f0mlditqh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pl-06-platinum-06", name: "Jel oje. PL-06. Platin No. 06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/69a/k2ryiwj0rxzc90qaxw34x18pmf3r1mot.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pl-07-platinum-07", name: "Jel oje. PL-07. Platin No. 07", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/230/05f5oi2htu37tqlb2p26jc6j346j7uz3.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pl-08-platinum-08", name: "Jel oje. PL-08. Platin No. 08", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/44f/9hal0ynwi8zqqrozf2n3990vme3qbcwp.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pl-09-platinum-09", name: "Jel oje. PL-09. Platin No. 09", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/263/mv13qfxnmg7l10z29eocfz7fvfpn4dhr.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pl-10-platinum-10", name: "Jel oje. PL-10. Platin No. 10", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/443/47ofspufc2pai87cm99kybp6j7eq9u0b.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pr-03-pretty-dots-03", name: "Jel oje. PR-03. Pretty Dots No. 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2b1/cd8sd8amyhy6wgcx0hzxt5yk354ztd4y.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pr-05-pretty-dots-05", name: "Jel oje. PR-05. Pretty Dots No. 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/305/lunh198onk0sqn1tydxevgbxm9pwbbc0.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pr-06-pretty-dots-06", name: "Jel oje. PR-06. Pretty Dots No. 06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b09/21puqmagxxhdzroue32yw34uupcd40jp.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pr-07-pretty-dots-07", name: "Jel oje. PR-07. Pretty Dots No. 07", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8e0/6vwbtvm09ivzutx3ipvj143cy2q54351.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pr-08-pretty-dots-08", name: "Jel oje. PR-08. Pretty Dots No. 08", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/5d9/lk08es5gp6l9zqy3jpn1ktl3kidplcgp.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pr-09-pretty-dots-09", name: "Jel oje. PR-09. Pretty Dots No. 09", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/337/78qfrgjv9zp3lqqw9wnv8k6j2cel9u73.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pr-11-pretty-dots-11", name: "Jel oje. PR-11. Pretty Dots No. 11", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f2e/al2usb3ndt3v7lsn106zn0we0nqo85pt.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-pr-14-pretty-dots-14", name: "Jel oje. PR-14. Pretty Dots No. 14", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/691/aexza02j6uq0tc6y9q838tnezlsp6oln.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sl-06-shelly-06", name: "Jel oje. SL-06. Shelly No. 06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/487/1iihxni2ya5rxlhbd1fwjrt66b9fmskn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sl-07-shelly-07", name: "Jel oje. SL-07. Shelly No. 07", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a3d/as5t40rodiw4nbfxi8nlr82fzm9egvlq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sl-09-shelly-09", name: "Jel oje. SL-09. Shelly No. 09", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a14/uzjmvv6t65zfunj80j7hw9lawjcr8gqv.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sl-10-shelly-10", name: "Jel oje. SL-10. Shelly No. 10", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/440/l3hoxvbj2dxw6l96lf3zsc9i0ejvpr9q.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sl-11-shelly-11", name: "Jel oje. SL-11. Shelly No. 11", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/67d/1any7uzgmfjccfxu2y9x936s1omqlnjj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sp-1-sparkle-1", name: "Jel oje. SP-1. Parıltı No. 1", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/46f/gjpvnq4sn5s90nqcx00o1ken60p4z271.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sp-2-sparkle-2", name: "Jel oje. SP-2. Parıltı No. 2", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/6ac/547a7s6axgezkbivbm9rd6yvr15711i1.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sp-4-sparkle-4", name: "Jel oje. SP-4. Parıltı No. 4", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/1af/n8iuy7jbifui8yh8ptzogrc9wg7xwbwq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sp-5-sparkle-5", name: "Jel oje. SP-5. Parıltı No. 5", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/bba/3v9hgb307ly1ihju581lmff985lhyhnd.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sw-1-star-way-1", name: "Jel oje. SW-1. Star Way No. 1", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/855/uagzfwm10nsu7pq2fqq0vqkd8kc2csyk.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sw-2-star-way-2", name: "Jel oje. SW-2. Star Way No. 2", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f6b/t1ey7ktil8k9ba357pzdyqa6js3vlws6.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sw-3-star-way-3", name: "Jel oje. SW-3. Star Way No. 3", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/90f/2bz9vtr7gmgc6d703bfr1cgfqp9oc6u6.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sw-4-star-way-4", name: "Jel oje. SW-4. Star Way No. 4", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a48/wl52v4845xfw4l35dk4d5dpknwxvb2vg.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sw-5-star-way-5", name: "Jel oje. SW-5. Star Way No. 5", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b28/ztdgeaqq6949yc4cl5p3dxi660nzy0dp.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sw-6-star-way-6", name: "Jel oje. SW-6. Star Way No. 6", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e97/9w5wlvsjjs5s6ybeq5d3ef7orhoqfkgj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sw-7-star-way-7", name: "Jel oje. SW-7. Star Way No. 7", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/57b/5tf8p0u8alukwaykhaeixtorb41ocis2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sw-8-star-way-8", name: "Jel oje. SW-8. Star Way No. 8", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/852/pev0f2dditdx511tr8udqm2ucy0z66v1.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sw-9-star-way-9", name: "Jel oje. SW-9. Star Way No. 9", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f01/1v9mqt69alyg5aenswug4f3iq70o1cwo.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-01-vitrazh-01", name: "Jel oje. VT-01. Vitray pencere #01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ad7/k8udmp5vc9dmvnwxhgzg9ntzkjoitiwh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-02-vitrazh-02", name: "Jel oje. VT-02. Vitray pencere #02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a34/w96wm2ol1xmsvpps7j2npya1c2tizeoz.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-03-vitrazh-03", name: "Jel oje. VT-03. Vitray pencere #03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/020/9hedh4wcwbdy1gxifwx5lwbzsuou7iqm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-04-vitrazh-04", name: "Jel oje. VT-04. Vitray pencere #04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/55e/2813r1401vpc0hcz6m3ynng0b3ocdihk.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-05-vitrazh-05", name: "Jel oje. VT-05. Vitray #05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/08c/chzm3wuol9rbgde2zmufpqd22gmp5bhq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-06-vitrazh-06", name: "Jel oje. VT-06. Vitray pencere #06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/816/fluj0t3d6l5j292wbc3d4r2jcvxu4ac5.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-07-vitrazh-07", name: "Jel oje. VT-07. Vitray #07", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/1fc/t21xwlxrstymm45h09axt6c6seai0wim.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-08-vitrazh-08", name: "Jel oje. VT-08. Vitray #08", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/497/eccr7daup8a0qmfsqrkutzd96mq1q6zj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-09-vitrazh-09", name: "Jel oje. VT-09. Vitray #09", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/405/i0gtsvvvspu69idmg1env45cxg3pf25c.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-10-vitrazh-10", name: "Jel oje. VT-10. Vitray No. 10", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/3e1/505kpok540fv0mjjd19hxm61iiz6bojw.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-11-vitrazh-11", name: "Jel oje. VT-11. Vitray pencere #11", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/523/8ra1ac1a3owof4tk59b4mx8n0mfvdbio.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vt-12-vitrazh-12", name: "Jel oje. VT-12. Vitray pencere #12", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d4c/bnk025m6l3dk55gd2xhz1d5jewylx0wm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vl-04-vual-04", name: "Jel oje. VL-04. Peçe No. 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/168/0iuhurxl6yh2se5pzoh2aazzblhruth8.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-01-pervyy-sneg", name: "Jel oje. A-01. İlk kar.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ad6/94jnqxmjugsmxadi6rjjx2a7872xjsd6.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-02-chernaya-zhemchuzhina", name: "Jel oje. A-02. Siyah inci", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/bc2/j0bwlipbixuggmei00xsnrfunz2kdeuo.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-03-balerina", name: "Jel oje. A-03. Balerin", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/620/ehe8sr1olhv363jmm33sagmmb1202xfv.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-04-merenga", name: "Jel oje. A-04. Mereng", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/eae/o97fxl1f6yvsbf04nya00adnxfm6rzh3.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-05-marshmellou", name: "Jel oje. A-05. Marshmallow", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2b4/84llzwbi193logyqhugzit9baf5341uc.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-06-rozovyy-zefir", name: "Jel oje. A-06. Pembe hatmi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/613/fcwgyh0xw8rk90qrhi5sq1a054qhvgv2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-07-madmuazel", name: "Jel oje. A-07. Mademoiselle", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a05/8mlm7orr80w5ltts4j07h3kwy9vzp6zt.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-08-barbi", name: "Jel oje. A-08. Barbie", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ed6/r3tmh1jg0yobpmolqv2l1g8nzt34nux1.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-09-naslazhdenie", name: "Jel oje. A-09. Zevk", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f0c/ip874xq1rdwpwy914hx1fa7chdyd0q6a.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-10-blazhenstvo", name: "Jel oje. A-10. Bliss", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0ae/xm6ojaunoe9323do3mhg8i1q6m801mw9.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-11-slivochnyy-krem", name: "Jel oje. A-11. Kremsi kıvamda.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f6d/mixziyvdqk7haufkk2yj64rk3rnztumk.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-12-vlyublennost", name: "Jel oje. A-12. Aşık olmak", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a16/wjvp8106da8g8ulo5isufcpibb363m3e.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-13-frantsuzskoe-kruzhevo", name: "Jel oje. A-13. Fransız danteli.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/914/y3ma2cybbe3ak14w5i0jg4tipeax6qzk.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-14-ravnovesie", name: "Jel oje. A-14. Equilibrium", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/648/9zherdlpwxt1wutet8xh9p0p2zi4bhq3.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-15-nezhnyy-lepestok", name: "Jel oje. A-15. Narin yaprak.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/7b1/mofhg1nhqg0k2g08oadeu2w9shp36hhm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-16-chaynaya-roza", name: "Jel oje. A-16. Çay gülü.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/cb1/d0quwwv7dlw5y72u7gkvp3htfu3ueuo5.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-17-sladkaya-nega", name: "Jel oje. A-17. Tatlı mutluluk", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/471/vplsqq32oi0nxt59nari0f7ifuly923n.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-18-taynoe-svidanie", name: "Jel oje. A-18. Gizli buluşma.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/9d0/2v3chw49kze5u45s0iks3enseq9716v7.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-19-lilovye-rumyana", name: "Jel oje. A-19. Leylak rengi allık.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/56b/s1ykua2pxjz4kwb7n7gegu1g0gilfz8k.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-20-tsvetok-sakury", name: "A-20. Kiraz çiçeği", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/9be/wf6q812ff5tp4apf3s76d0q3ttqa7agm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-21-pudrovyy-aromat", name: "Jel oje. A-21. Pudra kokusu.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8a7/goj314qf687h6jduig69ef0522102fau.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-a-22-rozovaya-dymka", name: "Jel oje. A-22. Pembe ton.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/982/y034g04grm3tgtyksd157mefygmtvf14.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-01-teplyy-kashemir", name: "Jel oje. B-01. Sıcak kaşmir", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/5ef/6k4onbu78wxdtfkl20q3vpv11rd6azj6.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-02-medlennyy-tanets", name: "Jel oje. B-02. Yavaş dans", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d23/a5xwd0pvfrrvstv9wvtoxdbm2qd6ot8r.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-03-tomnyy-vzglyad", name: "Jel oje. B-03. Uyuşuk görünüm.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f26/rp2pjxjlt6sntq7an5nn0kbqw6f6kq5z.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-04-agatovyy-braslet", name: "Jel oje. B-04. Akik bileklik.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/658/plaj323umwby0d4r09lvwyj94fdznhpw.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-05-neznakomka", name: "Jel oje. B-05. Yabancı", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c36/fao49l0qsgv7bk9neyhztnfgyn6hthtb.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-06-stilnaya-shtuchka", name: "Jel oje. B-06. Şık bir şey.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/3bb/5bxojdaiww7yhm372k1w2heun4d2xzrm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-07-volshebnaya-pyl", name: "B-07. Sihirli Toz", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/52c/26ygqf87kizhzsxriik200hr7b5ztiys.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-08-vishnevyy-sirop", name: "Jel oje. B-08. Kiraz şurubu.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/11a/77db7m3pn1ogu55snbfmiyv0yynmy195.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-09-pirog-s-koritsey", name: "Jel oje. B-09. Tarçınlı turta.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/75d/6uvy8lmso899i7oj35kwtgiz32yhm23l.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-10-zakat-v-santa-monike", name: "Jel oje. B-10. Santa Monica'da gün batımı.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/244/oeadmpkoxn2vg46g1qsoi0khxcgsqphz.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-11-prikosnovenie", name: "Jel oje. B-11. Dokunuş", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/401/5prfx8hnv7e8ak6fhwjueazdidvqizt1.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-12-martsipan", name: "Jel oje. B-12. Badem ezmesi", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c0b/6c4solv5wsa4v69agu41rr5pwy13s3tz.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-13-zemlyanichnyy-krem", name: "Jel oje. B-13. Çilekli krem.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e4e/22wmli44wqyywx9m0pkydw19au9c3yti.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-b-14-klubnika-so-slivkami", name: "Jel oje. B-14. Çilek ve krema", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/de2/fmzw6pgjsbnxpfwn0h70cvch4aue1516.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-01-persikovyy-maffin", name: "Jel oje. C-01. Şeftali keki", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/dce/1xdmmmbedzll5hr70hs6loarz3vx74hw.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-02-imbirnoe-pechene", name: "Jel oje. C-02. Zencefilli kurabiye.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d8a/727fnn1ai3x35taai8zzion0rze7zxdb.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-03-apelsinovyy-keks", name: "Jel oje. C-03. Portakallı kek.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b68/o3m1r351xlhonl3q553mj8t1ugkdotbv.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-04-klenovyy-sirop", name: "Jel oje. C-04. Akçaağaç şurubu", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f3f/7ka5wgelajgh7ro8h75hb3hs2n4hdq7a.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-05-venskie-vafli", name: "Jel oje. C-05. Viyana waffle'ları", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f95/6l7yq8kex16o3yaq9n4s1v0r9n814b34.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-06-glazur", name: "Jel oje. C-06. Parlatıcı", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/af9/hb2j3bhbb23q7cp8r49ygbfb3bvy4sxr.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-07-tiramisu", name: "Jel oje. C-07. Tiramisu", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f8b/9hl3z5bjipk8sx95j53751bfc3subcvh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-08-kapkeyk", name: "Jel oje. C-08. Cupcake", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/7fc/unyfkkutcczg5ug2aqy4hcsog9gtunlp.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-09-karamelnoe-chudo", name: "Jel oje. C-09. Karamel mucizesi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c84/tptfhju4lb2e0kobusecv00928dwdrax.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-10-rozhdestvenskiy-puding", name: "Jel oje. C-10. Noel pudingi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a14/u9pkodff2jolmqcglmtbky0leslwdnmn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-11-utrenniy-kofe", name: "Jel oje. C-11. Sabah kahvesi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/43b/2jb3cu4s4snsiclyq2uzjdflizzmm602.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-12-fistashkovoe-morozhenoe", name: "Jel oje. C-12. Antep fıstıklı dondurma.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/421/z1oq6ifzylch996i2bel71x1ripxiy9d.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-13-kapuchino", name: "Jel oje. C-13. Cappuccino", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2a4/0n58yt645u5xus2ahwcpp52tb3nahpvl.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-14-chizkeyk", name: "Jel oje. C-14. Cheesecake", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/243/hffr0ue1twmy2faxcna1hder8nongi4w.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-15-belyy-shokolad", name: "Jel oje. C-15. Beyaz çikolata", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0fa/8jczvbt61lylx7pwoadv6l36853lh3e2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-16-rafaello", name: "Jel oje. C-16. Rafaello", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c5e/jd8wro567m06bypvtba7mejvf7l4npnp.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-17-latte", name: "Jel oje. C-17. Latte", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ffe/l8415fxf59ai52zqb5e9zlbfw3sq9li1.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-18-toffi", name: "Jel oje. C-18. Toffee", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0c8/c1wdlv7in4hesxjd20d3rjsiehjl80cm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-19-sakharnyy-persik", name: "Jel oje. C-19. Şeker şeftalisi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f01/39ysxv7kb2s46n9gq96k9rhmfpaxdmvp.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-20-persikovyy-nektar", name: "Jel oje. C-20. Şeftali nektarı", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/894/m61yrgl7kygbdms4aoy5ijcadqih1y9x.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-21-kofe-po-venski", name: "Jel oje. C-21. Viyana kahvesi", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/712/nntzyd4l7u7fpyah7p4f6owhh8yq96kw.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-c-22-persikovyy-dzhem", name: "Jel oje. C-22. Şeftali reçeli.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/856/fuf87b5r9hmhugj4amdcc521t42f6kg6.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-01-myagkiy-shelk", name: "Jel oje. D-01. Yumuşak ipek.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a24/zlpuc1sam75zj13qr4f2f82ti9hi3g30.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-02-nezhnyy-satin", name: "Jel oje. D-02. Hassas saten", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e0c/qzvusibqhvqxliu2zix2piofcoe4bjbi.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-03-sladkaya-vata", name: "Jel oje. D-03. Pamuk şeker", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a8e/10vefqbunop3imrw6t7827k3mwe797bx.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-04-rozovyy-atlas", name: "Jel oje. D-04. Pembe saten.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a3b/71hkdm357g7mrtq4m6qj28lvvuugcp7l.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-05-pudra", name: "Jel oje. D-05. Toz", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/927/2g5haufaato1syhg8s4bct45j82ihh2c.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-06-krem-bryule", name: "Jel oje. D-06. Krem Brulee", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/322/2dr7r663d2msm520xe9b67kex4ghw9v6.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-07-svezhiy-kruassan", name: "Jel oje. D-07. Taze kruvasan", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ba3/srzj4sdg90kx7kdxjte0slapz5baba29.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-08-kakao-s-molokom", name: "Jel oje. D-08. Sütlü kakao.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/716/gqgtdqkwpytxlb1zwggfis108tyvsvwt.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-09-aromatnyy-soblazn", name: "Jel oje. D-09. Kokulu cazibe.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/bbc/jydewm4lu0emt566imu6c0ue33zqbqvm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-10-mertsayushchiy-kvarts", name: "D-10. Parıldayan Kuvars", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/540/p52k0y0abfp6ijs00fbj3p5dz86ptb9q.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-11-mindalnoe-iskushenie", name: "Jel oje. D-11. Badem cazibesi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/9c7/bru88oxk7us1rtxlacuo78ep9upup0e9.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-12-manyashchiy-aromat", name: "Jel oje. D-12. Büyüleyici aroma.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8d0/pxjb6k066n9e1vzjtxl6w7n0m0a8px3g.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-13-taynaya-strast", name: "Jel oje. D-13. Gizli tutku.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/6b4/w888cf5fkdkii0fxoyhxb31ewlc5f02s.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-14-venge", name: "Jel oje. D-14. Wenge", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/813/c092ppce27zttmfiwnmm8936wyv1xp8v.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-15-siena", name: "Jel oje. D-15. Sienna", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/79f/0kzwqoi62onx8dw94lsof6nnpl6irgrh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-16-granat", name: "Jel oje. D-16. Garnet", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e37/o93gjsbbzvhd313o84fewkvoheklcf2l.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-17-roskosh", name: "Jel oje. D-17. Lüks.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/03a/p7c0c8nbk9ax7t6du60ucvvon1k6zujn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-18-makhagon", name: "Jel oje. D-18. Maun rengi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/144/qwyuxyk68198ydaz1s7nsgangxnbmgyd.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-d-19-karmen", name: "Jel oje. D-19. Carmen", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/7b2/hdpl5bjhlqyljzcqu9os9fxrt4g9navq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-01-sepiya", name: "Jel oje. E-01. Sepya", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/05e/bxundmgflxfqnl158p05etrwv238vi97.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-02-molochnyy-shokolad", name: "Jel oje. E-02. Sütlü çikolata", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/747/fpzr34r03sxgmad37jj5889kbkmpm1et.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-03-espresso", name: "Jel oje. E-03. Espresso", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e83/c9zdv9sen9ju13bavv5d9g5qwfn0pgio.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-04-korolevskiy-shik", name: "Jel oje. E-04. Kraliyet şıklığı.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/71c/zrc43uhctd4ffqi0dd72wik5kvua8hse.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-05-tango", name: "Jel oje. E-05. Tango", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/735/10jgenb0fy9ecrux6aipiaxlqnw867n4.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-06-temnyy-shokolad", name: "E-06. Bitter Çikolata", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/1e3/0rwjomlk2s2nvhn3zlej3cfz0mpdpns0.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-07-volshebnyy-vecher", name: "Jel oje. E-07. Büyülü bir akşam.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/936/vfrmy7aq5wzcs342fx2x3oomkib39frq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-08-elegantnyy-stil", name: "Jel oje. E-08. Zarif stil.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/217/hkfv9viikir1g3c5cpiwsatkvxi9vzfb.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-09-oniks", name: "Jel oje. E-09. Oniks", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0d7/of2jlk8tsgyb1mp3eh21gpgof03umh88.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-10-grafit", name: "Jel oje. E-10. Grafit", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/333/4m4kjlikfgnw64rggtuo1fawvleiay19.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-11-temnyy-marengo", name: "Jel oje. E-11. Koyu Marengo", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8f9/x52bvc5jzugh7is1ely7o6372pzq1zkh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-12-seryy-agat", name: "Jel oje. E-12. Gri akik", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d09/zycc5jkqcqed351v3cgjys06cec0hm5g.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-13-mokryy-asfalt", name: "Jel oje. E-13. Islak asfalt.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/046/97yvoja6rbua7yex0gdz7kwxx14axx5u.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-14-spokoystvie", name: "Jel oje. E-14. Sakinleştirici", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/96c/m14w6ls9ab7a1zswpml7oxah0x44oddr.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-15-tishina", name: "Jel oje. E-15. Sessizlik", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ebe/qxobq1oh7s3b1nhyktlm35bkvm875nlt.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-16-bezmyatezhnost", name: "Jel oje. E-16. Serenity", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ab7/tsls98klz1zzjk3ynwwti8e6b3clbt8r.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-17-vanil", name: "Jel oje. E-17. Vanilya", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/dd1/qpr7bx5hyknya2paympihlinom09buao.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-18-nebo-londona", name: "Jel oje. E-18. London Sky", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/664/1hix7shh8x99rqes60xu2amd4a4hpzyh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-19-mertsayushchiy-nyud", name: "Jel oje. E-19. Parıltılı ten rengi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/3e2/jijjejh82o3uyn97e9ufp23z3vcb0t28.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-20-kofeynaya-dymka", name: "Jel oje. E-20. Kahve tonu.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b43/7rvd83fujvb5e28mcskj92wa6qw0cio5.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-e-21-praline", name: "Jel oje. E-21. Pralin", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c80/jflrxrz4kt020ljvxt5smmjna398qxq1.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-01-rozmarin", name: "Jel oje. F-01. Biberiye", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/5a5/wmndj8nysmqcdzbhqir0howmimto92kh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-02-glitsiniya", name: "Jel oje. F-02. Mor salkım", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/4fa/d0raxwptyv7qf8tri44rkj93syjbc721.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-03-nimfa", name: "Jel oje. F-03. Nymph", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/46a/fu7x8kqf2vgwvhgy7ba50ahqg7rbrwxb.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-04-siren", name: "Jel oje. F-04. Leylak", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/6db/0wwe8r0u8exah5og0bl984r6zbf11ua5.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-06-chernichnoe-varene", name: "Jel oje. F-06. Yaban mersini reçeli.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/7e2/3s5t7gz88b5b29cemrxnetaa0n5rc912.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-07-spelyy-vinograd", name: "Jel oje. F-07. Olgun üzümler", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b30/o2yan2o1wcph8q9r8ryer7zvldd7mrue.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-08-temnyy-dzhins", name: "Jel oje. F-08. Koyu kot mavisi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/058/s38qwwqlydjf11d4g8thesyhyxg63ti3.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-09-vselennaya", name: "Jel oje. F-09. Universe", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/870/3l9fns7fbvqxdgtggs5pe6u1mcynbgk2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-11-teplaya-noch", name: "Jel oje. F-11. Sıcak gece", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0b3/4mw45i2cw2as8vmt7fc1tnoiee0jbhqa.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-12-temnaya-orkhideya", name: "Jel oje. F-12. Koyu orkide.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/4b0/w9v1vewh4searmut0up6rlmx33bi5xma.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-13-romantichnyy-vecher", name: "Jel oje. F-13. Romantik bir akşam.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/780/0grigekz0f4zfwzuzq0qgjsx07oi6lvh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-14-vozdushnyy-potseluy", name: "Jel oje. F-14. Hava öpücüğü.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/dab/c4t2rdacuk2cxt2ecjvcyspym75a8z4c.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-15-opal-mistik", name: "Jel oje. F-15. Mistik opal.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/114/921zxxn4xivuz59rqmq47zupnr7kf9ob.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-16-moroznoe-utro", name: "Jel oje. F-16. Buzlu bir sabah.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/948/k59mkugkjqhe03zr8qxqwz6j8dfcyqpx.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-17-melodiya-vetra", name: "Jel oje. F-17. Rüzgarın Melodisi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/353/y65n170e8q4mbuep3ui922nkwkicoe0r.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-18-ezhevichnyy-krem", name: "Jel oje. F-18. Böğürtlen kreması.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/69c/3knrieknd8bn6qs1x7noqyz4pgldut6v.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-19-sirenevyy-tuman", name: "Jel oje. F-19. Leylak rengi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/47e/gy9wyn5q7cbzj615wgucro3479jt5een.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-20-lepestki-vereska", name: "Jel oje. F-20. Heather petals", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a19/pstkxd59urvkgvz9gp46wj6vv4o5gpzm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-21-ledyanoe-ozero", name: "Jel oje. F-21. Buz Gölü", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/878/6kuzr8pmdr3l6mu7wyl4opsadfygckwk.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-f-22-ametist", name: "Jel oje. F-22. Ametist", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/39f/sjuswd1lump5m626hid07sk93hdo1p1r.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-01-flirt", name: "Jel oje. G-01. Flirt", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/6a5/ezrbjmh6vnepjt9shscqvruo1dpt2y15.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-02-fialka", name: "Jel oje. G-02. Mor", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/7ee/akkcyi0p89r9xq8rubeomtcaiipafxot.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-03-lavanda", name: "Jel oje. G-03. Lavanta", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/5d7/ahvxsw330swlu1gp0zi4egjh7utg56ww.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-04-iris", name: "Jel oje. G-04. İris", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/155/h9nxqdqygnacl2ondaluc8edkwp0j57y.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-05-lilovyy-gorizont", name: "Jel oje. G-05. Leylak ufku.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/591/qhtrow3pzxpswtyci74lpghcviwjy6xq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-06-rumba", name: "Jel oje. G-06. Rumba", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/947/3soexp4bld3936q3zygx1jkqn9owqfzd.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-07-lesnaya-ezhevika", name: "Jel oje. G-07. Yaban mersini.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/3e6/9mwb51btcyzpo9ig84avc0hb357afz7n.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-08-ocharovanie", name: "Jel oje. G-08. Charm", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b09/vja32xdemq3x0sj3n8iacxu568bgke8u.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-09-temnyy-purpur", name: "Jel oje. G-09. Koyu mor", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/155/26bhooih7ifxj4z1spae74nsc0ylt7a4.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-10-vostorg", name: "Jel oje. G-10. Delight.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/6ea/agz03lubeln1fi62doar3840nqw7vypn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-11-baklazhan", name: "Jel oje. G-11. Patlıcan rengi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/30e/fnfo2qczynugb221reicgmr1wwpaph1n.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-12-krasnoe-vino", name: "Jel oje. G-12. Kırmızı şarap rengi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/178/5d13trsmnfeobldoegmplczmclb7cn5c.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-13-brusnichnyy-mors", name: "Jel oje. G-13. Kızılcık suyu.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/608/5qxx6ea0c4bqpy7vi21izhibp1g53ckj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-14-zhelanie", name: "Jel oje. G-14. Arzu", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/017/3ycp41x5ekr3mgxprpszcwyenhhru7gq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-15-sapfir", name: "Jel oje. G-15. Safir", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/788/99nu8avp4f9mq7fhugbg48bvysbp8yuf.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-16-sladkie-sny", name: "Jel oje. G-16. Tatlı rüyalar.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d52/eucfj3yk3f2dms3kcg2rb622ma85b3p6.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-17-strela-kupidona", name: "Jel oje. G-17. Aşk oku.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/117/bbzdw7ujztzo5wxbe0l8y3oi9432sqjj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-18-glamur", name: "Jel oje. G-18. Glamor", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/332/s4eb3zklbtj3cftlf5pi73eedq517g2p.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-19-spelaya-sliva", name: "Jel oje. G-19. Olgun erik rengi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/712/xs43mo2dr80fuaibcf5p1kkhwugv5ka3.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-20-verona", name: "Jel oje. G-20. Verona", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/bed/7jwpjkb2pevghaep3cin0xj9ffq834c9.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-21-purpurnyy-blesk", name: "Jel oje. G-21. Mor simli.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ded/ntd5m49bjqm3orbi44f6k1q6vupa902o.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-22-siyanie-madzhenty", name: "Jel oje. G-22. Macenta parlaklığı.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/878/x6lmgiv336vi4r1ahvkim4dm93u2oo9l.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-23-vostochnaya-skazka", name: "Jel oje. G-23. Doğu masalı.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/822/el6kcyt2jub7wjng6g27eqgq5qgabbca.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-g-24-zvezda-vostoka", name: "Jel oje. G-24. Eastern Star.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/6e5/iyd6ru3295digkvsbv6vz48xeunhttvj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-01-zhemchuzhnyy-uzor", name: "Jel oje. GL-01. İnci desenli.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/79e/qwxhlczajbfs46z7mclcbkkpw5ftuktw.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-02-snezhnyy-den", name: "Jel oje. GL-02. Karlı gün", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/378/1iya99c8jfcrkv4x8y78j8peoi3f82v1.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-03-almaznaya-kroshka", name: "Jel oje. GL-03. Elmas parçacıkları.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/596/qz267415p0mghomk2updzw2a1pu1suj9.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-05-prazdnichnoe-konfetti", name: "Jel oje. GL-05. Şenlikli konfeti", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/3ad/qwpdt6hpzinjwtgyd5onqskekxxg2nvz.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-06-oskolki-radugi", name: "Jel oje. GL-06. Gökkuşağı Parçaları", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/3ac/u71gbqmh81v1tn13t39dyb1zoack4ieb.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-07-svetloe-zoloto", name: "Jel oje. GL-07. Açık altın rengi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/6bc/8sp03ay3r4ez6gd4y7a2edpz67ur8742.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-08-dragotsennyy-kamen", name: "Jel oje. GL-08. Değerli taş", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/502/1fkryhmdbzayrgwqk12hwv4jrzdj55ei.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-09-dorogoe-ukrashenie", name: "Jel oje. GL-09. Pahalı dekorasyon.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/4f1/jjhj515ucu2x8ekr1g31daxxomy07ohc.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-10-iskryashchiysya-zolotoy", name: "Jel oje. GL-10. Parıldayan altın rengi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ded/5tdscptnhu2hv4f8q42kmmggobqak7h2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-11-zolotaya-pyl", name: "Jel oje. GL-11. Altın tozu.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/9c3/7mz7rpx6f1jqojlfof9hhnp06mdzrdjn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-12-skarlett", name: "Jel oje. GL-12. Scarlett", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/830/39hsh9cuwg1mvp4lz2qud3k8ugv8nepl.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-13-shampan", name: "Jel oje. GL-13. Şampanya", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8c6/01ryh4f54owl3r4cs854jgchday65mix.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-14-imperatorskiy-topaz", name: "Jel oje. GL-14. İmperial topaz", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c83/45uv6i5vwqb4ohyl1zioow61keg8ragz.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-15-feeriya-bleska", name: "Jel oje. GL-15. Parıltı şöleni.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/aa5/c2364jzv07vtgnox0slf4nelxe8tju41.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-16-gornyy-khrustal", name: "Jel oje. GL-16. Kaya kristali", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/94e/tgujtujbkmdm3x94lr5lefutbvtjug6o.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-17-mertsanie-serebra", name: "Jel oje. GL-17. Gümüş ışıltılı.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e83/9wnkkrotebu0vu8d8o3lhmsu2zf200oh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-gl-18-nezhnye-bliki", name: "Jel oje. GL-18. Zarif ışıltılar.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c7b/nkwuqfq6p99zxjsp6tbb06pvumxvz07y.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-01-bananovyy-topping", name: "Jel oje. Q-01. Muz desenli kaplama.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/1a5/uqlnq7qesplnh6he1sn8206vkfk2g49q.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-02-letnee-solntse", name: "Jel oje. Q-02. Yaz güneşi", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a34/ejj129g5mwgjthvw5kknk86bkspqp7t4.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-03-gorchichnyy", name: "Jel oje. Q-03. Hardal rengi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/eb5/0947tx5v0k7srgnamcucxi7ung5qn1r5.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-04-olivkovaya-roshcha", name: "Jel oje. Q-04. Zeytinlik", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e01/jzfh91hw57jrt3y5ctl7wwhtpncdalod.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-05-morskoy-pesok", name: "Jel oje. Q-05. Deniz kumu", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e64/3kadu8364bp257womeahplz0ssfbn5yr.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-06-sochnyy-limon", name: "Jel oje. Q-06. Sulu limon.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/479/e103w38xnkq8w9lgsgb54kw3j1gr015p.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-07-abrikosovoe-varene", name: "Jel oje. Q-07. Kayısı reçeli.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b76/eg8jahw7qvkxmf4lgb14poizadpi6ajq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-09-kashtanovyy-sirop", name: "Jel oje. Q-09. Kestane şurubu.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d09/dp5yjexwqklpkof5y3nsmcssv5t6h6vx.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-10-pikantnyy-kardamon", name: "Jel oje. Q-10. Baharatlı kakule", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b77/r77grxfr8ewlurrl4pqwt8gd73w35yzi.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-11-pryanaya-kurkuma", name: "Jel oje. Q-11. Acılı zerdeçal", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/328/39dtke91b7nq6d5y2dz2n7d5gr3ryksd.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-12-vesennyaya-mimoza", name: "Jel oje. Q-12. İlkbahar mimozası", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/045/0l5hwx2f6qs1560zn3pzdvw1pnuo2y7q.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-13-zheltaya-khrizantema", name: "Jel oje. Q-13. Sarı krizantem", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2fe/1e98w4zgb6g1mfn6w7mtn9cdkau0l7vj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-14-lunnyy-svet", name: "Jel oje. Q-14. Ay Işığı", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/619/no89xi4n745w43vfh520kgorkdmpgcpv.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-15-limonnyy-tsvetok", name: "Jel oje. Q-15. Limon çiçeği.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b98/3xtxqy0sj00ruenecgdwnup6pzxjpgls.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-16-klematis", name: "Jel oje. Q-16. Clematis", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/97b/c3gksay8due13tjswrqhd9h7cnsf9q14.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-17-provanskie-travy", name: "Jel oje. Q-17. Provence otları.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/525/6flpyt4bwj6grth32sh0cf4lfz5eiypd.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-18-zheltaya-akatsiya", name: "Jel oje. Q-18. Sarı akasya", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/67a/nzeiaard5ttzksyq7491775qektcxoiv.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-q-19-ananasovyy-sok", name: "Jel oje. Q-19. Ananas suyu", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/fa0/wx9rdnidlkytcl4644j0ablwgh2ubzyn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-01-dykhanie-oseni", name: "Jel oje. R-01. Sonbaharın Nefesi", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/54f/oi5l46400y20lz5eo4ix4v4vvsmpkoxq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-02-zelenyy-chay", name: "Jel oje. R-02. Yeşil çay", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c1f/p41p68q1cwg05rc6b06w979xb8m49nmj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-03-mokhito", name: "Jel oje. R-03. Mojito", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/6f5/3euvztgv7ccx8rtqacpt98ih4tmmfm1o.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-04-elovyy-les", name: "Jel oje. R-04. Çam ormanı", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/cd8/tgx7cqixpia1ujqgplna2bdwrk5t32j2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-05-alpiyskiy-lug", name: "Jel oje. R-05. Alp çayırı.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/aa2/hmifa0s0y25fol52prz3qui5lps41j0m.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-06-izumrudnyy-gorod", name: "Jel oje. R-06. Emerald City", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/4be/w4i7n1kf528p57bh159kpdfb3d7xlttx.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-07-rusalka", name: "Jel oje. R-07. Denizkızı", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/fef/crpbcbc2lgy6exkg3wystvoahqcq2gjk.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-08-amazonka", name: "Jel oje. R-08. Amazon.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ac4/cbj3yk60kdnj5i3rja5ims3w81wdnnj7.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-09-ostrov-sokrovishch", name: "Jel oje. R-09. Hazine Adası", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e83/zqnf9f7gipd4s0svvzqnto4zxlpabqk6.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-10-galaktika", name: "Jel oje. R-10. Galaksi", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/7d5/pbs6722msw042v7xbc32rpyvtunxh6jg.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-11-malakhitovaya-shkatulka", name: "Jel oje. R-11. Malakit kutu.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/3d1/2fc30v83lsu380oi8u5v2fch17e9tej1.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-12-zagadka-atlantidy", name: "Jel oje. R-12. Atlantis'in Gizemi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/cd8/om4wox75ciltsu8fl0w0psbtx4f07wp8.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-13-zimniy-les", name: "Jel oje. R-13. Kış ormanı.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/33b/es1keswlkqzkrmqcumqumql6qo8jq37b.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-14-tropikana", name: "Jel oje. R-14. Tropicana", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/944/i1rbuiapjjt0ff9775u0un7c3rqd0kmr.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-15-kiparis", name: "Jel oje. R-15. Selvi", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ef0/9inbs6dj18q05sp92f658u8ymvs11p0p.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-16-akvamarin", name: "Jel oje. R-16. Akuamarin", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/eea/2gobvrmdhhb6n39a3nkb9j9sau354tfg.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-17-golubaya-el", name: "Jel oje. R-17. Mavi ladin", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/3e7/g5z9a41y83t93aa80exji87mq5f03gh2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-18-niagara", name: "Jel oje. R-18. Niagara", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ea8/7azi3w49qozynpk4cn9txot4pykh7pot.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-19-svetlo-fistashkovyy", name: "Jel oje. R-19. Açık fıstık yeşili.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f0b/8so10kwsasapvgkhah0vel2fsk2zp4do.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-20-aromat-shalfeya", name: "Jel oje. R-20. Adaçayı kokulu.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/365/st3dtzryv0yacfi3h8v1mk18ozjs87cd.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-21-izumrudnyy-pereliv", name: "Jel oje. R-21. Zümrüt yeşili ışıltı.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0e1/w8b7njeibrcu9toeuvzb2h7teivzlxp3.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-22-kosmicheskaya-pyl", name: "Jel oje. R-22. Kozmik toz.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f4d/0ifef5cpmjq4b5s6jxhrlpp5cp0gyh4v.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-23-zvezdnyy-dozhd", name: "Jel oje. R-23. Yıldız yağmuru.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d02/br26v1f2g2plomnvd0mcjs0otix1be09.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-r-24-seryy-kardinal", name: "Jel oje. R-24. Gri kardinal.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b45/djgc4cof9qfe5iomj4chqsxtgdgkdo8b.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-01-starinnyy-farfor", name: "Jel oje. S-01. Antik porselen.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/9cb/fcrmhk11k362rhhb65ldf4y6lmblfd6c.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-02-morskoy-briz", name: "Jel oje. S-02. Deniz meltemi", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/cfa/j2jmpyto8cjbl4mqwfuvmrnmlagnqnnm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-03-nefrit", name: "Jel oje. S-03. Yeşim taşı", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/571/jsqfdqbyuin0b84a3gxd6911yzov9hdy.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-04-indiyskaya-biryuza", name: "Jel oje. S-04. Hint turkuazı.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a55/1bua7s1plox9uqs5b1h27vsqd4wa3y4w.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-05-fidzhi", name: "Jel oje. S-05. Fiji", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/279/0cuz3yjbn7zp4hc8n41i55f0911chh33.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-06-tiffani", name: "Jel oje. S-06. Tiffany", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a2c/7lhpauz9kkc5k0f4o9343pdon1qctodq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-07-lazur", name: "Jel oje. S-07. Açık mavi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/94e/gfgbjlquxkv0i6x9gvqy0gp47tdzw16s.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-08-laskovyy-briz", name: "Jel oje. S-08. Hafif esinti", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/9fa/jfuwco36k753cy3ho4a3lr3k39jnksbn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-09-lazurnyy-bereg", name: "Jel oje. S-09. Cote d'Azur", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/da0/sp75zk8b2xaf4x27f0p99owh9obzcwyu.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-10-vasilkovoe-plate", name: "Jel oje. S-10. Mısır çiçeği mavisi elbise.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/fef/gu2w9nfcd3xfcsdv1rbckj2ni5kjpl6j.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-11-ledovityy-okean", name: "Jel oje. S-11. Arktik Okyanusu", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2de/2uk6xhzfk3l2iysi2dt1n6z8aom5guju.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-12-vozdushnye-zamki", name: "Jel oje. S-12. Hayal ürünü.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/4d7/lkm2v0d8mf3uvaoro4q09rlbrq02s8nc.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-13-snezhnyy-bars", name: "Jel oje. S-13. Kar Leoparı", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d30/tqjtw1mseexy712yldj0dn95ug7v655z.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-14-utrenniy-tuman", name: "Jel oje. S-14. Sabah sisi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/294/8hsix3mnl21ofakzm53aj240kjyuftct.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-15-granit", name: "Jel oje. S-15. Granit", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/be6/a5qcysglgzpmj01aktz0ee3x0121v6cz.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-16-put-strannika", name: "Jel oje. S-16. Gezginin Yolu", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/1d8/l2zu7fzey4xqm6wmragobx59bsrdbgds.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-17-tikhiy-okean", name: "Jel oje. S-17. Pasifik Okyanusu", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e4c/k0q0rmkfgy0fiyk7v75v49yif5wkg5k1.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-18-murena", name: "Jel oje. S-18. Murena", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d2c/h8zzynqct0ef0h818hrw468sblarhbvh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-19-letnyaya-prokhlada", name: "Jel oje. S-19. Yaz serinliği.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/842/2q710q7xs1w6yuoy69hdaef329pbejob.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-20-yasnoe-nebo", name: "Jel oje. S-20. Berrak gökyüzü", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2fd/h7ji2cehjnv7bg5krofx152ns94qy4qr.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-s-21-rayskaya-bukhta", name: "Jel oje. S-21. Paradise Bay", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/21f/clhgbeyld0xm3v9nm335688md0nr6yy0.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-01-korolevskiy-siniy", name: "Jel oje. U-01. Koyu mavi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/dab/lqm0q5tuv59edynapvkkmxtepbr0fc7j.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-02-zimniy-sad", name: "Jel oje. U-02. Kış Bahçesi", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a3d/wmfbn12umsxdoktjc86oj1lhgjqk9ygm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-03-ultramarin", name: "Jel oje. U-03. Ultramarin", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a61/8ym17ukt52xzvqvcbb6ypnv1qd568kj2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-04-indigo", name: "Jel oje. U-04. İndigo", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c65/mpncfdur7uagp2y949thq9hx9t64kc2t.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-05-avatar", name: "Jel oje. U-05. Avatar", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c36/tdedwbx3vq04pbfe28r8myhbxov5iagu.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-06-poseydon", name: "Jel oje. U-06. Poseidon", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/03e/4rwdk5pwaw38qug72xsfuzc46b2a3rqv.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-07-tayna-okeana", name: "Jel oje. U-07. Okyanusun Gizemi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/1aa/zw6196e3texegt5200hhrww0l0kirvvh.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-08-siyanie-nochi", name: "Jel oje. U-08. Gece parıltısı.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a2b/ha94xkz1sgtp01l4gksxcfs03093mnh5.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-09-zvezdnoe-nebo", name: "Jel oje. U-09. Yıldızlı gökyüzü.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/505/duolz9a346on8zh5jpupnu9oq8qzgf1e.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-10-glubiny-morey", name: "Jel oje. U-10. Denizlerin derinlikleri", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/6e9/uta6ne3xgfjn5fyfjlfwvjskfl3l41sj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-11-zatmenie", name: "Jel oje. U-11. Eclipse", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d5f/9lk9soxgi8xiih2oakkjybh1y7oqvwih.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-12-avantyurin", name: "Jel oje. U-12. Aventurin", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2ec/9p431y6ioh370f00rjwk0l62cikz9h45.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-13-sozvezdie", name: "Jel oje. U-13. Takımyıldız", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a4f/cmewirnbfo6bl89h6s410ogb2gdhpwzg.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-14-versal", name: "Jel oje. U-14. Versailles", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/326/frdasmzj7mcqsab20ytxn9rha0ch3spn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-15-zamanchivyy-blesk", name: "Jel oje. U-15. Büyüleyici parlaklık.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/01d/la3u1xbxnqlwarxc7xqmb636jycyrbk0.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-16-mlechnyy-put", name: "Jel oje. U-16. Samanyolu", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/3fc/822zbjaiz78arbfat7psu81fga5d08xb.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-17-chernyy-brilliant", name: "Jel oje. U-17. Siyah elmas.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/480/ra6jttc56ogrhw35fpmu25uxl0vapm7j.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-18-bengalskie-ogni", name: "Jel oje. 18 yaş altı. Simli ojeler.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/197/0rn5mardq0of00ax7tfovj94udjhm4te.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-19-chernyy-opal", name: "Jel oje. U-19. Siyah opal.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c1f/7llb0n3v57fmqshpkb5nt9na72q8yvh2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-u-20-prazdnichnaya-noch", name: "Jel oje. U-20. Şenlikli gece.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/431/8qthtsi3ciinrkydxrxge6mxirwunm2h.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-01-marsala", name: "Jel oje. V-01. Marsala", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8b7/0qdndccz7wo4znchcxish5nc2kxt10fj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-02-spelaya-chereshnya", name: "Jel oje. V-02. Olgun kiraz.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d81/wkxrjwr4qjj75beown71ybbgk2qnmrqk.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-03-terrakotovyy", name: "Jel oje. V-03. Terracotta", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ea4/hr06j10i2tywvsql55qmf1hbmvn7289i.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-04-speloe-mango", name: "Jel oje. V-04. Olgun mango", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ac2/3tqt1wx4nynwwlsn1z6x8i24lyeey6jm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-05-solenaya-karamel", name: "Jel oje. V-05. Tuzlu karamel", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/15d/oa1nr3mlr716suu57p8ylxeq33plab94.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-06-ryabinovye-busy", name: "Jel oje. V-06. Rowan boncukları.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2a0/w54c1c2dhf8ejd81bqc8lfsyyx0swon3.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-07-krasnyy-mak", name: "Jel oje. V-07. Kırmızı gelincik", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/78c/ds3v26imws6utszrnq8f9umn6hyij1d2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-08-obzhigayushchiy-rio", name: "Jel oje. V-08. Scorching Rio", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/5f7/gdjtlg3265g2t5y175o6v2q12d5dnws8.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-09-rimskie-kanikuly", name: "Jel oje. V-09. Roma Tatili", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/38e/3fe7y7i0udpxulzv9a1frqsx37ijj2zm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-10-svidanie-v-parizhe", name: "Jel oje. V-10. Paris'te bir buluşma.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c74/cn4lvp2hf3aazhzrfd4ic7hqm6990zk2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-11-ogni-las-vegasa", name: "Jel oje. V-11. Las Vegas Lights", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/377/hpkb979yu7rakckdbz0kg771sumpgfce.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-12-pisma-dzhulette", name: "Jel oje. V-12. Juliet'e Mektuplar", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/77e/9lnbxrganlz5u79ygrs3o3lx1euznfpj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-13-venetsianskiy-karnaval", name: "Jel oje. V-13. Venedik Karnavalı", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/1e8/emgxix1e69evhlkqrz55fnyc3aodg7pv.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-14-tayny-vostoka", name: "Jel oje. V-14. Doğu'nun Sırları", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8a8/nng4aib4v50o5b0h5ejeerghbm1gc20i.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-15-korallovyy-rif", name: "Jel oje. V-15. Mercan resifi", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d6f/uxa2a7h1w4mz3i6cp3r345ib1cy6vawo.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-16-tsvetushchaya-liliya", name: "Jel oje. V-16. Çiçek açan zambak.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/520/fk9uvr0faz4iwcngts1hu6arc3k4qbmz.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-17-rozovyy-flamingo", name: "Jel oje. V-17. Pembe flamingo.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d48/jt6fv0eo68ja4ya664dxdlxmwfd8c1fn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-18-rayskiy-sad", name: "Jel oje. V-18. Cennet Bahçesi", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/641/t863bpbwvs8aepj2fn15tgyamt248aya.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-19-zhivoy-korall", name: "Jel oje. V-19. Canlı mercan.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/9ec/w0ktiu611by768bg55qvdno1np7sb2cg.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-20-letniy-kruiz", name: "Jel oje. V-20. Yaz tatili.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a87/nop6l4pl2f2urkoay5fiflcj0z4twihb.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-21-vostochnye-spetsii", name: "Jel oje. V-21. Doğu baharatları.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e46/gphia5r6sgf07ogqszh3x8x6r5co8y3o.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-22-krasnyy-samotsvet", name: "Jel oje. V-22. Kırmızı taş.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2cd/er6e9ifkj83727xmfldxu2c676v34y6g.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-23-ognennyy-rubin", name: "Jel oje. V-23. Ateş yakutu", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/23d/2h7il2nv2a98svvmcgagxz9srnz9uoy8.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-24-ognennye-chary", name: "Jel oje. V-24. Ateşli tılsımlar", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/426/u5yauajri3btyo2w3dmvsu6h5lrkj3qq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-25-maskarad", name: "Jel oje. V-25. Maskeli balo", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e01/qjucymltnqdlbyqfxr2n08kfa4w08q2e.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-26-gratsiya", name: "Jel oje. V-26. Grace", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/25d/coogw43h8847rurnghil0ewaotqrkmzp.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-27-strast", name: "Jel oje. V-27. Tutku", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d90/620mq61y6wh1cux0my1x02dvi1e0m7b5.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-28-goryashchee-solntse", name: "Jel oje. V-28. Yanan güneş.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/171/4fsvm59az5q2ykmtn5av2tjrb7phlb49.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-29-iskry-ognya", name: "Jel oje. V-29. Ateş kıvılcımları.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c2d/pysboptqija3ncaddbfhqd8o9jpyonsk.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-30-turmalin", name: "Jel oje. V-30. Turmalin", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ff1/4nrn72risbd21ljz2jwyu5i02gyt9n4n.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-31-roskoshnaya-ledi", name: "Jel oje. V-31. Lüks bayan", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/7fb/ytotj58s0oux3k3gdwefkskeguxye4n9.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-v-32-plamya-strasti", name: "Jel oje. V-32. Tutku Alevi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/462/d7ss4kbdo9ziyzzngkamau0qj7q6931m.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-01-rozovaya-pomada", name: "Jel oje. Z-01. Pembe ruj.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2cf/hyxypikd3bf182j2zg0sl1ytd976115q.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-02-italyanskiy-soblazn", name: "Jel oje. Z-02. İtalyan cazibesi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/156/9yjofgcc363z6tktjt1q0tpnedhsbg78.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-03-memuary-geyshi", name: "Jel oje. Z-03. Bir Geyşanın Anıları", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/4ae/r8r3zuc5maajqyr4qfr2zsfveok7j8az.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-04-yagodnyy-muss", name: "Jel oje. Z-04. Orman meyvesi köpüğü", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/ac2/7sxhl310eqcaoif2xjjxrkrga3lhsvko.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-05-serdtse-stambula", name: "Jel oje. Z-05. İstanbul'un Kalbi", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a06/ztkt8qjgae393x8alwp37vd7qxcg180o.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-06-malinovyy-sok", name: "Jel oje. Z-06. Ahududu suyu.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/154/og7e924ed2oyk6x2mjq06331jusauknm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-07-pesnya-vostoka", name: "Jel oje. Z-07. Doğu'nun Şarkısı", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/632/tvqcgi6k1a62de7o16h4qu4mxk413r3k.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-08-klubnichnyy-liker", name: "Jel oje. Z-08. Çilek likörü", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8fa/oebri2zb3ms99jv0aj0ob1r6flmi2d3w.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-09-tayny-kleopatry", name: "Jel oje. Z-09. Kleopatra'nın Sırları", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/5d0/apgusldnozxfwe1dm7libg1i0mg1mjp6.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-10-rubinovoe-kole", name: "Jel oje. Z-10. Yakut kolye.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/167/w45tq7qifirflaqn63ta8gebes265j2y.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-11-prazdnik", name: "Jel oje. Z-11. Tatil.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/91a/o56of93e4x47qwwjw83yrdaamrtnshoy.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-12-yagodnyy-punsh", name: "Jel oje. Z-12. Berry punch", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d29/9c2rork3srq8x1tsf3hx8s4zs79p1uiv.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-13-ispanskiy-tanets", name: "Jel oje. Z-13. İspanyol dansı.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/329/x2cb3w210a3qsia11x7rt7gd0xzxg5zz.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-14-glintveyn", name: "Jel oje. Z-14. Sıcak şarap.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f00/ejkoupaz3w2silke6xqqgta0hy575td6.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-15-charuyushchaya-barselona", name: "Jel oje. Z-15. Büyüleyici Barselona", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/21d/91lvfg6pto1ulpxzcubu2ki0v2zx6jqc.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-16-burgundskoe-vino", name: "Jel oje. Z-16. Bordo şarap rengi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8e9/wyskwm5kuqwwbvlncafkbmu127fn63z4.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-17-vechernee-plate", name: "Jel oje. Z-17. Abiye elbise.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0a6/kmvlerz3mi3355jdbfnyst38ewr0kiw8.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-18-noch-v-marokko", name: "Jel oje. Z-18. Fas'ta Bir Gece", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/17d/1y3uifc9swluhtsr44ey2bk5jysk8cr1.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-19-feeriya", name: "Jel oje. Z-19. Extravaganza", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2ce/a793m9v0hw31wqxb3qioelq0aenv7b71.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-20-flamenko", name: "Jel oje. Z-20. Flamenko", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/9d6/q1mxfxakhe8odelkfsjk157sqvlobhi7.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-21-obolshchenie", name: "Jel oje. Z-21. Baştan Çıkarma", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b7e/mi0k6ojeu1g9hetojyln2kgwuhn5ezmn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-z-22-karnavalnoe-plate", name: "Jel oje. Z-22. Karnaval elbisesi.", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d67/cz0p7939y2box2g8z9n78abvnofzna5j.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-jb-01-juicy-boom-papaya-vibe-01", name: "Jel oje. JB-01. Juicy Boom &quot;Papaya Vibe&quot; No. 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/159/d2zpqgs5b3n4gesbuxhw347vced1taxf.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-jb-02-juicy-boom-guava-time-02", name: "Jel oje. JB-02. Juicy Boom &quot;Guava Time&quot; No. 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/59d/x706ez876wr5axr3evxx0muo3jk4r8qk.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-jb-03-juicy-boom-pink-grapefruit-03", name: "Jel oje. JB-03. Juicy Boom &quot;Pembe greyfurt&quot; No. 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/920/ohocto1i9uvzhkjm377jm7e67l968uch.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-jb-04-juicy-boom-dragon-fruit-04", name: "Jel oje. JB-04. Juicy Boom &quot;Ejder Meyvesi&quot; No. 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c47/ndamwtf27irtcttsilod8fnqvtz3hzm0.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-jb-05-juicy-boom-grape-feel-05", name: "Jel oje. JB-05. Juicy Boom “Üzüm hissi” No. 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/841/w9hod842f4t6rw9e8nqippvf0s894y80.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-jb-06-juicy-boom-blueberry-juice-06", name: "Jel oje. JB-06. Juicy Boom &quot;Yaban Mersini Suyu&quot; No. 06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/3e1/xa9gl6fapiimkqrta165d4menewti01i.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-jb-07-juicy-boom-fresh-mint-07", name: "Jel oje. JB-07. Juicy Boom “Taze nane” No. 07", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a53/y9pny7frg6bbg0ti0zyzj1ma20wbsdcg.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ac-01-air-cats-01", name: "Jel oje. AC-01. Air Cats No. 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/2e1/dxr0tsmetmpxrimjeoixh2j3oa6iesrw.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ac-02-air-cats-02", name: "Jel oje. AC-02. Air Cats No. 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c8e/8uvt73s861ow6uii7x13cfz3wfvg9siy.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ac-03-air-cats-03", name: "Jel oje. AC-03. Air Cats No. 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/d9c/mchpa04if6fk2q2pzge3ohvq0mumgm60.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ac-04-air-cats-04", name: "Jel oje. AC-04. Air Cats No. 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8a9/xmskp2ycl8044f7e0e8eb4189fx77e2j.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ac-05-air-cats-05", name: "Jel oje. AC-05. Air Cats No. 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/6b9/i4z96gk7aylumvs8r77v8wt1mybl915l.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ac-06-air-cats-06", name: "Гель-лак. AC-06. Air Cats № 06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/c97/89ijxkrb9sfpuateosw6cd6pbxpsyhjn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ac-07-air-cats-07", name: "Гель-лак. AC-07. Air Cats № 07", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f00/e942t74a99sdnlredouajrxqm5mcrgt9.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-fc-01-fair-cats-01", name: "Гель-лак. FC-01. Fair Cats № 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/1a4/a3n72nj7ilcfib5reafflqe0jjsfgpx2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-fc-02-fair-cats-02", name: "Гель-лак. FC-02. Fair Cats № 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/056/j6pot7lh5p6e7njv41gop2gb6ks3qkht.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-fc-03-fair-cats-03", name: "Гель-лак. FC-03. Fair Cats № 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/04d/l282znafvappbc4cidq82m5fyplh0h8s.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-fc-04-fair-cats-04", name: "Гель-лак. FC-04. Fair Cats № 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/03f/3sfbvelup5pp5d31qcesti0p2oc2emfo.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-fc-05-fair-cats-05", name: "Гель-лак. FC-05. Fair Cats № 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e48/p4bg2fy14q1i0t5nczgyqv2fj62ftgmv.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-fc-06-fair-cats-06", name: "Гель-лак. FC-06. Fair Cats № 06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a4b/j6xz6d2xw2d3q0x0a90w0whsq7pvboz8.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sg-01-so-glam-01", name: "Гель-лак. SG-01. So Glam # 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/720/fbnff22wsh93c6iqrut3lp4a6e8n9axw.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sg-02-so-glam-02", name: "Гель-лак. SG-02. So Glam # 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/440/s33ohc2btr7r7a7398exalidyuy71euj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sg-03-so-glam-03", name: "Гель-лак. SG-03. So Glam # 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/aa8/mb3ztdw2b1nytt7sguxc5ktf9ikveady.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sg-04-so-glam-04", name: "Гель-лак. SG-04. So Glam # 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/bc5/mbh6634pyf11ez72u02ar83ica2ywtes.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-sg-05-so-glam-05", name: "Гель-лак. SG-05. So Glam # 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/694/075eygb6zatxbhay1g4t5edxv5njygpi.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-red-01-8-ml", name: "Гель-лак. Коллекция «RED» # 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/40a/z3mvv9fy738j20flxo8qg2493emyl8gf.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-red-02-8-ml", name: "Гель-лак. Коллекция «RED» # 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a48/3bpt68gpug2kjkj5wd4jtzjoluysstpy.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-red-03-8-ml", name: "Гель-лак. Коллекция «RED» # 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/4f7/ajs7va2vf9qoic544rh3ofar1iwi6go4.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-red-04-8-ml", name: "Гель-лак. Коллекция «RED» # 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/0ce/hesxkfl1e042cr6tuap5pud1a7zrq55y.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-red-05-8-ml", name: "Гель-лак. Коллекция «RED» # 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/bd6/shxao6hd4g9abze661igje6tnjdfajod.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-red-06-8-ml", name: "Гель-лак. Коллекция «RED» # 06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b0a/3hqhzjurc4fnszkpdtu2qv9dicya2qzq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-azia-cats-01", name: "Гель-лак. Коллекция «Azia Cats» # 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/638/vf3e6npg9dnd7rf2m3fstuk0hzplb9l2.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-azia-cats-02", name: "Гель-лак. Коллекция «Azia Cats» # 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/3b8/997syeed3wnpyb00ksz3ny6f1a38qc19.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-azia-cats-03", name: "Гель-лак. Коллекция «Azia Cats» # 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/823/9gsuyt8urqlizdgqskbapgpliwavp5jn.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-azia-cats-04", name: "Гель-лак. Коллекция «Azia Cats» # 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e37/7s8av2bb1kie90fesxvlpxyz5cxoyy9e.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-azia-cats-05", name: "Гель-лак. Коллекция «Azia Cats» # 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/f88/wn8jv27hb3jcjrp6lpi9yfo5n76ptety.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-azia-cats-06", name: "Гель-лак. Коллекция «Azia Cats» # 06", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/7a8/0ac4ygmsny8nfpn4d066umtidxt38lfq.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-nude-01-8-ml", name: "Гель-лак. Коллекция «Nude» # 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/a87/ke8prxsny5nq0x15801j7v7sl4an3n01.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-nude-02-8-ml", name: "Гель-лак. Коллекция «Nude» # 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/9c9/o42a1t23vcqs932smivtii3ykde0aalp.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-nude-03-8-ml", name: "Гель-лак. Коллекция «Nude» # 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/64d/5ywixu4jelsn232by67bhdd82ee3nmnz.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-nude-04-8-ml", name: "Гель-лак. Коллекция «Nude» # 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/75c/y85dwfvgx5knxsskov7fv88by5b0gptm.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kollektsiya-nude-05-8-ml", name: "Гель-лак. Коллекция «Nude» # 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/803/sw928cqkpic7jy2xxhwn3etxwxwgfyfe.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-vishnya", name: "Гель-лак. Вишня", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/4f0/jt2psrsv9bgdji57fb4d7cs29hhie0h8.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-kalina", name: "Гель-лак. Калина", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/72e/64udzjzz1scyoxbzhiq4cygzpo9blnfj.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-klyukva", name: "Гель-лак. Клюква", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/4bf/srit1ueys5q7zi5oydsg7p00zdr63zds.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-len", name: "Гель-лак. Лен", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b51/lc1jtrwhk3v7cx4oap12nzx0jl43t9uw.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-luga", name: "Гель-лак. Луга", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b74/2651hfbfufi5qg76dva0xp3fqiz8v3yt.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-ryabina", name: "Гель-лак. Рябина", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/4b9/fxhuhog5rx3ys1xqwb5gke5t4tl14s12.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-tuman", name: "Гель-лак. Туман", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/8d8/jop83wzys1bt9d9ny50ocstr1eg75j1s.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-leo-01-leo-cats-01", name: "Гель-лак. LEO-01. Leo Cats № 01", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/e4e/99p46j02q5egb639dl0dcu19w82kne2k.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-leo-02-leo-cats-02", name: "Гель-лак. LEO-02. Leo Cats № 02", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/b09/270eu8y4chvkdze792qyjdmu3b9cfcpd.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-leo-03-leo-cats-03", name: "Гель-лак. LEO-03. Leo Cats № 03", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/41c/os59we7mn29u24767f3yffsfar3mi674.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-leo-04-leo-cats-04", name: "Гель-лак. LEO-04. Leo Cats № 04", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/494/7cm424q737csulkj0w7iuaoom79fgruv.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-leo-05-leo-cats-05", name: "Гель-лак. LEO-05. Leo Cats № 05", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/53d/24gonu0b4h6mvw4u6cb3oydh1iyosazk.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-lunnaya-koshka-moon-cats-belaya-8-ml", name: "Гель-лак. Лунная кошка (Moon Cats) # Белая, 8 мл", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/764/biqr3fvmdc3eugz5zes0ly9q0og7umpd.jpg", categories: ["gel-polish"] },
  { id: "mio-gel-gel-lak-lunnaya-koshka-moon-cats-prozrachnaya-8-ml", name: "Гель-лак. Лунная кошка (Moon Cats) # Прозрачная, 8 мл", brand: "MIO NAILS", size: "8 ml", color: "", image: "https://mionails.ru/upload/iblock/dc4/ypvahsi3y7duqbvnpbm0y5akco1o071n.jpg", categories: ["gel-polish"] },
];

const isLegacySeedData = (products) => {
  if (!Array.isArray(products) || products.length !== 8) return false;
  return products.every((item, index) => item?.id === `p${index + 1}`);
};

const defaultBanners = [
  {
    id: "b1",
    subtitle: "Profesyonel Jel Seti",
    price: "220 AED",
    title: "FRANSIZ MANİKÜRÜ",
    description: "Tırnaklarınız için kusursuz Fransız manikürü seti",
    buttonText: "Detayları İncele",
    buttonUrl: "./katalog.html?filter=all",
    image: "",
  },
];

const loadProducts = () => {
  const REMOVED_PRODUCT_IDS = new Set([
    "starter-kit",
    "albi-regenerating-hand-cream-seaweed-coconut",
    "albi-cream-for-tired-feet-menthol-camphor",
    "albi-foot-cream-softening-corns-cracks",
    "albi-nourishing-hand-cream",
    "albi-foot-softening-cream",
    "nail-file-albi-moon",
    "nail-file-albi-boomerang",
    "nail-file-albi-straight",
  ]);
  const normSizeDigits = (value) => {
    const raw = String(value || "").trim();
    const numeric = raw.replace(/[^\d]/g, "");
    return numeric || "10";
  };
  const isKirpikFamily = (p) =>
    Array.isArray(p?.categories) &&
    p.categories.some((c) => c === "ipek-kirpik" || (typeof c === "string" && c.startsWith("kirpik-")));

  const migrateAdetBucketToFirca = (arr) => {
    let changed = false;
    const next = arr.map((p) => {
      if (p.id === "kalipso-collapsible-brush-acrylic-12") {
        const cats = p.categories || [];
        if (cats.length === 1 && cats[0] === "firca") return p;
        changed = true;
        return { ...p, categories: ["firca"] };
      }
      if (isKirpikFamily(p)) return p;
      const n = normSizeDigits(p.size);
      if (!["1", "2", "3"].includes(n)) return p;
      const cats = p.categories || [];
      if (cats.length === 1 && cats[0] === "firca") return p;
      changed = true;
      return { ...p, categories: ["firca"] };
    });
    return { next, changed };
  };

  const migrateLovelyIpekLine = (arr) => {
    let changed = false;
    const next = arr.map((p) => {
      const brand = String(p.brand || "").trim().toLocaleLowerCase("tr");
      if (brand !== "lovely") return p;
      const cats = p.categories || [];
      if (!cats.includes("ipek-kirpik")) return p;
      if (LOVELY_LINE_SUBCATEGORIES.some((s) => cats.includes(s)) && cats.includes(LOVELY_LINE_PARENT)) return p;
      const sub = detectLovelySubFromName(p.name);
      changed = true;
      const merged = [...new Set([...cats.filter((c) => !LOVELY_LINE_SUBCATEGORIES.includes(c)), LOVELY_LINE_PARENT, sub])];
      return { ...p, categories: merged };
    });
    return { next, changed };
  };

  const stored = localStorage.getItem(PRODUCTS_KEY);
  if (!stored) return [...defaultProducts];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.length) return [...defaultProducts];
    if (isLegacySeedData(parsed)) return [...defaultProducts];
    let { next, changed } = migrateAdetBucketToFirca(parsed);
    const lovelyMig = migrateLovelyIpekLine(next);
    if (lovelyMig.changed) {
      changed = true;
      next = lovelyMig.next;
    }
    const cleaned = next.filter((p) => !REMOVED_PRODUCT_IDS.has(p.id));
    if (cleaned.length !== next.length) {
      changed = true;
      next = cleaned;
    }
    if (changed) localStorage.setItem(PRODUCTS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [...defaultProducts];
  }
};

const loadBanners = () => {
  const stored = localStorage.getItem(BANNERS_KEY);
  if (!stored) return [...defaultBanners];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length ? parsed : [...defaultBanners];
  } catch {
    return [...defaultBanners];
  }
};

const trackVisitMetrics = () => {
  const today = new Date().toISOString().slice(0, 10);
  const defaultMetrics = {
    totalVisits: 0,
    homeViews: 0,
    catalogViews: 0,
    adminLogins: 0,
    dailyVisits: {},
  };

  let metrics = defaultMetrics;
  try {
    const stored = localStorage.getItem(METRICS_KEY);
    if (stored) {
      metrics = { ...defaultMetrics, ...JSON.parse(stored) };
      metrics.dailyVisits = { ...defaultMetrics.dailyVisits, ...(metrics.dailyVisits || {}) };
    }
  } catch {
    metrics = defaultMetrics;
  }

  metrics.totalVisits += 1;
  const isCatalogPage = window.location.pathname.toLowerCase().includes("katalog");
  if (isCatalogPage) {
    metrics.catalogViews += 1;
  } else {
    metrics.homeViews += 1;
  }
  metrics.dailyVisits[today] = (metrics.dailyVisits[today] || 0) + 1;
  localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
};

const productPhotoClass = (index) => {
  const tones = ["", "tone-2", "tone-3", "tone-4", "tone-5", "tone-6", "tone-7", "tone-8"];
  return tones[index % tones.length];
};

const prevSlideBtn = document.querySelector("#prevSlide");
const nextSlideBtn = document.querySelector("#nextSlide");
const homeSlider = document.querySelector("#homeSlider");
const sliderDots = document.querySelector("#sliderDots");
let currentSlideIndex = 0;
let mobileSliderTimer = null;
const MOBILE_SLIDER_MS = 4500;
let touchStartX = 0;
let touchStartY = 0;
let touchInProgress = false;
const SWIPE_THRESHOLD_PX = 42;
const isMobileViewport = () => window.matchMedia("(max-width: 980px)").matches;

const stopMobileSliderAutoplay = () => {
  if (!mobileSliderTimer) return;
  clearInterval(mobileSliderTimer);
  mobileSliderTimer = null;
};

const startMobileSliderAutoplay = () => {
  stopMobileSliderAutoplay();
  if (!isMobileViewport() || !homeSlider) return;
  const banners = loadBanners();
  if (banners.length <= 1) return;
  mobileSliderTimer = window.setInterval(() => {
    const latestBanners = loadBanners();
    if (!latestBanners.length) return;
    currentSlideIndex = (currentSlideIndex + 1) % latestBanners.length;
    renderHomeSlider();
  }, MOBILE_SLIDER_MS);
};

const resetMobileSliderAutoplay = () => {
  startMobileSliderAutoplay();
};

const showPrevSlide = () => {
  const banners = loadBanners();
  if (!banners.length) return;
  currentSlideIndex = (currentSlideIndex - 1 + banners.length) % banners.length;
  renderHomeSlider();
  resetMobileSliderAutoplay();
};

const showNextSlide = () => {
  const banners = loadBanners();
  if (!banners.length) return;
  currentSlideIndex = (currentSlideIndex + 1) % banners.length;
  renderHomeSlider();
  resetMobileSliderAutoplay();
};

const renderHomeSlider = () => {
  if (!homeSlider) return;
  const banners = loadBanners();
  if (!banners.length) return;
  const active = banners[currentSlideIndex % banners.length];
  const bannerImg = active.image ? tildaBannerSrc(active.image) : "";
  const safeBannerAlt = escapeHtml(active.title || "Banner");
  const imageMarkup = bannerImg
    ? `<div class="slide-media"><img src="${bannerImg}" alt="${safeBannerAlt}" width="1400" height="788" loading="eager" decoding="async" fetchpriority="high" /></div>`
    : `<div class="slide-visual" aria-hidden="true"><div class="bottle b1"></div><div class="bottle b2"></div><div class="bottle b3"></div><div class="bottle b4"></div></div>`;

  homeSlider.innerHTML = `
    <article class="slide-card">
      ${active.price ? `<div class="price-badge">${active.price}</div>` : ""}
      ${imageMarkup}
      <div class="slide-copy">
        <p>${active.subtitle || ""}</p>
        <h2>${active.title || ""}</h2>
        <span>${active.description || ""}</span>
        <a href="${active.buttonUrl || "./katalog.html?filter=all"}" class="slide-btn">${active.buttonText || "Detayları İncele"}</a>
      </div>
    </article>
  `;

  if (sliderDots) {
    sliderDots.innerHTML = banners
      .map((_, idx) => `<span data-dot-index="${idx}" class="${idx === currentSlideIndex ? "active" : ""}"></span>`)
      .join("");
  }
};

const normalizeMl = (value) => {
  const raw = String(value || "").trim();
  const numeric = raw.replace(/[^\d]/g, "");
  return numeric || "10";
};

const formatSizeUnit = (value) => {
  const numeric = Number(String(value || "").trim());
  if ([1, 2, 3].includes(numeric)) return `${numeric} adet`;
  return `${String(value || "").trim()} ml`;
};

const LASH_CATEGORY = "ipek-kirpik";
/** İpek kirpik telleri ve kirpik sarf / palet / ekipman ürünleri (ml filtresi ve kart boyutu için). */
const isLashProduct = (product) =>
  (product.categories || []).some((c) => c === LASH_CATEGORY || (typeof c === "string" && c.startsWith("kirpik-")));

const isFircaProduct = (product) => (product.categories || []).includes("firca");

const KIRPIK_SUPPLY_CATEGORY_SLUGS = [
  "kirpik-ekipman",
  "kirpik-markali",
  "kirpik-alt-izolasyon",
  "kirpik-ek-malzemeler",
  "kirpik-tekstil",
  "kirpik-sarf",
  "kirpik-tablet-stand",
];

/** LOVELY ana hat (ipek kirpik); alt seriler: rili / lashy / lovely (çekirdek seri). */
const LOVELY_LINE_PARENT = "lovely";
const LOVELY_LINE_SUBCATEGORIES = ["lovely-rili", "lovely-lashy", "lovely-lovely"];

const detectLovelySubFromName = (name) => {
  const n = String(name || "");
  if (/\bLASHY\b/i.test(n)) return "lovely-lashy";
  if (/\bRili\b/i.test(n)) return "lovely-rili";
  return "lovely-lovely";
};

const getBrandForFilter = (product) => {
  const brand = String(product?.brand || "ALBI").trim() || "ALBI";
  const lower = brand.toLocaleLowerCase("tr");
  if (lower === "lovely" || lower === "riley" || lower === "lashy") return "LOVELY";
  if (lower.startsWith("lovely /")) return "LOVELY";
  return brand;
};

const normalizeSearchText = (value) =>
  String(value || "")
    .toLocaleLowerCase("tr")
    .replace(/\s+/g, " ")
    .trim();

const extractFirstNumber = (value) => {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

const isPolishProduct = (product) =>
  Array.isArray(product?.categories) && product.categories.includes("gel-polish");

const sortProductsForCatalog = (products) =>
  [...products].sort((a, b) => {
    const aPolish = isPolishProduct(a);
    const bPolish = isPolishProduct(b);
    if (!aPolish || !bPolish) return 0;

    const aNum = extractFirstNumber(a.name);
    const bNum = extractFirstNumber(b.name);
    if (aNum === null && bNum === null) return String(a.name || "").localeCompare(String(b.name || ""), "tr");
    if (aNum === null) return 1;
    if (bNum === null) return -1;
    if (aNum !== bNum) return aNum - bNum;
    return String(a.name || "").localeCompare(String(b.name || ""), "tr");
  });

const renderProductCard = (product, index, { lazyImage = true } = {}) => {
  const toneClass = productPhotoClass(index);
  const thumbSrc = product.image ? tildaThumbnailSrc(product.image, 540) : "";
  const safeName = escapeHtml(product.name);
  const loadingAttr = lazyImage ? "lazy" : "eager";
  const fetchPri = lazyImage ? "low" : "auto";
  const imgMarkup = thumbSrc
    ? `<img src="${thumbSrc}" alt="${safeName}" width="540" height="540" loading="${loadingAttr}" decoding="async" fetchpriority="${fetchPri}" />`
    : "";
  const imageClass = product.image ? "has-image" : "";
  const lash = isLashProduct(product);
  const firca = isFircaProduct(product);
  const skipMlPack = lash || firca;
  const mlValue = skipMlPack ? "" : normalizeMl(product.size);
  const skipMl = skipMlPack ? "true" : "false";
  const colorRaw = String(product.color || "").trim();
  const brandLabel = getBrandForFilter(product);
  const brandKey = `brand-${slugifyBrand(brandLabel)}`;
  const nameKey = normalizeSearchText(product.name);
  const sizeDisplay = skipMlPack
    ? escapeHtml(String(product.size || "").trim() || "—")
    : escapeHtml(formatSizeUnit(mlValue));
  const colorLine = lash && colorRaw ? `<p>Renk: ${escapeHtml(colorRaw)}</p>` : "";
  const seriesRaw = String(product.series || "").trim();
  const seriesKey = slugifySeries(seriesRaw);
  const seriesLine = seriesRaw ? `<p>Seri: ${escapeHtml(seriesRaw)}</p>` : "";
  return `
    <article class="catalog-card" data-category="${(product.categories || []).join(",")}" data-size-ml="${mlValue}" data-brand-key="${brandKey}" data-series="${seriesKey}" data-skip-ml-filter="${skipMl}" data-name-key="${escapeHtml(nameKey)}">
      <div class="catalog-photo ${toneClass} ${imageClass}">
        ${imgMarkup}
      </div>
      <h3>${safeName}</h3>
      <p>Marka: ${escapeHtml(brandLabel)}</p>
      <p>Boyut: ${sizeDisplay}</p>
      ${seriesLine}
      ${colorLine}
    </article>
  `;
};

const renderCatalogProducts = () => {
  const grid = document.querySelector("#catalogGridDynamic");
  if (!grid) return;
  const products = sortProductsForCatalog(loadProducts());
  grid.innerHTML = products.map((p, i) => renderProductCard(p, i, { lazyImage: true })).join("");
  populateTopFilters();
};

const renderPreviewProducts = () => {
  if (!previewGrid) return;
  const products = loadProducts().slice(0, 4);
  previewGrid.innerHTML = products.map((p, i) => renderProductCard(p, i, { lazyImage: i >= 2 })).join("");
};

const applySiteContent = () => {
  const stored = localStorage.getItem(CONTENT_KEY);
  if (!stored) return;
  try {
    const content = JSON.parse(stored);
    const mappings = [
      ["#heroTitle", content.heroTitle],
      ["#heroLead", content.heroLead],
      ["#whyTitle", content.whyTitle],
      ["#whyCardTitle", content.whyCardTitle],
      ["#whyCardText", content.whyCardText],
    ];
    mappings.forEach(([selector, value]) => {
      const node = document.querySelector(selector);
      if (node && value) node.textContent = value;
    });
  } catch {
    // ignore malformed content
  }
};

const filterLabelMap = {
  all: "Tüm ürünler listeleniyor",
  new: "Yeni ürünler listeleniyor",
  "gel-polish": "Kalıcı ojeler listeleniyor",
  "base-coat": "Baz kat ürünleri listeleniyor",
  "top-coat": "Top kat ürünleri listeleniyor",
  "building-gel": "Jel güçlendirme ürünleri listeleniyor",
  "liquid-polygel": "Sıvı polijel ürünleri listeleniyor",
  "nail-skin-care": "Tırnak ve cilt bakımı ürünleri listeleniyor",
  "nail-files": "Tırnak törpüleri listeleniyor",
  firca: "Fırça ve fırça setleri listeleniyor",
  "ipek-kirpik": "İpek kirpik ürünleri listeleniyor",
  "kirpik-malzemeleri": "Kirpik sarf ve yardımcı ürünleri listeleniyor",
  "kirpik-ekipman": "Kirpik ekipmanı ve aletleri listeleniyor",
  "kirpik-markali": "Markalı kirpik ürünleri listeleniyor",
  "kirpik-alt-izolasyon": "Alt kirpik izolasyonu ürünleri listeleniyor",
  "kirpik-ek-malzemeler": "Kirpik ek malzemeleri listeleniyor",
  "kirpik-tekstil": "Kirpik tekstil ürünleri listeleniyor",
  "kirpik-sarf": "Kirpik sarf malzemeleri listeleniyor",
  "kirpik-tablet-stand": "Tablet, palet ve yardımcı yüzeyler listeleniyor",
  lovely: "LOVELY ipek kirpik (tüm seriler) listeleniyor",
  "lovely-rili": "LOVELY — Rili serisi listeleniyor",
  "lovely-lashy": "LOVELY — Lashy serisi listeleniyor",
  "lovely-lovely": "LOVELY — Lovely çekirdek seri listeleniyor",
};

const slugifyBrand = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

const slugifySeries = (value) =>
  String(value || "")
    .toLocaleLowerCase("tr")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

let currentCategoryFilter = "all";
let currentCatalogPage = 1;
const ITEMS_PER_PAGE = 20;

const renderCatalogPagination = (totalPages, visibleCount) => {
  if (!catalogPagination) return;
  if (visibleCount === 0 || totalPages <= 1) {
    catalogPagination.innerHTML = "";
    return;
  }

  const pages = Array.from({ length: totalPages }, (_, idx) => idx + 1);
  catalogPagination.innerHTML = `
    <button type="button" data-page-action="prev" ${currentCatalogPage === 1 ? "disabled" : ""}>‹</button>
    ${pages
      .map(
        (page) =>
          `<button type="button" data-page="${page}" class="${page === currentCatalogPage ? "active" : ""}">${page}</button>`
      )
      .join("")}
    <button type="button" data-page-action="next" ${currentCatalogPage === totalPages ? "disabled" : ""}>›</button>
  `;
};

const populateTopFilters = () => {
  const products = loadProducts();
  if (topMlFilter) {
    const mlValues = [
      ...new Set(
        products
          .filter((p) => !isLashProduct(p) && !isFircaProduct(p))
          .map((p) => normalizeMl(p.size))
          .filter(Boolean)
      ),
    ].sort((a, b) => Number(a) - Number(b));
    topMlFilter.innerHTML = `<option value="all">Tümü</option>${mlValues
      .map((ml) => `<option value="${ml}">${escapeHtml(formatSizeUnit(ml))}</option>`)
      .join("")}`;
  }

  if (topBrandFilter) {
    const brands = [...new Set(products.map((p) => getBrandForFilter(p)).filter(Boolean))];
    topBrandFilter.innerHTML = `<option value="all">Tümü</option>${brands
      .map((brand) => `<option value="${slugifyBrand(brand)}">${brand}</option>`)
      .join("")}`;
  }

  if (topSeriesFilter) {
    const prev = topSeriesFilter.value;
    const withSeries = products.map((p) => String(p.series || "").trim()).filter(Boolean);
    const unique = [...new Set(withSeries)].sort((a, b) => a.localeCompare(b, "tr"));
    const hasEmpty = products.some((p) => !String(p.series || "").trim());
    let html = `<option value="all">Tümü</option>`;
    if (hasEmpty) html += `<option value="__empty__">Seri atanmamış</option>`;
    html += unique.map((s) => `<option value="${slugifySeries(s)}">${escapeHtml(s)}</option>`).join("");
    topSeriesFilter.innerHTML = html;
    if ([...topSeriesFilter.options].some((o) => o.value === prev)) {
      topSeriesFilter.value = prev;
    }
  }
};

const applyCatalogFilter = (filterKey = currentCategoryFilter, resetPage = false) => {
  currentCategoryFilter = filterKey || "all";
  if (resetPage) currentCatalogPage = 1;
  const cards = document.querySelectorAll(".catalog-card[data-category]");
  if (!cards.length) return;

  const selectedMl = topMlFilter?.value || "all";
  const selectedBrand = topBrandFilter?.value || "all";
  const selectedSeries = topSeriesFilter?.value || "all";
  const selectedSearch = normalizeSearchText(topSearchFilter?.value || "");
  const matchedCards = [];

  cards.forEach((card) => {
    const categoryList = (card.dataset.category || "").split(",");
    const sizeValue = card.dataset.sizeMl || "";
    const brandKey = card.dataset.brandKey || "";
    const seriesSlug = card.dataset.series || "";
    const nameKey = card.dataset.nameKey || "";
    const skipMl = card.dataset.skipMlFilter === "true";
    const lovelyParentMatch =
      currentCategoryFilter === LOVELY_LINE_PARENT &&
      (categoryList.includes(LOVELY_LINE_PARENT) ||
        LOVELY_LINE_SUBCATEGORIES.some((slug) => categoryList.includes(slug)));
    const categoryMatch =
      currentCategoryFilter === "all" ||
      lovelyParentMatch ||
      categoryList.includes(currentCategoryFilter) ||
      (currentCategoryFilter === "kirpik-malzemeleri" &&
        (categoryList.includes("kirpik-malzemeleri") ||
          categoryList.some((c) => KIRPIK_SUPPLY_CATEGORY_SLUGS.includes(c))));
    const mlMatch = selectedMl === "all" || (!skipMl && sizeValue === selectedMl);
    const brandMatch = selectedBrand === "all" || brandKey === `brand-${selectedBrand}`;
    const seriesMatch =
      selectedSeries === "all" ||
      (selectedSeries === "__empty__" && !seriesSlug) ||
      (selectedSeries !== "__empty__" && seriesSlug === selectedSeries);
    const searchMatch = !selectedSearch || nameKey.includes(selectedSearch);
    const shouldShow = categoryMatch && mlMatch && brandMatch && seriesMatch && searchMatch;
    if (shouldShow) matchedCards.push(card);
  });

  const totalPages = Math.max(1, Math.ceil(matchedCards.length / ITEMS_PER_PAGE));
  if (currentCatalogPage > totalPages) currentCatalogPage = totalPages;
  const start = (currentCatalogPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const visibleCards = new Set(matchedCards.slice(start, end));

  cards.forEach((card) => {
    card.classList.toggle("is-hidden", !visibleCards.has(card));
  });

  if (topCategoryFilter) {
    topCategoryFilter.value = currentCategoryFilter;
  }

  if (catalogCurrent) {
    const baseLabel = filterLabelMap[currentCategoryFilter] || filterLabelMap.all;
    const mlLabel = selectedMl === "all" ? "Tümü" : formatSizeUnit(selectedMl);
    const brandLabel =
      selectedBrand === "all"
        ? "Tümü"
        : topBrandFilter?.selectedOptions?.[0]?.textContent || "Tümü";
    const seriesLabel =
      selectedSeries === "all"
        ? "Tümü"
        : selectedSeries === "__empty__"
          ? "Seri atanmamış"
          : topSeriesFilter?.selectedOptions?.[0]?.textContent || "Tümü";
    const searchLabel = selectedSearch ? ` | Arama: ${selectedSearch}` : "";
    catalogCurrent.textContent = `${baseLabel} | ML: ${mlLabel} | Marka: ${brandLabel} | Seri: ${seriesLabel}${searchLabel}`;
  }

  if (catalogEmpty) {
    catalogEmpty.classList.toggle("show", matchedCards.length === 0);
  }

  renderCatalogPagination(totalPages, matchedCards.length);
};

const goToCatalog = (filterKey) => {
  if (topCategoryFilter) topCategoryFilter.value = filterKey || "all";
  applyCatalogFilter(filterKey, true);
  if (catalogSection) {
    catalogSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const initializeCatalogFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const initialFilter = params.get("filter");
  if (initialFilter) {
    applyCatalogFilter(initialFilter, true);
  } else {
    applyCatalogFilter("all", true);
  }
};

renderCatalogProducts();
renderPreviewProducts();
loadInstagramFeed();
applySiteContent();
trackVisitMetrics();
renderHomeSlider();

if (openCatalog && closeCatalog && catalogModal) {
  openCatalog.addEventListener("click", () => catalogModal.showModal());
  closeCatalog.addEventListener("click", () => catalogModal.close());
}

if (catalogLinks.length) {
  catalogLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const filterKey = link.dataset.catalogTrigger || "all";
      goToCatalog(filterKey);
    });
  });
}

if (prevSlideBtn && nextSlideBtn) {
  prevSlideBtn.addEventListener("click", showPrevSlide);
  nextSlideBtn.addEventListener("click", showNextSlide);
}

if (sliderDots) {
  sliderDots.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const dotIndex = Number(target.dataset.dotIndex);
    if (Number.isNaN(dotIndex)) return;
    currentSlideIndex = dotIndex;
    renderHomeSlider();
    resetMobileSliderAutoplay();
  });
}

if (homeSlider) {
  homeSlider.addEventListener(
    "touchstart",
    (event) => {
      const point = event.changedTouches[0];
      if (!point) return;
      touchStartX = point.clientX;
      touchStartY = point.clientY;
      touchInProgress = true;
    },
    { passive: true }
  );

  homeSlider.addEventListener(
    "touchend",
    (event) => {
      if (!touchInProgress) return;
      const point = event.changedTouches[0];
      if (!point) return;
      const deltaX = point.clientX - touchStartX;
      const deltaY = point.clientY - touchStartY;
      touchInProgress = false;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY)) return;
      if (deltaX > 0) {
        showPrevSlide();
      } else {
        showNextSlide();
      }
    },
    { passive: true }
  );
}

window.addEventListener("resize", startMobileSliderAutoplay);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopMobileSliderAutoplay();
  } else {
    startMobileSliderAutoplay();
  }
});

if (topMlFilter) {
  topMlFilter.addEventListener("change", () => {
    applyCatalogFilter(currentCategoryFilter, true);
  });
}

if (topBrandFilter) {
  topBrandFilter.addEventListener("change", () => {
    applyCatalogFilter(currentCategoryFilter, true);
  });
}

if (topSeriesFilter) {
  topSeriesFilter.addEventListener("change", () => {
    applyCatalogFilter(currentCategoryFilter, true);
  });
}

if (topSearchFilter) {
  topSearchFilter.addEventListener("input", () => {
    applyCatalogFilter(currentCategoryFilter, true);
  });
}

if (topCategoryFilter) {
  topCategoryFilter.addEventListener("change", () => {
    applyCatalogFilter(topCategoryFilter.value || "all", true);
    const url = new URL(window.location.href);
    url.searchParams.set("filter", topCategoryFilter.value || "all");
    window.history.replaceState({}, "", url);
  });
}

if (resetTopFilters) {
  resetTopFilters.addEventListener("click", () => {
    if (topMlFilter) topMlFilter.value = "all";
    if (topBrandFilter) topBrandFilter.value = "all";
    if (topSeriesFilter) topSeriesFilter.value = "all";
    if (topSearchFilter) topSearchFilter.value = "";
    if (topCategoryFilter) topCategoryFilter.value = "all";
    applyCatalogFilter("all", true);
  });
}

if (catalogPagination) {
  catalogPagination.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const pageAction = target.dataset.pageAction;
    const page = Number(target.dataset.page || 0);
    if (pageAction === "prev" && currentCatalogPage > 1) {
      currentCatalogPage -= 1;
      applyCatalogFilter(currentCategoryFilter);
      if (catalogSection) catalogSection.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (pageAction === "next") {
      currentCatalogPage += 1;
      applyCatalogFilter(currentCategoryFilter);
      if (catalogSection) catalogSection.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (!Number.isNaN(page) && page > 0) {
      currentCatalogPage = page;
      applyCatalogFilter(currentCategoryFilter);
      if (catalogSection) catalogSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const submitButton = contactForm.querySelector("button[type='submit']");
    if (!submitButton) return;
    const nameInput = contactForm.querySelector("#contactName");
    const emailInput = contactForm.querySelector("#contactEmail");
    const phoneInput = contactForm.querySelector("#contactPhone");
    const messageInput = contactForm.querySelector("#contactMessage");

    const offer = {
      id: `offer_${Date.now()}`,
      createdAt: new Date().toISOString(),
      name: String(nameInput?.value || "").trim(),
      email: String(emailInput?.value || "").trim(),
      phone: String(phoneInput?.value || "").trim(),
      message: String(messageInput?.value || "").trim(),
    };

    const storedOffersRaw = localStorage.getItem(OFFERS_KEY);
    let offers = [];
    if (storedOffersRaw) {
      try {
        const parsed = JSON.parse(storedOffersRaw);
        if (Array.isArray(parsed)) offers = parsed;
      } catch {
        offers = [];
      }
    }
    offers.unshift(offer);
    localStorage.setItem(OFFERS_KEY, JSON.stringify(offers));

    submitButton.textContent = "Talebiniz alındı";
    submitButton.disabled = true;

    setTimeout(() => {
      submitButton.textContent = "Talep Gönder";
      submitButton.disabled = false;
      contactForm.reset();
    }, 1800);
  });
}

const initSiteHeaderMenu = () => {
  const toggle = document.querySelector("#navToggle");
  const nav = document.querySelector("#mainNav");
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    document.body.classList.toggle("nav-menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(!document.body.classList.contains("nav-menu-open"));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("click", (event) => {
    if (!document.body.classList.contains("nav-menu-open")) return;
    const t = event.target;
    if (!(t instanceof Node)) return;
    if (toggle.contains(t) || nav.contains(t)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
};

initSiteHeaderMenu();

initializeCatalogFromUrl();
startMobileSliderAutoplay();
