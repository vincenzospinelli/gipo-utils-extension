import {SettingsSection} from "../SettingsSection";
import {SoundSettings} from "../SoundSettings";
import {formatDuration} from "../../../shared/time";

export function TimerSettingsSection({
  duration,
  onDurationChange,
  presets,
  presetsEnabled,
  newPresetMinutes,
  onPresetMinutesChange,
  addPreset,
  removePreset,
  handlePresetToggle,
  soundsEnabled,
  audioVolume,
  handleSoundToggle,
  handleVolumeChange,
  reminderEnabled,
  reminderSecondsInput,
  toggleReminderSetting,
  onReminderSecondsChange,
  filterJiraByUser,
  toggleFilter,
}) {
  return (
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
          onChange={(event) => onDurationChange(event.target.value)}
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
            onChange={(event) => handlePresetToggle(event.target.checked)}
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
              const disableRemove = !presetsEnabled || presets.length <= 1;
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
          <p className="text-sm text-gray-500">Nessun preset configurato.</p>
        )}
        <div className="flex gap-2 mt-3">
          <input
            type="number"
            min={1}
            step={1}
            value={newPresetMinutes}
            onChange={(event) => onPresetMinutesChange(event.target.value)}
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
            I preset restano salvati ma non verranno mostrati nel widget finché
            disabilitati.
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
            onChange={(event) => toggleReminderSetting(event.target.checked)}
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
          onChange={(event) => onReminderSecondsChange(event.target.value)}
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
            onChange={(event) => toggleFilter(event.target.checked)}
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
  );
}
