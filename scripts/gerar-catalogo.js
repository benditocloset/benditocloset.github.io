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

// ── SEO para o Google: sitemap.xml + dados estruturados (JSON-LD) no index.html ──
const hoje = new Date().toISOString().slice(0, 10);
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const paginas = ["/", "/looks/", "/lojas/", "/imprensa/", "/lojas/exemplos/maison-amande/", "/lojas/exemplos/bigodes/"];
const disp = PECAS.filter(p => p.foto && p.status === "disponivel");
const urls = [...paginas.map(u => SITE + u), ...disp.map(p => `${SITE}/?peca=${encodeURIComponent(p.id)}`)];
fs.writeFileSync(path.join(root, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${esc(u)}</loc><lastmod>${hoje}</lastmod></url>`).join("\n") + `\n</urlset>\n`);
const ld = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "OnlineStore", "@id": SITE + "/#loja", name: "Bendito Closet", url: SITE + "/",
      logo: SITE + "/img/logo.jpg", image: SITE + "/img/logo.jpg",
      description: "Brechó online de moda de marca em segunda mão: bolsas, casacos, roupas, sapatos e acessórios. Peças únicas, envio para Portugal e toda a Europa.",
      areaServed: "Europe", sameAs: ["https://www.instagram.com/benditocloset.pt/"] },
    { "@type": "ItemList", name: "Peças disponíveis", itemListElement: disp.map((p, i) => ({
      "@type": "ListItem", position: i + 1, item: {
        "@type": "Product", name: `${p.marca} – ${p.nome}`, sku: p.id, brand: { "@type": "Brand", name: p.marca },
        image: (p.fotos && p.fotos.length ? p.fotos : [p.foto]).map(f => `${SITE}/${f}`),
        description: `${p.nome}. ${p.detalhe || ""}`.trim(),
        url: `${SITE}/?peca=${encodeURIComponent(p.id)}`,
        offers: { "@type": "Offer", price: Number(p.preco).toFixed(2), priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          itemCondition: condicao(p.detalhe) === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
          url: `${SITE}/?peca=${encodeURIComponent(p.id)}`, seller: { "@id": SITE + "/#loja" } } } })) }
  ]
};
const bloco = `<script type="application/ld+json" id="ld">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;
let novo = html.replace(/<script type="application\/ld\+json" id="ld">[\s\S]*?<\/script>/, bloco);
if (novo === html && !html.includes('id="ld"')) novo = html.replace("</head>", bloco + "\n</head>");
fs.writeFileSync(path.join(root, "index.html"), novo);
console.log(`sitemap.xml: ${urls.length} links · JSON-LD: ${disp.length} produtos`);
