// Gera scripts/stripe-plano.json: o que cada link de pagamento Stripe deve ter
// (preço normal e Black Friday, tamanho da peça e portes).  Uso: node scripts/stripe-plano.js
//
// Regras de portes (por tamanho da peça):
//   pequena (roupas, acessórios): PT continental 6 € · Açores/Madeira 6 € · Europa 12 €
//   média   (sapatos, bolsas):    PT continental 10 € · Açores/Madeira 10 € · Europa 24 €
//   grande  (casacos):            PT continental 12 € · Açores/Madeira 10 € · Europa 24 €
//   Preço do link ≥ 100 €: portes grátis só em Portugal continental; Açores/Madeira e Europa pagam.
//   (O cacifo InPost foi retirado a 25/11/2026: só CTT com entrega em casa.)
// Black Friday: não há links próprios — o site preenche BLACKFRIDAY15 / BENDITO10BF no checkout.
// O campo "bf" fica só como referência do preço com −15%.
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const PECAS = vm.runInNewContext(html.match(/const PECAS = (\[[\s\S]*?\n\]);/)[1]);

const TAM = { roupas: "pequena", acessorios: "pequena", sapatos: "media", bolsas: "media", casacos: "grande" };
const PORTES = {
  pequena: { cont: 6, ilhas: 6, europa: 12 },
  media:   { cont: 10, ilhas: 10, europa: 24 },
  grande:  { cont: 12, ilhas: 10, europa: 24 },
};
const portes = (preco, tam) => preco >= 100
  ? { cont: 0, ilhas: PORTES[tam].ilhas, europa: PORTES[tam].europa }
  : { ...PORTES[tam] };

const plano = PECAS.filter(p => p.status !== "vendido" && (p.foto || p.fotos)).map(p => {
  const tam = TAM[p.cat]; if (!tam) throw new Error(`Categoria sem tamanho: ${p.cat} (${p.id})`);
  const bf = Math.round(p.preco * 0.85);
  return {
    id: p.id, nome: `${p.marca} – ${p.nome}`, tam,
    foto: `https://benditocloset.pt/${(p.fotos || [p.foto])[0]}`,
    normal: { preco: p.preco, portes: portes(p.preco, tam) },
    bf: { preco: bf, portes: portes(bf, tam) },
  };
});
fs.writeFileSync(path.join(__dirname, "stripe-plano.json"), JSON.stringify(plano, null, 1) + "\n");
console.log(`stripe-plano.json: ${plano.length} peças`);
