// Bendito Closet · ponte segura entre o site e a FASHN (provador virtual com IA)
// Segredos/ligações na Cloudflare: FASHN_KEY (segredo), LIMITS (KV). Opcionais: PER_DAY (3), TOTAL_DAY (40).
const ALLOWED = ["https://benditocloset.pt", "https://www.benditocloset.pt"];
// Instruções para a IA: vestir só a peça da loja (a foto da loja mostra uma modelo; ignorar o resto do look dela)
const KEEP = " Preserve the person's face exactly as in the original photo: same identity, features, skin, expression and hair; do not retouch or change the face. The garment fabric is fully opaque: sleeves and body fully cover the skin underneath, with no tattoos or skin showing through, and the print follows the garment's natural folds without distortion. Keep the hands, phone and accessories unchanged.";
const JEANS_BARE = " If the person's legs are bare or they are in underwear or swimwear, also dress them in classic mid-blue straight-leg jeans.";
const JEANS_ALL = " Also replace whatever they wear on the lower body (skirt, shorts, dress hem, underwear) with classic mid-blue straight-leg jeans.";
const PROMPT = {
  tops: "Dress the person in the top/jacket from the product photo only. Keep the person's face, body, pose, hair and background.",
  bottoms: "Dress the person in the trousers/leggings from the product photo only. If the person wears a dress, replace it with these trousers and a simple plain fitted top in a neutral colour. Keep face, body, pose, hair and background.",
  "one-pieces": "Dress the person in the dress/one-piece from the product photo only, replacing their current outfit. Keep face, body, pose, hair and background.",
  auto: "Dress the person in the main garment from the product photo only. Keep face, body, pose, hair and background."
};
export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = { "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0], "Access-Control-Allow-Methods": "POST,GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-Bendito-Dono", "Vary": "Origin" };
    const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (url.pathname === "/") return j({ ok: true, service: "bendito-provador" });
    if (!ALLOWED.includes(origin)) return j({ error: "origin" }, 403);
    if (url.pathname === "/run" && req.method === "POST") {
      const ip = req.headers.get("CF-Connecting-IP") || "x", day = new Date().toISOString().slice(0, 10);
      const PER = +(env.PER_DAY || 3), TOTAL = +(env.TOTAL_DAY || 40);
      const kIp = `ip:${day}:${ip}`, kAll = `all:${day}`;
      const nIp = +((await env.LIMITS.get(kIp)) || 0), nAll = +((await env.LIMITS.get(kAll)) || 0);
      const dono = env.OWNER_TOKEN && req.headers.get("X-Bendito-Dono") === env.OWNER_TOKEN;
      if (!dono && nIp >= PER) return j({ error: "limit_user" }, 429);
      if (!dono && nAll >= TOTAL) return j({ error: "limit_day" }, 429);
      let b; try { b = await req.json(); } catch (e) { return j({ error: "bad_json" }, 400); }
      if (typeof b.model_image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(b.model_image) || b.model_image.length > 4e6) return j({ error: "bad_image" }, 400);
      if (typeof b.garment_image !== "string" || !/^https:\/\/benditocloset\.pt\//.test(b.garment_image)) return j({ error: "bad_garment" }, 400);
      const category = ["tops", "bottoms", "one-pieces"].includes(b.category) ? b.category : "auto";
      const r = await fetch("https://api.fashn.ai/v1/run", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.FASHN_KEY },
        body: JSON.stringify({ model_name: "tryon-max", inputs: { model_image: b.model_image, product_image: b.garment_image, prompt: (PROMPT[category] || PROMPT.auto) + KEEP + (category === "tops" ? (b.jeans ? JEANS_ALL : JEANS_BARE) : ""), resolution: "1k", generation_mode: "balanced", return_base64: true, output_format: "jpeg" } }) });
      let o = {}; try { o = await r.json(); } catch (e) {}
      if (!r.ok || !o.id) return j({ error: "fashn", detail: (o.error && (o.error.name || o.error.message || o.error)) || r.status }, 502);
      if (!dono) {
        await env.LIMITS.put(kIp, String(nIp + 1), { expirationTtl: 172800 });
        await env.LIMITS.put(kAll, String(nAll + 1), { expirationTtl: 172800 });
        await env.LIMITS.put("job:" + o.id, kIp, { expirationTtl: 86400 });
      }
      return j({ id: o.id, left: PER - nIp - 1 });
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
      if (!dono && nAll >= TOTAL) return j({ error: "limit_day" }, 429);
      let b; try { b = await req.json(); } catch (e) { return j({ error: "bad_json" }, 400); }
      if (typeof b.face_image !== "string" || !/^data:image\/(jpeg|png|webp);base64,/.test(b.face_image) || b.face_image.length > 4e6) return j({ error: "bad_image" }, 400);
      const r = await fetch("https://api.fashn.ai/v1/run", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.FASHN_KEY },
        body: JSON.stringify({ model_name: "face-to-model", inputs: { face_image: b.face_image, aspect_ratio: "2:3", resolution: "1k", generation_mode: "fast", return_base64: true, output_format: "jpeg" } }) });
      let o = {}; try { o = await r.json(); } catch (e) {}
      if (!r.ok || !o.id) return j({ error: "fashn", detail: (o.error && (o.error.name || o.error.message || o.error)) || r.status }, 502);
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
