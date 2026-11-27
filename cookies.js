/* Aviso de cookies (só aparece uma vez). Sem "Aceitar", o Google não guarda cookies de publicidade. */
/* Contagem anónima de visitas e cliques (sem cookies, sem dados pessoais): só números por dia, para o resumo diário */
(function () {
  var U = 'https://bendito-provador-ia.nn45hn9bvr.workers.dev/ev';
  /* Aparelhos da Marianna não contam: abrir uma vez benditocloset.pt/?dono=1 (desfazer com ?dono=0) */
  var dono = false; try { var q = location.search; if (/[?&]dono=1/.test(q)) localStorage.setItem('bc-dono', '1'); if (/[?&]dono=0/.test(q)) localStorage.removeItem('bc-dono'); dono = localStorage.getItem('bc-dono') === '1'; } catch (x) {}
  window.bcEv = function (e) { if (dono) return; try { navigator.sendBeacon(U, new Blob([JSON.stringify({ e: e, p: location.pathname })], { type: 'text/plain' })); } catch (x) {} };
  var ev = 'pv';
  try { var h = new Date().toISOString().slice(0, 10); if (localStorage.getItem('bc-vis') !== h) { localStorage.setItem('bc-vis', h); ev = ['pv', 'vis']; } } catch (x) {}
  bcEv(ev);
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : null; if (!t) return;
    if (t.closest('[data-buy]')) bcEv('cartao'); /* botão Comprar (mesmo quando o link de reserva é o WhatsApp) */
    else if (t.closest('a[href*="wa.me"],a[href*="api.whatsapp"]')) bcEv('whatsapp');
    else if (t.closest('a[href*="buy.stripe.com"]')) bcEv('cartao');
    /* o saco conta-se no próprio site, só quando a peça entra (tirar do saco não conta) */
  }, true);
})();
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
  b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#FAF6F0;color:#1C1517;border-top:1px solid #1C1517;padding:12px 18px;font:300 12.5px/1.45 Jost,"Helvetica Neue",Arial,sans-serif;display:flex;gap:10px 16px;align-items:center;justify-content:center;flex-wrap:wrap';
  var bt = 'background:none;border:1px solid #1C1517;color:#1C1517;border-radius:0;padding:8px 16px;font:500 10.5px/1 Jost,"Helvetica Neue",Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;cursor:pointer';
  b.innerHTML = '<span style="flex:1 1 220px;max-width:420px">' + T[0] + '</span>' +
    '<span style="display:flex;gap:10px"><button data-v="nao" style="' + bt + '">' + T[2] + '</button>' +
    '<button data-v="sim" style="' + bt + ';background:#1C1517;color:#FAF6F0">' + T[1] + '</button></span>';
  b.addEventListener('click', function (e) {
    var x = e.target.getAttribute && e.target.getAttribute('data-v'); if (!x) return;
    try { localStorage.setItem(k, x); } catch (er) {}
    if (x === 'sim') px();
    if (x === 'sim' && window.gtag) gtag('consent', 'update', {ad_storage:'granted', ad_user_data:'granted', ad_personalization:'granted', analytics_storage:'granted'});
    b.remove();
  });
  (document.body ? Promise.resolve() : new Promise(function (r) { document.addEventListener('DOMContentLoaded', r); })).then(function () { document.body.appendChild(b); });
})();
