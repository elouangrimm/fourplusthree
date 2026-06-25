/* 4×3 stats beacon — anonymous, fire-and-forget telemetry to the CF Worker.
 * No PII: a random per-browser id, the puzzle date, and the result numbers.
 * Set EP to your deployed Worker URL. Failures are swallowed so the game never
 * depends on it. */
(function () {
  "use strict";
  var EP = "https://fourbythree-stats.hankmt.workers.dev";

  function anon() {
    try {
      var k = localStorage.getItem("x43_anon");
      if (!k) {
        k = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : (Date.now().toString(36) + Math.random().toString(36).slice(2));
        localStorage.setItem("x43_anon", k);
      }
      return k;
    } catch (e) { return ""; }
  }
  function dev() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "mobile" : "desktop";
  }
  function src() {
    try {
      var r = document.referrer || "";
      if (/t\.co|twitter\.com|x\.com/i.test(r)) return "twitter";
      if (/youtube\.com|youtu\.be/i.test(r)) return "youtube";
      if (!r) return "direct";
      return "other";
    } catch (e) { return "other"; }
  }
  function send(path, body) {
    try {
      var s = JSON.stringify(body);
      if (navigator.sendBeacon) { navigator.sendBeacon(EP + path, s); return; }
      fetch(EP + path, { method: "POST", body: s, keepalive: true, mode: "no-cors" });
    } catch (e) {}
  }

  /* Call once when a puzzle is finished. ev = {p, rel, w, m, s, ms, st, ad} */
  window.x43beacon = function (ev) {
    var id = anon(); if (!id || !ev || !ev.p) return;
    send("/e", {
      v: 1, id: id, p: ev.p,
      rel: ev.rel ? 1 : 0, w: ev.w ? 1 : 0,
      m: ev.m | 0, s: ev.s | 0, ms: ev.ms | 0, st: ev.st | 0,
      ad: ev.ad ? 1 : 0,
      src: src(), dev: dev()
    });
  };

  /* Call when the player taps share for a given puzzle date. */
  window.x43share = function (p) {
    var id = anon(); if (!id || !p) return;
    send("/s", { id: id, p: p });
  };
})();
