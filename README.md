# GipoUtils – Chrome Extension

**GipoUtils** è un'estensione per Chrome che include due strumenti interattivi e configurabili:

- 🎡 **GipoWheel of Names** – Una ruota personalizzabile per scegliere nomi a caso.
- ⏱️ **GipoTimer** – Un timer associato a una lista di persone per gestire turni, attività o presentazioni.

---

## 🧩 Funzionalità principali

### GipoWheel of Names

- Inserisci una lista di nomi (una per riga)
- Avvia l'animazione della ruota e seleziona un vincitore
- Effetti visivi con animazione 3D e coriandoli 🎉
- Funzioni per mischiare e ripristinare la lista
- Elimina automaticamente i nomi già estratti

### GipoTimer

- Imposta un timer personalizzato per ogni partecipante
- Naviga avanti/indietro tra le persone
- Timer visivo con animazione tipo orologio analogico
- Comandi per avviare, fermare e resettare
- Tema chiaro/scuro selezionabile

---

## ⚙️ Configurazione

Puoi configurare facilmente:

- Lista di nomi per la ruota
- Durata del timer (in secondi)
- Tema dell’interfaccia

Tutto viene salvato automaticamente tramite `chrome.storage.sync`.

---

## 🚀 Installazione

1. Clona o scarica questa repository.
2. Apri `chrome://extensions/` nel browser.
3. Attiva la **Modalità sviluppatore** in alto a destra.
4. Clicca su **"Carica estensione non pacchettizzata"** e seleziona la cartella `gipo-utils-extension`.

---

## 📁 Struttura dei file

- `manifest.json` – Configurazione dell'estensione
- `content.js` – Inietta il widget timer nella pagina
- `config/options.html` – Pagina delle opzioni (timer e ruota)
- `config/options.js` – Logica ruota e timer
- `assets/` – Icone, stili e script di supporto

---

## 🧪 Compatibilità

Testata su:

- Chrome (ultima versione)
- Chromium-based browsers (es. Edge)

---

## 📦 To-do / Futuri miglioramenti

- Notifiche sonore a fine timer
- Modalità fullscreen
- Esportazione dello storico delle estrazioni

---
