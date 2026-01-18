# 🐔 Progetto Pollaio Automatizzato – Uso Personale

## 1. Presentazione del Progetto

### Obiettivo
Realizzare un pollaio fisso per 20–25 galline ovaiole ad uso personale, con automazione robusta, modulare e facilmente manutenibile. Il sistema è pensato per funzionare tutto l’anno con intervento umano ogni 2–3 giorni.

### Filosofia progettuale
- **Robustezza prima dell’automazione**
- Ogni funzione critica ha un **fallback meccanico**
- Architettura modulare tipo impianto industriale
- Evoluzione possibile: manuale → semi-automatica → smart

### Contesto
- Zona rurale (Colli al Metauro)
- Nessuna vendita, uso familiare
- Nessuna criticità normativa nota

---

## 2. Architettura Generale

### Schema logico

- ESP32 dedicati per modulo
- Raspberry Pi come server centrale
- Comunicazione LAN
- Server web locale + storico dati

```
[Modulo Cibo] ─┐
[Modulo Acqua] ├─ ESP32 ─┐
[Modulo Porta] ┘         │
                           ├─ Raspberry Pi (Server Web)
[Ambiente] ─── ESP32 ────┘
```

---

## 3. Lista Acquisti (con link indicativi)

### Elettronica
- ESP32 Dev Module (x4)
  - https://www.amazon.it/dp/B08L9C8X8M
- Raspberry Pi 4 (4GB)
  - https://www.raspberrypi.com/products/raspberry-pi-4-model-b/
- Alimentatore Raspberry ufficiale
- UPS per Raspberry (HAT)

### Sensori
- Sensore temperatura/umidità DHT22
- Sensore luce (LDR o BH1750)
- Sensore livello acqua (galleggiante o ultrasuoni)
- Celle di carico + HX711 (mangime)

### Attuatori
- Motore DC 12V con vite senza fine (porta)
- Finecorsa meccanici (x2)
- Relè 12V

### Alimentazione
- Alimentatore 12V stabilizzato
- Batteria 12V 100Ah (opzionale FV)
- Pannello fotovoltaico 200W (opzionale)
- Regolatore di carica MPPT

### Meccanica / Struttura
- Porta a ghigliottina in alluminio
- Mangiatoia a pedale anti-roditori
- Abbeveratoi a tazza automatici
- Bidone alimentare 50L (acqua)

---

## 4. Schemi Elettrici (concettuali)

### Modulo Porta

```
12V ── Fusibile ── Relè ── Motore
                  │
ESP32 ─ GPIO ─────┘

Finecorsa alto/basso → GPIO input
```

### Modulo Sensori
- DHT22 → GPIO
- LDR → ADC
- Sensori livello → GPIO

Massa comune, alimentazione separata logica/potenza

---

## 5. Logica Software ESP32

### Stati principali
- INIT
- OPERATIVO
- ERRORE
- MANUALE

### Pseudocodice Porta

```
loop:
  if manual_override:
    stop
  else if sunset_time and porta_aperta:
    chiudi_porta()
  else if sunrise_time and porta_chiusa:
    apri_porta()

  if finecorsa_non_raggiunto:
    invia_alert()
```

### Comunicazione
- HTTP REST verso Raspberry
- Heartbeat ogni 60s

---

## 6. Web UI – Bozza

### Dashboard
- Stato porta (aperta/chiusa)
- Temperatura / umidità
- Livello acqua
- Livello mangime
- Ultimo evento

### Funzioni
- Override manuale
- Storico grafici
- Log eventi

### Tecnologie
- Server: Raspberry Pi
- Backend: Python / Node
- Frontend: HTML + CSS + JS

---

## 7. Pulizia e Gestione Deiezioni

### Soluzione scelta
- Pavimento liscio
- Lettiera profonda
- Raschiatore manuale

### Compostaggio
- Raccolta settimanale
- Accumulo aerato
- Riutilizzo agricolo

---

## 8. Energia e Continuità

### Consumi medi
- ~260 Wh/giorno

### Blackout
- UPS Raspberry
- Porta con gravità
- Acqua e cibo meccanici

---

## 9. Stato del Progetto

- [x] Progettazione
- [ ] Acquisti
- [ ] Assemblaggio
- [ ] Test
- [ ] Messa in esercizio

---

## 10. Note Finali

Sistema pensato per durare nel tempo, facilmente riparabile e migliorabile.
