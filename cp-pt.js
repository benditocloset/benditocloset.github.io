/* Código postal português: põe o traço sozinho (4445285 → 4445-285), confirma que o código existe
   (geoapi.pt, dados oficiais dos CTT) e preenche a localidade. Funciona em qualquer campo autocomplete="postal-code". */
(function () {
  var cache = {};
  function fmt(v) { var d = String(v).replace(/\D/g, "").slice(0, 7); return d.length > 4 ? d.slice(0, 4) + "-" + d.slice(4) : d; }
  function raiz(i) { return i.closest("form") || i.closest("section") || document; }
  function ePortugal(i) { var s = raiz(i).querySelector('#pais, select[autocomplete="country-name"], select[autocomplete="country"]'); return !s || /portugal|^pt$/i.test(s.value); }
  function campoLocal(i) { return raiz(i).querySelector('#loc, input[autocomplete="address-level2"]'); }
  function msg(i, t, ok) {
    var m = i.parentNode.querySelector(".cpmsg");
    if (!m) { m = document.createElement("small"); m.className = "cpmsg"; m.style.cssText = "display:block;font-size:12px;margin-top:5px;letter-spacing:0;text-transform:none"; i.insertAdjacentElement("afterend", m); }
    m.textContent = t || ""; m.style.color = ok ? "#2e6b3f" : "#9B1B3A"; m.hidden = !t;
  }
  function verificar(i, final) {
    if (!ePortugal(i)) { i.setCustomValidity(""); msg(i, ""); return; }
    var v = i.value;
    if (!/^\d{4}-\d{3}$/.test(v)) {
      if (final && v) { i.setCustomValidity("Código postal inválido"); msg(i, "Escreva o código postal completo: 0000-000", false); }
      else { i.setCustomValidity(v ? "Código postal incompleto" : ""); msg(i, ""); }
      return;
    }
    var usar = function (o) {
      if (o === null) { i.setCustomValidity("Código postal não existe"); msg(i, "Este código postal não existe. Confirme os números.", false); return; }
      if (!o) { i.setCustomValidity(""); msg(i, ""); return; }
      i.setCustomValidity("");
      var L = o.Localidade || o["Designação Postal"] || o.Concelho || "", C = o.Concelho || "";
      msg(i, "✓ " + L + (C && C !== L ? " (" + C + ")" : ""), true);
      var loc = campoLocal(i);
      if (loc && L && (!loc.value || loc.dataset.auto === "1" || final)) { loc.value = L; loc.dataset.auto = "1"; loc.dispatchEvent(new Event("input", { bubbles: true })); }
    };
    if (v in cache) return usar(cache[v]);
    fetch("https://json.geoapi.pt/cp/" + v).then(function (r) { if (r.status === 404) return null; if (!r.ok) throw 0; return r.json(); })
      .then(function (o) { cache[v] = o && (o.CP || o.Localidade) ? o : (o === null ? null : undefined); usar(cache[v]); })
      .catch(function () { usar(undefined); });
  }
  function ligar(i) {
    if (i.dataset.cpPt) return; i.dataset.cpPt = "1";
    i.setAttribute("inputmode", "numeric"); i.setAttribute("maxlength", "8"); i.setAttribute("pattern", "\\d{4}-\\d{3}");
    i.addEventListener("input", function () { if (!ePortugal(i)) return; var p = i.selectionStart, a = i.value, b = fmt(a); if (a !== b) { i.value = b; try { i.setSelectionRange(p + (b.length - a.length), p + (b.length - a.length)); } catch (e) {} } verificar(i, false); });
    i.addEventListener("blur", function () { verificar(i, true); });
    var loc = campoLocal(i); if (loc) loc.addEventListener("input", function (e) { if (e.isTrusted) loc.dataset.auto = ""; });
    if (i.value) { if (ePortugal(i)) i.value = fmt(i.value); verificar(i, true); }
  }
  function tudo() { document.querySelectorAll('input[autocomplete="postal-code"]').forEach(ligar); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", tudo); else tudo();
  var t0; new MutationObserver(function () { clearTimeout(t0); t0 = setTimeout(tudo, 200); }).observe(document.documentElement, { childList: true, subtree: true });
})();
