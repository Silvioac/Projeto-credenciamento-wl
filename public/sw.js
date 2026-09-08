/* Service worker do credenciamento — mantém o app abrindo sem internet.
 * Estratégias:
 *  - navegação (HTML): rede primeiro (5 s), cai para o cache; último recurso: página pré-cacheada
 *  - /_next/static, ícones, logos: cache primeiro (arquivos com hash nunca mudam)
 *  - demais GET da mesma origem: stale-while-revalidate
 *  - qualquer outra origem (Supabase, fontes): passa direto, sem interceptar
 */
const VERSAO = "v1";
const CACHE = `credenciamento-${VERSAO}`;
const PRECACHE = [
  "/inscricao",
  "/gestao",
  "/gestao/login",
  "/manifest.webmanifest",
  "/logo-wl-horizontal.svg",
  "/logo-wl-horizontal-clara.svg",
  "/icons/icone-192.png",
  "/icons/icone-512.png",
];
const TIMEOUT_REDE_MS = 5000;

async function precachear(cache, url) {
  const res = await fetch(new Request(url, { cache: "reload" }));
  // Sem login, /gestao redireciona para o login: não guardar a resposta redirecionada
  // como se fosse a página (ela é cacheada na primeira visita logada).
  if (res.ok && !res.redirected) await cache.put(url, res);
}

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => precachear(cache, url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

function comTimeout(promessa, ms) {
  return new Promise((resolver, rejeitar) => {
    const t = setTimeout(() => rejeitar(new Error("timeout")), ms);
    promessa.then(
      (v) => {
        clearTimeout(t);
        resolver(v);
      },
      (e) => {
        clearTimeout(t);
        rejeitar(e);
      },
    );
  });
}

async function guardar(req, res) {
  if (!res || res.status !== 200 || res.redirected) return;
  const cache = await caches.open(CACHE);
  await cache.put(req, res.clone());
}

async function navegacao(req) {
  const url = new URL(req.url);
  try {
    const res = await comTimeout(fetch(req), TIMEOUT_REDE_MS);
    await guardar(new Request(url.pathname), res.clone());
    return res;
  } catch {
    const cache = await caches.open(CACHE);
    const emCache = await cache.match(url.pathname, { ignoreSearch: true });
    if (emCache) return emCache;
    const alternativa = url.pathname.startsWith("/gestao") ? "/gestao" : "/inscricao";
    const reserva = await cache.match(alternativa);
    if (reserva) return reserva;
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Sem conexão</title><p style=\"font-family:sans-serif;padding:24px\">Sem conexão e sem cópia local desta página. Abra o app uma vez com internet.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

async function cachePrimeiro(req) {
  const cache = await caches.open(CACHE);
  const emCache = await cache.match(req);
  if (emCache) return emCache;
  const res = await fetch(req);
  await guardar(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const emCache = await cache.match(req);
  const atualizacao = fetch(req)
    .then(async (res) => {
      await guardar(req, res.clone());
      return res;
    })
    .catch(() => undefined);
  if (emCache) return emCache;
  const res = await atualizacao;
  return res || new Response("", { status: 504 });
}

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return;

  if (req.mode === "navigate") {
    evento.respondWith(navegacao(req));
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".woff2")
  ) {
    evento.respondWith(cachePrimeiro(req));
    return;
  }
  evento.respondWith(staleWhileRevalidate(req));
});

/* Background Sync: quando a rede volta, pede ao app aberto para enviar a fila. */
self.addEventListener("sync", (evento) => {
  if (evento.tag !== "sincronizar-fila") return;
  evento.waitUntil(
    self.clients
      .matchAll({ includeUncontrolled: true, type: "window" })
      .then((clientes) => clientes.forEach((c) => c.postMessage({ tipo: "SINCRONIZAR_FILA" }))),
  );
});

self.addEventListener("message", (evento) => {
  if (evento.data && evento.data.tipo === "SKIP_WAITING") self.skipWaiting();
});
