# YouTube CC immer aus (Tampermonkey-Userscript)

Schaltet YouTube‑Untertitel standardmäßig aus – sowohl in normalen Watch‑Seiten als auch in Shorts. Das Skript greift nur kurz beim Start eines Videos ein, respektiert danach Ihre manuelle Einstellung und benötigt keine besonderen Berechtigungen.

## Features
- Untertitel beim Start automatisch AUS (Watch, Shorts, youtu.be, m.youtube.com)
- Respektiert manuelles Einschalten während der Sitzung
- Blockiert Untertitel‑Fetches (\`/api/timedtext\`) in einem kurzen Startfenster
- Räumt lokale Caption‑Präferenzen auf (localStorage/sessionStorage)
- Best‑Effort über YouTube Player‑API (\`setOption('captions', 'enabled', false)\`)
- Keine externen Domains, \`@grant none\
- Leichtgewichtig und robust gegenüber Navigationsereignissen (yt‑navigate, yt‑player‑updated)

## Installation
1. Browser‑Erweiterung Tampermonkey installieren (Chrome, Edge, Firefox).
2. In Tampermonkey auf „Create a new script…“ klicken.
3. Inhalt aus der Datei [youtube-cc-off.user.js](youtube-cc-off.user.js) komplett kopieren und einfügen.
4. Speichern. YouTube neu laden.

Optional nach GitHub‑Upload: Direktinstallation per Rohdatei‑Link (wird hier ergänzt, sobald verfügbar).

## Nutzung
- Keine Interaktion nötig: Videos starten ohne Untertitel.
- Wenn Sie Untertitel manuell aktivieren, bleibt das erhalten, bis Sie es wieder ändern.

## Kompatibilität
- Domains: `https://www.youtube.com/*`, `https://m.youtube.com/*`, `https://youtu.be/*`
- Ausgenommen: `https://www.youtube.com/live_chat*`
- Getestet mit aktuellem YouTube‑Layout (Watch & Shorts).

## Funktionsweise (Kurzfassung)
- Setzt lokale Präferenzen für Untertitel auf „aus“ (localStorage/sessionStorage).
- Während eines kurzen Durchsetzungsfensters (Standard ~3s) werden aktive CC‑Buttons deaktiviert und `fetch`/`XMLHttpRequest` zu `/api/timedtext` blockiert.
- Nutzt YouTube‑Navigationsereignisse (`yt-navigate-finish`, `yt-page-data-updated`, `yt-player-updated`), um nur beim Start/Autoplay einzugreifen.

## Fehlerbehebung
- Seite hart neu laden (Strg+F5) und erneut testen.
- Andere YouTube‑Erweiterungen testweise deaktivieren (Konflikte ausschließen).
- Debug aktivieren: In [youtube-cc-off.user.js](youtube-cc-off.user.js) `const debug = true` setzen und Konsole öffnen.

## Änderungshistorie
- 1.1.0: Netz‑Guards für `/api/timedtext`, stabilere Events, Aufräumlogik.

## Lizenz
Noch nicht festgelegt. Gern MIT/Apache‑2.0 vorschlagen und hinzufügen.
