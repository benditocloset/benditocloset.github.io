// Bendito Closet · pagamento da caução do empréstimo de peças (valor calculado aqui a partir dos preços do site)
// Segredo na Cloudflare: STRIPE_KEY (chave restrita da conta Bendito Closet, só "Checkout Sessions: escrita")
const OK = ["https://benditocloset.pt", "https://www.benditocloset.pt"];
const ENVIO = { envio: "Envio para a morada (portes ida e volta pela Bendito Closet)", mao: "Levantamento em mão (Ermesinde)" };
async function pecas() {
const h = await (await fetch("https://benditocloset.pt/?w=" + Math.floor(Date.now() / 300000))).text();
const m = h.match(/const PECAS = (\[[\s\S]*?\n\]);/);
const P = {};
if (!m) return P;
for (const l of m[1].split("\n")) {
const id = l.match(/^\s*\{\s*id:"([^"]+)"/);
if (!id) continue;
const g = k => { const r = l.match(new RegExp("\\b" + k + ":\\s*\"([^\"]*)\"")); return r ? r[1] : ""; };
const pr = l.match(/\bpreco:\s*([\d.]+)/);
P[id[1]] = { marca: g("marca"), nome: g("nome"), status: g("status"), preco: pr ? +pr[1] : 0 };
}
return P;
}
export default {
async fetch(req, env) {
const o = req.headers.get("Origin") || "";
const cors = { "Access-Control-Allow-Origin": OK.includes(o) ? o : OK[0], "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" };
const j = (x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
if (req.method === "OPTIONS") return new Response(null, { headers: cors });
const url = new URL(req.url);
if (url.pathname === "/") return j({ ok: true, service: "bendito-caucao", chave: !!env.STRIPE_KEY });
if (url.pathname !== "/caucao" || req.method !== "POST") return j({ error: "not_found" }, 404);
if (!env.STRIPE_KEY) return j({ error: "sem_chave" }, 503);
let b = {};
try { b = await req.json(); } catch (e) { return j({ error: "pedido" }, 400); }
const code = String(b.code || ""), ship = String(b.ship || ""), email = String(b.email || "").trim(), d1 = String(b.d1 || ""), d2 = String(b.d2 || "");
const ids = Array.isArray(b.ids) ? [...new Set(b.ids.map(String))] : [];
const dt = /^\d{4}-\d{2}-\d{2}$/;
if (!/^BC-[A-Z0-9]{4}$/.test(code) || !ENVIO[ship] || !/^\S+@\S+\.\S+$/.test(email) || !ids.length || ids.length > 30 || !dt.test(d1) || !dt.test(d2)) return j({ error: "dados" }, 400);
const P = await pecas(), sel = [];
for (const id of ids) { const p = P[id]; if (!p || p.status === "vendido" || !(p.preco > 0)) return j({ error: "peca", id }, 400); sel.push(p); }
const cau = Math.round(sel.reduce((a, p) => a + p.preco, 0) * 100);
const lista = sel.map(p => p.marca + " " + p.nome + " (" + p.preco + " €)").join("; ");
const fd = d => d.split("-").reverse().join("/");
const f = new URLSearchParams();
f.set("mode", "payment");
f.set("locale", "pt");
f.set("customer_email", email);
f.set("client_reference_id", code);
f.set("success_url", "https://benditocloset.pt/emprestimo/?pago=" + code);
f.set("cancel_url", "https://benditocloset.pt/emprestimo/#caucao");
f.set("line_items[0][quantity]", "1");
f.set("line_items[0][price_data][currency]", "eur");
f.set("line_items[0][price_data][unit_amount]", String(cau));
f.set("line_items[0][price_data][product_data][name]", "Caução (devolvida) · pedido " + code);
f.set("line_items[0][price_data][product_data][description]", lista.slice(0, 480));
const meta = { pedido: code, pecas: lista.slice(0, 490), datas: fd(d1) + " a " + fd(d2), entrega: ENVIO[ship], caucao_eur: (cau / 100).toFixed(2) };
for (const [k, v] of Object.entries(meta)) { f.set("metadata[" + k + "]", v); f.set("payment_intent_data[metadata][" + k + "]", v); }
f.set("payment_intent_data[description]", "Caução empréstimo " + code + " · " + (cau / 100) + " €");
const call = x => fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { "Authorization": "Bearer " + env.STRIPE_KEY, "Content-Type": "application/x-www-form-urlencoded" }, body: x });
const f2 = new URLSearchParams(f);
["card", "mb_way", "multibanco"].forEach((t, i) => f2.set("payment_method_types[" + i + "]", t));
let r = await call(f2.toString()), s = await r.json();
if (!r.ok) { r = await call(f.toString()); s = await r.json(); }
if (!r.ok || !s.url) return j({ error: "stripe", detail: s.error && s.error.message }, 502);
return j({ url: s.url, caucao: cau / 100, total: cau / 100 });
}
};
