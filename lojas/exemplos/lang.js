/* Botão PT | EN dos sites de exemplo. Em inglês, traduz o texto da página com /lojas/exemplos/en.json
   (também o texto que aparece depois: avisos, carrinho, assistente). Partilha a escolha com o resto do site (bc-lang). */
(function () {
  var KEY = "bc-lang", q = null, saved = null;
  try { q = new URLSearchParams(location.search).get("lang"); } catch (e) {}
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var nav = (navigator.languages && navigator.languages[0]) || navigator.language || "pt";
  var lang = q || saved || (/^pt/i.test(nav) ? "pt" : "en");
  lang = lang === "en" ? "en" : "pt";
  if (q) try { localStorage.setItem(KEY, lang); } catch (e) {}

  var css = document.createElement("style");
  css.textContent = ".lg-sw{position:fixed;top:12px;right:12px;z-index:1000;display:flex;}.lg-sw.in{position:static;display:inline-flex;vertical-align:middle;margin:2px 0 2px 10px;box-shadow:none;background:rgba(255,255,255,.14)}.lg-sw{background:rgba(17,17,17,.88);border-radius:999px;padding:3px;font:600 12px/1 'DM Sans',system-ui,sans-serif;letter-spacing:.06em;box-shadow:0 6px 18px rgba(0,0,0,.18)}" +
    ".lg-sw button{border:0;background:none;color:#eee;padding:7px 11px;border-radius:999px;cursor:pointer;font:inherit}.lg-sw button[aria-pressed=true]{background:#f3c98b;color:#111}" +
    "html.lg-wait body{opacity:0}body{transition:opacity .2s}";
  document.head.appendChild(css);

  function sw() {
    var d = document.createElement("div"); d.className = "lg-sw"; d.setAttribute("role", "group"); d.setAttribute("aria-label", "Idioma / Language");
    ["pt", "en"].forEach(function (l) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = l.toUpperCase(); b.setAttribute("lang", l === "pt" ? "pt-PT" : "en");
      b.setAttribute("aria-pressed", l === lang);
      b.onclick = function () { if (l === lang) return; try { localStorage.setItem(KEY, l); } catch (e) {} var u = new URL(location.href); u.searchParams.delete("lang"); location.href = u.toString(); };
      d.appendChild(b);
    });
    var bar = document.querySelector(".kit-bar") || [].find.call(document.body.children, function (e) { return /Projeto conceito|Concept project/.test(e.textContent) && e.getBoundingClientRect().top < 5; });
    if (bar) { d.classList.add("in"); bar.appendChild(d); } else document.body.appendChild(d);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(sw, 0); }); else setTimeout(sw, 0);
  if (lang !== "en") return;

  document.documentElement.classList.add("lg-wait");
  document.documentElement.lang = "en";
  var unhide = setTimeout(function () { document.documentElement.classList.remove("lg-wait"); }, 1500);

  var D = {};
  var DAYS = { "segunda-feira": "Monday", "terça-feira": "Tuesday", "quarta-feira": "Wednesday", "quinta-feira": "Thursday", "sexta-feira": "Friday", "sábado": "Saturday", "domingo": "Sunday" };
  var MONTHS = { janeiro: "January", fevereiro: "February", "março": "March", abril: "April", maio: "May", junho: "June", julho: "July", agosto: "August", setembro: "September", outubro: "October", novembro: "November", dezembro: "December" };
  function t(s) { return D[s] || s; }
  function data(s) { // "quinta-feira, 26 de novembro" -> "Thursday, 26 November"
    return s.replace(/(segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|domingo), (\d+) de (\p{L}+)/u, function (m, d, n, mo) { return (DAYS[d] || d) + ", " + n + " " + (MONTHS[mo] || mo); });
  }
  var R = [
    [/^(\d+) de (\d+)$/, function (m) { return m[1] + " of " + m[2]; }],
    [/^Juntar (.+) ao carrinho$/, function (m) { return "Add " + t(m[1]) + " to cart"; }],
    [/^Juntar (.+)$/, function (m) { return "Add " + t(m[1]); }],
    [/^Menos (.+)$/, function (m) { return "Less " + t(m[1]); }],
    [/^Mais (.+)$/, function (m) { return "More " + t(m[1]); }],
    [/^Total: (.+)$/, function (m) { return "Total: " + m[1]; }],
    [/^Para “(.+)”, o plano ideal é$/, function (m) { return "For “" + m[1] + "”, the ideal plan is"; }],
    [/^(.+) · (\d+) €\/mês\. Num site real, abria aqui o pagamento por cartão ou MB WAY e a cliente recebia o acesso na hora\.$/, function (m) { return t(m[1]) + " · €" + m[2] + "/month. On a real site, card or MB WAY payment would open here and the client would get access instantly."; }],
    [/^Numa tasca real, seguia agora para o WhatsApp: “(.+)”, com o total e a hora de levantamento\.$/, function (m) { return "In a real tavern, this would now go to WhatsApp: “" + m[1].split(", ").map(function (x) { var p = x.match(/^(\d+)× (.+)$/); return p ? p[1] + "× " + t(p[2]) : x; }).join(", ") + "”, with the total and pickup time."; }],
    [/^Reserva para (\d+) pessoas às (.+)\. Num site real, a tasca recebia logo o pedido e confirmava por mensagem\.$/, function (m) { return "Table for " + m[1] + " at " + m[2] + ". On a real site, the tavern would get the request straight away and confirm by message."; }],
    [/^Marcação: (.+?), (.+) às (.+)\. Num site real, o atelier recebia a marcação e a cliente um lembrete na véspera\.$/, function (m) { return "Booking: " + t(m[1]) + ", " + data(m[2]) + " at " + m[3] + ". On a real site, the salon would get the booking and the client a reminder the day before."; }],
    [/^(segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|domingo), .+$/, function (m) { return data(m[0]).replace(" · escolha a hora", " · choose a time").replace(/ às /, " at "); }],
    [/^Faltam (\d+) macarons para encher a caixa\.$/, function (m) { return m[1] + " more macarons to fill the box."; }],
    [/^Numa loja real, seguia para o WhatsApp: “Caixa de (\d+): (.+)”\.$/, function (m) { return "In a real shop, this would go to WhatsApp: “Box of " + m[1] + ": " + m[2].split(", ").map(function (x) { var p = x.match(/^(\d+) (.+)$/); return p ? p[1] + " " + t(p[2]) : x; }).join(", ") + "”."; }],
    [/^Numa loja real, este botão enviava os (\d+) produto\(s\) para o WhatsApp da loja, já com a lista e o total\.$/, function (m) { return "In a real shop, this button would send the " + m[1] + " product(s) to the shop's WhatsApp, with the list and total."; }]
  ];
  function tr(s) {
    var k = s.replace(/\s+/g, " ").trim(); if (!k) return null;
    if (D[k]) return D[k];
    for (var i = 0; i < R.length; i++) { var m = k.match(R[i][0]); if (m) return R[i][1](m); }
    return null;
  }
  var ATTRS = ["placeholder", "alt", "title", "aria-label"];
  function node(n) {
    if (n.nodeType === 3) {
      var p = n.parentNode; if (!p || /^(SCRIPT|STYLE)$/.test(p.nodeName)) return;
      var v = tr(n.nodeValue); if (v != null && v !== n.nodeValue.trim()) {
        var lead = n.nodeValue.match(/^\s*/)[0], trail = n.nodeValue.match(/\s*$/)[0];
        n.nodeValue = lead + v + trail;
      }
    } else if (n.nodeType === 1) {
      if (/^(SCRIPT|STYLE)$/.test(n.nodeName)) return;
      ATTRS.forEach(function (a) { var v = n.getAttribute(a); if (v) { var x = tr(v); if (x != null && x !== v) n.setAttribute(a, x); } });
      for (var c = n.firstChild; c; c = c.nextSibling) node(c);
    }
  }
  function run() {
    node(document.body);
    var tt = tr(document.title); if (tt) document.title = tt;
    var md = document.querySelector("meta[name=description]"); if (md) { var x = tr(md.content); if (x) md.content = x; }
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        if (m.type === "characterData") node(m.target);
        else if (m.type === "attributes") node(m.target);
        else m.addedNodes.forEach(node);
      });
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    clearTimeout(unhide); document.documentElement.classList.remove("lg-wait");
  }
  fetch("/lojas/exemplos/en.json").then(function (r) { return r.json(); }).then(function (j) {
    D = j;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(run, 0); }); else setTimeout(run, 0);
  }).catch(function () { document.documentElement.classList.remove("lg-wait"); });
})();
