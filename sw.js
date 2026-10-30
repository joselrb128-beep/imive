// imive · funciona sin internet y se actualiza solo
const CACHE = "imive-v17";
const FILES = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./favicon.png", "./emoji.css"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(u => new Request(u, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
function tag(r) { return r ? (r.headers.get("etag") || r.headers.get("last-modified") || r.headers.get("content-length") || "") : ""; }
function avisar() { self.clients.matchAll({type: "window"}).then(cs => cs.forEach(c => c.postMessage({type: "update"}))); }
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  if (isPage) {
    // 1) Abre al instante desde la copia guardada (funciona sin internet)
    // 2) Por detrás busca la versión nueva; si cambió, la guarda y avisa
    e.respondWith(caches.open(CACHE).then(c => c.match("./index.html").then(hit => {
      const net = fetch("./index.html", {cache: "no-store"}).then(res => {
        if (res && res.ok) {
          const changed = hit && tag(res) !== tag(hit);
          return Promise.all([c.put("./index.html", res.clone()), c.put("./", res.clone())]).then(() => { if (changed) avisar(); return res; });
        }
        return res;
      });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net.catch(() => c.match("./"));
    })));
    return;
  }
  e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match("./index.html"))));
});
