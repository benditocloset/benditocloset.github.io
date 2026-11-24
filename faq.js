/* Assistente de perguntas frequentes (sem IA, respostas fixas, 6 línguas). */
(function () {
  var WA = '351936796783';
  var D = {
    pt: { btn: 'Ajuda', t: 'Olá! Como posso ajudar?', s: 'Escolha uma pergunta:', back: '‹ Outras perguntas', wa: 'Falar com a Marianna no WhatsApp', waMsg: 'Olá! Tenho uma dúvida.', q: [
      ['Quanto custam os portes?', 'Os portes são calculados no pagamento, conforme o tamanho da peça e o destino:<br>• Roupa e acessórios: 6 € em Portugal, 12 € para a Europa<br>• Sapatos e malas: 10 € em Portugal, 24 € para a Europa<br>• Casacos: 12 € no continente, 10 € nas ilhas, 24 € para a Europa<br><b>Portes grátis em compras acima de 100 € em Portugal.</b>'],
      ['Quanto tempo demora a entrega?', 'Enviamos por CTT, com código de seguimento, em até 2 dias úteis depois do pagamento. Em Portugal chega normalmente em poucos dias úteis; para o resto da Europa pode demorar um pouco mais.'],
      ['Como posso pagar?', 'Toque em <b>“Comprar”</b> na peça: abre o pagamento seguro, com cartão, MB WAY, Apple Pay, Google Pay ou Klarna. Quer várias peças? Junte-as ao saco e envie o pedido: combinamos um só envio.'],
      ['Posso pagar em prestações?', 'Sim. Com a Klarna, paga em 3 prestações sem juros. Sujeito a verificação de elegibilidade pela Klarna. Podem ser aplicadas taxas por atraso.'],
      ['As peças são originais?', 'Sim. São peças originais, do meu armário e de closets que eu escolho. Na descrição de cada peça indicamos o estado e qualquer defeito.'],
      ['Como sei o tamanho certo?', 'O tamanho está na descrição de cada peça. Se quiser medidas exatas, pergunte-me no WhatsApp: envio fotos com a fita métrica.'],
      ['A peça ainda está disponível?', 'Se tem o botão “Comprar”, está disponível. Cada peça é única: quando é vendida, aparece como “Vendido”.'],
      ['Posso devolver?', 'Sim, até 14 dias depois de receber. Avise-nos primeiro pelo WhatsApp. A peça tem de voltar no mesmo estado. Os portes da devolução ficam a cargo da cliente e devolvemos o valor pago assim que recebermos a peça.'],
      ['Há algum desconto?', 'Inscreva-se com o seu email no site e ganhe <b>10% na primeira compra</b>. Na Black Friday (27 a 29 de novembro) há −15% em tudo, e os 10% acumulam.'],
      ['Quero vender as minhas peças aqui', 'Abrimos o seu closet no nosso site: escolhemos até 5 peças consigo, criamos fotos profissionais e publicamos no site e no Instagram. Veja em <a href="/#venda-connosco">“Abra o seu closet”</a>.']
    ]},
    en: { btn: 'Help', t: 'Hi! How can I help?', s: 'Choose a question:', back: '‹ Other questions', wa: 'Chat with Marianna on WhatsApp', waMsg: 'Hi! I have a question.', q: [
      ['How much is shipping?', 'Shipping is calculated at checkout, based on the size of the piece and the destination:<br>• Clothing and accessories: €6 in Portugal, €12 to Europe<br>• Shoes and bags: €10 in Portugal, €24 to Europe<br>• Coats: €12 mainland, €10 islands, €24 to Europe<br><b>Free shipping on orders over €100 in Portugal.</b>'],
      ['How long does delivery take?', 'We ship with CTT, with tracking, within 2 working days of payment. In Portugal it usually arrives in a few working days; elsewhere in Europe it may take a little longer.'],
      ['How can I pay?', 'Tap <b>“Buy now”</b> on the piece: a secure checkout opens, with card, MB WAY, Apple Pay, Google Pay or Klarna. Want several pieces? Add them to the bag and send the order: we combine them into one shipment.'],
      ['Can I pay in instalments?', 'Yes. With Klarna, pay in 3 interest-free instalments. Subject to eligibility check by Klarna. Late fees may apply.'],
      ['Are the pieces authentic?', 'Yes. They are original pieces from my wardrobe and from closets I select. Each description states the condition and any flaws.'],
      ['How do I know my size?', 'The size is in each description. For exact measurements, ask me on WhatsApp and I will send photos with a tape measure.'],
      ['Is the piece still available?', 'If it has the “Buy now” button, it is available. Every piece is one of a kind: once sold, it shows as “Sold”.'],
      ['Can I return it?', 'Yes, up to 14 days after delivery. Let us know first on WhatsApp. The piece must come back in the same condition. Return shipping is paid by the customer and we refund the amount paid as soon as we receive it.'],
      ['Is there a discount?', 'Sign up with your email on the site and get <b>10% off your first purchase</b>. On Black Friday (27–29 November) everything is −15%, and the 10% stacks.'],
      ['I want to sell my pieces here', 'We open your closet on our site: we pick up to 5 pieces with you, create professional photos and publish them on the site and Instagram. See <a href="/#venda-connosco">“Open your closet”</a>.']
    ]},
    es: { btn: 'Ayuda', t: '¡Hola! ¿En qué puedo ayudar?', s: 'Elige una pregunta:', back: '‹ Otras preguntas', wa: 'Hablar con Marianna por WhatsApp', waMsg: '¡Hola! Tengo una duda.', q: [
      ['¿Cuánto cuesta el envío?', 'El envío se calcula en el pago, según el tamaño de la prenda y el destino:<br>• Ropa y accesorios: 6 € en Portugal, 12 € a Europa<br>• Zapatos y bolsos: 10 € en Portugal, 24 € a Europa<br>• Abrigos: 12 € en el continente, 10 € en las islas, 24 € a Europa<br><b>Envío gratis en compras de más de 100 € en Portugal.</b>'],
      ['¿Cuánto tarda la entrega?', 'Enviamos por CTT, con seguimiento, en un máximo de 2 días laborables tras el pago. En Portugal suele llegar en pocos días laborables; al resto de Europa puede tardar algo más.'],
      ['¿Cómo puedo pagar?', 'Toca <b>“Comprar”</b> en la prenda: se abre el pago seguro, con tarjeta, MB WAY, Apple Pay, Google Pay o Klarna. ¿Varias prendas? Añádelas a la bolsa y envía el pedido: hacemos un solo envío.'],
      ['¿Puedo pagar a plazos?', 'Sí. Con Klarna, pagas en 3 plazos sin intereses. Sujeto a verificación de elegibilidad por Klarna. Pueden aplicarse cargos por retraso.'],
      ['¿Las prendas son originales?', 'Sí. Son prendas originales, de mi armario y de closets que selecciono. En cada descripción indicamos el estado y cualquier defecto.'],
      ['¿Cómo sé mi talla?', 'La talla está en cada descripción. Para medidas exactas, pregúntame por WhatsApp y te envío fotos con cinta métrica.'],
      ['¿La prenda sigue disponible?', 'Si tiene el botón “Comprar”, está disponible. Cada prenda es única: cuando se vende, aparece como “Vendido”.'],
      ['¿Puedo devolverla?', 'Sí, hasta 14 días después de recibirla. Avísanos antes por WhatsApp. La prenda debe volver en el mismo estado. El envío de la devolución corre a cargo de la clienta y devolvemos el importe pagado en cuanto la recibimos.'],
      ['¿Hay algún descuento?', 'Suscríbete con tu email en la web y consigue <b>un 10% en tu primera compra</b>. En Black Friday (27–29 de noviembre) hay −15% en todo, y el 10% se suma.'],
      ['Quiero vender mis prendas aquí', 'Abrimos tu closet en nuestra web: elegimos contigo hasta 5 prendas, hacemos fotos profesionales y las publicamos en la web y en Instagram. Mira <a href="/#venda-connosco">“Abre tu closet”</a>.']
    ]},
    fr: { btn: 'Aide', t: 'Bonjour ! Comment puis-je aider ?', s: 'Choisissez une question :', back: '‹ Autres questions', wa: 'Écrire à Marianna sur WhatsApp', waMsg: 'Bonjour ! J\'ai une question.', q: [
      ['Combien coûte la livraison ?', 'La livraison est calculée au paiement, selon la taille de la pièce et la destination :<br>• Vêtements et accessoires : 6 € au Portugal, 12 € vers l\'Europe<br>• Chaussures et sacs : 10 € au Portugal, 24 € vers l\'Europe<br>• Manteaux : 12 € sur le continent, 10 € dans les îles, 24 € vers l\'Europe<br><b>Livraison offerte au-delà de 100 € au Portugal.</b>'],
      ['Quel est le délai de livraison ?', 'Nous expédions par CTT, avec suivi, sous 2 jours ouvrés après le paiement. Au Portugal, cela arrive en général en quelques jours ouvrés ; ailleurs en Europe, cela peut prendre un peu plus.'],
      ['Comment payer ?', 'Touchez <b>« Acheter »</b> sur la pièce : le paiement sécurisé s\'ouvre, par carte, MB WAY, Apple Pay, Google Pay ou Klarna. Plusieurs pièces ? Ajoutez-les au panier et envoyez la commande : un seul envoi.'],
      ['Puis-je payer en plusieurs fois ?', 'Oui. Avec Klarna, payez en 3 fois sans frais. Sous réserve d\'acceptation par Klarna. Des frais de retard peuvent s\'appliquer.'],
      ['Les pièces sont-elles authentiques ?', 'Oui. Ce sont des pièces originales, de ma garde-robe et de closets que je sélectionne. Chaque description indique l\'état et les éventuels défauts.'],
      ['Comment connaître ma taille ?', 'La taille figure dans chaque description. Pour des mesures exactes, demandez-moi sur WhatsApp : j\'envoie des photos avec un mètre ruban.'],
      ['La pièce est-elle encore disponible ?', 'Si elle a le bouton « Acheter », elle est disponible. Chaque pièce est unique : une fois vendue, elle apparaît comme « Vendu ».'],
      ['Puis-je la retourner ?', 'Oui, jusqu\'à 14 jours après réception. Prévenez-nous d\'abord sur WhatsApp. La pièce doit revenir dans le même état. Les frais de retour sont à la charge de la cliente et nous remboursons le montant payé dès réception.'],
      ['Y a-t-il une réduction ?', 'Inscrivez-vous avec votre email sur le site et obtenez <b>10 % sur votre premier achat</b>. Pendant le Black Friday (27–29 novembre), tout est à −15 %, et les 10 % se cumulent.'],
      ['Je veux vendre mes pièces ici', 'Nous ouvrons votre closet sur notre site : nous choisissons avec vous jusqu\'à 5 pièces, faisons des photos professionnelles et les publions sur le site et Instagram. Voir <a href="/#venda-connosco">« Ouvrez votre closet »</a>.']
    ]},
    de: { btn: 'Hilfe', t: 'Hallo! Wie kann ich helfen?', s: 'Wähle eine Frage:', back: '‹ Andere Fragen', wa: 'Marianna auf WhatsApp schreiben', waMsg: 'Hallo! Ich habe eine Frage.', q: [
      ['Was kostet der Versand?', 'Der Versand wird an der Kasse berechnet, je nach Größe des Teils und Ziel:<br>• Kleidung und Accessoires: 6 € in Portugal, 12 € nach Europa<br>• Schuhe und Taschen: 10 € in Portugal, 24 € nach Europa<br>• Mäntel: 12 € Festland, 10 € Inseln, 24 € nach Europa<br><b>Kostenloser Versand ab 100 € in Portugal.</b>'],
      ['Wie lange dauert die Lieferung?', 'Wir versenden mit CTT, mit Sendungsverfolgung, innerhalb von 2 Werktagen nach Zahlung. In Portugal kommt es meist in wenigen Werktagen an; im restlichen Europa kann es etwas länger dauern.'],
      ['Wie kann ich bezahlen?', 'Tippe beim Teil auf <b>„Kaufen“</b>: Die sichere Kasse öffnet sich, mit Karte, MB WAY, Apple Pay, Google Pay oder Klarna. Mehrere Teile? Leg sie in die Tasche und sende die Bestellung: ein gemeinsamer Versand.'],
      ['Kann ich in Raten zahlen?', 'Ja. Mit Klarna zahlst du in 3 zinsfreien Raten. Vorbehaltlich der Prüfung durch Klarna. Es können Mahngebühren anfallen.'],
      ['Sind die Teile echt?', 'Ja. Es sind Originalteile aus meinem Kleiderschrank und aus Closets, die ich auswähle. Jede Beschreibung nennt den Zustand und eventuelle Mängel.'],
      ['Wie finde ich meine Größe?', 'Die Größe steht in jeder Beschreibung. Für genaue Maße frag mich auf WhatsApp: Ich schicke Fotos mit Maßband.'],
      ['Ist das Teil noch verfügbar?', 'Wenn es den Button „Kaufen“ hat, ist es verfügbar. Jedes Teil ist ein Unikat: Nach dem Verkauf steht es als „Verkauft“.'],
      ['Kann ich zurückgeben?', 'Ja, bis 14 Tage nach Erhalt. Sag uns zuerst auf WhatsApp Bescheid. Das Teil muss im gleichen Zustand zurückkommen. Die Rücksendekosten trägt die Kundin, und wir erstatten den gezahlten Betrag nach Erhalt.'],
      ['Gibt es einen Rabatt?', 'Melde dich mit deiner E-Mail auf der Website an und erhalte <b>10 % auf deinen ersten Einkauf</b>. Am Black Friday (27.–29. November) gibt es −15 % auf alles, und die 10 % kommen dazu.'],
      ['Ich möchte meine Teile hier verkaufen', 'Wir eröffnen dein Closet auf unserer Website: Wir wählen mit dir bis zu 5 Teile aus, machen Profifotos und veröffentlichen sie auf der Website und auf Instagram. Siehe <a href="/#venda-connosco">„Dein Closet“</a>.']
    ]},
    it: { btn: 'Aiuto', t: 'Ciao! Come posso aiutarti?', s: 'Scegli una domanda:', back: '‹ Altre domande', wa: 'Scrivi a Marianna su WhatsApp', waMsg: 'Ciao! Ho una domanda.', q: [
      ['Quanto costa la spedizione?', 'La spedizione si calcola al pagamento, in base alla taglia del capo e alla destinazione:<br>• Abbigliamento e accessori: 6 € in Portogallo, 12 € verso l\'Europa<br>• Scarpe e borse: 10 € in Portogallo, 24 € verso l\'Europa<br>• Cappotti: 12 € continente, 10 € isole, 24 € verso l\'Europa<br><b>Spedizione gratuita sopra i 100 € in Portogallo.</b>'],
      ['Quanto tempo ci vuole?', 'Spediamo con CTT, con tracciamento, entro 2 giorni lavorativi dal pagamento. In Portogallo arriva di solito in pochi giorni lavorativi; nel resto d\'Europa può volerci un po\' di più.'],
      ['Come posso pagare?', 'Tocca <b>“Acquista”</b> sul capo: si apre il pagamento sicuro, con carta, MB WAY, Apple Pay, Google Pay o Klarna. Più capi? Aggiungili alla borsa e invia l\'ordine: un\'unica spedizione.'],
      ['Posso pagare a rate?', 'Sì. Con Klarna paghi in 3 rate senza interessi. Soggetto a verifica di idoneità da parte di Klarna. Possono essere applicate penali per ritardo.'],
      ['I capi sono originali?', 'Sì. Sono capi originali, dal mio armadio e da closet che seleziono. Ogni descrizione indica lo stato e gli eventuali difetti.'],
      ['Come scelgo la taglia?', 'La taglia è in ogni descrizione. Per misure esatte chiedimi su WhatsApp: invio foto con il metro.'],
      ['Il capo è ancora disponibile?', 'Se ha il pulsante “Acquista”, è disponibile. Ogni capo è unico: una volta venduto, appare come “Venduto”.'],
      ['Posso restituirlo?', 'Sì, entro 14 giorni dalla consegna. Avvisaci prima su WhatsApp. Il capo deve tornare nelle stesse condizioni. La spedizione del reso è a carico della cliente e rimborsiamo l\'importo pagato appena lo riceviamo.'],
      ['C\'è uno sconto?', 'Iscriviti con la tua email sul sito e ottieni <b>il 10% sul primo acquisto</b>. Al Black Friday (27–29 novembre) tutto è −15%, e il 10% si somma.'],
      ['Voglio vendere i miei capi qui', 'Apriamo il tuo closet sul nostro sito: scegliamo con te fino a 5 capi, facciamo foto professionali e li pubblichiamo sul sito e su Instagram. Vedi <a href="/#venda-connosco">“Apri il tuo closet”</a>.']
    ]}
  };
  function L() { var l = (document.documentElement.lang || 'pt').slice(0, 2); return D[l] ? l : 'pt'; }
  var css = '#faqbtn{position:fixed;right:14px;bottom:14px;z-index:40;display:flex;align-items:center;gap:7px;background:#c9a36a;color:#141012;border:0;border-radius:999px;padding:11px 16px;font:700 14px Montserrat,system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.45)}' +
    '#faqbtn svg{width:18px;height:18px}' +
    '#faqbox{position:fixed;right:14px;bottom:70px;z-index:41;width:min(360px,calc(100vw - 28px));max-height:min(560px,calc(100vh - 100px));overflow:auto;background:#141012;color:#f4ece4;border:1px solid #c9a36a;border-radius:16px;padding:16px;font:14px/1.5 Montserrat,system-ui,sans-serif;box-shadow:0 14px 40px rgba(0,0,0,.55);display:none}' +
    '#faqbox.open{display:block}#faqbox h3{margin:0 24px 4px 0;font:600 20px "Cormorant Garamond",Georgia,serif;color:#fff}#faqbox p.s{margin:0 0 10px;color:#b8ab97;font-size:13px}' +
    '#faqbox .q{display:block;width:100%;text-align:left;background:none;border:1px solid #3a2f2a;color:#f4ece4;border-radius:10px;padding:9px 12px;margin:0 0 7px;font:inherit;cursor:pointer}#faqbox .q:hover{border-color:#c9a36a}' +
    '#faqbox .a{background:#1e1719;border-radius:10px;padding:12px;margin:8px 0}#faqbox .a a{color:#c9a36a}#faqbox .bk{background:none;border:0;color:#c9a36a;font:inherit;cursor:pointer;padding:0}' +
    '#faqbox .wa{display:block;text-align:center;margin-top:10px;background:#25d366;color:#0b2414;border-radius:10px;padding:10px;font-weight:700;text-decoration:none}' +
    '#faqbox .xx{position:absolute;top:10px;right:12px;background:none;border:0;color:#b8ab97;font-size:20px;cursor:pointer}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var btn = document.createElement('button'); btn.id = 'faqbtn'; btn.type = 'button';
  var box = document.createElement('div'); box.id = 'faqbox'; box.setAttribute('role', 'dialog');
  function wa(d) { return '<a class="wa" href="https://wa.me/' + WA + '?text=' + encodeURIComponent(d.waMsg) + '" target="_blank" rel="noopener">' + d.wa + '</a>'; }
  function lista() { var d = D[L()]; box.innerHTML = '<button class="xx" type="button" aria-label="×">×</button><h3>' + d.t + '</h3><p class="s">' + d.s + '</p>' +
      d.q.map(function (x, i) { return '<button class="q" type="button" data-i="' + i + '">' + x[0] + '</button>'; }).join('') + wa(d); }
  function resp(i) { var d = D[L()], x = d.q[i]; box.innerHTML = '<button class="xx" type="button" aria-label="×">×</button><button class="bk" type="button">' + d.back + '</button><h3 style="margin-top:8px">' + x[0] + '</h3><div class="a">' + x[1] + '</div>' + wa(d); box.scrollTop = 0; }
  function label() { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>' + D[L()].btn; }
  btn.addEventListener('click', function () { if (box.classList.toggle('open')) lista(); });
  box.addEventListener('click', function (e) {
    var q = e.target.closest('.q'); if (q) return resp(+q.dataset.i);
    if (e.target.closest('.bk')) return lista();
    if (e.target.closest('.xx') || e.target.closest('a[href^="/#"]')) box.classList.remove('open');
  });
  new MutationObserver(function () { label(); if (box.classList.contains('open')) lista(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  function go() { label(); document.body.appendChild(btn); document.body.appendChild(box); }
  document.body ? go() : document.addEventListener('DOMContentLoaded', go);
})();
