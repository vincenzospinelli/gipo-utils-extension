## [2.1.3] - 2025-09-17

### ✨ Fix

- Corretto un problema che durante l’aggiornamento del plugin causava un redirect alla pagina GitHub.

## [2.1.2] - 2025-09-17

### ✨ Nuove funzionalità

- GipoTimer: promemoria opzionale quando mancano X secondi, con flash della cornice, beep e vibrazione (se disponibile).
- GipoTimer: preset rapidi personalizzabili (es. 5/10/15 minuti) selezionabili dal widget.
- Nuova sezione Dashboard: cronologia delle sessioni con riepilogo per persona nelle opzioni e totale parlato mostrato nel widget.
- Impostazioni GipoTimer organizzate in tab con card a dimensione uniforme.
- Configurazione GipoWheel suddivisa in tab con card a dimensione uniforme.

## [2.1.0] - 2025-09-15

### ✨ Nuove funzionalità

- Migrazione architetturale: popup, options e content widget ora sono in React + Vite.
- GipoTimer: tick sonoro di sottofondo durante il countdown; impostazioni audio con mute e volume; salvataggio live con toast.
- GipoWheel: suono di proclamazione vincitore con mute e volume; lista persone con salvataggio automatico e toast.
- Changelog: rendering del changelog in Markdown formattato.

### 🐛 Fix

- Timer: arresto affidabile del tick su stop/fine/reset.
- Ruota: eliminato il disallineamento tra freccia e vincitore.
- Rimossi outline/bordi indesiderati attorno al widget.
- Nessuna collisione di stili con i siti.

## [1.1.3] - 2025-07-06

### ✨ Nuove funzionalità

- Introdotta una **funzionalità beta** per il cambio automatico della board Jira in base all'utente selezionato.
  - Attivabile dalla pagina di configurazione tramite checkbox, utile per sincronizzare automaticamente i filtri Jira durante l'utilizzo dell'estensione.

## [1.1.2] - 2025-06-29

### ✨ Nuove funzionalità

- Aggiornata la pagina di configurazione con supporto per:
  - Inserimento della lista delle persone
  - Inserimento dell' `idJira` per ogni persona
- Selezione automatica del prossimo utente dalla board ogni volta che viene cambiata la persona attiva
