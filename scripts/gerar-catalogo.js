// Gera catalogo.csv (feed de produtos para o Meta Commerce Manager / Instagram Shopping)
// a partir da lista PECAS do index.html.  Uso: node scripts/gerar-catalogo.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const m = html.match(/const PECAS = (\[[\s\S]*?\n\]);/);
if (!m) throw new Error("Lista PECAS não encontrada");
const PECAS = vm.runInNewContext(m[1]);
const SITE = "https://benditocloset.pt";
const condicao = d => {
  const t = (d || "").toLowerCase();
  const semNunca = t.replace(/nunca usad\w*/g, "");
  if (/usad|seminov|sinais de uso|marcas de uso/.test(semNunca)) return "used";  // já foi usada
  if (/nunca usad|com etiqueta|\bnov[oa]s?\b/.test(t)) return "new";            // nunca usada / com etiqueta
  return "used";
};
const csv = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
const cols = ["id","title","description","availability","condition","price","link","image_link","additional_image_link","brand"];
const linhas = [cols.join(",")];
let n = 0;
for (const p of PECAS) {
  if (!p.foto) continue;                      // sem foto não entra no catálogo
  const extra = (p.fotos || []).filter(f => f !== p.foto).map(f => `${SITE}/${f}`).join(",");
  linhas.push([
    p.id,
    `${p.marca} – ${p.nome}`.slice(0, 200),
    `${p.nome}. ${(p.detalhe || "").replace(/[.\s]*$/, ".")} Peça única, em segunda mão, da loja Bendito Closet. Compra pelo WhatsApp.`.slice(0, 9999),
    p.status === "disponivel" ? "in stock" : "out of stock",
    condicao(p.detalhe),
    `${Number(p.preco).toFixed(2)} EUR`,
    `${SITE}/?peca=${encodeURIComponent(p.id)}`,
    `${SITE}/${p.foto}`,
    extra,
    p.marca,
  ].map(csv).join(","));
  n++;
}
fs.writeFileSync(path.join(root, "catalogo.csv"), linhas.join("\n") + "\n");
console.log(`catalogo.csv: ${n} peças`);
