/* Aviso de cookies (só aparece uma vez). Sem "Aceitar", o Google não guarda cookies de publicidade. */
(function () {
  var k = 'bc-cookies', v; try { v = localStorage.getItem(k); } catch (e) {}
  if (v) return;
  var L = (document.documentElement.lang || 'pt').slice(0, 2);
  var T = {
    pt: ['Usamos cookies do Google para medir os nossos anúncios. Aceita?', 'Aceitar', 'Recusar'],
    en: ['We use Google cookies to measure our ads. Do you accept?', 'Accept', 'Decline'],
    es: ['Usamos cookies de Google para medir nuestros anuncios. ¿Aceptas?', 'Aceptar', 'Rechazar'],
    fr: ['Nous utilisons des cookies Google pour mesurer nos annonces. Acceptez-vous ?', 'Accepter', 'Refuser'],
    de: ['Wir verwenden Google-Cookies, um unsere Anzeigen zu messen. Einverstanden?', 'Akzeptieren', 'Ablehnen'],
    it: ['Usiamo cookie di Google per misurare i nostri annunci. Accetti?', 'Accetta', 'Rifiuta']
  }[L] || null;
  T = T || ['Usamos cookies do Google para medir os nossos anúncios. Aceita?', 'Aceitar', 'Recusar'];
  var b = document.createElement('div');
  b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Cookies');
  b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:520px;margin:0 auto;background:#141012;color:#f4ece4;border:1px solid #c9a36a;border-radius:14px;padding:14px 16px;font:14px/1.45 Montserrat,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);display:flex;gap:10px;align-items:center;flex-wrap:wrap';
  b.innerHTML = '<span style="flex:1 1 220px">' + T[0] + '</span>' +
    '<button data-v="nao" style="background:none;border:1px solid #c9a36a;color:#c9a36a;border-radius:999px;padding:8px 14px;font:inherit;cursor:pointer">' + T[2] + '</button>' +
    '<button data-v="sim" style="background:#c9a36a;border:0;color:#111;border-radius:999px;padding:8px 16px;font:600 14px Montserrat,system-ui,sans-serif;cursor:pointer">' + T[1] + '</button>';
  b.addEventListener('click', function (e) {
    var x = e.target.getAttribute && e.target.getAttribute('data-v'); if (!x) return;
    try { localStorage.setItem(k, x); } catch (er) {}
    if (x === 'sim' && window.gtag) gtag('consent', 'update', {ad_storage:'granted', ad_user_data:'granted', ad_personalization:'granted', analytics_storage:'granted'});
    b.remove();
  });
  (document.body ? Promise.resolve() : new Promise(function (r) { document.addEventListener('DOMContentLoaded', r); })).then(function () { document.body.appendChild(b); });
})();
