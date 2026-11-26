// Bendito Closet · ponte segura entre o site e a FASHN (provador virtual com IA)
// Segredos/ligações na Cloudflare: FASHN_KEY (segredo), LIMITS (KV). Opcionais: PER_DAY (3), TOTAL_DAY (40).
const ALLOWED = ["https://benditocloset.pt", "https://www.benditocloset.pt"];
// Instruções para a IA: vestir só a peça da loja (a foto da loja mostra uma modelo; ignorar o resto do look dela)
const KEEP = " Preserve the person's face exactly as in the original photo: same identity, features, skin, expression and hair; do not retouch or change the face. The garment fabric is fully opaque: sleeves and body fully cover the skin underneath, with no tattoos or skin showing through, and the print follows the garment's natural folds without distortion. Keep the hands, phone and accessories unchanged.";
// Se a pessoa estiver de roupa interior ou fato de banho, completar com um básico (t-shirt branca e calças de ganga)
const HINT = {
  watch: " The product is a wristwatch: put it on the person's wrist, replacing any watch or smartwatch they already wear. Adjust the arm pose naturally (for example, one hand resting near the waist or chest with the wrist turned to the camera) so the watch face is clearly visible and sharp. The rest of the body and the face stay the same.",
  glasses: " The product is a pair of sunglasses: place them correctly on the person's face, centred on the eyes, resting on the nose and ears, with both lenses fully visible and the same shape, size and logo as in the product photo. Keep the head facing the camera. Do not change the face shape or features around the glasses.",
  bag: " Show the whole bag clearly, including its strap or chain, without hiding it behind the arm or phone."
};
const NEVER_BARE = " If no skirt, shorts or trousers are visible on the lower body (bare legs up to the hips, a long shirt or top with nothing underneath, underwear or swimwear), dress the lower body in classic mid-blue straight-leg jeans. If the upper body is only in underwear or swimwear, dress it in a plain white crew-neck t-shirt. Never leave the person partly undressed.";
const FILL = {
  bottoms: " If the person's upper body is in underwear, a bra or swimwear, dress it in a plain white crew-neck t-shirt.",
  shoes: NEVER_BARE,
  bags: NEVER_BARE,
  accessories: NEVER_BARE
};
const KEEP_ACC = " Preserve the person's face exactly as in the original photo: same identity, features, skin, expression and hair; do not retouch or change the face. Keep the clothes, background and phone unchanged.";
const JEANS_BARE = " If the person has nothing on the lower body (bare legs up to the hips, or only underwear or swimwear), dress the lower body in classic mid-blue straight-leg jeans; never leave the person without clothing on the lower body.";
const JEANS_ALL = " Also replace whatever they wear on the lower body (skirt, shorts, dress hem, underwear) with classic mid-blue straight-leg jeans.";
const PROMPT = {
  tops: "Dress the person in the top/jacket from the product photo only, on the upper body. Do not remove, shorten or change anything on the lower body: keep any skirt, sarong, shorts, trousers or the lower part of a dress exactly as it is, with the top worn naturally over it. Keep the person's face, body, pose, hair and background.",
  bottoms: "Dress the person in the trousers/leggings from the product photo only. If the person wears a dress, replace it with these trousers and a simple plain fitted top in a neutral colour. Keep face, body, pose, hair and background.",
  "one-pieces": "Dress the person in the dress/one-piece from the product photo only, replacing their current outfit. Keep face, body, pose, hair and background.",
  shoes: "Put the shoes/sneakers from the product photo on the person's feet only; ignore the rest of the outfit in the product photo. Keep everything else the same.",
  bags: "Add the bag from the product photo to the person, carried naturally on the shoulder or in the hand; ignore the rest of the outfit in the product photo. Keep everything else the same.",
  accessories: "Add only the accessory from the product photo (e.g. watch, sunglasses, scarf) to the person, worn naturally; ignore the rest of the outfit in the product photo. Keep everything else the same.",
  auto: "Dress the person in the main garment from the product photo only. Keep face, body, pose, hair and background."
};
// Aviso à Marianna (1 vez por dia por motivo): o servidor marca, e o navegador de quem viu o aviso envia o e-mail (como a newsletter)
async function avisar(env, motivo) {
  const day = new Date().toISOString().slice(0, 10), k = `aviso:${day}:${motivo}`;
  if (await env.LIMITS.get(k)) return null;
  await env.LIMITS.put(k, "1", { expirationTtl: 172800 });
  return motivo;
}
// Empréstimo de peças: cria o pagamento da caução na Stripe com o valor calculado aqui,
// a partir dos preços publicados no site. Segredo na Cloudflare: STRIPE_KEY (chave restrita, só "Checkout Sessions: escrita").
// Portes de ida e volta por conta da Bendito Closet (decisão de 25/11/2026): o pagamento é só a caução.
const PORTES = { envio: [0, 0], mao: [0, 0] };
const PORTES_NOME = { envio: "Envio para a morada (portes ida e volta pela Bendito Closet)", mao: "Levantamento em mão (Ermesinde)" };
async function pecasDoSite() {
  const h = await (await fetch("https://benditocloset.pt/?w=" + Math.floor(Date.now() / 300000), { cf: { cacheTtl: 300 } })).text();
  const m = h.match(/const PECAS = (\[[\s\S]*?\n\]);/); const P = {};
  if (!m) return P;
  for (const l of m[1].split("\n")) {
    const id = l.match(/^\s*\{\s*id:"([^"]+)"/); if (!id) continue;
    const g = k => { const r = l.match(new RegExp("\\b" + k + ":\\s*\"([^\"]*)\"")); return r ? r[1] : ""; };
    const pr = l.match(/\bpreco:\s*([\d.]+)/);
    const fo = l.match(/\bfotos?:\s*\[?\s*"([^"]+)"/);
    P[id[1]] = { cat: g("cat"), marca: g("marca"), nome: g("nome"), status: g("status"), preco: pr ? +pr[1] : 0, foto: fo ? fo[1] : "" };
  }
  return P;
}
async function caucao(req, env, j) {
  if (!env.STRIPE_KEY) return j({ error: "sem_chave" }, 503);
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const code = String(b.code || ""), ship = String(b.ship || ""), email = String(b.email || "").trim(), ids = Array.isArray(b.ids) ? b.ids.map(String) : [];
  const d1 = String(b.d1 || ""), d2 = String(b.d2 || "");
  if (!/^BC-[A-Z0-9]{4}$/.test(code) || !PORTES[ship] || !/^\S+@\S+\.\S+$/.test(email) || !ids.length || ids.length > 30 || !/^\d{4}-\d{2}-\d{2}$/.test(d1) || !/^\d{4}-\d{2}-\d{2}$/.test(d2)) return j({ error: "dados" }, 400);
  // A caução é só retida no cartão (não é cobrada). A Stripe mantém a retenção 7 dias: a devolução tem de ser até 6 dias depois do pedido.
  const hoje = new Date(); hoje.setUTCHours(12, 0, 0, 0); const lim = new Date(hoje); lim.setUTCDate(lim.getUTCDate() + 6);
  if (new Date(d2 + "T12:00:00Z") > lim || d2 < d1) return j({ error: "datas" }, 400);
  const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10), k = `cau:${day}:${ip}`, n = +((await env.LIMITS.get(k)) || 0);
  if (n >= 15) return j({ error: "limite" }, 429);
  await env.LIMITS.put(k, String(n + 1), { expirationTtl: 172800 });
  const P = await pecasDoSite(), sel = [];
  for (const id of new Set(ids)) { const p = P[id]; if (!p || p.status === "vendido" || !(p.preco > 0)) return j({ error: "peca", id }, 400); sel.push(p); }
  const cau = Math.round(sel.reduce((a, p) => a + p.preco, 0) * 100);
  const big = sel.some(p => !["roupas", "acessorios"].includes(p.cat));
  const portes = PORTES[ship][big ? 1 : 0] * 2 * 100;
  const lista = sel.map(p => `${p.marca} ${p.nome} (${p.preco} €)`).join("; ");
  const fd = d => d.split("-").reverse().join("/");
  const f = new URLSearchParams();
  f.set("mode", "payment"); f.set("locale", "pt"); f.set("customer_email", email); f.set("client_reference_id", code);
  f.set("success_url", "https://benditocloset.pt/emprestimo/?pago=" + code); f.set("cancel_url", "https://benditocloset.pt/emprestimo/#caucao");
  f.set("line_items[0][quantity]", "1"); f.set("line_items[0][price_data][currency]", "eur"); f.set("line_items[0][price_data][unit_amount]", String(cau));
  f.set("line_items[0][price_data][product_data][name]", "Caução retida no cartão (não é cobrada) · pedido " + code);
  f.set("line_items[0][price_data][product_data][description]", lista.slice(0, 480));
  if (portes) {
    f.set("line_items[1][quantity]", "1"); f.set("line_items[1][price_data][currency]", "eur"); f.set("line_items[1][price_data][unit_amount]", String(portes));
    f.set("line_items[1][price_data][product_data][name]", "Portes ida e volta · " + PORTES_NOME[ship]);
  }
  const meta = { pedido: code, pecas: lista.slice(0, 490), datas: fd(d1) + " a " + fd(d2), envio: PORTES_NOME[ship], caucao_eur: (cau / 100).toFixed(2), portes_eur: (portes / 100).toFixed(2) };
  for (const [a, v] of Object.entries(meta)) { f.set(`metadata[${a}]`, v); f.set(`payment_intent_data[metadata][${a}]`, v); }
  f.set("payment_intent_data[description]", "Caução retida · empréstimo " + code + " · " + (cau / 100) + " €");
  f.set("payment_intent_data[capture_method]", "manual");
  f.set("payment_method_types[0]", "card");
  f.set("custom_text[submit][message]", "A caução fica só retida no seu cartão, não é cobrada. É libertada quando as peças voltam em bom estado, ou automaticamente ao fim de 7 dias.");
  const call = body => fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { "Authorization": "Bearer " + env.STRIPE_KEY, "Content-Type": "application/x-www-form-urlencoded" }, body });
  const r = await call(f.toString()), o = await r.json();
  if (!r.ok || !o.url) return j({ error: "stripe", detail: o.error && o.error.message }, 502);
  return j({ url: o.url, caucao: cau / 100, portes: portes / 100, total: (cau + portes) / 100, retida: true });
}

// Compra de peças: pagamento com o preço do site e só os portes escolhidos pela cliente (calculados aqui).
// Tabela aprovada a 25/11/2026: [roupa e acessórios, sapatos/malas/casacos]; CTT no continente grátis a partir de 100 €.
const ENVIO = {
  ctt: { n: "Portugal continental · CTT · 2 a 3 dias úteis", p: [7, 9], min: 2, max: 3, c: ["PT"], gratis: 100 },
  cex: { n: "Portugal continental · Correos Express · 24h", p: [10, 12], min: 1, max: 1, c: ["PT"] },
  ilhas: { n: "Açores e Madeira · CTT · 3 a 5 dias úteis", p: [9, 12], min: 3, max: 5, c: ["PT"] },
  eu: { n: "Europa · DHL ou Correos Express", p: [18, 24], min: 2, max: 6, c: ["ES","FR","IT","DE","NL","BE","LU","IE","AT","DK","SE","FI","PL","CZ","SK","SI","HR","HU","RO","BG","GR","CY","MT","EE","LV","LT","CH","NO","GB"] }
};
// Códigos que o site aplica sozinho → cupões da conta Bendito Closet (o cupão BF expira a 29/11 na própria Stripe)
const CUPOES = { BENDITO10: "4PD8sCeI", BLACKFRIDAY15: "5zMdM2cY", BENDITO10BF: "Ae5VZaMp" };
const LOCAIS = ["pt", "en", "es", "fr", "de", "it"];
async function comprar(req, env, j) {
  if (!env.STRIPE_KEY) return j({ error: "sem_chave" }, 503);
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const ids = Array.isArray(b.ids) ? [...new Set(b.ids.map(String))] : [];
  const e = ENVIO[String(b.ship || "")], lang = LOCAIS.includes(b.lang) ? b.lang : "pt", code = String(b.code || "").toUpperCase();
  if (!e || !ids.length || ids.length > 20) return j({ error: "dados" }, 400);
  const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10), k = `buy:${day}:${ip}`, n = +((await env.LIMITS.get(k)) || 0);
  if (n >= 40) return j({ error: "limite" }, 429);
  await env.LIMITS.put(k, String(n + 1), { expirationTtl: 172800 });
  const P = await pecasDoSite(), sel = [];
  for (const id of ids) { const p = P[id]; if (!p || p.status === "vendido" || !(p.preco > 0)) return j({ error: "peca", id }, 409); sel.push({ id, ...p }); }
  const sub = sel.reduce((a, p) => a + p.preco, 0);
  const big = sel.some(p => !["roupas", "acessorios"].includes(p.cat));
  let portes = e.p[big ? 1 : 0];
  if (e.gratis && sub >= e.gratis) portes = 0;
  const f = new URLSearchParams();
  f.set("mode", "payment"); f.set("locale", lang);
  f.set("success_url", "https://benditocloset.pt/?compra=ok&s={CHECKOUT_SESSION_ID}");
  f.set("cancel_url", "https://benditocloset.pt/" + (ids.length === 1 ? "?peca=" + encodeURIComponent(ids[0]) : ""));
  sel.forEach((p, i) => {
    f.set(`line_items[${i}][quantity]`, "1");
    f.set(`line_items[${i}][price_data][currency]`, "eur");
    f.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(p.preco * 100)));
    f.set(`line_items[${i}][price_data][product_data][name]`, (p.marca + " – " + p.nome).slice(0, 250));
    if (p.foto) f.set(`line_items[${i}][price_data][product_data][images][0]`, "https://benditocloset.pt/" + p.foto.replace(/^\//, ""));
    f.set(`line_items[${i}][price_data][product_data][metadata][peca]`, p.id);
  });
  f.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  f.set("shipping_options[0][shipping_rate_data][display_name]", e.n);
  f.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(portes * 100));
  f.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "eur");
  f.set("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]", "business_day");
  f.set("shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]", String(e.min));
  f.set("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]", "business_day");
  f.set("shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]", String(e.max));
  e.c.forEach((c, i) => f.set(`shipping_address_collection[allowed_countries][${i}]`, c));
  f.set("phone_number_collection[enabled]", "true");
  if (CUPOES[code]) f.set("discounts[0][coupon]", CUPOES[code]); else f.set("allow_promotion_codes", "true");
  const lista = sel.map(p => p.id).join(",");
  f.set("metadata[pecas]", lista.slice(0, 490)); f.set("metadata[envio]", e.n); f.set("metadata[portes_eur]", String(portes));
  f.set("payment_intent_data[metadata][pecas]", lista.slice(0, 490)); f.set("payment_intent_data[metadata][envio]", e.n);
  f.set("payment_intent_data[description]", "Bendito Closet · " + sel.map(p => p.marca + " " + p.nome).join("; ").slice(0, 300));
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { "Authorization": "Bearer " + env.STRIPE_KEY, "Content-Type": "application/x-www-form-urlencoded" }, body: f.toString() });
  const o = await r.json();
  if (!r.ok || !o.url) return j({ error: "stripe", detail: o.error && o.error.message }, 502);
  return j({ url: o.url, subtotal: sub, portes });
}

// Contrato assinado: guarda os dados e a assinatura (KV) e mostra-os numa página com o texto do contrato desse dia.
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function guardarContrato(req, env, j) {
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const code = String(b.code || ""), sig = String(b.assinatura || ""), dados = b.dados && typeof b.dados === "object" ? b.dados : null;
  if (!/^BC-[A-Z0-9]{4}$/.test(code) || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(sig) || sig.length > 400000 || !dados || JSON.stringify(dados).length > 20000) return j({ error: "dados" }, 400);
  const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10), k = `ctr:${day}:${ip}`, n = +((await env.LIMITS.get(k)) || 0);
  if (n >= 20) return j({ error: "limite" }, 429);
  await env.LIMITS.put(k, String(n + 1), { expirationTtl: 172800 });
  let texto = "";
  try { const h = await (await fetch("https://benditocloset.pt/emprestimo/?v=" + Date.now())).text(); const a = h.indexOf('<h2 id="contrato"'), z = h.indexOf('<div id="signed"'); if (a > 0 && z > a) texto = h.slice(a, z).replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, ""); } catch (e) {}
  const id = code + "-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  await env.LIMITS.put("contrato:" + id, JSON.stringify({ code, dados, sig, texto, ip, quando: new Date().toISOString() }));
  return j({ url: "https://bendito-provador-ia.nn45hn9bvr.workers.dev/contrato/" + id });
}
async function verContrato(id, env) {
  const raw = await env.LIMITS.get("contrato:" + id);
  if (!raw) return new Response("Contrato não encontrado.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const c = JSON.parse(raw);
  const linhas = Object.entries(c.dados).filter(([k]) => !k.startsWith("_") && k !== "email" && k !== "Dispositivo").map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Contrato assinado ${esc(c.code)} · Bendito Closet</title><style>body{margin:0;background:#F8F5F0;color:#1C1517;font:15px/1.6 system-ui,-apple-system,sans-serif}main{max-width:760px;margin:0 auto;padding:28px 20px 60px}h1{font-family:Georgia,serif;font-weight:400;font-size:28px;margin:0 0 4px}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e6ddd3;border-radius:12px;margin:16px 0}th,td{text-align:left;vertical-align:top;padding:7px 10px;border-bottom:1px solid #f0e9e1;font-size:14px}th{width:36%;color:#6b5f62;font-weight:600}.sig{background:#fff;border:1px solid #e6ddd3;border-radius:12px;padding:12px;margin:12px 0}.sig img{max-width:100%;height:auto}.muted{color:#6b5f62;font-size:13px}button{border:1px solid #d9cfc4;background:#fff;border-radius:999px;padding:8px 14px;font:inherit;cursor:pointer}@media print{button{display:none}}</style></head><body><main>
<div class="muted">BENDITO CLOSET</div><h1>Contrato de empréstimo assinado · ${esc(c.code)}</h1>
<p class="muted">Assinado no site benditocloset.pt em ${esc(new Date(c.quando).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" }))} (hora de Lisboa).</p>
<button onclick="print()">Guardar em PDF / imprimir</button>
<table>${linhas}</table>
<div class="sig"><div class="muted">Assinatura do Utilizador</div><img src="${c.sig}" alt="Assinatura"></div>
${c.texto || '<p><a href="https://benditocloset.pt/emprestimo/#contrato">Texto do contrato</a></p>'}
</main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'", "X-Robots-Tag": "noindex" } });
}
export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = { "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0], "Access-Control-Allow-Methods": "POST,GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Bendito-Dono", "Vary": "Origin" };
    const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (url.pathname === "/") return j({ ok: true, service: "bendito-provador" });
    if (url.pathname === "/caucao" && req.method === "POST") return caucao(req, env, j);
    if (url.pathname === "/comprar" && req.method === "POST") return comprar(req, env, j);
    if (url.pathname === "/assinatura" && req.method === "POST") return guardarContrato(req, env, j);
    const mc = url.pathname.match(/^\/contrato\/(BC-[A-Z0-9]{4}-[a-f0-9]{16})$/);
    if (mc && req.method === "GET") return verContrato(mc[1], env);
    if (!ALLOWED.includes(origin)) return j({ error: "origin" }, 403);
    if (url.pathname === "/run" && req.method === "POST") {
      const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10);
      const PER = +(env.PER_DAY || 3), TOTAL = +(env.TOTAL_DAY || 40);
      const kIp = `ip:${day}:${ip}`, kAll = `all:${day}`;
      const nIp = +((await env.LIMITS.get(kIp)) || 0), nAll = +((await env.LIMITS.get(kAll)) || 0);
      const dono = env.OWNER_TOKEN && req.headers.get("X-Bendito-Dono") === env.OWNER_TOKEN;
      if (!dono && nIp >= PER) return j({ error: "limit_user" }, 429);
      if (!dono && nAll >= TOTAL) { return j({ error: "limit_day", notify: await avisar(env, "cheio") }, 429); }
      let b; try { b = await req.json(); } catch (e) { return j({ error: "bad_json" }, 400); }
      if (typeof b.model_image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(b.model_image) || b.model_image.length > 4e6) return j({ error: "bad_image" }, 400);
      if (typeof b.garment_image !== "string" || !/^https:\/\/benditocloset\.pt\//.test(b.garment_image)) return j({ error: "bad_garment" }, 400);
      const category = ["tops", "bottoms", "one-pieces", "shoes", "bags", "accessories"].includes(b.category) ? b.category : "auto";
      const r = await fetch("https://api.fashn.ai/v1/run", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.FASHN_KEY },
        body: JSON.stringify({ model_name: "tryon-max", inputs: { model_image: b.model_image, product_image: b.garment_image, prompt: (PROMPT[category] || PROMPT.auto) + (HINT[b.hint] || "") + (category === "accessories" ? KEEP_ACC : KEEP) + (category === "tops" ? (b.jeans ? JEANS_ALL : JEANS_BARE) : (FILL[category] || "")), resolution: "1k", generation_mode: "balanced", return_base64: true, output_format: "jpeg" } }) });
      let o = {}; try { o = await r.json(); } catch (e) {}
      if (!r.ok || !o.id) {
        const det = String((o.error && (o.error.name || o.error.message || o.error)) || r.status);
        // Sem créditos na FASHN: mostrar "provador cheio hoje" em vez de erro
        if (r.status === 402 || /credit|balance|quota|insufficient/i.test(det)) { return j({ error: "limit_day", notify: await avisar(env, "creditos") }, 429); }
        return j({ error: "fashn", detail: det }, 502);
      }
      if (!dono) {
        await env.LIMITS.put(kIp, String(nIp + 1), { expirationTtl: 172800 });
        await env.LIMITS.put(kAll, String(nAll + 1), { expirationTtl: 172800 });
        await env.LIMITS.put("job:" + o.id, kIp, { expirationTtl: 86400 });
      }
      return j({ id: o.id, left: PER - nIp - 1 });
    }
    if (url.pathname === "/teste-aviso" && req.method === "POST") {
      if (!(env.OWNER_TOKEN && req.headers.get("X-Bendito-Dono") === env.OWNER_TOKEN)) return j({ error: "no" }, 403);
      return j({ ok: true, notify: "teste" });
    }
    if (url.pathname === "/left" && req.method === "GET") {
      // Quantas provas a pessoa ainda tem hoje (não gasta nada)
      const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10);
      const PER = +(env.PER_DAY || 3), dono = env.OWNER_TOKEN && req.headers.get("X-Bendito-Dono") === env.OWNER_TOKEN;
      const nIp = +((await env.LIMITS.get(`ip:${day}:${ip}`)) || 0);
      return j({ per: PER, left: dono ? 999 : Math.max(0, PER - nIp), dono: !!dono });
    }
    if (url.pathname === "/face" && req.method === "POST") {
      // Só o rosto na foto: a FASHN cria um corpo (meio corpo) a partir do rosto, para depois provar a peça. Conta como 1 prova.
      const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10);
      const PER = +(env.PER_DAY || 3), TOTAL = +(env.TOTAL_DAY || 40);
      const kIp = `ip:${day}:${ip}`, kAll = `all:${day}`;
      const nIp = +((await env.LIMITS.get(kIp)) || 0), nAll = +((await env.LIMITS.get(kAll)) || 0);
      const dono = env.OWNER_TOKEN && req.headers.get("X-Bendito-Dono") === env.OWNER_TOKEN;
      if (!dono && nIp >= PER) return j({ error: "limit_user" }, 429);
      if (!dono && nAll >= TOTAL) { return j({ error: "limit_day", notify: await avisar(env, "cheio") }, 429); }
      let b; try { b = await req.json(); } catch (e) { return j({ error: "bad_json" }, 400); }
      if (typeof b.face_image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(b.face_image) || b.face_image.length > 4e6) return j({ error: "bad_image" }, 400);
      const r = await fetch("https://api.fashn.ai/v1/run", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.FASHN_KEY },
        body: JSON.stringify({ model_name: "face-to-model", inputs: { face_image: b.face_image, aspect_ratio: "2:3", resolution: "1k", generation_mode: "fast", return_base64: true, output_format: "jpeg" } }) });
      let o = {}; try { o = await r.json(); } catch (e) {}
      if (!r.ok || !o.id) {
        const det = String((o.error && (o.error.name || o.error.message || o.error)) || r.status);
        // Sem créditos na FASHN: mostrar "provador cheio hoje" em vez de erro
        if (r.status === 402 || /credit|balance|quota|insufficient/i.test(det)) { return j({ error: "limit_day", notify: await avisar(env, "creditos") }, 429); }
        return j({ error: "fashn", detail: det }, 502);
      }
      if (!dono) {
        await env.LIMITS.put(kIp, String(nIp + 1), { expirationTtl: 172800 });
        await env.LIMITS.put(kAll, String(nAll + 1), { expirationTtl: 172800 });
        await env.LIMITS.put("job:" + o.id, kIp, { expirationTtl: 86400 });
      }
      return j({ id: o.id, left: PER - nIp - 1 });
    }
    const m = url.pathname.match(/^\/status\/([\w-]{8,80})$/);
    if (m && req.method === "GET") {
      const r = await fetch("https://api.fashn.ai/v1/status/" + m[1], { headers: { "Authorization": "Bearer " + env.FASHN_KEY } });
      let o = {}; try { o = await r.json(); } catch (e) {}
      if ((o.status || "failed") === "failed") {
        // Prova que falhou não conta para o limite da pessoa
        const k = await env.LIMITS.get("job:" + m[1]);
        if (k) { await env.LIMITS.delete("job:" + m[1]); const n = +((await env.LIMITS.get(k)) || 0); if (n > 0) await env.LIMITS.put(k, String(n - 1), { expirationTtl: 172800 }); }
      }
      return j({ status: o.status || "failed", output: o.output || null, error: o.error ? (o.error.name || o.error.message || String(o.error)) : null });
    }
    return j({ error: "not_found" }, 404);
  }
};
