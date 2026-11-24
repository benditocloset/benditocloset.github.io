// Copia os links de pagamento de scripts/stripe-links.json para a constante STRIPE do index.html.
// stripe-links.json: { "id-da-peca": { "normal": "https://buy.stripe.com/...", "plink": "plink_..." } }
// Uso: node scripts/stripe-aplicar.js
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const links = JSON.parse(fs.readFileSync(path.join(__dirname, "stripe-links.json"), "utf8"));
const mapa = {};
for (const [id, l] of Object.entries(links)) {
  if (!/^https:\/\/buy\.stripe\.com\/\w+$/.test(l.normal || "")) throw new Error(`Link inválido em ${id}: ${l.normal}`);
  mapa[id] = l.normal;
}
const f = path.join(root, "index.html");
const html = fs.readFileSync(f, "utf8");
if (!/const STRIPE = \{[^\n]*\};/.test(html)) throw new Error("Constante STRIPE não encontrada");
fs.writeFileSync(f, html.replace(/const STRIPE = \{[^\n]*\};/, `const STRIPE = ${JSON.stringify(mapa)};`));
console.log(`STRIPE: ${Object.keys(mapa).length} peças com link`);
