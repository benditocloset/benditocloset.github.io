/* País de quem se inscreve: lista curta, já escolhida pelo fuso horário do telemóvel (a pessoa só confirma).
   Usado por assinar.js, profissionais.js e o pop-up do index. Envia o código ISO e o nome em português. */
(function () {
  var CODES = ["PT", "BR", "ES", "FR", "IT", "DE", "GB", "IE", "CH", "BE", "NL", "LU", "AT", "US", "CA", "AO", "MZ"];
  var PT = { PT: "Portugal", BR: "Brasil", ES: "Espanha", FR: "França", IT: "Itália", DE: "Alemanha", GB: "Reino Unido", IE: "Irlanda", CH: "Suíça", BE: "Bélgica", NL: "Países Baixos", LU: "Luxemburgo", AT: "Áustria", US: "Estados Unidos", CA: "Canadá", AO: "Angola", MZ: "Moçambique", XX: "Outro" };
  var TZ = { "Europe/Lisbon": "PT", "Atlantic/Madeira": "PT", "Atlantic/Azores": "PT", "Europe/Madrid": "ES", "Atlantic/Canary": "ES", "Africa/Ceuta": "ES",
    "Europe/Paris": "FR", "Europe/Rome": "IT", "Europe/Berlin": "DE", "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Zurich": "CH",
    "Europe/Brussels": "BE", "Europe/Amsterdam": "NL", "Europe/Luxembourg": "LU", "Europe/Vienna": "AT", "Africa/Luanda": "AO", "Africa/Maputo": "MZ" };
  var L = { pt: ["País", "Outro"], en: ["Country", "Other"], es: ["País", "Otro"], fr: ["Pays", "Autre"], de: ["Land", "Anderes"], it: ["Paese", "Altro"] };
  function guess() {
    var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    if (TZ[tz]) return TZ[tz];
    if (/^America\/(Sao_Paulo|Fortaleza|Recife|Bahia|Belem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Maceio|Araguaina|Noronha|Santarem)$/.test(tz)) return "BR";
    if (/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina)$/.test(tz)) return "CA";
    if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit)$|^Pacific\/Honolulu$/.test(tz)) return "US";
    return "";
  }
  function nome(code, lang) {
    if (code === "XX") return (L[lang] || L.pt)[1];
    try { return new Intl.DisplayNames([lang || "pt"], { type: "region" }).of(code) || PT[code]; } catch (e) { return PT[code] || code; }
  }
  function select(lang, cls) {
    lang = L[lang] ? lang : "pt";
    var g = guess(), lbl = L[lang][0];
    var list = CODES.map(function (c) { return [c, nome(c, lang)]; }).sort(function (a, b) { return a[1].localeCompare(b[1], lang); });
    return '<select name="pais" class="' + (cls || "") + '" aria-label="' + lbl + '"><option value=""' + (g ? "" : " selected") + ' disabled>' + lbl + '</option>' +
      list.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === g ? " selected" : "") + '>' + x[1] + '</option>'; }).join("") +
      '<option value="XX">' + L[lang][1] + '</option></select>';
  }
  /* O que vai no e-mail da inscrição: "Reino Unido (GB)" + o fuso, para confirmar. */
  function valor(sel) {
    var c = sel && sel.value; var tz = ""; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    return { pais: c ? (PT[c] || c) + " (" + c + ")" : "Não indicado", fuso: tz };
  }
  window.bcPais = { select: select, valor: valor, guess: guess };
})();
