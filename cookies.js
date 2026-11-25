/* Aviso de cookies (só aparece uma vez). Sem "Aceitar", o Google não guarda cookies de publicidade. */
(function () {
  var k = 'bc-cookies', v; try { v = localStorage.getItem(k); } catch (e) {}
  /* Pixel da Meta: só carrega depois de a visitante aceitar */
  function px() {
    if (window.fbq) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '1925398431782482'); fbq('track', 'PageView');
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="buy.stripe.com"]');
    if (a && window.fbq) fbq('track', 'InitiateCheckout');
  }, true);
  if (v === 'sim') px();
  if (v) return;
  var L = (document.documentElement.lang || 'pt').slice(0, 2);
  var T = {
    pt: ['Usamos cookies do Google e da Meta para medir os nossos anúncios. Aceita?', 'Aceitar', 'Recusar'],
    en: ['We use Google and Meta cookies to measure our ads. Do you accept?', 'Accept', 'Decline'],
    es: ['Usamos cookies de Google y Meta para medir nuestros anuncios. ¿Aceptas?', 'Aceptar', 'Rechazar'],
    fr: ['Nous utilisons des cookies Google et Meta pour mesurer nos annonces. Acceptez-vous ?', 'Accepter', 'Refuser'],
    de: ['Wir verwenden Google- und Meta-Cookies, um unsere Anzeigen zu messen. Einverstanden?', 'Akzeptieren', 'Ablehnen'],
    it: ['Usiamo cookie di Google e Meta per misurare i nostri annunci. Accetti?', 'Accetta', 'Rifiuta']
  }[L] || null;
  T = T || ['Usamos cookies do Google e da Meta para medir os nossos anúncios. Aceita?', 'Aceitar', 'Recusar'];
  var b = document.createElement('div');
  b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Cookies');
  b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:520px;margin:0 auto;background:#141012;color:#f4ece4;border:1px solid #c9a36a;border-radius:14px;padding:10px 12px;font:12.5px/1.4 Montserrat,system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4);display:flex;gap:10px;align-items:center;flex-wrap:wrap';
  b.innerHTML = '<span style="flex:1 1 220px">' + T[0] + '</span>' +
    '<button data-v="nao" style="background:none;border:1px solid #c9a36a;color:#c9a36a;border-radius:999px;padding:6px 12px;font:inherit;cursor:pointer">' + T[2] + '</button>' +
    '<button data-v="sim" style="background:#c9a36a;border:0;color:#111;border-radius:999px;padding:6px 14px;font:600 12.5px Montserrat,system-ui,sans-serif;cursor:pointer">' + T[1] + '</button>';
  b.addEventListener('click', function (e) {
    var x = e.target.getAttribute && e.target.getAttribute('data-v'); if (!x) return;
    try { localStorage.setItem(k, x); } catch (er) {}
    if (x === 'sim') px();
    if (x === 'sim' && window.gtag) gtag('consent', 'update', {ad_storage:'granted', ad_user_data:'granted', ad_personalization:'granted', analytics_storage:'granted'});
    b.remove();
  });
  (document.body ? Promise.resolve() : new Promise(function (r) { document.addEventListener('DOMContentLoaded', r); })).then(function () { document.body.appendChild(b); });
})();
