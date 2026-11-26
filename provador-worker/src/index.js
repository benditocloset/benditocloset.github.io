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
    P[id[1]] = { cat: g("cat"), marca: g("marca"), nome: g("nome"), detalhe: g("detalhe"), status: g("status"), preco: pr ? +pr[1] : 0, foto: fo ? fo[1] : "" };
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
  f.set("allowed_payment_method_types[0]", "card");
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

// ===== Encomendas: a cliente cancela ou pede devolução no site (sem WhatsApp) =====
// Precisa de a chave restrita STRIPE_KEY ter também: Checkout Sessions (leitura), PaymentIntents (leitura), Charges (leitura), Refunds (escrita).
// Regras (decisão da Marianna, 26/11/2026): cancelar antes de a peça ser enviada → reembolso automático na hora.
// Devolver depois de receber → pedido registado; o reembolso sai quando a Marianna marca "Peça recebida" na página de gestão.
const DIAS_DEV = 30; // limite para pedir devolução, contado da compra (14 dias depois de receber + envio)
async function stp(env, path, method = "GET", params = null) {
  const r = await fetch("https://api.stripe.com/v1/" + path, { method, headers: { "Authorization": "Bearer " + env.STRIPE_KEY, "Content-Type": "application/x-www-form-urlencoded" }, body: params ? new URLSearchParams(params).toString() : undefined });
  const o = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((o.error && o.error.message) || ("stripe " + r.status));
  return o;
}
async function hmac(env, msg) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(env.OWNER_TOKEN || "bc")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg)));
  return [...s].slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function resumoEncomenda(env, ses) {
  const pi = typeof ses.payment_intent === "object" ? ses.payment_intent : (ses.payment_intent ? await stp(env, "payment_intents/" + ses.payment_intent + "?expand[]=latest_charge") : null);
  const ch = pi && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
  const estado = JSON.parse((await env.LIMITS.get("enc:" + ses.id)) || "{}");
  const reemb = ch ? (ch.amount_refunded >= ch.amount ? "total" : ch.amount_refunded > 0 ? "parcial" : "") : "";
  return {
    id: ses.id, ref: ses.id.slice(-8).toUpperCase(), data: new Date(ses.created * 1000).toISOString().slice(0, 10), criado: ses.created,
    total: (ses.amount_total || 0) / 100, email: (ses.customer_details && ses.customer_details.email) || "", nome: (ses.customer_details && ses.customer_details.name) || "",
    pecas: (pi && pi.description || "").replace(/^Bendito Closet · /, ""), envio: (ses.metadata && ses.metadata.envio) || "",
    last4: ch && ch.payment_method_details && ch.payment_method_details.card ? ch.payment_method_details.card.last4 : "",
    pi: pi ? pi.id : "", enviada: !!estado.enviada, devolucao: estado.devolucao || "", reembolso: reemb || estado.reembolso || ""
  };
}
async function encontrar(req, env, j) {
  if (!env.STRIPE_KEY) return j({ error: "sem_chave" }, 503);
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10), k = `enc:${day}:${ip}`, n = +((await env.LIMITS.get(k)) || 0);
  if (n >= 15) return j({ error: "limite" }, 429);
  await env.LIMITS.put(k, String(n + 1), { expirationTtl: 172800 });
  try {
    let lista = [];
    if (b.s && /^cs_(live|test)_[A-Za-z0-9]{20,}$/.test(String(b.s))) {
      const ses = await stp(env, "checkout/sessions/" + b.s);
      if (ses.payment_status === "paid") { const r = await resumoEncomenda(env, ses); if (!/^Empr[eé]stimo/i.test(r.pecas)) lista = [r]; }
    } else {
      const email = String(b.email || "").trim().toLowerCase(), l4 = String(b.last4 || "").replace(/\D/g, "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || l4.length !== 4) return j({ error: "dados" }, 400);
      const o = await stp(env, "checkout/sessions?limit=20&customer_details[email]=" + encodeURIComponent(email));
      for (const ses of (o.data || [])) {
        if (ses.payment_status !== "paid" || Date.now() / 1000 - ses.created > DIAS_DEV * 86400 || !(ses.metadata && ses.metadata.pecas)) continue;
        const r = await resumoEncomenda(env, ses);
        if (r.last4 === l4 && !/^Empr[eé]stimo/i.test(r.pecas)) lista.push(r);
      }
    }
    for (const r of lista) { r.tok = await hmac(env, "enc:" + r.id); delete r.pi; delete r.last4; }
    return j({ encomendas: lista });
  } catch (e) { return j({ error: "stripe", detail: String(e.message || e) }, 502); }
}
async function acaoCliente(req, env, j) {
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const id = String(b.id || ""), acao = String(b.acao || "");
  if (!/^cs_(live|test)_[A-Za-z0-9]{20,}$/.test(id) || b.tok !== await hmac(env, "enc:" + id) || !["cancelar", "devolver"].includes(acao)) return j({ error: "dados" }, 400);
  try {
    const ses = await stp(env, "checkout/sessions/" + id);
    const r = await resumoEncomenda(env, ses), est = JSON.parse((await env.LIMITS.get("enc:" + id)) || "{}");
    if (r.reembolso === "total") return j({ ok: true, estado: "ja_reembolsada", encomenda: r });
    if (acao === "cancelar") {
      if (r.enviada) return j({ error: "ja_enviada" }, 409);
      await stp(env, "refunds", "POST", { payment_intent: r.pi, reason: "requested_by_customer", "metadata[motivo]": "cancelada pela cliente no site" });
      est.reembolso = "total"; est.cancelada = new Date().toISOString();
      await env.LIMITS.put("enc:" + id, JSON.stringify(est));
      return j({ ok: true, estado: "cancelada", encomenda: { ...r, pi: undefined, last4: undefined, reembolso: "total" } });
    }
    if (Date.now() / 1000 - r.criado > DIAS_DEV * 86400) return j({ error: "prazo" }, 409);
    est.devolucao = "pedida"; est.motivo = String(b.motivo || "").slice(0, 500); est.pedida = new Date().toISOString();
    await env.LIMITS.put("enc:" + id, JSON.stringify(est));
    return j({ ok: true, estado: "devolucao_pedida", encomenda: { ...r, pi: undefined, last4: undefined, devolucao: "pedida" } });
  } catch (e) { return j({ error: "stripe", detail: String(e.message || e) }, 502); }
}
// Página de gestão da Marianna (link privado com o token de dona)
async function gestao(req, env, url) {
  const t = url.searchParams.get("t") || "";
  if (!env.OWNER_TOKEN || t !== env.OWNER_TOKEN) return new Response("Sem acesso", { status: 403 });
  let msg = "", avisoCliente = null;
  if (req.method === "POST") {
    const f = await req.formData(), id = String(f.get("id") || ""), acao = String(f.get("acao") || "");
    if (/^cs_(live|test)_[A-Za-z0-9]{20,}$/.test(id)) {
      const est = JSON.parse((await env.LIMITS.get("enc:" + id)) || "{}");
      try {
        if (acao === "enviada") {
          est.enviada = new Date().toISOString(); est.track = String(f.get("track") || "").trim().slice(0, 60); est.transp = String(f.get("transp") || "CTT").slice(0, 30);
          msg = "Marcada como enviada." + (est.track ? " A cliente recebe o código de seguimento por e-mail." : "");
          if (est.track) {
            const ses = await stp(env, "checkout/sessions/" + id), r = await resumoEncomenda(env, ses);
            const link = est.transp === "CTT" ? "https://www.ctt.pt/feapl_2/app/open/objectSearch/objectSearch.jspx?objects=" + encodeURIComponent(est.track) : "https://www.correosexpress.pt";
            avisoCliente = { _subject: "A sua encomenda Bendito Closet foi enviada · tracking number " + est.track, _template: "table", _captcha: "false", _cc: r.email,
              "Olá": r.nome || "", "Encomenda": r.ref, "Peças": r.pecas, "Transportadora": est.transp, "Tracking number (código de seguimento)": est.track,
              "Track your package (seguir a encomenda)": link, "App Shop": "Pode seguir a encomenda na app Shop (shop.app): cole o código em Adicionar encomenda, ou ligue o seu Gmail à app.",
              "Cancelar ou devolver": "https://benditocloset.pt/encomenda/?s=" + r.id };
          }
        }
        if (acao === "nao_enviada") { delete est.enviada; msg = "Desmarcada."; }
        if (acao === "recebida") {
          const ses = await stp(env, "checkout/sessions/" + id), r = await resumoEncomenda(env, ses);
          if (r.reembolso !== "total") await stp(env, "refunds", "POST", { payment_intent: r.pi, reason: "requested_by_customer", "metadata[motivo]": "devolução recebida" });
          est.devolucao = "recebida"; est.reembolso = "total"; msg = "Reembolso feito: " + r.total.toFixed(2) + " €.";
        }
        await env.LIMITS.put("enc:" + id, JSON.stringify(est));
      } catch (e) { msg = "Erro: " + esc(e.message || e); }
    }
  }
  let rows = "";
  try {
    const o = await stp(env, "checkout/sessions?limit=40&expand[]=data.payment_intent.latest_charge");
    for (const ses of (o.data || [])) {
      if (ses.payment_status !== "paid" || !(ses.metadata && ses.metadata.pecas) || Date.now() / 1000 - ses.created > 60 * 86400) continue;
      const r = await resumoEncomenda(env, ses);
      if (/^Empr[eé]stimo/i.test(r.pecas)) continue;
      const st = r.reembolso === "total" ? "Reembolsada" : r.devolucao === "pedida" ? "Devolução pedida" : r.enviada ? "Enviada" : "Por enviar";
      const bt = (a, l) => `<form method="post"><input type="hidden" name="id" value="${esc(r.id)}"><input type="hidden" name="acao" value="${a}"><button>${l}</button></form>`;
      const acoes = r.reembolso === "total" ? "" : (r.devolucao === "pedida" ? bt("recebida", "Peça recebida → reembolsar " + r.total.toFixed(2) + " €") : "") + (r.enviada ? bt("nao_enviada", "Desmarcar enviada") : `<form method="post"><input type="hidden" name="id" value="${esc(r.id)}"><input type="hidden" name="acao" value="enviada"><select name="transp"><option>CTT</option><option>Correos Express</option></select> <input name="track" placeholder="Código de seguimento" style="padding:8px;border:1px solid #1C1517"> <button>Marcar como enviada</button></form>`);
      rows += `<div class="o"><b>${esc(r.ref)}</b> · ${esc(r.data)} · ${r.total.toFixed(2)} €<br>${esc(r.pecas)}<br><small>${esc(r.nome)} · ${esc(r.email)} · ${esc(r.envio)}</small><br><i>${st}</i>${est_motivo(r)}<div class="a">${acoes}</div></div>`;
    }
  } catch (e) { rows = "<p>Erro ao ler a Stripe: " + esc(e.message || e) + "</p>"; }
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Encomendas · Bendito Closet</title><style>body{font:15px/1.5 system-ui,sans-serif;background:#FAF6F0;color:#1C1517;margin:0;padding:20px;max-width:720px;margin:auto}h1{font:400 30px Georgia,serif}.o{border-top:1px solid #ddd;padding:14px 0}.a{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}button{border:1px solid #1C1517;background:#fff;padding:8px 12px;font:inherit;cursor:pointer}.m{background:#fff;border:1px solid #1C1517;padding:10px}</style><h1>Encomendas</h1>${msg ? `<p class="m">${esc(msg)}</p>` : ""}${avisoCliente ? `<script>fetch("https://formsubmit.co/ajax/ola@benditocloset.pt",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:${JSON.stringify(JSON.stringify(avisoCliente)).replace(/</g, "\\u003c")}}).catch(()=>{})</script>` : ""}<p>Últimos 60 dias. Marque "enviada" quando enviar: a partir daí a cliente já não consegue cancelar sozinha, só pedir devolução.</p>${rows || "<p>Sem encomendas.</p>"}`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
function est_motivo(r) { return ""; }

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

// Assistente "Tenho uma dúvida": responde com a IA da Cloudflare (Workers AI) só com os factos do site.
// Se não souber, responde [WHATSAPP] e o site passa a conversa para o WhatsApp da Marianna.
const LINGUAS = { pt: "português de Portugal", en: "English", es: "español", fr: "français", de: "Deutsch", it: "italiano" };
async function faqTexto() {
  try {
    const t = await (await fetch("https://benditocloset.pt/faq.js?w=" + Math.floor(Date.now() / 600000), { cf: { cacheTtl: 600 } })).text();
    const a = t.indexOf("pt: {"), b = t.indexOf("en: {");
    const blk = a >= 0 && b > a ? t.slice(a, b) : "";
    return [...blk.matchAll(/\['((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\]/g)].map(m => "P: " + m[1] + "\nR: " + m[2].replace(/<br>/g, "\n").replace(/<[^>]+>/g, "").replace(/\\'/g, "'")).join("\n\n");
  } catch (e) { return ""; }
}
async function ajuda(req, env, j) {
  if (!env.AI) return j({ resposta: "[WHATSAPP]" });
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const q = String(b.q || "").trim().slice(0, 600), lang = LINGUAS[b.lang] ? b.lang : "pt", pid = String(b.peca || "");
  const hist = Array.isArray(b.hist) ? b.hist.slice(-6).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 600) })) : [];
  if (q.length < 2) return j({ error: "pergunta" }, 400);
  const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10), k = `aju:${day}:${ip}`, n = +((await env.LIMITS.get(k)) || 0);
  if (n >= 40) return j({ resposta: "[WHATSAPP]" });
  await env.LIMITS.put(k, String(n + 1), { expirationTtl: 172800 });
  const [P, faq] = await Promise.all([pecasDoSite(), faqTexto()]);
  const p = P[pid];
  const peca = p ? `PEÇA EM QUESTÃO: ${p.marca} – ${p.nome}. Descrição: ${p.detalhe || "(sem mais detalhes)"}. Preço: ${p.preco} €. Categoria: ${p.cat}. Estado: ${p.status === "vendido" ? "VENDIDA (já não está disponível)" : "disponível"}.` : "";
  const sistema = `És o assistente da loja online Bendito Closet (benditocloset.pt), um brechó de moda de marca em segunda mão em Portugal, da Marianna Werneck. Respondes SEMPRE em ${LINGUAS[lang]}, de forma curta (no máximo 3 frases), simpática e direta, a tratar a cliente por "você".
Usa APENAS os factos abaixo. Nunca inventes medidas, tamanhos, estados, prazos, preços, descontos ou políticas que não estejam escritos aqui. Não prometas nada em nome da Marianna.
Se a resposta não estiver claramente nos factos, ou se a cliente pedir medidas, mais fotos, negociar o preço, reservar, saber o estado de uma encomenda, fazer uma reclamação, devolução ou reembolso, ou falar com uma pessoa, responde exatamente e só: [WHATSAPP]
${peca}
FACTOS DA LOJA:
- Compra no site: botão «Comprar» na peça ou «Pagar o saco»; a cliente escolhe o envio e paga na Stripe (cartão, MB WAY, Multibanco, Apple Pay, Google Pay ou Klarna).
- Portes (roupa e acessórios / sapatos, malas e casacos): Portugal continental CTT 2-3 dias úteis 7 €/9 € (grátis acima de 100 €); Portugal continental Correos Express 24h 10 €/12 €; Açores e Madeira CTT 9 €/12 €; Europa DHL ou Correos Express 18 €/24 €.
- Cada peça é única. Se tem «Comprar» está disponível.
- Empréstimo de peças para editoriais e produções: até 7 dias, pedido e contrato no site em benditocloset.pt/emprestimo, caução igual ao valor das peças só retida no cartão (não cobrada), portes de ida e volta grátis.
${faq}`;
  const messages = [{ role: "system", content: sistema }, ...hist, { role: "user", content: q }];
  let resposta = "";
  try { const r = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", { messages, max_tokens: 220, temperature: 0.2 }); resposta = String((r && r.response) || "").trim(); } catch (e) { resposta = ""; }
  if (!resposta || /\[WHATSAPP\]/i.test(resposta)) resposta = "[WHATSAPP]";
  return j({ resposta });
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
    if (url.pathname === "/ajuda" && req.method === "POST") return ajuda(req, env, j);
    if (url.pathname === "/encomenda/procurar" && req.method === "POST") return encontrar(req, env, j);
    if (url.pathname === "/encomenda/acao" && req.method === "POST") return acaoCliente(req, env, j);
    if (url.pathname === "/gestao") return gestao(req, env, url);
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
