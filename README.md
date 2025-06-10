# GipoUtils – Chrome Extension

**GipoUtils** è un'estensione per Chrome che include due strumenti interattivi e configurabili:

- 🎡 **GipoWheel of Names** – Una ruota personalizzabile per scegliere nomi a caso.
- ⏱️ **GipoTimer** – Un timer associato a una lista di persone per gestire turni, attività o presentazioni.

---

## 🧩 Funzionalità principali

### GipoTimer

![Screenshot dell’estensione](assets/images/Screen_1.png)

- Imposta un timer personalizzato per ogni partecipante
- Naviga avanti/indietro tra le persone
- Timer visivo con animazione tipo orologio analogico
- Comandi per avviare, fermare e resettare
- Tema chiaro/scuro selezionabile

### GipoWheel of Names

![Screenshot dell’estensione](assets/images/Screen_2.png)

- Inserisci una lista di nomi (una per riga)
- Avvia l'animazione della ruota e seleziona un vincitore
- Effetti visivi con coriandoli 🎉
- Funzioni per mischiare e ripristinare la lista
- Elimina automaticamente i nomi già estratti

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
- `options/options.html` – Pagina delle opzioni (timer e ruota)
- `options/options.js` – Logica ruota e timer
- `popup/popup.html` – Popup per accedere alla configurazione
- `popup/popup.js` – Logica del popup per accedere alla configurazione
- `assets/` – Icone, stili e script di supporto

---

## 🧪 Compatibilità

Testata su:

- Chrome (ultima versione)
- Chromium-based browsers (es. Edge)

---

# Norme sulla privacy

Questa estensione non raccoglie, memorizza né trasmette alcun dato personale. Tutti i dati inseriti dall’utente (es. nomi o impostazioni) vengono salvati localmente nel browser, e non vengono condivisi con terze parti.
