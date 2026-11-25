/* Kit dos exemplos: faixa "projeto conceito" e aviso (toast) para ações simuladas. */
(function(){
  var b=document.createElement('div');b.className='kit-bar';
  b.innerHTML='Projeto conceito: negócio inventado por Marianna Werneck para mostrar o tipo de site que pode ter. <a href="/lojas/#exemplos">Quero um site assim →</a>';
  document.body.prepend(b);
  var s=document.createElement('style');s.textContent='.kit-bar{background:#111;color:#eee;font:500 13px/1.4 "DM Sans",system-ui,sans-serif;text-align:center;padding:9px 14px}.kit-bar a{color:#f3c98b;font-weight:600;white-space:nowrap}.kit-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(140%);max-width:min(460px,calc(100vw - 32px));background:#111;color:#fff;font:400 14px/1.45 "DM Sans",system-ui,sans-serif;padding:14px 18px;border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,.3);z-index:999;transition:transform .35s cubic-bezier(.2,.8,.2,1)}.kit-toast.on{transform:translateX(-50%) translateY(0)}.kit-toast a{color:#f3c98b;font-weight:600}';
  document.head.appendChild(s);
  var t=document.createElement('div');t.className='kit-toast';t.setAttribute('role','status');document.body.appendChild(t);var h;
  window.kitToast=function(msg){t.innerHTML=msg+' <a href="/lojas/#exemplos">Quero um site assim →</a>';t.classList.add('on');clearTimeout(h);h=setTimeout(function(){t.classList.remove('on')},6500)};
})();
