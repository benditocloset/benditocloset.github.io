// Copia os links de pagamento de scripts/stripe-links.json para a constante STRIPE do index.html.
// stripe-links.json: { "id-da-peca": { "normal": "https://buy.stripe.com/...", "bf": "https://buy.stripe.com/..." } }
// Uso: node scripts/stripe-aplicar.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const links = JSON.parse(fs.readFileSync(path.join(__dirname, "stripe-links.json"), "utf8"));
const mapa = {};
for (const [id, l] of Object.entries(links)) {
  for (const u of [l.normal, l.bf]) if (u && !/^https:\/\/buy\.stripe\.com\//.test(u)) throw new Error(`Link inválido em ${id}: ${u}`);
  mapa[id] = [l.normal || "", l.bf || ""];
}
const f = path.join(root, "index.html");
const html = fs.readFileSync(f, "utf8");
const novo = html.replace(/const STRIPE = \{[^\n]*\};/, `const STRIPE = ${JSON.stringify(mapa)};`);
if (novo === html && !html.includes(`const STRIPE = ${JSON.stringify(mapa)};`)) throw new Error("Constante STRIPE não encontrada");
fs.writeFileSync(f, novo);
console.log(`STRIPE: ${Object.keys(mapa).length} peças com link`);
