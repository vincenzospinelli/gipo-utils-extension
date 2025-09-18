import {useEffect, useMemo, useRef, useState} from "react";

import {ensureUnitVolume, percentToUnit, unitToPercent} from "../shared/audio";
import {
  DEFAULT_DURATION,
  DEFAULT_PEOPLE,
  DEFAULT_REMINDER_ENABLED,
  DEFAULT_REMINDER_SECONDS,
  DEFAULT_TIMER_PRESETS,
  MAX_SESSION_HISTORY,
} from "../shared/constants";
import {sanitizePeopleList} from "../shared/people";
import {readSyncStorage, writeSyncStorage} from "../shared/storage";
import {formatDuration} from "../shared/time";
import {sanitizePresets, summarizeHistory} from "../shared/timer";

import {SoundSettings} from "./components/SoundSettings";

const CARD_BASE_CLASS =
  "bg-white shadow-lg rounded-lg w-full max-w-4xl md:w-[960px] flex-shrink-0 h-[720px] flex flex-col overflow-hidden";
const CARD_HEADER_CLASS = "flex-none px-8 py-6 border-b border-gray-100";
const CARD_BODY_CLASS = "flex-1 px-8 py-6 overflow-y-auto";

const SettingsSection = ({title, description, children}) => (
  <section className="border border-gray-200 rounded-lg bg-gray-50 p-4 flex flex-col gap-4">
    <div>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      )}
    </div>
    <div className="flex flex-col gap-3">{children}</div>
  </section>
);

function useAutoToast(timeout = 1200) {
  const [message, setMessage] = useState("");
  const timer = useRef(null);
  const show = (msg = "Impostazioni salvate") => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), timeout);
  };
  useEffect(() => () => timer.current && clearTimeout(timer.current), []);
  return {toastMessage: message, showToast: show};
}

const Toast = ({message}) =>
  message ? (
    <div className="fixed top-16 right-6 z-50 bg-gray-900 text-white text-sm px-3 py-2 rounded shadow">
      {message}
    </div>
  ) : null;

export function OptionsApp() {
  const [active, setActive] = useState("timer");

  useEffect(() => {
    const setFromHash = () => {
      const hash = window.location.hash.replace("#", "") || "timer";
      setActive(hash);
    };
    setFromHash();
    window.addEventListener("hashchange", setFromHash);
    return () => window.removeEventListener("hashchange", setFromHash);
  }, []);

  const go = (tab) => {
    window.location.hash = tab;
  };

  const navButtonClass = (tab) =>
    `hover:text-blue-600 transition-colors ${
      active === tab ? "text-blue-600 font-semibold" : "text-gray-600"
    }`;

  return (
    <>
      <header className="absolute top-0 left-0 w-full bg-white shadow-md py-4 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="../assets/images/icon.png" alt="Logo" className="w-8 h-8" />
          <span className="text-xl font-semibold text-gray-700">
            Configurazioni
          </span>
        </div>
        <nav className="flex gap-4 font-medium">
          <button
            onClick={() => go("dashboard")}
            className={navButtonClass("dashboard")}
          >
            Dashboard
          </button>
          <button
            onClick={() => go("timer")}
            className={navButtonClass("timer")}
          >
            GipoTimer
          </button>
          <button
            onClick={() => go("wheel")}
            className={navButtonClass("wheel")}
          >
            GipoWheel
          </button>
          <button
            onClick={() => go("changelog")}
            className={navButtonClass("changelog")}
          >
            Changelog
          </button>
        </nav>
      </header>
      <div className="flex flex-wrap gap-8 justify-center mt-8 w-full px-4">
        {active === "timer" && <TimerTab />}
        {active === "dashboard" && <DashboardTab />}
        {active === "wheel" && <WheelTab />}
        {active === "changelog" && <ChangelogTab />}
      </div>
      <canvas
        id="confetti-canvas"
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
      />
    </>
  );
}

function TimerTab() {
  const [people, setPeople] = useState(DEFAULT_PEOPLE);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [filterJiraByUser, setFilterJiraByUser] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState(10);
  const [presets, setPresets] = useState(DEFAULT_TIMER_PRESETS);
  const [newPresetMinutes, setNewPresetMinutes] = useState("5");
  const [reminderEnabled, setReminderEnabledState] = useState(
    DEFAULT_REMINDER_ENABLED
  );
  const [reminderSecondsInput, setReminderSecondsInput] = useState(
    String(DEFAULT_REMINDER_SECONDS)
  );
  const [timerSection, setTimerSection] = useState("general");

  useEffect(() => {
    let active = true;
    readSyncStorage([
      "peopleWithIds",
      "duration",
      "filterJiraByUser",
      "audioMuted",
      "audioVolume",
      "reminderEnabled",
      "reminderSeconds",
      "timerPresets",
    ]).then((data) => {
      if (!active) return;
      const storedPeople = Array.isArray(data.peopleWithIds)
        ? data.peopleWithIds
        : DEFAULT_PEOPLE;
      setPeople(storedPeople);
      const storedDuration = parseInt(data.duration, 10);
      setDuration(
        !Number.isNaN(storedDuration) && storedDuration > 0
          ? storedDuration
          : DEFAULT_DURATION
      );
      setFilterJiraByUser(Boolean(data.filterJiraByUser));
      setSoundsEnabled(!Boolean(data.audioMuted));
      setAudioVolume(unitToPercent(ensureUnitVolume(data.audioVolume, 0.1)));
      const reminderEnabledValue =
        typeof data.reminderEnabled === "boolean"
          ? data.reminderEnabled
          : DEFAULT_REMINDER_ENABLED;
      setReminderEnabledState(reminderEnabledValue);
      const parsedReminderSeconds = parseInt(data.reminderSeconds, 10);
      const safeReminderSeconds =
        !Number.isNaN(parsedReminderSeconds) && parsedReminderSeconds > 0
          ? parsedReminderSeconds
          : DEFAULT_REMINDER_SECONDS;
      setReminderSecondsInput(String(safeReminderSeconds));
      const sanitizedPresets = sanitizePresets(data.timerPresets);
      setPresets(sanitizedPresets);
      const defaultsPayload = {};
      if (!data.peopleWithIds) {
        defaultsPayload.peopleWithIds = sanitizePeopleList(storedPeople);
      }
      if (!data.duration) {
        defaultsPayload.duration = storedDuration || DEFAULT_DURATION;
      }
      if (typeof data.reminderEnabled !== "boolean") {
        defaultsPayload.reminderEnabled = DEFAULT_REMINDER_ENABLED;
      }
      if (Number.isNaN(parsedReminderSeconds) || parsedReminderSeconds <= 0) {
        defaultsPayload.reminderSeconds = safeReminderSeconds;
      }
      if (!Array.isArray(data.timerPresets)) {
        defaultsPayload.timerPresets = sanitizedPresets;
      }
      if (Object.keys(defaultsPayload).length > 0) {
        writeSyncStorage(defaultsPayload);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const listener = (changes, areaName) => {
      if (areaName !== "sync") return;
      if (changes.timerPresets) {
        setPresets(sanitizePresets(changes.timerPresets.newValue));
      }
    };
    try {
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    } catch {
      return () => {};
    }
  }, []);

  const {toastMessage: timerToast, showToast: showTimerToast} = useAutoToast();

  const timerNavClass = (section) =>
    `px-3 py-2 rounded transition-colors ${
      timerSection === section
        ? "bg-blue-100 text-blue-700 font-semibold"
        : "text-gray-600 hover:text-blue-600"
    }`;

  const persistPeople = (list) => {
    writeSyncStorage({peopleWithIds: sanitizePeopleList(list)});
    showTimerToast();
  };

  const updatePerson = (idx, field, value) => {
    setPeople((prev) => {
      const next = prev.map((p, i) => (i === idx ? {...p, [field]: value} : p));
      persistPeople(next);
      return next;
    });
  };

  const addPerson = () =>
    setPeople((prev) => {
      const next = [...prev, {name: "", jiraId: ""}];
      persistPeople(next);
      return next;
    });

  const removePerson = (idx) =>
    setPeople((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      persistPeople(next);
      return next;
    });

  const onDurationChange = (val) => {
    const numeric = parseInt(val, 10);
    setDuration(val);
    if (!Number.isNaN(numeric) && numeric > 0) {
      writeSyncStorage({duration: numeric});
      showTimerToast();
    }
  };

  const toggleFilter = (checked) => {
    setFilterJiraByUser(checked);
    writeSyncStorage({filterJiraByUser: checked});
    showTimerToast();
  };

  const handleSoundToggle = (enabled) => {
    setSoundsEnabled(enabled);
    writeSyncStorage({
      audioMuted: !enabled,
      audioVolume: percentToUnit(audioVolume),
    });
    showTimerToast();
  };

  const handleVolumeChange = (vol) => {
    const safeValue = Number.isNaN(vol) ? 0 : vol;
    setAudioVolume(safeValue);
    writeSyncStorage({
      audioMuted: !soundsEnabled,
      audioVolume: percentToUnit(safeValue),
    });
    showTimerToast();
  };

  const toggleReminderSetting = (enabled) => {
    setReminderEnabledState(enabled);
    if (enabled) {
      const numeric = parseInt(reminderSecondsInput, 10);
      const safeNumeric =
        !Number.isNaN(numeric) && numeric > 0
          ? numeric
          : DEFAULT_REMINDER_SECONDS;
      if (Number.isNaN(numeric) || numeric <= 0) {
        setReminderSecondsInput(String(safeNumeric));
      }
      writeSyncStorage({
        reminderEnabled: true,
        reminderSeconds: safeNumeric,
      });
    } else {
      writeSyncStorage({reminderEnabled: false});
    }
    showTimerToast();
  };

  const onReminderSecondsChange = (value) => {
    setReminderSecondsInput(value);
    const numeric = parseInt(value, 10);
    if (!Number.isNaN(numeric) && numeric > 0) {
      writeSyncStorage({reminderSeconds: numeric});
      showTimerToast();
    }
  };

  const addPreset = () => {
    const normalized = parseFloat(newPresetMinutes.replace(/,/g, "."));
    if (Number.isNaN(normalized) || normalized <= 0) {
      showTimerToast("Inserisci minuti validi");
      return;
    }
    const seconds = Math.round(normalized * 60);
    if (presets.includes(seconds)) {
      showTimerToast("Preset già presente");
      setNewPresetMinutes("");
      return;
    }
    const next = sanitizePresets([...presets, seconds]);
    setPresets(next);
    writeSyncStorage({timerPresets: next});
    setNewPresetMinutes("");
    showTimerToast("Preset aggiunto");
  };

  const removePreset = (seconds) => {
    if (!presets.includes(seconds)) return;
    if (presets.length <= 1) return;
    const next = presets.filter((preset) => preset !== seconds);
    const sanitized = next.length
      ? sanitizePresets(next)
      : [...DEFAULT_TIMER_PRESETS];
    setPresets(sanitized);
    writeSyncStorage({timerPresets: sanitized});
    showTimerToast("Preset aggiornati");
  };

  return (
    <>
      <div id="section-timer" className={CARD_BASE_CLASS}>
        <div className={CARD_HEADER_CLASS}>
          <h2 className="text-2xl font-bold text-gray-800">
            Configurazione GipoTimer
          </h2>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              className={timerNavClass("general")}
              onClick={() => setTimerSection("general")}
            >
              Impostazioni
            </button>
            <button
              type="button"
              className={timerNavClass("people")}
              onClick={() => setTimerSection("people")}
            >
              Partecipanti
            </button>
            <button
              type="button"
              className={timerNavClass("presets")}
              onClick={() => setTimerSection("presets")}
            >
              Preset
            </button>
          </div>
        </div>
        <div className={CARD_BODY_CLASS}>
          {timerSection === "general" && (
            <div className="flex flex-col gap-4">
              <SettingsSection
                title="Durata timer"
                description="Imposta la durata predefinita delle sessioni cronometrate."
              >
                <label
                  htmlFor="timer-duration"
                  className="block text-sm font-medium text-gray-700"
                >
                  Durata (secondi)
                </label>
                <input
                  type="number"
                  id="timer-duration"
                  placeholder="60"
                  min={1}
                  value={duration}
                  onChange={(e) => onDurationChange(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-500"
                />
              </SettingsSection>

              <SettingsSection
                title="Promemoria fine turno"
                description="Ricevi un avviso quando sta per scadere il tempo."
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="timer-reminder-enabled"
                    checked={reminderEnabled}
                    onChange={(e) => toggleReminderSetting(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="timer-reminder-enabled"
                    className="text-sm font-medium text-gray-700"
                  >
                    Abilita promemoria finale
                  </label>
                </div>
                <label
                  htmlFor="timer-reminder-seconds"
                  className="block text-sm font-medium text-gray-700"
                >
                  Avvisa quando mancano (secondi)
                </label>
                <input
                  type="number"
                  id="timer-reminder-seconds"
                  min={1}
                  value={reminderSecondsInput}
                  onChange={(e) => onReminderSecondsChange(e.target.value)}
                  disabled={!reminderEnabled}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </SettingsSection>

              <SettingsSection
                title="Suoni timer"
                description="Attiva o disattiva i suoni del timer e regola il volume."
              >
                <SoundSettings
                  checkboxId="timer-sounds-enabled"
                  sliderId="timer-audio-volume"
                  enabled={soundsEnabled}
                  volume={audioVolume}
                  onToggle={handleSoundToggle}
                  onVolumeChange={handleVolumeChange}
                  enabledLabel="Suoni timer abilitati (beep e tick)"
                  volumeLabel="Volume suoni"
                />
              </SettingsSection>

              <SettingsSection
                title="Automazioni Jira"
                description="Sincronizza automaticamente il filtro assignee della board."
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="jira-user-filter"
                    checked={filterJiraByUser}
                    onChange={(e) => toggleFilter(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="jira-user-filter"
                    className="text-sm font-medium text-gray-700"
                  >
                    Filtra la board Jira per utente (Beta)
                  </label>
                </div>
              </SettingsSection>
            </div>
          )}

          {timerSection === "people" && (
            <div className="flex flex-col gap-4">
              <SettingsSection
                title="Persone"
                description="Aggiorna il roster del team e gli eventuali Jira ID."
              >
                <div className="flex flex-col gap-2">
                  {people.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Nome"
                        value={p.name}
                        onChange={(e) =>
                          updatePerson(i, "name", e.target.value)
                        }
                        className="flex-grow border rounded p-2"
                      />
                      <input
                        type="text"
                        placeholder="Jira ID (opzionale)"
                        value={p.jiraId || ""}
                        onChange={(e) =>
                          updatePerson(i, "jiraId", e.target.value)
                        }
                        className="w-full border rounded p-2"
                      />
                      <button
                        type="button"
                        onClick={() => removePerson(i)}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                      >
                        Rimuovi
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  id="add-person"
                  type="button"
                  onClick={addPerson}
                  className="self-start bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded"
                >
                  Aggiungi
                </button>
              </SettingsSection>
            </div>
          )}

          {timerSection === "presets" && (
            <div className="flex flex-col gap-4">
              <SettingsSection
                title="Preset attivi"
                description="Questi preset compaiono come scorciatoie nel widget del timer."
              >
                {presets.length ? (
                  <div className="flex flex-col gap-2">
                    {presets.map((preset) => {
                      const minutesValue = preset / 60;
                      const minutesLabel = Number.isInteger(minutesValue)
                        ? `${minutesValue} min`
                        : `${minutesValue.toFixed(1)} min`;
                      return (
                        <div
                          key={preset}
                          className="flex items-center justify-between border border-gray-200 rounded px-3 py-2 text-sm"
                        >
                          <span className="font-mono">
                            {formatDuration(preset * 1000)} ({minutesLabel})
                          </span>
                          <button
                            type="button"
                            onClick={() => removePreset(preset)}
                            disabled={presets.length <= 1}
                            className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                          >
                            Rimuovi
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Nessun preset configurato.
                  </p>
                )}
              </SettingsSection>

              <SettingsSection
                title="Nuovo preset"
                description="Aggiungi un nuovo slot espresso in minuti."
              >
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={newPresetMinutes}
                    onChange={(e) => setNewPresetMinutes(e.target.value)}
                    placeholder="Minuti"
                    className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={addPreset}
                    className="self-start bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded"
                  >
                    Aggiungi
                  </button>
                </div>
              </SettingsSection>
            </div>
          )}
        </div>
      </div>
      <Toast message={timerToast} />
    </>
  );
}

function DashboardTab() {
  const [sessionHistory, setSessionHistory] = useState([]);
  const {toastMessage: dashboardToast, showToast: showDashboardToast} =
    useAutoToast();

  useEffect(() => {
    let active = true;
    readSyncStorage(["sessionHistory"]).then((data) => {
      if (!active) return;
      const storedHistory = Array.isArray(data.sessionHistory)
        ? data.sessionHistory.slice(0, MAX_SESSION_HISTORY)
        : [];
      setSessionHistory(storedHistory);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const listener = (changes, areaName) => {
      if (areaName !== "sync") return;
      if (changes.sessionHistory) {
        const history = Array.isArray(changes.sessionHistory.newValue)
          ? changes.sessionHistory.newValue.slice(0, MAX_SESSION_HISTORY)
          : [];
        setSessionHistory(history);
      }
    };
    try {
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    } catch {
      return () => {};
    }
  }, []);

  const clearHistory = () => {
    setSessionHistory([]);
    writeSyncStorage({sessionHistory: []});
    showDashboardToast("Cronologia azzerata");
  };

  const totalSessions = sessionHistory.length;
  const totalDurationMs = useMemo(
    () =>
      sessionHistory.reduce(
        (acc, entry) => acc + Math.max(0, entry?.durationMs || 0),
        0
      ),
    [sessionHistory]
  );

  const topTalkers = useMemo(() => {
    const summary = summarizeHistory(sessionHistory);
    return summary
      .slice()
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10);
  }, [sessionHistory]);

  const latestSessions = useMemo(
    () => sessionHistory.slice(0, 15),
    [sessionHistory]
  );

  return (
    <>
      <div className={CARD_BASE_CLASS}>
        <div className={CARD_HEADER_CLASS}>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-2">
            Panoramica delle sessioni accumulate dal widget.
          </p>
        </div>
        <div className={`${CARD_BODY_CLASS} space-y-6`}>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-xs uppercase text-gray-500">
                Sessioni registrate
              </h3>
              <div className="text-3xl font-semibold text-gray-800">
                {totalSessions}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-xs uppercase text-gray-500">Tempo totale</h3>
              <div className="text-3xl font-semibold text-gray-800">
                {formatDuration(totalDurationMs)}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col gap-2">
              <h3 className="text-xs uppercase text-gray-500">Azioni</h3>
              <button
                type="button"
                onClick={clearHistory}
                disabled={!sessionHistory.length}
                className="self-start px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-400"
              >
                Svuota cronologia
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Top 10 speaker
              </h3>
              {topTalkers.length ? (
                <ul className="space-y-2">
                  {topTalkers.map((item) => (
                    <li
                      key={item.personName}
                      className="flex justify-between text-sm text-gray-700"
                    >
                      <span className="font-medium">{item.personName}</span>
                      <span className="font-mono">
                        {formatDuration(item.durationMs)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  Nessun dato disponibile: avvia qualche sessione dal widget.
                </p>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Ultime sessioni
              </h3>
              {latestSessions.length ? (
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-200">
                  {latestSessions.map((entry, idx) => {
                    const startedLabel = entry.startedAt
                      ? new Date(entry.startedAt).toLocaleString()
                      : "";
                    return (
                      <div
                        key={`${entry.personName}-${entry.startedAt}-${idx}`}
                        className="py-3 text-sm text-gray-700 flex flex-col gap-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {entry.personName}
                          </span>
                          <span className="font-mono">
                            {formatDuration(entry.durationMs)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{startedLabel}</span>
                          <span
                            className={
                              entry.completed
                                ? "text-green-600"
                                : "text-orange-500"
                            }
                          >
                            {entry.completed ? "Completo" : "Interrotto"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Nessuna sessione recente registrata.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Toast message={dashboardToast} />
    </>
  );
}

function WheelTab() {
  const [people, setPeople] = useState(DEFAULT_PEOPLE);
  const [winner, setWinner] = useState("");
  const [lastWinner, setLastWinner] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [spinning, setSpinning] = useState(false);
  const spinningRef = useRef(false);
  const lastWinnerRef = useRef(null);
  const angleRef = useRef(0);
  const velRef = useRef(0);
  const spinEndRef = useRef(0);
  const spinDurRef = useRef(0);
  const canvasRef = useRef(null);
  const confettiCanvasRef = useRef(null);
  const confettiCtxRef = useRef(null);
  const confettiParticlesRef = useRef([]);
  const wheelAudioRef = useRef(null);
  const {toastMessage: wheelToast, showToast: showWheelToast} = useAutoToast();
  const [wheelSoundsEnabled, setWheelSoundsEnabled] = useState(true);
  const [wheelAudioVolume, setWheelAudioVolume] = useState(10);
  const [wheelSection, setWheelSection] = useState("general");
  const wheelNavClass = (section) =>
    `px-3 py-2 rounded transition-colors ${
      wheelSection === section
        ? "bg-blue-100 text-blue-700 font-semibold"
        : "text-gray-600 hover:text-blue-600"
    }`;

  const handleWheelToggle = (enabled) => {
    setWheelSoundsEnabled(enabled);
    writeSyncStorage({
      wheelAudioMuted: !enabled,
      wheelAudioVolume: percentToUnit(wheelAudioVolume),
    });
    showWheelToast();
  };

  const handleWheelVolumeChange = (vol) => {
    const safeValue = Number.isNaN(vol) ? 0 : vol;
    setWheelAudioVolume(safeValue);
    writeSyncStorage({
      wheelAudioMuted: !wheelSoundsEnabled,
      wheelAudioVolume: percentToUnit(safeValue),
    });
    showWheelToast();
  };

  const persistWheelPeople = (list) => {
    writeSyncStorage({wheelPeople: sanitizePeopleList(list)});
    showWheelToast();
  };

  const updateWheelPerson = (idx, value) => {
    setPeople((prev) => {
      const next = prev.map((p, i) => (i === idx ? {...p, name: value} : p));
      persistWheelPeople(next);
      return next;
    });
  };

  const addWheelPerson = () => {
    setPeople((prev) => {
      const next = [...prev, {name: "", jiraId: ""}];
      persistWheelPeople(next);
      return next;
    });
  };

  const removeWheelPerson = (idx) => {
    setPeople((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      persistWheelPeople(next);
      return next.length ? next : [{name: "", jiraId: ""}];
    });
  };

  const winnerAnimatingRef = useRef(false);
  const winnerPulseRef = useRef(0);
  const TAU = 2 * Math.PI;
  const POINTER = Math.PI / 2;

  useEffect(() => {
    let active = true;
    readSyncStorage([
      "wheelPeople",
      "wheelAudioMuted",
      "wheelAudioVolume",
    ]).then((data) => {
      if (!active) return;
      const storedPeople = Array.isArray(data.wheelPeople)
        ? data.wheelPeople
        : DEFAULT_PEOPLE;
      setPeople(storedPeople);
      drawWheel(storedPeople.map((p) => p.name));
      const volumeUnit = ensureUnitVolume(data.wheelAudioVolume, 0.1);
      const volumePercent = unitToPercent(volumeUnit);
      setWheelSoundsEnabled(!Boolean(data.wheelAudioMuted));
      setWheelAudioVolume(volumePercent);
      if (wheelAudioRef.current) {
        wheelAudioRef.current.volume = !data.wheelAudioMuted ? volumeUnit : 0;
      }
    });
    const c = confettiCanvasRef.current;
    if (c) {
      confettiCtxRef.current = c.getContext("2d");
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wheelAudioRef.current) {
      wheelAudioRef.current.volume = wheelSoundsEnabled
        ? percentToUnit(wheelAudioVolume)
        : 0;
    }
  }, [wheelSoundsEnabled, wheelAudioVolume]);

  const names = useMemo(
    () => people.map((p) => p.name).filter(Boolean),
    [people]
  );

  useEffect(() => {
    drawWheel(names);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names, selectedIndex]);

  function drawWheel(namesList) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const radius = canvas.width / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createRadialGradient(
      radius * 0.5,
      radius * 0.5,
      radius * 0.2,
      radius,
      radius,
      radius
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.7, "#cccccc");
    gradient.addColorStop(1, "#999999");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
    ctx.fill();

    if (namesList.length === 0) return;
    const step = (2 * Math.PI) / namesList.length;

    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(angleRef.current);

    namesList.forEach((name, i) => {
      ctx.beginPath();
      const isSelected = i === selectedIndex;
      const r = isSelected
        ? radius + 12 * Math.max(0, Math.min(1, winnerPulseRef.current))
        : radius;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, i * step, (i + 1) * step);
      ctx.fillStyle = isSelected
        ? `hsl(${(i * 360) / namesList.length}, 90%, 50%)`
        : `hsl(${(i * 360) / namesList.length}, 70%, 70%)`;
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.rotate(i * step + step / 2);
      ctx.translate(r * 0.8, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "#000";
      ctx.font = "bold 14px sans-serif";
      const letters = name.toUpperCase().split("");
      letters.forEach((char, index) => {
        ctx.fillText(char, -ctx.measureText(char).width / 2, index * 16);
      });
      ctx.restore();

      if (isSelected && winnerAnimatingRef.current) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 215, 0, 0.9)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, r, i * step, (i + 1) * step);
        ctx.stroke();
        ctx.restore();
      }
    });

    ctx.restore();
  }

  function animate() {
    if (!spinningRef.current) return;
    angleRef.current += velRef.current;
    const now = Date.now();
    if (now >= spinEndRef.current) {
      setSpinning(false);
      spinningRef.current = false;
      const normalizedAngle = ((angleRef.current % TAU) + TAU) % TAU;
      const step = TAU / names.length;
      const pointerAngle = (TAU - normalizedAngle + POINTER) % TAU;
      const index = Math.floor(pointerAngle / step) % names.length;
      const selectedPerson = names[index];
      setWinner(`Il vincitore è ${selectedPerson}!`);
      setSelectedIndex(index);
      const centerOfIndex = index * step + step / 2;
      const targetNormalized = (POINTER - centerOfIndex + TAU) % TAU;
      const delta =
        ((targetNormalized - normalizedAngle + Math.PI) % TAU) - Math.PI;
      angleRef.current += delta;
      startConfetti();
      try {
        if (wheelSoundsEnabled && wheelAudioRef.current) {
          wheelAudioRef.current.volume = percentToUnit(wheelAudioVolume);
          wheelAudioRef.current.play?.();
        }
      } catch {}
      setLastWinner(selectedPerson);
      lastWinnerRef.current = selectedPerson;
      startWinnerAnimation(selectedPerson);
      return;
    } else {
      const rem = Math.max(0, spinEndRef.current - now);
      const frac = spinDurRef.current > 0 ? rem / spinDurRef.current : 0;
      velRef.current = 0.35 * Math.max(0.05, frac * frac);
      requestAnimationFrame(animate);
    }
    drawWheel(names);
  }

  function startWinnerAnimation(selectedPerson) {
    winnerAnimatingRef.current = true;
    const start = Date.now();
    const duration = 1800;

    const stepAnim = () => {
      const t = (Date.now() - start) / duration;
      if (t >= 1) {
        winnerPulseRef.current = 0;
        winnerAnimatingRef.current = false;
        const updatedPeople = people.filter((p) => p.name !== selectedPerson);
        setPeople(updatedPeople);
        persistWheelPeople(updatedPeople);
        setSelectedIndex(-1);
        drawWheel(updatedNames);
        return;
      }
      const amp = Math.abs(Math.sin(t * 6 * Math.PI)) * (1 - t);
      winnerPulseRef.current = amp;
      drawWheel(names);
      requestAnimationFrame(stepAnim);
    };
    requestAnimationFrame(stepAnim);
  }

  function onSpin() {
    if (winnerAnimatingRef.current) return;
    if (names.length < 2) {
      alert("Inserisci almeno due nomi per usare la ruota.");
      return;
    }
    setLastWinner(null);
    lastWinnerRef.current = null;
    setSpinning(true);
    spinningRef.current = true;
    setWinner("");
    setSelectedIndex(-1);
    const dur = 3000 + Math.random() * 2000;
    spinDurRef.current = dur;
    spinEndRef.current = Date.now() + dur;
    velRef.current = 0.35;
    requestAnimationFrame(animate);
  }

  function onReset() {
    setPeople(DEFAULT_PEOPLE);
    persistWheelPeople(DEFAULT_PEOPLE);
    drawWheel(DEFAULT_PEOPLE.map((p) => p.name));
    angleRef.current = 0;
    velRef.current = 0;
    setSpinning(false);
    spinningRef.current = false;
    setLastWinner(null);
    lastWinnerRef.current = null;
  }

  function onShuffle() {
    const shuffled = [...people];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setPeople(shuffled);
    persistWheelPeople(shuffled);
  }

  function startConfetti() {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({length: 150}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * 40 + 10,
      color: `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`,
      tilt: Math.random() * 10 - 5,
      tiltAngleIncrement: Math.random() * 0.1 + 0.05,
      tiltAngle: 0,
    }));
    confettiParticlesRef.current = particles;
    requestAnimationFrame(updateConfetti);
  }

  function updateConfetti() {
    const canvas = confettiCanvasRef.current;
    const ctx = confettiCtxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let particles = confettiParticlesRef.current;
    particles.forEach((p) => {
      p.y += Math.cos(p.d) + 1 + p.r / 2;
      p.x += Math.sin(0);
      p.tiltAngle += p.tiltAngleIncrement;
      p.tilt = Math.sin(p.tiltAngle) * 15;

      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });
    particles = particles.filter((p) => p.y < canvas.height);
    confettiParticlesRef.current = particles;
    if (particles.length > 0) requestAnimationFrame(updateConfetti);
  }

  return (
    <>
      <div id="section-wheel" className={CARD_BASE_CLASS}>
        <div className={CARD_HEADER_CLASS}>
          <h2 className="text-2xl font-bold text-gray-800">
            Configurazione GipoWheel of Names
          </h2>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              className={wheelNavClass("general")}
              onClick={() => setWheelSection("general")}
            >
              Ruota
            </button>
            <button
              type="button"
              className={wheelNavClass("participants")}
              onClick={() => setWheelSection("participants")}
            >
              Partecipanti
            </button>
            <button
              type="button"
              className={wheelNavClass("audio")}
              onClick={() => setWheelSection("audio")}
            >
              Suoni
            </button>
          </div>
        </div>
        <div className={CARD_BODY_CLASS}>
          {wheelSection === "general" && (
            <div className="flex flex-col gap-4">
              <SettingsSection
                title="Anteprima ruota"
                description="Visualizza la ruota attuale con il puntatore prima di estrarre il prossimo nome."
              >
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-red-600 absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]"></div>
                    <canvas
                      ref={canvasRef}
                      id="wheel-canvas"
                      width="500"
                      height="500"
                      className="block"
                    ></canvas>
                  </div>
                  <div
                    id="winner"
                    className="text-center text-xl font-bold text-blue-700"
                  >
                    {winner}
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection
                title="Azioni rapide"
                description="Avvia la ruota, mischia l'ordine o ripristina l'elenco originale."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    id="spin"
                    onClick={onSpin}
                    disabled={spinning}
                    className={`text-white font-semibold py-2 px-4 rounded ${
                      spinning
                        ? "bg-green-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {spinning ? "Girando…" : "Gira"}
                  </button>
                  <button
                    id="wheel-shuffle"
                    onClick={onShuffle}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded"
                  >
                    Mischia
                  </button>
                  <button
                    id="wheel-reset"
                    onClick={onReset}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
                  >
                    Ripristina
                  </button>
                </div>
                <div
                  id="wheel-status"
                  className="text-sm text-green-600 h-5"
                ></div>
              </SettingsSection>
            </div>
          )}

          {wheelSection === "participants" && (
            <div className="flex flex-col gap-4">
              <SettingsSection
                title="Elenco partecipanti"
                description="Modifica i nomi della ruota. Ogni riga rappresenta una slice."
              >
                <div className="flex flex-col gap-2">
                  {people.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder={`Partecipante ${i + 1}`}
                        value={p.name}
                        onChange={(e) => updateWheelPerson(i, e.target.value)}
                        className="flex-1 border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeWheelPerson(i)}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                      >
                        Rimuovi
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addWheelPerson}
                    className="self-start bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded"
                  >
                    Aggiungi
                  </button>
                </div>
              </SettingsSection>

              <SettingsSection
                title="Strumenti elenco"
                description="Mischia l'ordine o ripristina l'elenco di default."
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={onShuffle}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded"
                  >
                    Mischia elenco
                  </button>
                  <button
                    onClick={onReset}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
                  >
                    Ripristina elenco iniziale
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Ultimo vincitore estratto: {lastWinner || "--"}
                </p>
              </SettingsSection>
            </div>
          )}

          {wheelSection === "audio" && (
            <div className="flex flex-col gap-4">
              <SettingsSection
                title="Suoni della ruota"
                description="Gestisci il suono riprodotto quando viene annunciato un vincitore."
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="wheel-sounds-enabled"
                    checked={wheelSoundsEnabled}
                    onChange={(e) => handleWheelToggle(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="wheel-sounds-enabled"
                    className="text-sm font-medium text-gray-700"
                  >
                    Suono proclamazione vincitore abilitato
                  </label>
                </div>
                <div>
                  <label
                    htmlFor="wheel-audio-volume"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Volume suono: {wheelAudioVolume}%
                  </label>
                  <input
                    type="range"
                    id="wheel-audio-volume"
                    min={0}
                    max={100}
                    step={1}
                    value={wheelAudioVolume}
                    onChange={(e) =>
                      handleWheelVolumeChange(parseInt(e.target.value, 10))
                    }
                    className="w-full"
                  />
                </div>
              </SettingsSection>
            </div>
          )}
        </div>
      </div>
      <Toast message={wheelToast} />
    </>
  );
}

function ChangelogTab() {
  const [content, setContent] = useState("Caricamento changelog...");
  const mdToHtml = (md) => {
    if (!md) return "";
    const escape = (s) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    const inline = (text) => {
      const e = escape(text);
      return e
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*(?!\s)(.+?)(?!\s)\*(?!\*)/g, "$1<em>$2</em>")
        .replace(/(^|[^_])_(?!\s)(.+?)(?!\s)_(?!_)/g, "$1<em>$2</em>")
        .replace(/~~(.+?)~~/g, "<del>$1</del>")
        .replace(/`([^`]+?)`/g, "<code>$1</code>")
        .replace(
          /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
          (m, t, url, title) => {
            const tt = title ? ` title="${escape(title)}"` : "";
            return `<a href="${url}" target="_blank" rel="noopener noreferrer"${tt}>${t}</a>`;
          }
        );
    };
    const lines = md.replace(/\r\n?/g, "\n").split("\n");
    let i = 0;
    let inCode = false;
    let codeLang = "";
    let codeBuf = [];
    const out = [];
    const paraBuf = [];
    const ulStack = [];
    const olStack = [];
    const flushParagraph = (buf) => {
      const txt = buf.join("\n").trim();
      if (!txt) return;
      out.push(`<p>${inline(txt)}</p>`);
      buf.length = 0;
    };
    const closeLists = () => {
      while (ulStack.length) out.push("</ul>") && ulStack.pop();
      while (olStack.length) out.push("</ol>") && olStack.pop();
    };
    while (i < lines.length) {
      const line = lines[i];
      const fence = line.match(/^```\s*(\w+)?\s*$/);
      if (fence) {
        if (inCode) {
          out.push(
            `<pre class="overflow-auto rounded bg-gray-100 p-3 text-sm"><code class="language-${codeLang}">${escape(
              codeBuf.join("\n")
            )}</code></pre>`
          );
          codeBuf = [];
          codeLang = "";
          inCode = false;
        } else {
          flushParagraph(paraBuf);
          closeLists();
          inCode = true;
          codeLang = fence[1] || "";
        }
        i++;
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        i++;
        continue;
      }
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushParagraph(paraBuf);
        closeLists();
        const level = h[1].length;
        out.push(
          `<h${level} class="mt-4 mb-2 font-bold">${inline(h[2])}</h${level}>`
        );
        i++;
        continue;
      }
      const bq = line.match(/^>\s?(.*)$/);
      if (bq) {
        flushParagraph(paraBuf);
        closeLists();
        out.push(
          `<blockquote class="border-l-4 pl-3 italic text-gray-600">${inline(
            bq[1]
          )}</blockquote>`
        );
        i++;
        continue;
      }
      const ul = line.match(/^\s*[-*]\s+(.*)$/);
      const ol = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ul) {
        flushParagraph(paraBuf);
        if (!ulStack.length)
          out.push('<ul class="list-disc ml-6 my-2">') && ulStack.push(true);
        out.push(`<li>${inline(ul[1])}</li>`);
        i++;
        continue;
      }
      if (ol) {
        flushParagraph(paraBuf);
        if (!olStack.length)
          out.push('<ol class="list-decimal ml-6 my-2">') && olStack.push(true);
        out.push(`<li>${inline(ol[1])}</li>`);
        i++;
        continue;
      }
      if (/^\s*$/.test(line)) {
        flushParagraph(paraBuf);
        closeLists();
        i++;
        continue;
      }
      paraBuf.push(line);
      i++;
    }
    flushParagraph(paraBuf);
    closeLists();
    return out.join("\n");
  };
  useEffect(() => {
    fetch(chrome.runtime.getURL("CHANGELOG.md"))
      .then((r) => r.text())
      .then((t) => setContent(t))
      .catch(() => setContent("Errore nel caricamento del changelog."));
  }, []);
  return (
    <div id="section-changelog" className={CARD_BASE_CLASS}>
      <div className={CARD_HEADER_CLASS}>
        <h2 className="text-2xl font-bold text-gray-800">Changelog</h2>
      </div>
      <div className={`${CARD_BODY_CLASS} pr-4`}>
        <div
          id="changelog-content"
          className="text-sm text-gray-800 leading-6 h-full overflow-y-auto"
          dangerouslySetInnerHTML={{__html: mdToHtml(content)}}
        />
      </div>
    </div>
  );
}
