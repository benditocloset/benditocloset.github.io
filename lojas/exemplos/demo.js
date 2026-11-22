/* Demonstração para os sites de exemplo: assistente com IA (simulado) e "como aparece no Google" (simulado).
   Cada página define window.DEMO antes de carregar este ficheiro. */
(function () {
  const D = window.DEMO; if (!D) return;
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const css = `
  .dm-fab{position:fixed;left:18px;bottom:18px;z-index:90;display:flex;align-items:center;gap:10px;border:0;cursor:pointer;
    background:${D.cor};color:${D.corTexto||"#fff"};padding:12px 18px 12px 14px;border-radius:999px;font:600 14px/1 ${D.fonte};
    box-shadow:0 10px 30px rgba(0,0,0,.18)}
  .dm-fab i{font-style:normal;font-size:20px}
  .dm-fab small{display:block;font-weight:400;font-size:11px;opacity:.8;margin-top:3px}
  .dm-chat{position:fixed;left:18px;bottom:18px;z-index:91;width:min(370px,calc(100vw - 36px));height:min(560px,calc(100vh - 36px));
    background:#fff;border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;font:400 14px/1.45 ${D.fonte};color:#222}
  .dm-chat.on{display:flex}
  .dm-hd{background:${D.cor};color:${D.corTexto||"#fff"};padding:14px 16px;display:flex;align-items:center;gap:10px}
  .dm-hd b{font-size:15px;display:block}.dm-hd span{font-size:11.5px;opacity:.85}
  .dm-hd button{margin-left:auto;background:none;border:0;color:inherit;font-size:22px;cursor:pointer;line-height:1}
  .dm-av{width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.22);display:grid;place-items:center;font-size:18px;flex:none}
  .dm-note{background:#FFF7E0;color:#6b5600;font-size:11.5px;padding:7px 14px;border-bottom:1px solid #f0e2b0}
  .dm-msgs{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px;background:#f7f5f2}
  .dm-m{max-width:84%;padding:9px 12px;border-radius:14px;white-space:pre-line}
  .dm-bot{background:#fff;border:1px solid #eee;align-self:flex-start;border-bottom-left-radius:4px}
  .dm-me{background:${D.cor};color:${D.corTexto||"#fff"};align-self:flex-end;border-bottom-right-radius:4px}
  .dm-typing{color:#999;font-size:12px;align-self:flex-start}
  .dm-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;background:#f7f5f2;border-top:1px solid #eee}
  .dm-chips button{border:1px solid ${D.cor};color:${D.cor};background:#fff;border-radius:999px;padding:6px 10px;font:500 12.5px/1 ${D.fonte};cursor:pointer}
  .dm-in{display:flex;border-top:1px solid #eee}
  .dm-in input{flex:1;border:0;padding:13px 14px;font:inherit;outline:none}
  .dm-in button{border:0;background:none;color:${D.cor};font-weight:700;padding:0 16px;cursor:pointer;font:700 14px ${D.fonte}}
  .dm-g{max-width:1100px;margin:0 auto;padding:70px 24px}
  .dm-g h2{font-family:${D.fonteTitulo||D.fonte};margin:0 0 8px}
  .dm-g p.dm-sub{color:#666;margin:0 0 22px;max-width:620px}
  .dm-g .dm-q{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
  .dm-g .dm-q button{border:1px solid #ccc;background:#fff;border-radius:999px;padding:8px 14px;cursor:pointer;font:500 13px ${D.fonte};color:#333}
  .dm-g .dm-q button.on{border-color:${D.cor};background:${D.cor};color:${D.corTexto||"#fff"}}
  .dm-serp{background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:20px 22px;font-family:Arial,Helvetica,sans-serif;color:#202124;box-shadow:0 4px 18px rgba(0,0,0,.05)}
  .dm-bar{display:flex;align-items:center;gap:10px;border:1px solid #dfe1e5;border-radius:24px;padding:10px 16px;margin-bottom:18px;font-size:15px}
  .dm-bar span{color:#9aa0a6}
  .dm-tag{display:inline-block;font:600 10px/1 Arial;letter-spacing:.08em;color:#6b5600;background:#FFF2C4;border-radius:4px;padding:4px 6px;margin-bottom:12px}
  .dm-r{margin-bottom:22px}.dm-r:last-child{margin-bottom:0}
  .dm-site{display:flex;align-items:center;gap:10px;font-size:13px}
  .dm-fav{width:26px;height:26px;border-radius:50%;background:${D.cor};color:${D.corTexto||"#fff"};display:grid;place-items:center;font-size:13px}
  .dm-site small{display:block;color:#4d5156;font-size:12px}
  .dm-r a{display:block;color:#1a0dab;font-size:19px;margin:6px 0 3px;text-decoration:none}
  .dm-r p{margin:0;color:#4d5156;font-size:14px;line-height:1.55}
  .dm-meta{color:#4d5156;font-size:13px;margin-top:4px}
  .dm-links{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 24px;margin:10px 0 0 14px}
  .dm-links a{font-size:15px;margin:0}.dm-links p{font-size:12.5px}
  .dm-prod{display:flex;gap:12px;overflow:auto;padding-bottom:4px}
  .dm-card{flex:0 0 160px;border:1px solid #e5e5e5;border-radius:12px;padding:10px;font-size:13px}
  .dm-card .ic{height:80px;border-radius:8px;display:grid;place-items:center;font-size:34px;margin-bottom:8px}
  .dm-card b{display:block;font-weight:400;color:#202124;margin-bottom:4px}
  .dm-card strong{font-size:15px}.dm-card em{display:block;font-style:normal;color:#188038;font-size:12px;margin-top:2px}
  .dm-foot{font-size:12px;color:#888;margin-top:14px}
  @media(max-width:640px){.dm-fab small{display:none}.dm-links{grid-template-columns:1fr}}`;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);

  /* ---------- Assistente (simulação) ---------- */
  document.body.insertAdjacentHTML("beforeend", `
  <button class="dm-fab" type="button" aria-label="Abrir assistente"><i>${D.icone || "✨"}</i><span>Pergunte ao assistente<small>IA · demonstração</small></span></button>
  <section class="dm-chat" role="dialog" aria-label="Assistente virtual">
    <div class="dm-hd"><div class="dm-av">${D.icone || "✨"}</div><div><b>${esc(D.assistente)}</b><span>Assistente com IA · responde 24h</span></div><button type="button" aria-label="Fechar">×</button></div>
    <div class="dm-note">Demonstração com respostas de exemplo. Numa loja real, a IA responde a qualquer pergunta com base no seu catálogo e nas suas regras.</div>
    <div class="dm-msgs"></div>
    <div class="dm-chips"></div>
    <form class="dm-in"><input placeholder="Escreva a sua pergunta…" aria-label="Pergunta"><button>Enviar</button></form>
  </section>`);
  const fab = document.querySelector(".dm-fab"), chat = document.querySelector(".dm-chat"),
        msgs = chat.querySelector(".dm-msgs"), chips = chat.querySelector(".dm-chips"),
        form = chat.querySelector("form"), input = form.querySelector("input");
  const add = (t, me) => { const d = document.createElement("div"); d.className = "dm-m " + (me ? "dm-me" : "dm-bot"); d.textContent = t; msgs.appendChild(d); msgs.scrollTop = 1e6; };
  const answer = q => { const n = norm(q); const hit = D.respostas.find(r => r.k.some(k => n.includes(norm(k)))); return hit ? hit.r : D.fallback; };
  let busy = false;
  const ask = q => {
    if (!q.trim() || busy) return; busy = true; add(q, true); input.value = "";
    const t = document.createElement("div"); t.className = "dm-typing"; t.textContent = "a escrever…"; msgs.appendChild(t); msgs.scrollTop = 1e6;
    setTimeout(() => { t.remove(); add(answer(q)); busy = false; }, 700 + Math.random() * 600);
  };
  chips.innerHTML = D.sugestoes.map(s => `<button type="button">${esc(s)}</button>`).join("");
  chips.addEventListener("click", e => { if (e.target.tagName === "BUTTON") ask(e.target.textContent); });
  form.addEventListener("submit", e => { e.preventDefault(); ask(input.value); });
  let started = false;
  fab.addEventListener("click", () => { chat.classList.add("on"); fab.style.display = "none"; if (!started) { started = true; add(D.saudacao); } input.focus(); });
  chat.querySelector(".dm-hd button").addEventListener("click", () => { chat.classList.remove("on"); fab.style.display = ""; });

  /* ---------- Google (simulação) ---------- */
  const G = D.google;
  const sec = document.createElement("section"); sec.className = "dm-g"; sec.id = "google";
  sec.innerHTML = `<h2>Como esta loja aparece no Google</h2>
    <p class="dm-sub">Cada produto tem página própria, com nome, preço e disponibilidade num formato que os motores de pesquisa leem. Toque numa pesquisa para ver um exemplo.</p>
    <div class="dm-q">${G.pesquisas.map((p, i) => `<button type="button" class="${i ? "" : "on"}">${esc(p.q)}</button>`).join("")}</div>
    <div class="dm-serp"></div>
    <p class="dm-foot">Simulação ilustrativa. A posição real nos resultados depende da concorrência e do tempo, e nenhuma loja tem o primeiro lugar garantido.</p>`;
  (document.querySelector(D.antesDe) || document.querySelector("footer")).before(sec);
  const serp = sec.querySelector(".dm-serp");
  const site = `<div class="dm-site"><div class="dm-fav">${D.icone || "✨"}</div><div>${esc(D.nome)}<small>${esc(G.url)}</small></div></div>`;
  const pinta = i => {
    const p = G.pesquisas[i];
    serp.innerHTML = `<div class="dm-tag">SIMULAÇÃO</div><div class="dm-bar"><span>🔍</span>${esc(p.q)}</div>` +
      (p.produtos ? `<div class="dm-r"><div style="font-size:16px;margin-bottom:10px">Produtos</div><div class="dm-prod">${p.produtos.map(x =>
        `<div class="dm-card"><div class="ic" style="background:${x.bg}">${x.ic}</div><b>${esc(x.n)}</b><strong>${esc(x.pr)}</strong><em>${esc(D.nome)}</em></div>`).join("")}</div></div>` : "") +
      `<div class="dm-r">${site}<a href="#">${esc(p.titulo)}</a><p>${esc(p.desc)}</p>${p.meta ? `<div class="dm-meta">${esc(p.meta)}</div>` : ""}` +
      (p.links ? `<div class="dm-links">${p.links.map(l => `<div><a href="#">${esc(l[0])}</a><p>${esc(l[1])}</p></div>`).join("")}</div>` : "") + `</div>`;
    serp.querySelectorAll("a").forEach(a => a.addEventListener("click", e => e.preventDefault()));
  };
  sec.querySelector(".dm-q").addEventListener("click", e => {
    if (e.target.tagName !== "BUTTON") return;
    sec.querySelectorAll(".dm-q button").forEach(b => b.classList.toggle("on", b === e.target));
    pinta([...e.target.parentNode.children].indexOf(e.target));
  });
  pinta(0);
})();
