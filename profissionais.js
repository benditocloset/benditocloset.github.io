/* Cadastro PROFISSIONAL (imprensa, stylists, criadoras de conteúdo, marcas), separado da lista de clientes.
   Uso: <div data-profissional="Origem"></div> + <script src="/profissionais.js" defer></script>
   Chega a ola@benditocloset.pt (FormSubmit) com o assunto "Novo contacto profissional: <tipo>". */
(function () {
  var TX = {
    pt: { k: "Lista profissional", t: "Imprensa, stylists e collabs", p: "Receba primeiro os comunicados, as peças novas disponíveis para empréstimo e os convites para collabs. É uma lista à parte das clientes, sem promoções.",
      n: "Nome", e: "E-mail", v: "Veículo, marca ou @ Instagram", tipo: "Sou…", tipos: ["Jornalista ou imprensa", "Stylist ou produção (empréstimo de peças)", "Criadora de conteúdo (collabs)", "Marca ou parceria", "Outro"],
      b: "Quero estar na lista", c: "Aceito receber e-mails profissionais do Bendito Closet. Posso cancelar quando quiser.", need: "Preencha o nome, o e-mail, escolha uma opção e marque a caixa.", ok: "Obrigada! Já está na lista profissional do Bendito Closet. Vai receber as novidades em primeira mão." },
    en: { k: "Professional list", t: "Press, stylists and collabs", p: "Be the first to get press releases, new pieces available to borrow and collab invitations. A separate list from customers, no promotions.",
      n: "Name", e: "E-mail", v: "Publication, brand or @Instagram", tipo: "I am…", tipos: ["Journalist or press", "Stylist or production (borrowing pieces)", "Content creator (collabs)", "Brand or partnership", "Other"],
      b: "Add me to the list", c: "I agree to receive professional e-mails from Bendito Closet. I can unsubscribe at any time.", need: "Fill in your name and e-mail, choose an option and tick the box.", ok: "Thank you! You're on the Bendito Closet professional list. You'll hear the news first." }
  };
  function lang() { var l = (document.documentElement.lang || "pt").slice(0, 2).toLowerCase(); return TX[l] ? l : "pt"; }
  var css = document.createElement("style");
  css.textContent = ".pf-box{border:1px solid rgba(201,163,106,.45);background:#121212;color:#ece2d2;padding:28px 22px;margin:44px auto;max-width:760px;text-align:left;font-family:Montserrat,system-ui,sans-serif}" +
    ".pf-box .pf-k{font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:#c9a36a;font-weight:600}" +
    ".pf-box h3{font-family:'Cormorant Garamond',Georgia,serif;font-weight:600;font-size:clamp(26px,5vw,34px);line-height:1.15;margin:8px 0;color:#fff}" +
    ".pf-box p{margin:0 0 16px;color:#cfc4b4;font-size:14.5px;line-height:1.55}" +
    ".pf-box form{display:grid;gap:10px}.pf-box input[type=text],.pf-box input[type=email],.pf-box select{width:100%;border:1px solid #4a4237;background:#1b1b1b;color:#fff;padding:12px 14px;font:inherit;font-size:15px;border-radius:2px}" +
    ".pf-box button{justify-self:start;border:1px solid #c9a36a;background:#c9a36a;color:#0b0b0b;padding:12px 22px;font:600 14px Montserrat,system-ui,sans-serif;letter-spacing:.04em;cursor:pointer;border-radius:2px}" +
    ".pf-box label{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:#b8ab97;line-height:1.4}.pf-box label input{margin-top:2px;accent-color:#c9a36a}" +
    ".pf-box .pf-h{color:#ffb4a0;font-size:13px}.pf-box .pf-ok{font-size:16px;color:#fff;margin:4px 0 0}";
  document.head.appendChild(css);
  function render(el) {
    var t = TX[lang()], done = false;
    try { done = localStorage.getItem("bc-profissional") === "sim"; } catch (e) {}
    if (done) { el.innerHTML = '<div class="pf-box"><div class="pf-k">' + t.k + '</div><h3>' + t.t + '</h3><p class="pf-ok">' + t.ok + '</p></div>'; return; }
    var opts = '<option value="" selected disabled>' + t.tipo + '</option>' + t.tipos.map(function (o) { return '<option>' + o + '</option>'; }).join("");
    el.innerHTML = '<div class="pf-box"><div class="pf-k">' + t.k + '</div><h3>' + t.t + '</h3><p>' + t.p + '</p><form novalidate>' +
      '<input type="text" name="nome" autocomplete="name" placeholder="' + t.n + '" aria-label="' + t.n + '">' +
      '<input type="email" name="email" autocomplete="email" placeholder="' + t.e + '" aria-label="' + t.e + '">' +
      '<select name="tipo" aria-label="' + t.tipo + '">' + opts + '</select>' +
      '<input type="text" name="veiculo" placeholder="' + t.v + '" aria-label="' + t.v + '">' +
      '<label><input type="checkbox"> <span>' + t.c + '</span></label><div class="pf-h" hidden>' + t.need + '</div>' +
      '<button type="submit">' + t.b + '</button></form></div>';
    var f = el.querySelector("form");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var g = function (n) { return (f.querySelector("[name=" + n + "]").value || "").trim(); };
      var ok = f.querySelector("label input").checked, h = f.querySelector(".pf-h");
      if (!g("nome") || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g("email")) || !g("tipo") || !ok) { h.hidden = false; return; }
      try {
        fetch("https://formsubmit.co/ajax/ola@benditocloset.pt", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ nome: g("nome"), email: g("email"), tipo: g("tipo"), veiculo: g("veiculo"), lingua: lang(), origem: "Lista profissional · " + (el.getAttribute("data-profissional") || "Site"), consentimento: "Sim",
            _subject: "Novo contacto profissional: " + g("tipo"), _template: "table", _captcha: "false" }), keepalive: true }).catch(function () {});
      } catch (x) {}
      try { localStorage.setItem("bc-profissional", "sim"); } catch (x) {}
      el.querySelector(".pf-box").innerHTML = '<div class="pf-k">' + t.k + '</div><h3>' + t.t + '</h3><p class="pf-ok">' + t.ok + '</p>';
    });
  }
  function all() { document.querySelectorAll("[data-profissional]").forEach(render); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", all); else all();
})();
