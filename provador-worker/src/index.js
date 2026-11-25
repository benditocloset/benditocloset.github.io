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
    P[id[1]] = { cat: g("cat"), marca: g("marca"), nome: g("nome"), status: g("status"), preco: pr ? +pr[1] : 0 };
  }
  return P;
}
async function caucao(req, env, j) {
  if (!env.STRIPE_KEY) return j({ error: "sem_chave" }, 503);
  let b = {}; try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
  const code = String(b.code || ""), ship = String(b.ship || ""), email = String(b.email || "").trim(), ids = Array.isArray(b.ids) ? b.ids.map(String) : [];
  const d1 = String(b.d1 || ""), d2 = String(b.d2 || "");
  if (!/^BC-[A-Z0-9]{4}$/.test(code) || !PORTES[ship] || !/^\S+@\S+\.\S+$/.test(email) || !ids.length || ids.length > 30 || !/^\d{4}-\d{2}-\d{2}$/.test(d1) || !/^\d{4}-\d{2}-\d{2}$/.test(d2)) return j({ error: "dados" }, 400);
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
  f.set("line_items[0][price_data][product_data][name]", "Caução (devolvida) · pedido " + code);
  f.set("line_items[0][price_data][product_data][description]", lista.slice(0, 480));
  if (portes) {
    f.set("line_items[1][quantity]", "1"); f.set("line_items[1][price_data][currency]", "eur"); f.set("line_items[1][price_data][unit_amount]", String(portes));
    f.set("line_items[1][price_data][product_data][name]", "Portes ida e volta · " + PORTES_NOME[ship]);
  }
  const meta = { pedido: code, pecas: lista.slice(0, 490), datas: fd(d1) + " a " + fd(d2), envio: PORTES_NOME[ship], caucao_eur: (cau / 100).toFixed(2), portes_eur: (portes / 100).toFixed(2) };
  for (const [a, v] of Object.entries(meta)) { f.set(`metadata[${a}]`, v); f.set(`payment_intent_data[metadata][${a}]`, v); }
  f.set("payment_intent_data[description]", "Empréstimo " + code + " · caução " + (cau / 100) + " € + portes " + (portes / 100) + " €");
  const call = body => fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { "Authorization": "Bearer " + env.STRIPE_KEY, "Content-Type": "application/x-www-form-urlencoded" }, body });
  const f2 = new URLSearchParams(f); ["card", "mb_way", "multibanco"].forEach((t, i) => f2.set(`payment_method_types[${i}]`, t));
  let r = await call(f2.toString()), o = await r.json();
  if (!r.ok) { r = await call(f.toString()); o = await r.json(); }
  if (!r.ok || !o.url) return j({ error: "stripe", detail: o.error && o.error.message }, 502);
  return j({ url: o.url, caucao: cau / 100, portes: portes / 100, total: (cau + portes) / 100 });
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
