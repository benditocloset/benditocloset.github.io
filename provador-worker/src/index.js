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
  const fora = await pecasFora(env);
  for (const id of new Set(ids)) { const p = P[id]; if (!p || p.status === "vendido" || fora.colab.includes(id) || fora.emprestadas.includes(id) || !(p.preco > 0)) return j({ error: "peca", id }, 400); p.id = id; sel.push(p); }
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
  const meta = { pedido: code, ids: sel.map(p => p.id).join(",").slice(0, 490), pecas: lista.slice(0, 490), datas: fd(d1) + " a " + fd(d2), envio: PORTES_NOME[ship], caucao_eur: (cau / 100).toFixed(2), portes_eur: (portes / 100).toFixed(2) };
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
  ctt: { n: "Portugal continental · Entrega em casa com seguimento · 2 a 3 dias úteis", p: [9, 11], min: 2, max: 3, c: ["PT"], gratis: 100 },
  cex: { n: "Portugal continental · Correos Express · 24h", p: [10, 12], min: 1, max: 1, c: ["PT"] },
  ilhas: { n: "Açores e Madeira · CTT · 3 a 5 dias úteis", p: [9, 12], min: 3, max: 5, c: ["PT"] },
  eu: { n: "Europa · DHL ou Correos Express", p: [18, 24], min: 2, max: 6, c: ["ES","FR","IT","DE","NL","BE","LU","IE","AT","DK","SE","FI","PL","CZ","SK","SI","HR","HU","RO","BG","GR","CY","MT","EE","LV","LT","CH","NO","GB"] }
};
// Códigos que o site aplica sozinho → cupões da conta Bendito Closet (o cupão BF expira a 29/11 na própria Stripe)
// Jogo da memória (decisão de 27/11/2026): −5% em todas as compras, somado ao cupão de boas-vindas (1.ª compra) e à Black Friday
const CUPOES = { BENDITO10: "4PD8sCeI", BLACKFRIDAY15: "5zMdM2cY", BENDITO10BF: "Ae5VZaMp", JOGO5: "JOGO5", JOGO5BF: "JOGO5BF", BENDITO10JOGO5: "BENDITO10JOGO5", BENDITO10JOGO5BF: "BENDITO10JOGO5BF" };
// Depois da Black Friday (29/11/2026 23:59, Lisboa), os códigos com BF passam ao equivalente sem BF
const BF_FIM_MS = Date.UTC(2026, 10, 30, 0, 0, 0);
const codigoValido = c => Date.now() < BF_FIM_MS ? c : (c === "BLACKFRIDAY15" ? "" : c.replace(/BF$/, ""));
const LOCAIS = ["pt", "en", "es", "fr", "de", "it"];
// ===== Reserva e venda automáticas: cada peça só pode ser paga uma vez =====
// KV "pcs" = { <id da peça>: {s: sessão Stripe, e: e-mail, ate: reservada até (ms), v: 1 se vendida} } — uma só chave, poucas escritas
const RES_MS = 30 * 60 * 1000;
const idsDe = ses => String((ses.metadata && ses.metadata.pecas) || "").split(",").map(x => x.trim()).filter(Boolean);
async function pcsLer(env) { try { return JSON.parse((await env.LIMITS.get("pcs")) || "{}"); } catch (e) { return {}; } }
async function pcsGravar(env, m) { await env.LIMITS.put("pcs", JSON.stringify(m)); }
async function pcGet(env, id) { return (await pcsLer(env))[id] || null; }
async function pcPut(env, id, meta) { const m = await pcsLer(env); m[id] = meta; await pcsGravar(env, m); }
// resolve uma reserva que já passou do prazo: pagou → vendida; não pagou → livre. Devolve [estado, mudou]
async function pcResolver(env, m) {
  if (!m) return ["", false];
  if (m.v) return ["vendido", false];
  if (m.ate > Date.now()) return ["reservado", false];
  try {
    const ses = await stp(env, "checkout/sessions/" + m.s);
    if (ses.payment_status === "paid") { m.v = 1; delete m.ate; return ["vendido", true]; }
    if (ses.status === "open") return ["reservado", false];
  } catch (e) { return ["", false]; }
  return [null, true]; // expirou sem pagar: apagar
}
async function pcEstado(env, id, m) {
  const all = await pcsLer(env); m = all[id];
  const [st, mudou] = await pcResolver(env, m);
  if (mudou) { if (st === null) delete all[id]; else all[id] = m; await pcsGravar(env, all); }
  return st || "";
}
async function pcVendidas(env, ses) { const m = await pcsLer(env); for (const id of idsDe(ses)) m[id] = { s: ses.id, v: 1 }; await pcsGravar(env, m); }
async function pcLibertar(env, ses) { const m = await pcsLer(env); let x = false; for (const id of idsDe(ses)) if (m[id] && m[id].s === ses.id) { delete m[id]; x = true; } if (x) await pcsGravar(env, m); }
async function estadoPecas(req, env, j) {
  const all = await pcsLer(env), out = { vendidas: [], reservadas: [] }; let mudou = false;
  for (const id of Object.keys(all)) {
    const [st, mu] = await pcResolver(env, all[id]);
    if (mu) { mudou = true; if (st === null) { delete all[id]; continue; } }
    if (st === "vendido") out.vendidas.push(id); else if (st === "reservado") out.reservadas.push(id);
  }
  if (mudou) await pcsGravar(env, all);
  try { const f = await pecasFora(env); out.colab = f.colab; out.emprestadas = f.emprestadas; } catch (e) {}
  out.n = Object.keys(all).length;
  return j(out);
}
// Peças fora da loja: "colab" (a Marianna marca na gestão, KV "colab") e "emprestadas" (caução retida na Stripe, metadata ids).
// Quando a caução é libertada, a peça volta a estar disponível sozinha. Cache de 60 s para não chamar a Stripe a cada visita.
const COLAB_INICIAL = ["adidas-calca-castanha"];
async function colabLer(env) { const v = await env.LIMITS.get("colab"); try { return v ? JSON.parse(v) : COLAB_INICIAL.slice(); } catch (e) { return []; } }
async function pecasFora(env) {
  const ck = new Request("https://cache.bendito/fora"), c = caches.default;
  const hit = await c.match(ck); if (hit) return hit.json();
  const out = { colab: await colabLer(env), emprestadas: [] };
  try {
    const o = await stp(env, "payment_intents?limit=40");
    for (const pi of (o.data || [])) if (pi.status === "requires_capture" && pi.metadata && pi.metadata.ids) out.emprestadas.push(...String(pi.metadata.ids).split(",").filter(Boolean));
  } catch (e) {}
  await c.put(ck, new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json", "Cache-Control": "max-age=60" } }));
  return out;
}
async function limparCacheEstado() { try { await caches.default.delete(new Request("https://cache.bendito/fora")); } catch (e) {} }
async function comprar(req, env, j) {
  if (!env.STRIPE_KEY) return j({ error: "sem_chave" }, 503);
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const ids = Array.isArray(b.ids) ? [...new Set(b.ids.map(String))] : [];
  const e = ENVIO[String(b.ship || "")], lang = LOCAIS.includes(b.lang) ? b.lang : "pt", code = codigoValido(String(b.code || "").toUpperCase());
  if (!e || !ids.length || ids.length > 20) return j({ error: "dados" }, 400);
  const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10), k = `buy:${day}:${ip}`, n = +((await env.LIMITS.get(k)) || 0);
  if (n >= 40) return j({ error: "limite" }, 429);
  await env.LIMITS.put(k, String(n + 1), { expirationTtl: 172800 });
  const quemCompra = await quem(env, b.sessao); if (!quemCompra) return j({ error: "conta" }, 401);
  const P = await pecasDoSite(), sel = [], antigas = new Set();
  for (const id of ids) {
    const p = P[id]; if (!p || p.status === "vendido" || !(p.preco > 0)) return j({ error: "peca", id }, 409);
    { const fo = await pecasFora(env); if (fo.colab.includes(id) || fo.emprestadas.includes(id)) return j({ error: "peca", id }, 409); }
    const st = await pcEstado(env, id), m = await pcGet(env, id);
    if (st === "vendido") return j({ error: "peca", id }, 409);
    if (st === "reservado") { if (m.e !== quemCompra) return j({ error: "reservada", id }, 409); antigas.add(m.s); }
    sel.push({ id, ...p });
  }
  // a mesma cliente a abrir o pagamento outra vez: fecha o pagamento anterior para não pagar duas vezes
  for (const sid of antigas) { try { await stp(env, "checkout/sessions/" + sid + "/expire", "POST"); } catch (e) {} }
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
  f.set("expires_at", String(Math.floor((Date.now() + RES_MS) / 1000) + 10));
  const cus = await clienteStripe(env, quemCompra, e.c);
  if (cus) { f.set("customer", cus); f.set("customer_update[shipping]", "auto"); f.set("customer_update[name]", "auto"); }
  else f.set("customer_email", quemCompra);
  if (CUPOES[code]) f.set("discounts[0][coupon]", CUPOES[code]); else f.set("allow_promotion_codes", "true");
  const lista = sel.map(p => p.id).join(",");
  f.set("metadata[pecas]", lista.slice(0, 490)); f.set("metadata[envio]", e.n); f.set("metadata[portes_eur]", String(portes));
  f.set("payment_intent_data[metadata][pecas]", lista.slice(0, 490)); f.set("payment_intent_data[metadata][envio]", e.n);
  f.set("payment_intent_data[description]", "Bendito Closet · " + sel.map(p => p.marca + " " + p.nome).join("; ").slice(0, 300));
  const r = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { "Authorization": "Bearer " + env.STRIPE_KEY, "Content-Type": "application/x-www-form-urlencoded" }, body: f.toString() });
  const o = await r.json();
  if (!r.ok || !o.url) return j({ error: "stripe", detail: o.error && o.error.message }, 502);
  let resOk = true;
  try { const m = await pcsLer(env); for (const p of sel) m[p.id] = { s: o.id, e: quemCompra, ate: Date.now() + RES_MS }; await pcsGravar(env, m); } catch (e) { resOk = String(e.message || e); }
  try {
    await somar(env, "checkout");
    const pcs = sel.map(p => p.marca + " – " + p.nome + " (" + p.preco + " €)").join("; ");
    await mail(env, "ola@benditocloset.pt", "Alguém está a pagar no site · " + (sub + portes) + " €", moldura("Pagamento aberto no site", `<p><b>${esc(quemCompra)}</b> abriu o pagamento com cartão.</p><p><b>Peças:</b> ${esc(pcs)}<br><b>Portes:</b> ${portes} €</p><p>Se pagar, recebe o e-mail "Nova encomenda". Se não pagar, as peças voltam a ficar livres sozinhas.</p>`), quemCompra + " abriu o pagamento: " + pcs);
  } catch (e) {}
  return j({ url: o.url, subtotal: sub, portes, pre: !!cus, res: resOk });
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
    total: (ses.amount_total || 0) / 100, portes: ((ses.total_details && ses.total_details.amount_shipping) || 0) / 100, email: (ses.customer_details && ses.customer_details.email) || "", nome: (ses.customer_details && ses.customer_details.name) || "",
    pecas: (pi && pi.description || "").replace(/^Bendito Closet · /, ""), envio: (ses.metadata && ses.metadata.envio) || "",
    last4: ch && ch.payment_method_details && ch.payment_method_details.card ? ch.payment_method_details.card.last4 : "",
    pi: pi ? pi.id : "", recibo: (ch && ch.receipt_url) || "", enviada: !!estado.enviada, enviadaEm: estado.enviada || "", track: estado.track || "", transp: estado.transp || "", problema: estado.problema ? (estado.problema.estado || "pedido") : "", devolucao: estado.devolucao || "", reembolso: estado.reembolso === "total" ? "total" : (reemb || estado.reembolso || "")
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
  if (!/^cs_(live|test)_[A-Za-z0-9]{20,}$/.test(id) || b.tok !== await hmac(env, "enc:" + id) || !["cancelar", "devolver", "problema"].includes(acao)) return j({ error: "dados" }, 400);
  try {
    const ses = await stp(env, "checkout/sessions/" + id);
    const r = await resumoEncomenda(env, ses), est = JSON.parse((await env.LIMITS.get("enc:" + id)) || "{}");
    if (r.reembolso === "total") return j({ ok: true, estado: "ja_reembolsada", encomenda: r });
    if (acao === "cancelar") {
      if (r.enviada) return j({ error: "ja_enviada" }, 409);
      await stp(env, "refunds", "POST", { payment_intent: r.pi, reason: "requested_by_customer", "metadata[motivo]": "cancelada pela cliente no site" });
      est.reembolso = "total"; est.cancelada = new Date().toISOString();
      await pcLibertar(env, ses); await limparCacheEstado();
      await env.LIMITS.put("enc:" + id, JSON.stringify(est));
      return j({ ok: true, estado: "cancelada", encomenda: { ...r, pi: undefined, last4: undefined, reembolso: "total" } });
    }
    if (acao === "problema") return problemaEntrega(env, j, b, ses, r, est);
    if (Date.now() / 1000 - r.criado > DIAS_DEV * 86400) return j({ error: "prazo" }, 409);
    est.devolucao = "pedida"; est.motivo = String(b.motivo || "").slice(0, 500); est.pedida = new Date().toISOString();
    await env.LIMITS.put("enc:" + id, JSON.stringify(est));
    return j({ ok: true, estado: "devolucao_pedida", encomenda: { ...r, pi: undefined, last4: undefined, devolucao: "pedida" } });
  } catch (e) { return j({ error: "stripe", detail: String(e.message || e) }, 502); }
}
// ===== Problema com a entrega (não chegou, danificada, peça errada) =====
// Travões contra burla: só depois de enviada; "não chegou" só 7 dias depois do envio; um pedido por encomenda;
// conta os pedidos anteriores do mesmo e-mail; o reembolso é sempre a dona que confirma na página de gestão.
const DIAS_PROB = 7, TIPOS_PROB = { nao_chegou: "Não chegou", danificada: "Chegou danificada", errada: "Peça errada" };
function linkTrack(transp, track) { return !track ? "" : transp === "CTT" ? "https://www.ctt.pt/feapl_2/app/open/objectSearch/objectSearch.jspx?objects=" + encodeURIComponent(track) : "https://www.correosexpress.pt"; }
async function problemaEntrega(env, j, b, ses, r, est) {
  const tipo = String(b.tipo || "");
  if (!TIPOS_PROB[tipo]) return j({ error: "dados" }, 400);
  if (!r.enviada) return j({ error: "nao_enviada" }, 409);
  if (est.problema) return j({ error: "ja_pedido" }, 409);
  if (Date.now() / 1000 - r.criado > 60 * 86400) return j({ error: "prazo" }, 409);
  const dias = (Date.now() - Date.parse(est.enviada)) / 86400000;
  if (tipo === "nao_chegou" && dias < DIAS_PROB) return j({ error: "cedo", dias: Math.ceil(DIAS_PROB - dias) }, 409);
  const ke = "prob:" + (r.email || "").toLowerCase(), antes = +((await env.LIMITS.get(ke)) || 0);
  await env.LIMITS.put(ke, String(antes + 1), { expirationTtl: 400 * 86400 });
  est.problema = { tipo, motivo: String(b.motivo || "").slice(0, 600), quando: new Date().toISOString(), estado: "pedido", antes };
  await env.LIMITS.put("enc:" + r.id, JSON.stringify(est));
  const tl = linkTrack(est.transp, est.track), eur = v => v.toFixed(2).replace(".", ",") + " €";
  if (env.RESEND_KEY) {
    await mail(env, "ola@benditocloset.pt", "Problema com a entrega · " + r.ref + " · " + TIPOS_PROB[tipo],
      moldura("Problema com a entrega · " + esc(r.ref), `<p><b>${esc(TIPOS_PROB[tipo])}</b></p><p>${esc(r.nome)} · ${esc(r.email)}<br><b>Peças:</b> ${esc(r.pecas)}<br><b>Total:</b> ${eur(r.total)}<br><b>Enviada:</b> ${esc(String(est.enviada).slice(0, 10))} (${Math.floor(dias)} dias) · ${esc(est.transp || "")} ${esc(est.track || "sem código")}</p>${est.problema.motivo ? `<p><b>O que a cliente escreveu:</b><br>${esc(est.problema.motivo)}</p>` : ""}<p><b>Pedidos anteriores deste e-mail:</b> ${antes}${antes ? " ⚠ atenção" : ""}</p><p>Antes de reembolsar: veja o seguimento${tipo !== "nao_chegou" ? " e peça fotos à cliente (pode responder a este e-mail)" : ""}. Depois abra a sua página de gestão das encomendas e carregue em <b>Reembolsar</b> ou <b>Não reembolsar</b>.</p>${tl ? botao(tl, "Ver o seguimento") : ""}`),
      "Problema com a entrega " + r.ref + " · " + TIPOS_PROB[tipo] + "\n" + r.nome + " · " + r.email + "\n" + r.pecas + "\nPedidos anteriores: " + antes, r.email);
    if (r.email) await mail(env, r.email, "Recebemos o seu pedido · encomenda " + r.ref,
      moldura("Recebemos o seu pedido", `<p>Olá${r.nome ? " " + esc(r.nome.split(" ")[0]) : ""},</p><p>Registámos o problema com a encomenda <b>${esc(r.ref)}</b> (${esc(TIPOS_PROB[tipo].toLowerCase())}). Vamos verificar com a transportadora e respondemos em até 2 dias úteis.${tipo !== "nao_chegou" ? " Para ajudar, responda a este e-mail com fotos da peça e da embalagem." : ""}</p><p>Se tiver direito a reembolso, ele é feito para o meio de pagamento que usou.</p>`),
      "Registámos o problema com a encomenda " + r.ref + ". Respondemos em até 2 dias úteis.");
  }
  return j({ ok: true, estado: "problema_pedido", encomenda: { ...r, pi: undefined, last4: undefined, problema: "pedido" } });
}
// Etiqueta de devolução para imprimir (a morada de devolução fica guardada no KV, não no código público)
async function etiqueta(env, url) {
  const id = url.searchParams.get("id") || "", tok = url.searchParams.get("tok") || "";
  if (!/^cs_(live|test)_[A-Za-z0-9]{20,}$/.test(id) || tok !== await hmac(env, "enc:" + id)) return new Response("Link inválido", { status: 403 });
  const morada = (await env.LIMITS.get("cfg:morada")) || "";
  let ses; try { ses = await stp(env, "checkout/sessions/" + id); } catch (e) { return new Response("Erro", { status: 502 }); }
  const sd = (ses.collected_information && ses.collected_information.shipping_details) || ses.shipping_details || {}, a = sd.address || {};
  const rem = [sd.name || (ses.customer_details && ses.customer_details.name) || "", [a.line1, a.line2].filter(Boolean).join(", "), [a.postal_code, a.city].filter(Boolean).join(" "), a.country || ""].filter(Boolean);
  const ref = id.slice(-8).toUpperCase();
  if (url.searchParams.get("tipo") === "envio") {
    const tel = (ses.customer_details && ses.customer_details.phone) || "";
    return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Etiqueta de envio ${ref}</title><style>body{font:15px/1.45 Helvetica,Arial,sans-serif;color:#111;margin:0;padding:24px;background:#fff}.e{border:2px solid #111;max-width:560px;margin:auto;padding:22px}.k{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#555;margin:14px 0 4px}.big{font-size:22px;font-weight:600}h1{font:400 26px Georgia,serif;margin:0 0 4px}button{margin:18px auto;display:block;border:1px solid #111;background:#111;color:#fff;padding:12px 20px;font:inherit;cursor:pointer}@media print{button{display:none}body{padding:0}}</style><div class="e"><h1>Bendito Closet</h1><div>Encomenda ${esc(ref)}</div><div class="k">Destinatário</div><div class="big">${rem.map(esc).join("<br>")}${tel ? "<br><small>" + esc(tel) + "</small>" : ""}</div><div class="k">Remetente</div><div style="white-space:pre-line">${esc(morada)}</div></div><button onclick="print()">Imprimir</button>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Etiqueta de devolução ${ref}</title><style>body{font:15px/1.45 Helvetica,Arial,sans-serif;color:#111;margin:0;padding:24px;background:#fff}.e{border:2px solid #111;max-width:560px;margin:auto;padding:22px}.k{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#555;margin:14px 0 4px}.big{font-size:20px;font-weight:600;white-space:pre-line}h1{font:400 26px Georgia,serif;margin:0 0 4px}.n{border-top:1px dashed #999;margin-top:18px;padding-top:12px;font-size:13px}button{margin:18px auto;display:block;border:1px solid #111;background:#111;color:#fff;padding:12px 20px;font:inherit;cursor:pointer}@media print{button{display:none}body{padding:0}}</style><div class="e"><h1>Devolução · Bendito Closet</h1><div>Encomenda ${esc(ref)}</div><div class="k">Destinatário</div><div class="big">${esc(morada || "(morada de devolução por configurar)")}</div><div class="k">Remetente</div><div>${rem.map(esc).join("<br>")}</div><div class="n">Portes da devolução pagos pelo remetente. Entregue nos CTT ou na Correos Express e guarde o comprovativo com o código de seguimento. Prazo: 14 dias depois de receber a encomenda. Peça a devolução antes em benditocloset.pt/encomenda.</div></div><button onclick="print()">Imprimir</button>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
async function confirmar(req, env, j) {
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const id = String(b.s || "");
  if (!/^cs_(live|test)_[A-Za-z0-9]{20,}$/.test(id)) return j({ error: "dados" }, 400);
  try {
    const ses = await stp(env, "checkout/sessions/" + id);
    if (ses.payment_status !== "paid") return j({ error: "nao_paga" }, 409);
    const r = await resumoEncomenda(env, ses);
    if (r.reembolso !== "total") { await pcVendidas(env, ses); await limparCacheEstado(); }
    if (/^Empr[eé]stimo/i.test(r.pecas)) return j({ error: "dados" }, 400);
    const k = "conf:" + id, dup = !!(await env.LIMITS.get(k));
    if (!dup) await env.LIMITS.put(k, "1", { expirationTtl: 90 * 86400 });
    const tok = await hmac(env, "enc:" + id);
    const links = { encomenda: "https://benditocloset.pt/encomenda/?s=" + id, devolucao: W + "/etiqueta?id=" + encodeURIComponent(id) + "&tok=" + tok };
    let enviado = false;
    if (!dup && env.RESEND_KEY && r.email) {
      const m = emailCompra(r, links, b.lang === "pt" ? "pt" : (LOCAIS.includes(b.lang) ? "en" : "pt"));
      enviado = await mail(env, r.email, m.assunto, m.html, m.texto);
      await mail(env, "ola@benditocloset.pt", "Nova encomenda " + r.ref + " · " + r.total.toFixed(2).replace(".", ",") + " €",
        moldura("Nova encomenda " + esc(r.ref), `<p>${esc(r.nome)} · ${esc(r.email)}</p><p><b>Peças:</b> ${esc(r.pecas)}<br><b>Envio:</b> ${esc(r.envio)}<br><b>Total:</b> ${r.total.toFixed(2).replace(".", ",")} €</p><p>A cliente recebeu o recibo, o link da encomenda e a etiqueta de devolução. As etiquetas de envio e de devolução para imprimir estão na sua página de gestão.</p>${botao(W + "/etiqueta?id=" + encodeURIComponent(id) + "&tok=" + tok + "&tipo=envio", "Etiqueta de envio")}`),
        "Nova encomenda " + r.ref + "\n" + r.nome + " · " + r.email + "\n" + r.pecas + "\n" + r.envio + "\nTotal: " + r.total.toFixed(2) + " €");
    }
    return j({ dup, enviado, ref: r.ref, email: r.email, nome: r.nome, pecas: r.pecas, total: r.total, envio: r.envio,
      devolucao: links.devolucao, encomenda: links.encomenda });
  } catch (e) { return j({ error: "stripe" }, 502); }
}
// ===== E-mails do site pelo Resend, de ola@benditocloset.pt (segredo RESEND_KEY na Cloudflare) =====
const W = "https://bendito-provador-ia.nn45hn9bvr.workers.dev";
async function mail(env, to, assunto, html, texto, responder) {
  if (!env.RESEND_KEY || !to) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "Authorization": "Bearer " + env.RESEND_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Bendito Closet <ola@benditocloset.pt>", to: [to], reply_to: responder || "ola@benditocloset.pt", subject: assunto, html, text: texto }) });
    return r.ok;
  } catch (e) { return false; }
}
// Estatísticas anónimas do site: só contagens por dia (sem IP, sem e-mail, sem cookies)
const EV_SITE = ["vis", "pv", "provador", "jogo", "saco", "whatsapp", "cartao", "popup", "fav"];
const diaLx = (d = new Date()) => d.toLocaleDateString("sv-SE", { timeZone: "Europe/Lisbon" });
// Uma chave por contador (st:<dia>:<evento>), para dois cliques ao mesmo tempo não se apagarem um ao outro
async function somar(env, ev, pagina) {
  const k = "st:" + diaLx() + ":" + ev + (pagina ? ":" + pagina : "");
  const n = +((await env.LIMITS.get(k)) || 0);
  await env.LIMITS.put(k, String(n + 1), { expirationTtl: 400 * 86400 });
}
async function evento(req, env) {
  const origin = req.headers.get("Origin") || "";
  if (!ALLOWED.includes(origin)) return new Response(null, { status: 204 });
  let b = {}; try { b = JSON.parse(await req.text()); } catch (e) {}
  const evs = (Array.isArray(b.e) ? b.e : [b.e]).map(String).filter(x => EV_SITE.includes(x)).slice(0, 3);
  let p = String(b.p || "/").toLowerCase().replace(/[^a-z0-9/_-]/g, "").slice(0, 40);
  p = p.split("/").filter(Boolean)[0] || "inicio";
  for (const ev of evs) { await somar(env, ev); if (ev === "pv") await somar(env, "pg", p); }
  return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": origin } });
}
async function creditosFashn(env) {
  try { const r = await fetch("https://api.fashn.ai/v1/credits", { headers: { "Authorization": "Bearer " + env.FASHN_KEY } }); const o = await r.json(); return o && o.credits ? o.credits.total : null; } catch (e) { return null; }
}
async function contasTotal(env) {
  let n = 0, cursor; try { do { const l = await env.LIMITS.list({ prefix: "cli:", cursor }); n += l.keys.length; cursor = l.list_complete ? null : l.cursor; } while (cursor); } catch (e) { return null; }
  return n;
}
async function resumoDia(env, dia) {
  dia = dia || diaLx();
  const o = { pg: {} };
  try {
    const l = await env.LIMITS.list({ prefix: "st:" + dia + ":" });
    for (const k of l.keys) {
      const partes = k.name.split(":"), v = +((await env.LIMITS.get(k.name)) || 0);
      if (partes[2] === "pg") o.pg[partes[3]] = v; else o[partes[2]] = v;
    }
  } catch (e) {}
  const provador = +((await env.LIMITS.get("all:" + dia)) || 0);
  let pagos = 0, valor = 0, abertos = 0;
  if (env.STRIPE_KEY) try {
    const ini = Math.floor(new Date(dia + "T00:00:00Z").getTime() / 1000) - 3600;
    const l = await stp(env, "checkout/sessions?limit=100&created[gte]=" + ini);
    for (const ses of (l.data || [])) {
      if (!(ses.metadata && ses.metadata.pecas) || diaLx(new Date(ses.created * 1000)) !== dia) continue;
      if (/^Empr/i.test(ses.metadata.pecas)) continue;
      if (ses.payment_status === "paid") { pagos++; valor += (ses.amount_total || 0) / 100; } else abertos++;
    }
  } catch (e) {}
  return { dia, vis: o.vis || 0, pv: o.pv || 0, pg: o.pg || {}, provador, provadorClick: o.provador || 0, jogo: o.jogo || 0, saco: o.saco || 0, fav: o.fav || 0,
    whatsapp: o.whatsapp || 0, cartao: o.cartao || 0, popup: o.popup || 0, checkout: o.checkout || 0, contaNova: o.conta_nova || 0,
    pagos, valor, abertos, creditos: await creditosFashn(env), contas: await contasTotal(env) };
}
function resumoHtml(r) {
  const eur = v => v.toFixed(2).replace(".", ",") + " €";
  const linhas = [
    ["Visitantes (pessoas diferentes)", r.vis], ["Páginas vistas", r.pv],
    ["Provador com IA: fotos geradas", r.provador], ["Jogo da memória: jogos terminados", r.jogo],
    ["Peças adicionadas ao saco", r.saco], ["Peças marcadas como favoritas", r.fav], ["Cliques no WhatsApp", r.whatsapp], ["Cliques em pagar com cartão", r.cartao],
    ["Inscrições no pop-up dos 10%", r.popup], ["Contas novas", r.contaNova], ["Pagamentos com cartão abertos", r.checkout],
    ["Vendas pagas", r.pagos + (r.pagos ? " · " + eur(r.valor) : "")],
    ["Contas no site (total)", r.contas == null ? "—" : r.contas],
    ["Créditos do provador (FASHN) que restam", r.creditos == null ? "—" : r.creditos]
  ];
  const top = Object.entries(r.pg).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, n]) => `${p}: ${n}`).join(" · ");
  const tab = linhas.map(([a, b]) => `<tr><td style="padding:6px 12px 6px 0;border-bottom:1px solid #EFE7DD">${esc(a)}</td><td style="padding:6px 0;border-bottom:1px solid #EFE7DD;text-align:right"><b>${esc(String(b))}</b></td></tr>`).join("");
  const html = `<table style="width:100%;border-collapse:collapse;font-size:15px">${tab}</table>` + (top ? `<p style="font-size:13px;color:#6F625C">Páginas mais vistas: ${esc(top)}</p>` : "") +
    `<p style="font-size:12px;color:#8a7d76">Visitantes e cliques contam todas as pessoas, aceitem ou não os cookies (contagem anónima, sem dados pessoais).</p>`;
  const txt = linhas.map(([a, b]) => a + ": " + b).join("\n") + (top ? "\nPáginas mais vistas: " + top : "");
  return { html, txt };
}
async function enviarResumo(env, dia) {
  const r = await resumoDia(env, dia), h = resumoHtml(r);
  const d = r.dia.split("-").reverse().join("/");
  await mail(env, "ola@benditocloset.pt", `Resumo do dia ${d}: ${r.vis} visitantes · ${r.pagos} vendas`, moldura("Resumo do dia " + esc(d), h.html), "Resumo do dia " + d + "\n\n" + h.txt);
  return r;
}
function moldura(titulo, corpo) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#F7F3EC;padding:26px 12px;font-family:Helvetica,Arial,sans-serif;color:#1C1517;font-size:15px;line-height:1.55"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #1C1517"><tr><td style="padding:30px 26px"><div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:.34em;text-transform:uppercase;text-align:center">Bendito Closet</div><h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.25;margin:22px 0 16px;text-align:center">${titulo}</h1>${corpo}</td></tr></table><p style="font-size:11px;color:#6F625C;margin:14px 0 0;letter-spacing:.08em">benditocloset.pt</p></td></tr></table></body></html>`;
}
const botao = (href, txt) => `<p style="text-align:center;margin:22px 0"><a href="${esc(href)}" style="display:inline-block;border:1px solid #1C1517;padding:13px 24px;color:#1C1517;text-decoration:none;font-size:12px;letter-spacing:.16em;text-transform:uppercase">${esc(txt)}</a></p>`;
const eurTxt = v => Number(v || 0).toFixed(2).replace(".", ",") + " €";
const ETXT = {
  pt: { a: r => "Encomenda " + r.ref + " confirmada · Bendito Closet", t: "Obrigada pela sua compra", ola: n => "Olá" + (n ? " " + n.split(" ")[0] : "") + ",", p1: "A sua encomenda está confirmada. Assim que for enviada, recebe outro e-mail com o código de seguimento (tracking number), que também pode seguir na app Shop.",
    enc: "Encomenda", pec: "Peças", env: "Envio", tot: "Total pago", rec: "Ver o recibo do pagamento", ver: "Ver, cancelar ou devolver",
    canT: "Cancelar", can: "Enquanto a encomenda não for enviada, pode cancelá-la no botão acima. O reembolso é automático.",
    devT: "Devolver", dev: ["Tem 14 dias depois de receber para pedir a devolução, no botão acima.", "Use a etiqueta de devolução: está no link abaixo e também vai impressa dentro da caixa.", "Entregue a encomenda nos CTT ou na Correos Express. Os portes da devolução são pagos por si, no balcão.", "Quando a peça chegar, fazemos o reembolso. A peça tem de voltar no mesmo estado."], recusa: "Se a encomenda for recusada ou não for levantada, o reembolso é feito sem os portes.",
    etq: "Etiqueta de devolução", conta: "Crie a sua conta com este e-mail para ver todas as suas encomendas e comprar mais depressa:", contaB: "A minha conta" },
  en: { a: r => "Order " + r.ref + " confirmed · Bendito Closet", t: "Thank you for your order", ola: n => "Hello" + (n ? " " + n.split(" ")[0] : "") + ",", p1: "Your order is confirmed. As soon as it ships, you'll get another email with the tracking number, which you can also follow in the Shop app.",
    enc: "Order", pec: "Items", env: "Shipping", tot: "Total paid", rec: "View your payment receipt", ver: "View, cancel or return",
    canT: "Cancel", can: "Until your order ships, you can cancel it with the button above. The refund is automatic.",
    devT: "Return", dev: ["You have 14 days after delivery to request a return, with the button above.", "Use the return label: it's at the link below and a printed copy also goes inside the box.", "Drop the parcel at CTT or Correos Express. Return shipping is paid by you at the counter.", "When the piece arrives, we refund you. It must come back in the same condition."], recusa: "If the order is refused or not collected, the refund is made without the shipping cost.",
    etq: "Return label", conta: "Create your account with this email to see all your orders and check out faster:", contaB: "My account" }
};
function emailCompra(r, links, lang) {
  const t = ETXT[lang] || ETXT.pt;
  const linha = (k, v) => `<tr><td style="padding:7px 0;border-bottom:1px solid #E2D8CC;color:#6F625C;font-size:13px;width:36%;vertical-align:top">${esc(k)}</td><td style="padding:7px 0;border-bottom:1px solid #E2D8CC;vertical-align:top">${esc(v)}</td></tr>`;
  const html = moldura(esc(t.t), `<p>${esc(t.ola(r.nome))}</p><p>${esc(t.p1)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">${linha(t.enc, r.ref)}${linha(t.pec, r.pecas)}${linha(t.env, r.envio)}${linha(t.tot, eurTxt(r.total))}</table>
${r.recibo ? `<p style="text-align:center"><a href="${esc(r.recibo)}" style="color:#1C1517">${esc(t.rec)}</a></p>` : ""}
${botao(links.encomenda, t.ver)}
<p style="font-family:Georgia,serif;font-size:19px;margin:24px 0 6px">${esc(t.canT)}</p><p>${esc(t.can)}</p>
<p style="font-family:Georgia,serif;font-size:19px;margin:24px 0 6px">${esc(t.devT)}</p><ol style="padding-left:20px;margin:0">${t.dev.map(x => `<li style="margin:0 0 6px">${esc(x)}</li>`).join("")}</ol><p style="font-size:14px;color:#6F625C;margin-top:10px">${esc(t.recusa)}</p>
${botao(links.devolucao, t.etq)}
<p style="border-top:1px solid #E2D8CC;padding-top:16px;font-size:14px;color:#6F625C">${esc(t.conta)} <a href="https://benditocloset.pt/conta/" style="color:#1C1517">${esc(t.contaB)}</a></p>`);
  const texto = [t.ola(r.nome), "", t.p1, "", t.enc + ": " + r.ref, t.pec + ": " + r.pecas, t.env + ": " + r.envio, t.tot + ": " + eurTxt(r.total), r.recibo ? t.rec + ": " + r.recibo : "", "", t.ver + ": " + links.encomenda, "", t.canT + ": " + t.can, "", t.devT + ":", ...t.dev.map((x, i) => (i + 1) + ") " + x), t.recusa, "", t.etq + ": " + links.devolucao, "", t.conta + " https://benditocloset.pt/conta/"].join("\n");
  return { assunto: t.a(r), html, texto };
}
function emailEnviada(r, est, link, etq) {
  const html = moldura("A sua encomenda foi enviada", `<p>Olá${r.nome ? " " + esc(r.nome.split(" ")[0]) : ""},</p><p>A encomenda <b>${esc(r.ref)}</b> já está a caminho (${esc(r.pecas)}).</p>
<p style="text-align:center;margin:20px 0 4px;color:#6F625C;font-size:12px;letter-spacing:.2em;text-transform:uppercase">${esc(est.transp)} · Tracking number</p><p style="text-align:center;font-family:Georgia,serif;font-size:24px;margin:0">${esc(est.track)}</p>
${botao(link, "Seguir a encomenda")}
<p>Também pode seguir a encomenda na app Shop (shop.app): toque em adicionar encomenda e cole o código, ou ligue o seu e-mail à app.</p>
<p style="border-top:1px solid #E2D8CC;padding-top:16px;font-size:14px;color:#6F625C">Se quiser devolver: peça a devolução em <a href="https://benditocloset.pt/encomenda/?s=${esc(r.id)}" style="color:#1C1517">A minha encomenda</a> até 14 dias depois de receber, use a <a href="${esc(etq)}" style="color:#1C1517">etiqueta de devolução</a> (também vai impressa dentro da caixa) e entregue nos CTT ou na Correos Express. Os portes da devolução são pagos por si.</p>`);
  const texto = `A encomenda ${r.ref} foi enviada.\nTransportadora: ${est.transp}\nTracking number: ${est.track}\nSeguir: ${link}\nTambém pode seguir na app Shop (shop.app).\n\nDevolver: https://benditocloset.pt/encomenda/?s=${r.id}\nEtiqueta de devolução: ${etq}\nOs portes da devolução são pagos pela cliente.`;
  return { assunto: "A sua encomenda Bendito Closet foi enviada · tracking number " + est.track, html, texto };
}

// Cliente na Stripe com a morada da conta: o pagamento abre com nome, telemóvel e morada preenchidos.
// Precisa de "Customers: escrita" na chave restrita; sem isso, o pagamento abre só com o e-mail preenchido.
async function clienteStripe(env, email, paises) {
  try {
    const p = JSON.parse((await env.LIMITS.get("cli:" + email)) || "{}");
    const prm = { email };
    if (p.nome) prm.name = p.nome;
    if (p.tel) prm.phone = p.tel;
    const pais = /^[A-Z]{2}$/.test(p.pais || "") ? p.pais : (/portugal/i.test(p.pais || "") ? "PT" : "");
    if (p.nome && p.l1 && p.cp && p.cidade && pais && paises.includes(pais)) {
      prm["shipping[name]"] = p.nome; if (p.tel) prm["shipping[phone]"] = p.tel;
      prm["shipping[address][line1]"] = p.l1; if (p.l2) prm["shipping[address][line2]"] = p.l2;
      prm["shipping[address][postal_code]"] = p.cp; prm["shipping[address][city]"] = p.cidade; prm["shipping[address][country]"] = pais;
    }
    if (p.cus) { await stp(env, "customers/" + p.cus, "POST", prm); return p.cus; }
    const c = await stp(env, "customers", "POST", { ...prm, "metadata[origem]": "conta benditocloset.pt" });
    p.cus = c.id; await env.LIMITS.put("cli:" + email, JSON.stringify(p));
    return c.id;
  } catch (e) { return ""; }
}
// ===== Conta de cliente: entrar com um link enviado por e-mail (sem palavra-passe) =====
const rnd = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, "0")).join("");
const emailOk = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length < 200;
async function quem(env, s) { s = String(s || ""); return /^[a-f0-9]{64}$/.test(s) ? ((await env.LIMITS.get("sess:" + s)) || "") : ""; }
const LTXT = {
  pt: { c: "O seu código", a: "Entrar na sua conta · Bendito Closet", t: "Entrar na sua conta", p: "Escreva o código no site, ou toque no botão para entrar. Vale durante 30 minutos.", b: "Entrar", n: "Se não foi a Mari que pediu este e-mail, pode ignorá-lo." },
  en: { c: "Your code", a: "Sign in to your account · Bendito Closet", t: "Sign in to your account", p: "Type the code on the website, or tap the button to sign in. Valid for 30 minutes.", b: "Sign in", n: "If you didn't request this email, you can ignore it." },
  es: { c: "Tu código", a: "Entrar en tu cuenta · Bendito Closet", t: "Entrar en tu cuenta", p: "Escribe el código en la web o pulsa el botón para entrar. Vale 30 minutos.", b: "Entrar", n: "Si no has pedido este correo, puedes ignorarlo." },
  fr: { c: "Votre code", a: "Connexion à votre compte · Bendito Closet", t: "Connexion à votre compte", p: "Saisissez le code sur le site, ou touchez le bouton pour vous connecter. Valable 30 minutes.", b: "Me connecter", n: "Si vous n'avez pas demandé cet e-mail, ignorez-le." },
  de: { c: "Ihr Code", a: "Anmeldung bei deinem Konto · Bendito Closet", t: "Bei deinem Konto anmelden", p: "Geben Sie den Code auf der Website ein oder tippen Sie auf den Button. 30 Minuten gültig.", b: "Anmelden", n: "Wenn du diese E-Mail nicht angefordert hast, kannst du sie ignorieren." },
  it: { c: "Il tuo codice", a: "Accedi al tuo account · Bendito Closet", t: "Accedi al tuo account", p: "Scrivi il codice sul sito o tocca il pulsante per accedere. Vale 30 minuti.", b: "Accedi", n: "Se non hai richiesto questa e-mail, puoi ignorarla." }
};
LTXT.pt.n = "Se não pediu este e-mail, pode ignorá-lo.";
const BTXT = {
  pt: ["A sua conta Bendito Closet está criada", "Bem-vinda", "A partir de agora, sempre que entrar com este e-mail, vê todas as suas encomendas num só sítio, cancela ou pede devoluções sem procurar nada, e o pagamento já abre com os seus dados.", "Guarde a sua morada na conta para não ter de a escrever de novo.", "Ver a minha conta"],
  en: ["Your Bendito Closet account is ready", "Welcome", "From now on, whenever you sign in with this email, you'll see all your orders in one place, cancel or request returns without searching, and checkout opens with your details.", "Save your address in your account so you don't have to type it again.", "Go to my account"]
};
async function abrirSessao(env, email, lang) {
  const s = rnd(32); await env.LIMITS.put("sess:" + s, email, { expirationTtl: 90 * 86400 });
  if (!(await env.LIMITS.get("cli:" + email))) {
    await env.LIMITS.put("cli:" + email, JSON.stringify({ criado: new Date().toISOString() }));
    try { await somar(env, "conta_nova"); await mail(env, "ola@benditocloset.pt", "Nova conta no site: " + email, moldura("Nova conta no site", `<p>Acabou de criar conta: <b>${esc(email)}</b></p><p>Língua: ${esc(String(lang || "pt"))}</p>`), "Nova conta no site: " + email); } catch (e) {}
    const t = BTXT[lang === "pt" ? "pt" : "en"];
    await mail(env, email, t[0], moldura(esc(t[1]), `<p>${esc(t[2])}</p><p>${esc(t[3])}</p>${botao("https://benditocloset.pt/conta/", t[4])}`), t[1] + "\n\n" + t[2] + "\n" + t[3] + "\nhttps://benditocloset.pt/conta/");
  }
  return s;
}
async function contaCodigo(req, env, j) {
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const email = String(b.email || "").trim().toLowerCase(), c = String(b.codigo || "").replace(/\D/g, "");
  if (!emailOk(email) || c.length !== 6) return j({ error: "dados" }, 400);
  const raw = await env.LIMITS.get("cod:" + email); if (!raw) return j({ error: "expirado" }, 410);
  const r = JSON.parse(raw);
  if (r.c !== c) {
    r.n++; if (r.n >= 5) { await env.LIMITS.delete("cod:" + email); return j({ error: "expirado" }, 410); }
    await env.LIMITS.put("cod:" + email, JSON.stringify(r), { expirationTtl: 1800 }); return j({ error: "codigo" }, 400);
  }
  await env.LIMITS.delete("cod:" + email); if (r.tok) await env.LIMITS.delete("login:" + r.tok);
  return j({ sessao: await abrirSessao(env, email, b.lang), email });
}
async function contaEntrar(req, env, j) {
  if (!env.RESEND_KEY) return j({ error: "sem_email" }, 503);
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const email = String(b.email || "").trim().toLowerCase(), lang = LTXT[b.lang] ? b.lang : "pt";
  if (!emailOk(email)) return j({ error: "dados" }, 400);
  const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10);
  for (const [k, max] of [[`lg:${day}:${ip}`, 10], [`lge:${day}:${email}`, 5]]) {
    const n = +((await env.LIMITS.get(k)) || 0); if (n >= max) return j({ error: "limite" }, 429);
    await env.LIMITS.put(k, String(n + 1), { expirationTtl: 172800 });
  }
  const tok = rnd(24); await env.LIMITS.put("login:" + tok, email, { expirationTtl: 1800 });
  const cod = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  await env.LIMITS.put("cod:" + email, JSON.stringify({ c: cod, n: 0, tok }), { expirationTtl: 1800 });
  const t = LTXT[lang], link = "https://benditocloset.pt/conta/?t=" + tok;
  const ok = await mail(env, email, t.a + " · " + cod, moldura(esc(t.t), `<p style="text-align:center;color:#6F625C;font-size:12px;letter-spacing:.2em;text-transform:uppercase;margin:0">${esc(t.c)}</p><p style="text-align:center;font-family:Georgia,serif;font-size:36px;letter-spacing:.18em;margin:6px 0 18px">${cod}</p><p style="text-align:center">${esc(t.p)}</p>${botao(link, t.b)}<p style="text-align:center;font-size:13px;color:#6F625C">${esc(t.n)}</p>`), t.t + "\n\n" + t.c + ": " + cod + "\n\n" + t.p + "\n" + link + "\n\n" + t.n);
  return ok ? j({ ok: true }) : j({ error: "envio" }, 502);
}
async function contaValidar(req, env, j) {
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const t = String(b.t || ""); if (!/^[a-f0-9]{48}$/.test(t)) return j({ error: "dados" }, 400);
  const email = await env.LIMITS.get("login:" + t); if (!email) return j({ error: "expirado" }, 410);
  await env.LIMITS.delete("login:" + t); await env.LIMITS.delete("cod:" + email);
  return j({ sessao: await abrirSessao(env, email, b.lang), email });
}
async function contaEu(req, env, j) {
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const email = await quem(env, b.sessao); if (!email) return j({ error: "sessao" }, 401);
  const perfil = JSON.parse((await env.LIMITS.get("cli:" + email)) || "{}"), encomendas = [];
  if (env.STRIPE_KEY) try {
    const o = await stp(env, "checkout/sessions?limit=30&customer_details[email]=" + encodeURIComponent(email));
    for (const ses of (o.data || [])) {
      if (ses.payment_status !== "paid" || !(ses.metadata && ses.metadata.pecas) || Date.now() / 1000 - ses.created > 400 * 86400) continue;
      const r = await resumoEncomenda(env, ses); if (/^Empr[eé]stimo/i.test(r.pecas)) continue;
      r.tok = await hmac(env, "enc:" + r.id); delete r.pi; delete r.last4; encomendas.push(r);
    }
  } catch (e) {}
  return j({ email, perfil, encomendas });
}
// Favoritos da cliente (lista de ids das peças), guardados na conta
async function contaFav(req, env, j) {
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const email = await quem(env, b.sessao); if (!email) return j({ error: "sessao" }, 401);
  const fav = [...new Set((Array.isArray(b.fav) ? b.fav : []).map(String).filter(x => /^[a-z0-9-]{2,60}$/.test(x)))].slice(0, 200);
  const p = JSON.parse((await env.LIMITS.get("cli:" + email)) || "{}"); p.fav = fav;
  await env.LIMITS.put("cli:" + email, JSON.stringify(p));
  return j({ ok: true, fav });
}
async function contaPerfil(req, env, j) {
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const email = await quem(env, b.sessao); if (!email) return j({ error: "sessao" }, 401);
  const p = JSON.parse((await env.LIMITS.get("cli:" + email)) || "{}"), d = b.perfil || {};
  for (const k of ["nome", "tel", "l1", "l2", "cp", "cidade"]) p[k] = String(d[k] || "").trim().slice(0, 120);
  p.pais = /^[A-Za-z]{2}$/.test(String(d.pais || "")) ? String(d.pais).toUpperCase() : "PT";
  p.novidades = !!d.novidades; p.atualizado = new Date().toISOString();
  await env.LIMITS.put("cli:" + email, JSON.stringify(p));
  return j({ ok: true, perfil: p });
}
async function contaSair(req, env, j) {
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const s = String(b.sessao || ""); if (/^[a-f0-9]{64}$/.test(s)) await env.LIMITS.delete("sess:" + s);
  return j({ ok: true });
}
// Página de gestão da Marianna (link privado com o token de dona)
async function gestao(req, env, url) {
  // Entra com o link de dona (?t=) ou com a conta do site da loja (ola@benditocloset.pt, ?s= sessão)
  const t = url.searchParams.get("t") || "", sTok = url.searchParams.get("s") || "";
  const dona = (env.OWNER_TOKEN && t === env.OWNER_TOKEN) || (sTok && (await quem(env, sTok)) === "ola@benditocloset.pt");
  if (!dona) return new Response("Sem acesso. Entre em benditocloset.pt/conta com o e-mail ola@benditocloset.pt e toque em «Gestão da loja».", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  let msg = "", avisoCliente = null, continue_ = true;
  if (req.method === "POST") {
    const f = await req.formData(), id = String(f.get("id") || ""), acao = String(f.get("acao") || "");
    if (acao === "morada") { await env.LIMITS.put("cfg:morada", String(f.get("morada") || "").trim().slice(0, 400)); msg = "Morada de devolução guardada."; }
    // Reserva em curso (alguém abriu o pagamento e ainda não pagou): fechar o pagamento e soltar a peça já
    if (acao === "soltar" && /^cs_(live|test)_[A-Za-z0-9]{20,}$/.test(id)) {
      try { await stp(env, "checkout/sessions/" + id + "/expire", "POST"); } catch (e) {}
      const m = await pcsLer(env); let x = 0;
      for (const pid of Object.keys(m)) if (m[pid].s === id && !m[pid].v) { delete m[pid]; x++; }
      await pcsGravar(env, m); await limparCacheEstado();
      msg = x ? "Reserva tirada: a peça voltou a estar disponível no site." : "Esta reserva já tinha terminado.";
    }
    if (acao === "colab_sai" || acao === "colab_volta") {
      const pid = String(f.get("peca") || ""), l = await colabLer(env);
      if (/^[a-z0-9-]{2,60}$/.test(pid)) {
        const n = acao === "colab_sai" ? [...new Set([...l, pid])] : l.filter(x => x !== pid);
        await env.LIMITS.put("colab", JSON.stringify(n)); await limparCacheEstado();
        msg = acao === "colab_sai" ? "Peça marcada como «Em collab»: deixa de se poder comprar." : "Peça de volta à venda no site.";
      }
    }
    // Cauções de empréstimo (retidas no cartão): libertar (peças voltaram bem) ou cobrar um valor (dano ou peça não devolvida)
    if (/^pi_[A-Za-z0-9]{10,}$/.test(id) && (acao === "libertar" || acao === "cobrar" || acao === "recusar")) {
      try {
        const pi = await stp(env, "payment_intents/" + id + "?expand[]=latest_charge");
        if (pi.status !== "requires_capture") msg = "Esta caução já não está retida (estado: " + pi.status + ").";
        else {
          const email = pi.receipt_email || (pi.latest_charge && pi.latest_charge.billing_details && pi.latest_charge.billing_details.email) || "";
          const ped = (pi.metadata && pi.metadata.pedido) || "";
          if (acao === "recusar") {
            // Pedido recusado: liberta a caução sem cobrar nada e avisa a pessoa com simpatia
            await stp(env, "payment_intents/" + id + "/cancel", "POST", { cancellation_reason: "requested_by_customer" });
            await limparCacheEstado();
            msg = "Pedido recusado: a caução de " + (pi.amount / 100).toFixed(2) + " € foi libertada e a pessoa recebeu um e-mail.";
            if (env.RESEND_KEY && email) await mail(env, email, "O seu pedido de empréstimo " + ped,
              moldura("Desta vez não foi possível", `<p>Obrigada pelo seu pedido de empréstimo ${esc(ped)} e pelo interesse no Bendito Closet.</p><p>Desta vez não conseguimos aceitar o pedido, por isso libertámos a caução de <b>${(pi.amount / 100).toFixed(2).replace(".", ",")} €</b>: nada foi cobrado e o valor volta a ficar disponível no seu cartão. Alguns bancos levam uns dias a atualizar.</p><p>Fica o convite para uma próxima produção. Pode escrever-nos quando quiser.</p>`),
              "Desta vez não conseguimos aceitar o pedido " + ped + ". A caução foi libertada e nada foi cobrado.");
          } else if (acao === "libertar") {
            await stp(env, "payment_intents/" + id + "/cancel", "POST", { cancellation_reason: "requested_by_customer" });
            await limparCacheEstado();
            msg = "Caução libertada: " + (pi.amount / 100).toFixed(2) + " €. O valor volta ao limite do cartão (o banco pode levar alguns dias a mostrar).";
            if (env.RESEND_KEY && email) await mail(env, email, "Caução libertada · empréstimo " + ped,
              moldura("Caução libertada", `<p>As peças do empréstimo ${esc(ped)} voltaram em bom estado. Obrigada!</p><p>Libertámos a caução de <b>${(pi.amount / 100).toFixed(2).replace(".", ",")} €</b>: nada foi cobrado e o valor volta a ficar disponível no seu cartão. Alguns bancos levam uns dias a atualizar.</p>`),
              "Caução de " + (pi.amount / 100).toFixed(2) + " € libertada. Nada foi cobrado.");
          } else {
            const v = Math.round(Math.min(Math.max(+String(f.get("valor") || "0").replace(",", ".") || 0, 0), pi.amount / 100) * 100);
            if (!(v > 0)) msg = "Escreva o valor a cobrar.";
            else {
              await stp(env, "payment_intents/" + id + "/capture", "POST", { amount_to_capture: String(v), "metadata[cobrado_motivo]": String(f.get("motivo") || "").slice(0, 400) });
              if (v >= pi.amount && pi.metadata && pi.metadata.ids) { const m = await pcsLer(env); for (const pid of String(pi.metadata.ids).split(",").filter(Boolean)) m[pid] = { s: pi.id, v: 1 }; await pcsGravar(env, m); }
              await limparCacheEstado();
              msg = "Cobrados " + (v / 100).toFixed(2) + " € da caução" + (v >= pi.amount ? " (valor total: as peças ficam como vendidas no site)" : "") + (v < pi.amount ? "; o resto (" + ((pi.amount - v) / 100).toFixed(2) + " €) foi libertado." : ".");
            }
          }
        }
      } catch (e) { msg = "Erro: " + String(e.message || e); }
    }
    if (/^cs_(live|test)_[A-Za-z0-9]{20,}$/.test(id) && acao !== "soltar") {
      const est = JSON.parse((await env.LIMITS.get("enc:" + id)) || "{}");
      try {
        if (acao === "enviada") {
          est.enviada = new Date().toISOString(); est.track = String(f.get("track") || "").trim().slice(0, 60); est.transp = String(f.get("transp") || "CTT").slice(0, 30);
          msg = "Marcada como enviada." + (est.track ? " A cliente recebe o código de seguimento por e-mail." : "");
          if (est.track) {
            const ses = await stp(env, "checkout/sessions/" + id), r = await resumoEncomenda(env, ses);
            const link = est.transp === "CTT" ? "https://www.ctt.pt/feapl_2/app/open/objectSearch/objectSearch.jspx?objects=" + encodeURIComponent(est.track) : "https://www.correosexpress.pt";
            const tokE = await hmac(env, "enc:" + r.id);
            if (env.RESEND_KEY && r.email) {
              const m = emailEnviada(r, est, link, W + "/etiqueta?id=" + encodeURIComponent(r.id) + "&tok=" + tokE);
              if (await mail(env, r.email, m.assunto, m.html, m.texto)) { msg += " E-mail enviado a " + r.email + "."; continue_ = false; }
            }
            if (continue_) avisoCliente = { _subject: "A sua encomenda Bendito Closet foi enviada · tracking number " + est.track, _template: "table", _captcha: "false", _cc: r.email,
              "Olá": r.nome || "", "Encomenda": r.ref, "Peças": r.pecas, "Transportadora": est.transp, "Tracking number (código de seguimento)": est.track,
              "Track your package (seguir a encomenda)": link, "App Shop": "Pode seguir a encomenda na app Shop (shop.app): cole o código em Adicionar encomenda, ou ligue o seu Gmail à app.",
              "Cancelar ou devolver": "https://benditocloset.pt/encomenda/?s=" + r.id,
              "Etiqueta de devolução (guarde-a; só precisa se quiser devolver)": "https://bendito-provador-ia.nn45hn9bvr.workers.dev/etiqueta?id=" + encodeURIComponent(r.id) + "&tok=" + await hmac(env, "enc:" + r.id) };
          }
        }
        if (acao === "nao_enviada") { delete est.enviada; msg = "Desmarcada."; }
        if ((acao === "problema_ok" || acao === "problema_nao") && est.problema) {
          const ses = await stp(env, "checkout/sessions/" + id), r = await resumoEncomenda(env, ses), nota = String(f.get("nota") || "").trim().slice(0, 600);
          if (acao === "problema_ok") {
            if (r.reembolso !== "total") await stp(env, "refunds", "POST", { payment_intent: r.pi, reason: "requested_by_customer", "metadata[motivo]": "problema com a entrega: " + (TIPOS_PROB[est.problema.tipo] || "") });
            est.problema.estado = "reembolsado"; est.reembolso = "total"; msg = "Reembolso feito: " + r.total.toFixed(2) + " €. A cliente recebe um e-mail.";
          } else { est.problema.estado = "recusado"; msg = "Pedido marcado como não reembolsado. A cliente recebe um e-mail com a sua mensagem."; }
          est.problema.resposta = nota; est.problema.fechado = new Date().toISOString();
          if (env.RESEND_KEY && r.email) await mail(env, r.email, (acao === "problema_ok" ? "Reembolso feito" : "Resposta ao seu pedido") + " · encomenda " + r.ref,
            moldura(acao === "problema_ok" ? "Reembolso feito" : "Resposta ao seu pedido", acao === "problema_ok"
              ? `<p>Fizemos o reembolso de <b>${r.total.toFixed(2).replace(".", ",")} €</b> da encomenda ${esc(r.ref)}. Aparece no extrato em 5 a 10 dias úteis. Pedimos desculpa pelo incómodo.</p>${nota ? `<p>${esc(nota)}</p>` : ""}`
              : `<p>Verificámos o pedido sobre a encomenda ${esc(r.ref)}.</p><p>${esc(nota || "Segundo a transportadora, a encomenda foi entregue na morada indicada. Se precisar de ajuda, responda a este e-mail.")}</p>`),
            acao === "problema_ok" ? "Reembolso de " + r.total.toFixed(2) + " € feito." : (nota || "Segundo a transportadora, a encomenda foi entregue."));
        }
        if (acao === "recusada") {
          const ses = await stp(env, "checkout/sessions/" + id), r = await resumoEncomenda(env, ses);
          const desc = Math.min(Math.max(+String(f.get("desconto") || "0").replace(",", ".") || 0, 0), r.total);
          const valor = Math.round((r.total - desc) * 100);
          if (r.reembolso !== "total" && valor > 0) await stp(env, "refunds", "POST", { payment_intent: r.pi, amount: String(valor), reason: "requested_by_customer", "metadata[motivo]": "devolvida pela transportadora (não entregue)", "metadata[portes_descontados_eur]": desc.toFixed(2) });
          est.devolucao = "recusada"; est.reembolso = "total"; est.descontado = desc;
          await pcLibertar(env, ses); await limparCacheEstado();
          msg = "Reembolso feito: " + (valor / 100).toFixed(2) + " € (descontados " + desc.toFixed(2) + " € de portes).";
        }
        if (acao === "recebida") {
          const ses = await stp(env, "checkout/sessions/" + id), r = await resumoEncomenda(env, ses);
          if (r.reembolso !== "total") await stp(env, "refunds", "POST", { payment_intent: r.pi, reason: "requested_by_customer", "metadata[motivo]": "devolução recebida" });
          est.devolucao = "recebida"; est.reembolso = "total"; msg = "Reembolso feito: " + r.total.toFixed(2) + " €. A peça voltou a ficar disponível no site.";
          await pcLibertar(env, ses); await limparCacheEstado();
        }
        await env.LIMITS.put("enc:" + id, JSON.stringify(est));
      } catch (e) { msg = "Erro: " + String(e.message || e); }
    }
  }
  let colabH = "";
  try {
    const P = await pecasDoSite(), l = await colabLer(env);
    const fmc = (a, pid, lab) => `<form method="post"><input type="hidden" name="acao" value="${a}"><input type="hidden" name="peca" value="${esc(pid)}"><button>${lab}</button></form>`;
    colabH = l.map(pid => `<div class="o"><b>${esc(P[pid] ? P[pid].marca + " " + P[pid].nome : pid)}</b> · em collab<div class="a">${fmc("colab_volta", pid, "Voltou → pôr à venda")}</div></div>`).join("") || "<p>Nenhuma peça em collab.</p>";
    const opts = Object.entries(P).filter(([pid, p]) => p.status !== "vendido" && !l.includes(pid)).map(([pid, p]) => `<option value="${esc(pid)}">${esc(p.marca + " " + p.nome)}</option>`).join("");
    colabH += `<form method="post" style="margin-top:8px"><input type="hidden" name="acao" value="colab_sai"><select name="peca" style="padding:8px;border:1px solid #1C1517;max-width:100%">${opts}</select> <button>Marcar «Em collab»</button></form>`;
  } catch (e) { colabH = "<p>Erro: " + esc(e.message || e) + "</p>"; }
  let resH = "";
  try {
    const m = await pcsLer(env), P = await pecasDoSite(), por = {};
    for (const [pid, r] of Object.entries(m)) if (!r.v && r.ate > Date.now()) (por[r.s] = por[r.s] || { e: r.e, ate: r.ate, ids: [] }).ids.push(pid);
    resH = Object.entries(por).map(([sid, r]) => `<div class="o"><b>${esc(r.ids.map(pid => P[pid] ? P[pid].marca + " " + P[pid].nome : pid).join(", "))}</b><br><small>${esc(r.e || "")} · reservada até às ${new Date(r.ate).toLocaleTimeString("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit" })}</small><div class="a"><form method="post"><input type="hidden" name="id" value="${esc(sid)}"><input type="hidden" name="acao" value="soltar"><button>Tirar do reservado</button></form></div></div>`).join("");
  } catch (e) {}
  let cau = "";
  try {
    const o = await stp(env, "payment_intents?limit=40");
    for (const pi of (o.data || [])) {
      if (pi.status !== "requires_capture") continue;
      const ped = (pi.metadata && pi.metadata.pedido) || "", dias = Math.max(0, 7 - Math.floor((Date.now() / 1000 - pi.created) / 86400));
      const fm = (a, inner) => `<form method="post"><input type="hidden" name="id" value="${esc(pi.id)}"><input type="hidden" name="acao" value="${a}">${inner}</form>`;
      cau += `<div class="o"><b>${esc(ped || pi.id)}</b> · ${(pi.amount / 100).toFixed(2)} € retidos · ${new Date(pi.created * 1000).toLocaleDateString("pt-PT", { timeZone: "Europe/Lisbon" })}<br>${esc((pi.metadata && pi.metadata.pecas) || pi.description || "")}<br><small>${esc((pi.metadata && pi.metadata.datas) || "")} · liberta-se sozinha em ${dias} dia${dias === 1 ? "" : "s"}</small><div class="a">${fm("libertar", `<button>Peças voltaram bem → libertar ${(pi.amount / 100).toFixed(2)} €</button>`)}${fm("recusar", `<button>Recusar pedido (não cobra nada)</button>`)}${fm("cobrar", `Cobrar <input name="valor" inputmode="decimal" placeholder="0,00" style="width:70px;padding:8px;border:1px solid #1C1517"> € <input name="motivo" placeholder="Motivo (ex.: mancha no punho)" style="padding:8px;border:1px solid #1C1517;width:200px"> <button>Cobrar e libertar o resto</button>`)}</div></div>`;
    }
  } catch (e) { cau = "<p>Erro ao ler as cauções: " + esc(e.message || e) + "</p>"; }
  let rows = "";
  try {
    const o = await stp(env, "checkout/sessions?limit=40&expand[]=data.payment_intent.latest_charge");
    for (const ses of (o.data || [])) {
      if (ses.payment_status !== "paid" || !(ses.metadata && ses.metadata.pecas) || Date.now() / 1000 - ses.created > 60 * 86400) continue;
      const r = await resumoEncomenda(env, ses);
      if (/^Empr[eé]stimo/i.test(r.pecas)) continue;
      if (r.reembolso !== "total") { const m = await pcsLer(env); if (idsDe(ses).some(pid => !(m[pid] && m[pid].v))) await pcVendidas(env, ses); }
      const estG = JSON.parse((await env.LIMITS.get("enc:" + r.id)) || "{}"), pb = estG.problema;
      const st = r.reembolso === "total" ? "Reembolsada" : pb && pb.estado === "pedido" ? "⚠ Problema com a entrega: " + (TIPOS_PROB[pb.tipo] || "") : r.devolucao === "pedida" ? "Devolução pedida" : r.enviada ? "Enviada" : "Por enviar";
      const pbInfo = pb ? `<div class="m" style="margin-top:8px">${esc(TIPOS_PROB[pb.tipo] || "")} · pedido em ${esc(String(pb.quando).slice(0, 10))}${pb.motivo ? "<br>“" + esc(pb.motivo) + "”" : ""}<br>Pedidos anteriores deste e-mail: <b>${pb.antes || 0}</b>${pb.estado !== "pedido" ? "<br>Resolvido: " + (pb.estado === "reembolsado" ? "reembolsado" : "não reembolsado") : ""}${estG.track ? `<br><a href="${esc(linkTrack(estG.transp, estG.track))}" target="_blank">Ver o seguimento (${esc(estG.track)})</a>` : ""}</div>` : "";
      const pbAcoes = pb && pb.estado === "pedido" && r.reembolso !== "total" ? `<form method="post"><input type="hidden" name="id" value="${esc(r.id)}"><input type="hidden" name="acao" value="problema_ok"><input name="nota" placeholder="Mensagem para a cliente (opcional)" style="padding:8px;border:1px solid #1C1517;width:220px"> <button>Reembolsar ${r.total.toFixed(2)} €</button></form><form method="post"><input type="hidden" name="id" value="${esc(r.id)}"><input type="hidden" name="acao" value="problema_nao"><input name="nota" placeholder="Porquê (ex.: entregue a 3/12, assinado)" style="padding:8px;border:1px solid #1C1517;width:220px"> <button>Não reembolsar</button></form>` : "";
      const bt = (a, l) => `<form method="post"><input type="hidden" name="id" value="${esc(r.id)}"><input type="hidden" name="acao" value="${a}"><button>${l}</button></form>`;
      const acoes = r.reembolso === "total" ? "" : (r.devolucao === "pedida" ? bt("recebida", "Peça recebida → reembolsar " + r.total.toFixed(2) + " €") : "") + (r.enviada && r.devolucao !== "pedida" ? `<form method="post"><input type="hidden" name="id" value="${esc(r.id)}"><input type="hidden" name="acao" value="recusada">Devolvida pela transportadora · descontar portes <input name="desconto" value="${r.portes.toFixed(2)}" inputmode="decimal" style="width:70px;padding:8px;border:1px solid #1C1517"> € <button>Reembolsar o resto</button></form>` : "") + (r.enviada ? bt("nao_enviada", "Desmarcar enviada") : `<form method="post"><input type="hidden" name="id" value="${esc(r.id)}"><input type="hidden" name="acao" value="enviada"><select name="transp"><option>CTT</option><option>Correos Express</option></select> <input name="track" placeholder="Código de seguimento" style="padding:8px;border:1px solid #1C1517"> <button>Marcar como enviada</button></form>`);
      const etqUrl = "/etiqueta?id=" + encodeURIComponent(r.id) + "&tok=" + await hmac(env, "enc:" + r.id);
      rows += `<div class="o"><b>${esc(r.ref)}</b> · ${esc(r.data)} · ${r.total.toFixed(2)} €<br>${esc(r.pecas)}<br><small>${esc(r.nome)} · ${esc(r.email)} · ${esc(r.envio)}</small><br><i>${st}</i>${est_motivo(r)} · <a href="${etqUrl}&tipo=envio" target="_blank">Etiqueta de envio</a> · <a href="${etqUrl}" target="_blank">Etiqueta de devolução</a>${pbInfo}<div class="a">${pbAcoes}${acoes}</div></div>`;
    }
  } catch (e) { rows = "<p>Erro ao ler a Stripe: " + esc(e.message || e) + "</p>"; }
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Encomendas · Bendito Closet</title><style>body{font:15px/1.5 system-ui,sans-serif;background:#FAF6F0;color:#1C1517;margin:0;padding:20px;max-width:720px;margin:auto}h1{font:400 30px Georgia,serif}.o{border-top:1px solid #ddd;padding:14px 0}.a{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}button{border:1px solid #1C1517;background:#fff;padding:8px 12px;font:inherit;cursor:pointer}.m{background:#fff;border:1px solid #1C1517;padding:10px}</style><h1>Encomendas</h1>${msg ? `<p class="m">${esc(msg)}</p>` : ""}${resH ? `<h2 style="font:400 22px Georgia,serif">Reservadas agora</h2>${resH}` : ""}<h2 style="font:400 22px Georgia,serif">Cauções de empréstimos</h2>${cau || "<p>Nenhuma caução retida.</p>"}<h2 style="font:400 22px Georgia,serif">Peças em collab</h2>${colabH}<h2 style="font:400 22px Georgia,serif">Vendas</h2>${avisoCliente ? `<script>fetch("https://formsubmit.co/ajax/ola@benditocloset.pt",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:${JSON.stringify(JSON.stringify(avisoCliente)).replace(/</g, "\\u003c")}}).catch(()=>{})</script>` : ""}<details><summary>Morada de devolução (aparece nas etiquetas)</summary><form method="post"><input type="hidden" name="acao" value="morada"><textarea name="morada" rows="5" style="width:100%;font:inherit">${esc(await env.LIMITS.get("cfg:morada") || "")}</textarea><button>Guardar morada</button></form></details><p>Últimos 60 dias. Marque "enviada" quando enviar: a partir daí a cliente já não consegue cancelar sozinha, só pedir devolução.</p>${rows || "<p>Sem encomendas.</p>"}`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
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
  const url = "https://bendito-provador-ia.nn45hn9bvr.workers.dev/contrato/" + id;
  // E-mails (antes iam pelo FormSubmit, que às vezes não respondia): à Bendito e cópia a quem assinou
  const cli = String(dados["E-mail"] || "").trim(), ok1 = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cli);
  const tab = Object.entries(dados).filter(([k]) => k !== "Dispositivo").map(([k, v]) => `<tr><td style="padding:4px 10px 4px 0;color:#6F625C;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join("");
  const txt = Object.entries(dados).filter(([k]) => k !== "Dispositivo").map(([k, v]) => k + ": " + v).join("\n");
  const mail1 = await mail(env, "ola@benditocloset.pt", "Contrato de empréstimo assinado " + code + " · caução " + (dados["Caução"] || ""),
    moldura("Contrato de empréstimo assinado " + esc(code), `<table style="border-collapse:collapse;font-size:14px">${tab}</table>${botao(url, "Ver o contrato assinado")}`), txt + "\n\nContrato: " + url, ok1 ? cli : undefined);
  if (ok1) await mail(env, cli, "Cópia do seu contrato de empréstimo " + code + " · Bendito Closet",
    moldura("O seu contrato de empréstimo " + esc(code), `<p>Obrigada! Aqui fica a cópia do contrato que assinou no site. Pode abri-lo, imprimi-lo ou guardá-lo em PDF.</p>${botao(url, "Ver o contrato assinado")}<table style="border-collapse:collapse;font-size:14px;margin-top:14px">${tab}</table>`),
    "Cópia do seu contrato de empréstimo " + code + "\n" + url + "\n\n" + txt);
  return j({ url, mail: mail1 });
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
// ===== Formulário de perguntas das lojas online: chega ao e-mail ola@ =====
async function lojaPedido(req, env, j) {
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const c = b && typeof b.campos === "object" && b.campos ? b.campos : {};
  const linhas = Object.entries(c).slice(0, 30).map(([k, v]) => [String(k).slice(0, 60), String(v || "").slice(0, 1500)]).filter(([, v]) => v.trim());
  if (!linhas.length) return j({ error: "vazio" }, 400);
  const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10), k = `lped:${day}:${ip}`, n = +((await env.LIMITS.get(k)) || 0);
  if (n >= 8) return j({ error: "limite" }, 429);
  await env.LIMITS.put(k, String(n + 1), { expirationTtl: 172800 });
  const em = String(c["E-mail"] || "").trim(), emOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em) ? em : "";
  const loja = String(c["Loja"] || c["Nome"] || "nova cliente").slice(0, 80);
  const origem = String(b.origem || "").slice(0, 80);
  const tabela = linhas.map(([k, v]) => `<tr><td style="padding:7px 10px 7px 0;color:#6F625C;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:7px 0;vertical-align:top"><b>${esc(v).replace(/\n/g, "<br>")}</b></td></tr>`).join("");
  const html = moldura("Respostas do formulário", `<p>${origem ? "Página: " + esc(origem) + "<br>" : ""}Recebido em ${new Date().toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</p><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #E9DFD3;font-size:14.5px">${tabela}</table>${emOk ? "<p style=\"margin-top:18px\">Carregue em Responder para escrever diretamente à pessoa.</p>" : ""}`);
  const texto = linhas.map(([k, v]) => k + ": " + v).join("\n");
  const ok = await mail(env, "ola@benditocloset.pt", "Respostas do formulário (lojas): " + loja, html, texto, emOk || undefined);
  return ok ? j({ ok: true }) : j({ error: "email" }, 502);
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
- Portes (roupa e acessórios / sapatos, malas e casacos): Portugal continental entrega em casa com seguimento 2-3 dias úteis 9 €/11 € (grátis acima de 100 €); Portugal continental Correos Express 24h 10 €/12 €; Açores e Madeira CTT 9 €/12 €; Europa DHL ou Correos Express 18 €/24 €.
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
  async scheduled(ev, env, ctx) { ctx.waitUntil(enviarResumo(env)); },
  async fetch(req, env, ctx) {
    try { return await tratar(req, env, ctx); }
    catch (e) {
      const origin = req.headers.get("Origin") || "";
      return new Response(JSON.stringify({ error: "interno", detail: String((e && e.message) || e).slice(0, 300) }), { status: 500, headers: { "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0], "Content-Type": "application/json", "Vary": "Origin" } });
    }
  }
};
async function tratar(req, env, ctx) {
  {
    const origin = req.headers.get("Origin") || "";
    const cors = { "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0], "Access-Control-Allow-Methods": "POST,GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Bendito-Dono", "Vary": "Origin" };
    const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (url.pathname === "/") return j({ ok: true, service: "bendito-provador" });
    if (url.pathname === "/caucao" && req.method === "POST") return caucao(req, env, j);
    if (url.pathname === "/pecas/estado" && req.method === "GET") return estadoPecas(req, env, j);
    if (url.pathname === "/cupoes/estado" && req.method === "GET") {
      const out = {};
      for (const [cod, id] of Object.entries(CUPOES)) {
        try { const c = await stp(env, "coupons/" + id); out[cod] = { cupao: true, valido: c.valid, pct: c.percent_off, ate: c.redeem_by ? new Date(c.redeem_by * 1000).toISOString() : null }; } catch (e) { out[cod] = { cupao: false, erro: String(e.message || e).slice(0, 80) }; }
        try { const pc = await stp(env, "promotion_codes?limit=1&code=" + encodeURIComponent(cod)); const x = (pc.data || [])[0]; out[cod].codigo = x ? { ativo: x.active, ate: x.expires_at ? new Date(x.expires_at * 1000).toISOString() : null } : null; } catch (e) { out[cod].codigo = "erro"; }
      }
      return j(out);
    }
    if (url.pathname === "/comprar" && req.method === "POST") return comprar(req, env, j);
    if (url.pathname === "/assinatura" && req.method === "POST") return guardarContrato(req, env, j);
    if (url.pathname === "/ajuda" && req.method === "POST") return ajuda(req, env, j);
    if (url.pathname === "/lojas/pedido" && req.method === "POST") return lojaPedido(req, env, j);
    if (url.pathname === "/encomenda/procurar" && req.method === "POST") return encontrar(req, env, j);
    if (url.pathname === "/encomenda/acao" && req.method === "POST") return acaoCliente(req, env, j);
    if (url.pathname === "/ev" && req.method === "POST") return evento(req, env);
    if (url.pathname === "/resumo") {
      if (!env.OWNER_TOKEN || url.searchParams.get("t") !== env.OWNER_TOKEN) return new Response("Sem acesso", { status: 403 });
      const dia = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("dia") || "") ? url.searchParams.get("dia") : undefined;
      const res = url.searchParams.get("enviar") === "1" ? await enviarResumo(env, dia) : await resumoDia(env, dia);
      return new Response(JSON.stringify(res, null, 1), { headers: { "Content-Type": "application/json; charset=utf-8" } });
    }
    if (url.pathname === "/gestao") return gestao(req, env, url);
    if (url.pathname === "/etiqueta") return etiqueta(env, url);
    if (url.pathname === "/encomenda/confirmar" && req.method === "POST") return confirmar(req, env, j);
    if (url.pathname === "/conta/entrar" && req.method === "POST") return contaEntrar(req, env, j);
    if (url.pathname === "/conta/codigo" && req.method === "POST") return contaCodigo(req, env, j);
    if (url.pathname === "/conta/validar" && req.method === "POST") return contaValidar(req, env, j);
    if (url.pathname === "/conta/eu" && req.method === "POST") return contaEu(req, env, j);
    if (url.pathname === "/conta/perfil" && req.method === "POST") return contaPerfil(req, env, j);
    if (url.pathname === "/conta/fav" && req.method === "POST") return contaFav(req, env, j);
    if (url.pathname === "/conta/sair" && req.method === "POST") return contaSair(req, env, j);
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

