/* Cadastro na revista/mailing do Bendito Closet.
   Uso: <div data-assinar="Origem"></div> + <script src="/assinar.js" defer></script>
   Os e-mails chegam a ola@benditocloset.pt (FormSubmit), com consentimento explícito. */
(function () {
  var TX = {
    pt: { k: "Bendito Edit · todos os meses", t: "Receba a revista no seu e-mail", p: "Os looks do mês, as peças novas antes de todos e o cupão BENDITO10 (−10% na 1.ª compra).", e: "O seu e-mail", b: "Quero receber", c: "Aceito receber e-mails do Bendito Closet. Posso cancelar quando quiser.", need: "Escreva o seu e-mail e marque a caixa.", ok: "Está inscrita! ✦ O seu cupão: BENDITO10 (−10% na 1.ª compra)." },
    en: { k: "Bendito Edit · every month", t: "Get the magazine in your inbox", p: "The looks of the month, new pieces before anyone else and the BENDITO10 coupon (−10% on your first order).", e: "Your e-mail", b: "Sign me up", c: "I agree to receive e-mails from Bendito Closet. I can unsubscribe at any time.", need: "Enter your e-mail and tick the box.", ok: "You're in! ✦ Your coupon: BENDITO10 (−10% on your first order)." },
    es: { k: "Bendito Edit · cada mes", t: "Recibe la revista en tu e-mail", p: "Los looks del mes, las piezas nuevas antes que nadie y el cupón BENDITO10 (−10% en tu primera compra).", e: "Tu e-mail", b: "Quiero recibirla", c: "Acepto recibir e-mails de Bendito Closet. Puedo darme de baja cuando quiera.", need: "Escribe tu e-mail y marca la casilla.", ok: "¡Ya estás dentro! ✦ Tu cupón: BENDITO10 (−10% en tu primera compra)." },
    fr: { k: "Bendito Edit · chaque mois", t: "Recevez le magazine par e-mail", p: "Les looks du mois, les nouvelles pièces en avant-première et le code BENDITO10 (−10 % sur la 1re commande).", e: "Votre e-mail", b: "Je m'inscris", c: "J'accepte de recevoir des e-mails de Bendito Closet. Désinscription à tout moment.", need: "Indiquez votre e-mail et cochez la case.", ok: "C'est fait ! ✦ Votre code : BENDITO10 (−10 % sur la 1re commande)." },
    de: { k: "Bendito Edit · jeden Monat", t: "Das Magazin per E-Mail", p: "Die Looks des Monats, neue Teile vor allen anderen und der Code BENDITO10 (−10 % auf die erste Bestellung).", e: "Deine E-Mail", b: "Anmelden", c: "Ich möchte E-Mails von Bendito Closet erhalten. Abmeldung jederzeit möglich.", need: "Gib deine E-Mail ein und setze das Häkchen.", ok: "Du bist dabei! ✦ Dein Code: BENDITO10 (−10 % auf die erste Bestellung)." },
    it: { k: "Bendito Edit · ogni mese", t: "Ricevi la rivista via e-mail", p: "I look del mese, i nuovi capi in anteprima e il codice BENDITO10 (−10% sul primo ordine).", e: "La tua e-mail", b: "Iscrivimi", c: "Accetto di ricevere e-mail da Bendito Closet. Posso disiscrivermi quando voglio.", need: "Scrivi la tua e-mail e spunta la casella.", ok: "Sei iscritta! ✦ Il tuo codice: BENDITO10 (−10% sul primo ordine)." }
  };
  function lang() { var l = (document.documentElement.lang || "pt").slice(0, 2).toLowerCase(); return TX[l] ? l : "pt"; }
  var css = document.createElement("style");
  css.textContent = ".as-box{background:#1C1517;color:#F7EFE8;border-radius:18px;padding:28px 22px;margin:34px auto;max-width:760px;font-family:'DM Sans',system-ui,sans-serif;text-align:left}" +
    ".as-box .as-k{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#E7A6B8;font-weight:600}" +
    ".as-box h3{font-family:'Bodoni Moda',Georgia,serif;font-weight:400;font-style:italic;font-size:clamp(26px,5vw,36px);line-height:1.1;margin:8px 0 8px;color:#fff}" +
    ".as-box p{margin:0 0 16px;color:#d8cdc6;font-size:14.5px;line-height:1.5}" +
    ".as-box form{display:flex;gap:8px;flex-wrap:wrap}.as-box input[type=email]{flex:1 1 220px;min-width:0;border:1px solid #5b4d50;background:#2a2124;color:#fff;border-radius:999px;padding:13px 18px;font:inherit;font-size:15px}" +
    ".as-box button{border:0;border-radius:999px;padding:13px 22px;background:#E7A6B8;color:#1C1517;font:600 14px 'DM Sans',system-ui,sans-serif;cursor:pointer}" +
    ".as-box label{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:#bfb2ab;margin-top:12px;line-height:1.4}.as-box label input{margin-top:2px;accent-color:#E7A6B8}" +
    ".as-box .as-h{color:#ffb4c2;font-size:13px;margin-top:8px}.as-box .as-ok{font-size:16px;color:#fff;margin:4px 0 0}";
  document.head.appendChild(css);
  function render(el) {
    var t = TX[lang()], done = false;
    try { done = localStorage.getItem("bc-revista") === "inscrita"; } catch (e) {}
    el.innerHTML = '<div class="as-box"><div class="as-k">' + t.k + '</div><h3>' + t.t + '</h3>' +
      (done ? '<p class="as-ok">' + t.ok + '</p>' :
      '<p>' + t.p + '</p><form novalidate><input type="email" autocomplete="email" placeholder="' + t.e + '" aria-label="' + t.e + '" required><button type="submit">' + t.b + '</button></form>' +
      '<label><input type="checkbox"> <span>' + t.c + ' <a href="/privacidade/" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">' + (lang()==="pt"?"Política de privacidade":"Privacy policy") + '</a></span></label><div class="as-h" hidden>' + t.need + '</div>') + '</div>';
    var f = el.querySelector("form"); if (!f) return;
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var em = f.querySelector("input[type=email]").value.trim(), ok = el.querySelector("label input").checked, h = el.querySelector(".as-h");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) || !ok) { h.hidden = false; return; }
      try {
        fetch("https://formsubmit.co/ajax/ola@benditocloset.pt", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ email: em, lingua: lang(), origem: el.getAttribute("data-assinar") || "Site", consentimento: "Sim", _subject: "Nova inscrição na revista Bendito Edit", _template: "table", _captcha: "false" }), keepalive: true }).catch(function () {});
      } catch (x) {}
      try { localStorage.setItem("bc-revista", "inscrita"); localStorage.setItem("bc-cupao", "BENDITO10"); } catch (x) {}
      el.querySelector(".as-box").innerHTML = '<div class="as-k">' + t.k + '</div><h3>' + t.t + '</h3><p class="as-ok">' + t.ok + '</p>';
    });
  }
  function all() { document.querySelectorAll("[data-assinar]").forEach(render); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", all); else all();
  new MutationObserver(all).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  window.bcAssinar = all;
})();
