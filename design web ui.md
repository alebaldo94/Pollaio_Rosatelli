🌐 WEB UI – STRUTTURA DI BASE (PRONTA PER CLAUDE)
1️⃣ Architettura generale UI

Server: Raspberry Pi
Accesso: LAN locale
Pattern: Dashboard + Settings

Rotte
/              → Dashboard (monitor + comandi)
/settings      → Configurazione automatismi
/api/*         → Backend REST
/stream/*      → Stream video RSP

2️⃣ DASHBOARD (Schermata principale)
A. STREAM VIDEO (2 flussi RSP)

Requisiti

Stream 1: Interno pollaio

Stream 2: Area esterna

Sempre visibili

Nessuna registrazione (solo live)

Tecnologie suggerite

MJPEG (<img src="/stream/cam1">)

Oppure HLS se vuoi buffering

Layout
