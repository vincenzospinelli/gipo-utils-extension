import {useEffect, useState} from "react";

import {
  ensureUnitVolume,
  percentToUnit,
  unitToPercent,
} from "../../shared/audio";
import {
  DEFAULT_DURATION,
  DEFAULT_PEOPLE,
  DEFAULT_REMINDER_ENABLED,
  DEFAULT_REMINDER_SECONDS,
  DEFAULT_TIMER_PRESETS,
} from "../../shared/constants";
import {sanitizePeopleList} from "../../shared/people";
import {readSyncStorage, writeSyncStorage} from "../../shared/storage";
import {formatDuration} from "../../shared/time";
import {sanitizePresets} from "../../shared/timer";
import {SettingsSection} from "../components/SettingsSection";
import {SoundSettings} from "../components/SoundSettings";
import {TimerPreview} from "../components/TimerPreview";
import {Toast} from "../components/Toast";
import {
  CARD_BASE_CLASS,
  CARD_BODY_CLASS,
  CARD_HEADER_CLASS,
} from "../constants/layout";
import {useAutoToast} from "../hooks/useAutoToast";

export function TimerTab() {
  const [people, setPeople] = useState(DEFAULT_PEOPLE);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [filterJiraByUser, setFilterJiraByUser] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState(10);
  const [presets, setPresets] = useState(DEFAULT_TIMER_PRESETS);
  const [presetsEnabled, setPresetsEnabled] = useState(true);
  const [newPresetMinutes, setNewPresetMinutes] = useState("5");
  const [reminderEnabled, setReminderEnabledState] = useState(
    DEFAULT_REMINDER_ENABLED
  );
  const [reminderSecondsInput, setReminderSecondsInput] = useState(
    String(DEFAULT_REMINDER_SECONDS)
  );
  const [timerSection, setTimerSection] = useState("timer");

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
      "timerPresetsEnabled",
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
      setPresetsEnabled(data.timerPresetsEnabled !== false);
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
      if (data.timerPresetsEnabled === undefined) {
        defaultsPayload.timerPresetsEnabled = true;
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
      if (changes.timerPresetsEnabled) {
        setPresetsEnabled(changes.timerPresetsEnabled.newValue !== false);
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
    if (!presetsEnabled) return;
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
    if (!presetsEnabled) return;
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

  const handlePresetToggle = (enabled) => {
    setPresetsEnabled(enabled);
    writeSyncStorage({timerPresetsEnabled: enabled});
    showTimerToast();
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
              className={timerNavClass("timer")}
              onClick={() => setTimerSection("timer")}
            >
              Timer
            </button>
            <button
              type="button"
              className={timerNavClass("team")}
              onClick={() => setTimerSection("team")}
            >
              Team
            </button>
            <button
              type="button"
              className={timerNavClass("settings")}
              onClick={() => setTimerSection("settings")}
            >
              Impostazioni
            </button>
          </div>
        </div>
        <div className={CARD_BODY_CLASS}>
          {timerSection === "timer" && (
            <div className="flex flex-col gap-4">
              <SettingsSection
                title="Anteprima timer"
                description="Visualizza come appare il widget GipoTimer con le impostazioni correnti."
              >
                <TimerPreview
                  people={people}
                  duration={duration}
                  presets={presets}
                  presetsEnabled={presetsEnabled}
                />
              </SettingsSection>
            </div>
          )}

          {timerSection === "settings" && (
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
                title="Preset timer"
                description="Gestisci le scorciatoie disponibili nel widget del timer."
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="timer-presets-enabled"
                    checked={presetsEnabled}
                    onChange={(e) => handlePresetToggle(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="timer-presets-enabled"
                    className="text-sm font-medium text-gray-700"
                  >
                    Preset abilitati
                  </label>
                </div>
                {presets.length ? (
                  <div className="flex flex-col gap-2">
                    {presets.map((preset) => {
                      const minutesValue = preset / 60;
                      const minutesLabel = Number.isInteger(minutesValue)
                        ? `${minutesValue} min`
                        : `${minutesValue.toFixed(1)} min`;
                      const disableRemove =
                        !presetsEnabled || presets.length <= 1;
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
                            disabled={disableRemove}
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
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={newPresetMinutes}
                    onChange={(e) => setNewPresetMinutes(e.target.value)}
                    placeholder="Minuti"
                    disabled={!presetsEnabled}
                    className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={addPreset}
                    disabled={!presetsEnabled}
                    className="self-start bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
                  >
                    Aggiungi
                  </button>
                </div>
                {!presetsEnabled && (
                  <p className="mt-2 text-xs text-gray-500">
                    I preset restano salvati ma non verranno mostrati nel widget
                    finché disabilitati.
                  </p>
                )}
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
                title="Automazioni Jira (Beta)"
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
                    Filtra la board Jira per utente
                  </label>
                </div>
              </SettingsSection>
            </div>
          )}

          {timerSection === "team" && (
            <div className="flex flex-col gap-4">
              <SettingsSection
                title="Team"
                description="Aggiorna l’elenco del team e associa i relativi Jira ID."
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
        </div>
      </div>
      <Toast message={timerToast} />
    </>
  );
}
