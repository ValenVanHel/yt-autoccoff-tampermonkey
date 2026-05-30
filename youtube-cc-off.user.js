// ==UserScript==
// @name         YouTube CC immer aus
// @namespace    https://github.com/userscripts/examples
// @version      1.1.0
// @description  Schaltet YouTube-Untertitel standardmäßig aus (Watch & Shorts). Nur beim Start ausschalten; manuelles Aktivieren bleibt erhalten.
// @author       you
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://youtu.be/*
// @exclude      https://www.youtube.com/live_chat*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const debug = false;
  const log = (...args) => debug && console.log('[YT-CC-OFF]', ...args);

  function debounce(fn, wait = 200) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  function setLocalPrefsOff() {
    try {
      localStorage.setItem('mweb_watch_captions_enable_auto_translate', 'false');
      sessionStorage.setItem('mweb_watch_captions_enable_auto_translate', 'false');
      // Leere explizit die gespeicherten Caption-Präferenzen
      localStorage.setItem('yt-player-caption-language-preference', JSON.stringify({ lang: '', vss_id: '' }));
      localStorage.removeItem('yt-player-caption-track');
      // Weitere mögliche Keys vorsorglich neutralisieren (falls vorhanden)
      localStorage.removeItem('yt-player-caption-font-size');
      localStorage.removeItem('yt-player-caption-window-color');
      localStorage.removeItem('yt-player-caption-foreground-color');
      localStorage.removeItem('yt-player-caption-background-color');
      localStorage.removeItem('yt-player-caption-edge-style');
    } catch (e) { /* ignore */ }
  }

  function buttonIsActive(btn) {
    if (!btn) return false;
    return btn.classList?.contains('ytp-button-active') || btn.getAttribute?.('aria-pressed') === 'true';
  }

  function clickToOff(btn) {
    try {
      if (btn && buttonIsActive(btn)) {
        btn.click();
        log('CC via Button deaktiviert');
      }
    } catch (_) { /* ignore */ }
  }

  // Best-effort: falls die Player-API verfügbar ist, Untertitel per API deaktivieren
  function tryIFrameApiOnce() {
    try {
      const p = window.yt?.player?.getPlayerByElement?.('movie_player') || window.ytplayer?.player;
      if (p?.setOption) {
        p.setOption('captions', 'enabled', false);
        p.setOption('captions', 'track', {});
        log('CC via setOption deaktiviert');
      }
    } catch (_) { /* ignore */ }
  }

  function getCurrentVideoId() {
    try {
      const u = new URL(location.href);
      // Standard-Watch
      const v = u.searchParams.get('v');
      if (v) return v;
      // Shorts
      if (u.pathname.startsWith('/shorts/')) {
        const parts = u.pathname.split('/');
        return parts[2] || null;
      }
      // youtu.be
      if (/youtu\.be$/.test(u.hostname)) {
        const path = u.pathname.replace(/^\//, '');
        return path ? path.split('/')[0] : null;
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  // Erzwingt CC AUS nur in einem kurzen Zeitfenster (z.B. beim Start/Autoplay)
  let lastEnforcedId = null;
  // Während dieses Fensters werden auch timedtext-Requests blockiert
  let enforceUntil = 0;
  const CAPTION_FETCH_PATH = '/api/timedtext';

  // Aktiv, solange innerhalb des Durchsetzungsfensters
  function isEnforceActive() {
    return Date.now() < enforceUntil;
  }

  // Netzwerkanfragen für Untertitel (timedtext) während des Fensters blockieren
  function installNetworkGuardsOnce() {
    try {
      if (!window.__ytCcOffNetGuardsInstalled) {
        window.__ytCcOffNetGuardsInstalled = true;

        // fetch
        const origFetch = window.fetch?.bind(window);
        if (origFetch) {
          window.fetch = function(input, init) {
            try {
              const url = typeof input === 'string' ? input : input?.url;
              if (url && url.includes(CAPTION_FETCH_PATH) && isEnforceActive()) {
                log('Blockiere captions (fetch):', url);
                const err = new DOMException('blocked by userscript', 'AbortError');
                return Promise.reject(err);
              }
            } catch (_) { /* ignore */ }
            return origFetch(input, init);
          };
        }

        // XHR
        const XHR = window.XMLHttpRequest;
        if (XHR) {
          const origOpen = XHR.prototype.open;
          const origSend = XHR.prototype.send;
          XHR.prototype.open = function(method, url, ...rest) {
            try { this.__isCaptionReq = typeof url === 'string' && url.includes(CAPTION_FETCH_PATH); } catch (_) { this.__isCaptionReq = false; }
            return origOpen.call(this, method, url, ...rest);
          };
          XHR.prototype.send = function(body) {
            try {
              if (this.__isCaptionReq && isEnforceActive()) {
                log('Blockiere captions (xhr)');
                try { this.abort(); } catch (_) { /* ignore */ }
                return; // Sende nicht
              }
            } catch (_) { /* ignore */ }
            return origSend.call(this, body);
          };
        }
      }
    } catch (_) { /* ignore */ }
  }

  function enforceCcOffWindow(windowMs = 3000) {
    const videoId = getCurrentVideoId();
    if (!videoId || videoId === lastEnforcedId) {
      // Falls wir ID nicht erkennen, trotzdem einmal heuristisch versuchen
      log('Starte initiales CC-Ausschalten (ohne ID)');
    } else {
      log('Starte CC-Ausschalten für Video', videoId);
      lastEnforcedId = videoId;
    }

    // Starte/verlängere das Durchsetzungsfenster und installiere einmalig Netz-Guards
    enforceUntil = Date.now() + windowMs;
    installNetworkGuardsOnce();

    const start = Date.now();
    const iv = setInterval(() => {
      // Klicke alle aktiven CC-Buttons aus (Watch & Shorts können mehrere Player-Instanzen haben)
      document.querySelectorAll('.ytp-subtitles-button').forEach((btn) => clickToOff(btn));
      tryIFrameApiOnce();
      if (Date.now() - start > windowMs) clearInterval(iv);
    }, 250);
  }

  const enforceCcOffWindowDebounced = debounce(() => enforceCcOffWindow(3000), 200);

  function bindYtEvents() {
    window.addEventListener('yt-navigate-finish', enforceCcOffWindowDebounced, true);
    window.addEventListener('yt-page-data-updated', enforceCcOffWindowDebounced, true);
    window.addEventListener('yt-player-updated', enforceCcOffWindowDebounced, true);
  }

  // Init
  setLocalPrefsOff();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enforceCcOffWindowDebounced, { once: true });
  } else {
    enforceCcOffWindowDebounced();
  }
  bindYtEvents();
  // Bei harten Reloads initial noch kurz nachfassen
  enforceCcOffWindow(1500);
})();
