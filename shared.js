"use strict";
/* Shared by index.html (the game) and the scoring / archive / build pages.
   One source of truth for the puzzle encoding, palette, dates, and point values. */

/* ---------- accessibility settings (shared across all pages) ---------- */
let A11Y = {};
try {
  A11Y = JSON.parse(localStorage.getItem("x43_a11y")) || {};
} catch (e) {}
function reduceMotion() {
  return !!A11Y.rm;
} /* checked at animation time in index.html */
/* apply the html classes as early as possible (documentElement exists in <head>) */
(function () {
  const c = document.documentElement.classList;
  c.toggle("a11y-rm", !!A11Y.rm);
  c.toggle("a11y-hc", !!A11Y.hc);
  c.toggle("a11y-bt", !!A11Y.bt);
  c.toggle("a11y-lc", !!A11Y.lc);
  c.toggle("a11y-dm", !!A11Y.dm);
  c.toggle("a11y-fd", !!A11Y.fd);
  c.toggle("a11y-nr", !!A11Y.nr);
})();

const BASE_URL = "api/internal-proxy/";

/* category palette: 0 blue, 1 green, 2 yellow, 3 purple. "Labeled colors" mode keeps
   these and just adds the colour's name to each solved tile (no recolouring). */
const BASE_COLORS = ["#5b8def", "#56b870", "#e7b416", "#a06ee1"];
const BASE_TINTS = ["#e8effc", "#e6f4ea", "#fcf3d7", "#f1e8fa"];
const BASE_MIDC = ["#b1c9f7", "#b3dcc0", "#f3da8e", "#d2b9f0"];

const DARK_COLORS = ["#8db3f7", "#79db96", "#ffd659", "#c3a6ff"];
const DARK_TINTS = ["#1a2a44", "#132d1b", "#33280c", "#25153b"];
const DARK_MIDC = ["#2b486f", "#2c5f3e", "#7d6911", "#583287"];

const COLORS = [...BASE_COLORS];
const TINTS = [...BASE_TINTS];
const MIDC = [...BASE_MIDC];

const logo = document.getElementsByClassName("logo");

function updateThemeColors() {
  const isDark = !!A11Y.dm;
  for (let i = 0; i < 4; i++) {
    COLORS[i] = isDark ? DARK_COLORS[i] : BASE_COLORS[i];
    TINTS[i] = isDark ? DARK_TINTS[i] : BASE_TINTS[i];
    MIDC[i] = isDark ? DARK_MIDC[i] : BASE_MIDC[i];
  }
  const logoEl = document.querySelector(".logo");
  const fishEl = document.querySelector(".fish");
  if (logoEl) {
    logoEl.src = isDark ? "logo-dark.png" : "logo.png";
  }
  if (fishEl) {
    fishEl.src = isDark ? "fish-dark.png" : "fish.png";
  }
}
updateThemeColors(); // run to set the colors quickly

// run again after the dom loads to fix logos
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateThemeColors);
} else {
  updateThemeColors();
}

const COLOR_NAMES = ["blue", "green", "yellow", "purple"];

/* scoring point values — change them here and every page follows */
const MISS = 15,
  MISS_LATE = 30;
const HUB_BONUS = 20,
  HUB_MID_BONUS = 20;
const PURPLE_BONUS = 15,
  RAINBOW_BONUS = 30,
  SPEED_BONUS = 30,
  BLUE_BONUS = 5;
const AD_BONUS = 5; /* clicking the ad this game */
const RULE_BREAKER_SCORE = -100;
/* solve-order achievements (category indices: 0 blue, 1 green, 2 yellow, 3 purple) */
const REV_RAINBOW = [3, 0, 1, 2]; /* purple → blue → green → yellow (+30) */
const RAINBOW = [
  2, 1, 0, 3,
]; /* yellow → green → blue → purple (the forward rainbow card) */
const GRELLOW = [
  3, 0, 2, 1,
]; /* purple → blue → yellow → green (no points, just bragging) */
const GRUE = [
  3, 1, 0, 2,
]; /* purple → green → blue → yellow (no points, just bragging) */

/* ---------- puzzle encoding ---------- */
function b64e(s) {
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function b64d(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return decodeURIComponent(escape(atob(s)));
}
function encPuzzle(p) {
  return b64e(JSON.stringify(p));
}
function decPuzzle(str) {
  const p = JSON.parse(b64d(str));
  if (!p || !p.s || !Array.isArray(p.c) || p.c.length !== 4)
    throw new Error("bad");
  return p;
}

/* ---------- dates ---------- */
function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
function fmtDate(k) {
  return new Date(k + "T12:00:00").toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ---------- small helpers ---------- */
function norm(w) {
  return String(w).trim().toUpperCase();
}
function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

/* proxy resolver function for remote file/data assets */
function pjURL(file) {
  let target = file || "puzzles.json";

  target = target.replace(/^\//, "");

  const localAssets = [
    "index.html",
    "archive.html",
    "build.html",
    "scoring.html",
    "shared.js",
    "shared.css",
    "sw.js",
    "manifest.json",
  ];
  if (localAssets.includes(target.split("?")[0])) {
    const divider = target.includes("?") ? "&" : "?";
    return target + divider + "ts=" + Date.now();
  }

  internalTarget = BASE_URL + target;
  target = BASE_URL + target;

  let dir = location.pathname;
  if (!/\/$/.test(dir)) {
    if (/\.[^/]+$/.test(dir)) dir = dir.replace(/[^/]*$/, "");
    else dir += "/";
  }

  const separator = target.includes("?") ? "&" : "?";

  if (target.startsWith("http://") || target.startsWith("https://")) {
    return dir + target + separator + "ts=" + Date.now();
  } else {
    return dir + internalTarget + separator + "ts=" + Date.now();
  }
}

/* ---------- clipboard ---------- */
function copyText(text, btn) {
  const done = () => {
    if (btn) {
      const o = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = o), 1400);
    }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(done)
      .catch(() => fallbackCopy(text, done));
  } else fallbackCopy(text, done);
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (e) {}
  document.body.removeChild(ta);
  done();
}

/* ---------- accessibility menu (top-right ♿, on every page) ---------- */
function buildA11yMenu() {
  if (document.getElementById("a11yBtn")) return;
  const btn = document.createElement("button");
  btn.id = "a11yBtn";
  btn.type = "button";
  btn.textContent = "Settings";
  /* accessible name = visible "Settings" (so voice control matches); described as a popup */
  btn.setAttribute("aria-haspopup", "true");
  btn.setAttribute("aria-expanded", "false");
  const menu = document.createElement("div");
  menu.id = "a11yMenu";
  menu.hidden = true;
  menu.setAttribute("role", "group");
  menu.setAttribute("aria-label", "Accessibility options");
  const opt = (k, label) =>
    "<label class='a11y-opt'><input type='checkbox' data-k='" +
    k +
    "'" +
    (A11Y[k] ? " checked" : "") +
    "><span>" +
    label +
    "</span></label>";
  menu.innerHTML =
    opt("rm", "Reduced motion") +
    opt("hc", "High contrast") +
    opt("lc", "Labeled colors") +
    opt("bt", "Bigger text") +
    opt("dm", "Dark mode") +
    opt("nr", "Daily reminder") +
    opt("fd", "Show future days (spoilers!)");
  const host =
    document.querySelector(".wrap") ||
    document.body; /* inside the column so it mirrors the streak */
  host.appendChild(btn);
  host.appendChild(menu);
  function setOpen(o) {
    menu.hidden = !o;
    btn.setAttribute("aria-expanded", String(o));
    if (o) {
      const first = menu.querySelector("input");
      if (first) first.focus();
    } /* move focus into the menu */ else if (
      menu.contains(document.activeElement)
    )
      btn.focus(); /* and back to the button on close */
  }
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    setOpen(menu.hidden);
  });
  menu.addEventListener("click", (e) => e.stopPropagation());
  /* checkboxes natively toggle on Space; make Enter work too */
  menu.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const i = e.target;
    if (i && i.type === "checkbox") {
      e.preventDefault();
      i.checked = !i.checked;
      i.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  menu.addEventListener("change", (e) => {
    const k = e.target.dataset && e.target.dataset.k;
    if (!k) return;
    if (k === "nr" && e.target.checked) {
      if ("Notification" in window) {
        Notification.requestPermission().then((permission) => {
          if (permission !== "granted") {
            e.target.checked = false;
            A11Y[k] = 0;
            localStorage.setItem("x43_a11y", JSON.stringify(A11Y));
            alert(
              "Notification permission denied. Please enable notifications in your browser settings to receive daily reminders.",
            );
          } else {
            A11Y[k] = 1;
            localStorage.setItem("x43_a11y", JSON.stringify(A11Y));
            if (navigator.serviceWorker && navigator.serviceWorker.ready) {
              navigator.serviceWorker.ready.then((reg) =>
                checkAndShowNotification(reg),
              );
            }
          }
        });
        return;
      } else {
        e.target.checked = false;
        alert("Notifications are not supported on this browser.");
        return;
      }
    }
    if (k === "fd" && e.target.checked) {
      if (
        !confirm(
          "Warning: Enabling future days will show puzzles that have not been released yet in the archive. This may contain spoilers. Do you want to proceed?",
        )
      ) {
        e.target.checked = false;
        return;
      }
    }
    A11Y[k] = e.target.checked ? 1 : 0;
    try {
      localStorage.setItem("x43_a11y", JSON.stringify(A11Y));
    } catch (_) {}
    document.documentElement.classList.toggle("a11y-" + k, !!A11Y[k]);
    if (k === "dm") {
      updateThemeColors();
      if (typeof paintTiles === "function") paintTiles();
    }
    if (k === "fd") {
      if (typeof renderArchive === "function") renderArchive();
    }
  });
  document.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", buildA11yMenu);
else buildA11yMenu();

/* ---------- service worker & notification trigger logic ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .then((reg) => {
        if (A11Y.nr && Notification.permission === "granted") {
          checkAndShowNotification(reg);
        }
      })
      .catch((err) => console.log("ServiceWorker registration failed: ", err));
  });
}

function checkAndShowNotification(reg) {
  const today = todayStr();
  let hasPlayed = false;
  try {
    const history = JSON.parse(localStorage.getItem("x43_history") || "{}");
    if (history[today]) hasPlayed = true;
    const game = JSON.parse(
      localStorage.getItem("x43_game_" + today) || "null",
    );
    if (game && game.over) hasPlayed = true;
  } catch (e) {}

  if (!hasPlayed) {
    const lastNotif = localStorage.getItem("x43_last_notif_date");
    if (lastNotif !== today) {
      reg.showNotification("4 × 3 Daily Reminder", {
        body: "Time for your daily 4 × 3 puzzle! Can you solve it today? 🧩",
        icon: "favicon.svg",
        badge: "favicon-32.png",
        tag: "daily-reminder",
        renotify: true,
      });
      localStorage.setItem("x43_last_notif_date", today);
    }
  }
}
