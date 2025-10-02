import {useState} from "react";

import {TimerPeopleSection} from "../components/timer/TimerPeopleSection";
import {TimerPreviewSection} from "../components/timer/TimerPreviewSection";
import {TimerSettingsSection} from "../components/timer/TimerSettingsSection";
import {Toast} from "../components/Toast";
import {
  CARD_BASE_CLASS,
  CARD_BODY_CLASS,
  CARD_HEADER_CLASS,
} from "../constants/layout";
import {useTimerSettings} from "../hooks/useTimerSettings";

export function TimerTab() {
  const {
    timerToast,
    people,
    duration,
    filterJiraByUser,
    soundsEnabled,
    audioVolume,
    presets,
    presetsEnabled,
    newPresetMinutes,
    reminderEnabled,
    reminderSecondsInput,
    updatePerson,
    addPerson,
    removePerson,
    onDurationChange,
    toggleFilter,
    handleSoundToggle,
    handleVolumeChange,
    toggleReminderSetting,
    onReminderSecondsChange,
    onPresetMinutesChange,
    addPreset,
    removePreset,
    handlePresetToggle,
  } = useTimerSettings();
  const [timerSection, setTimerSection] = useState("timer");

  const timerNavClass = (section) =>
    `px-3 py-2 rounded transition-colors ${
      timerSection === section
        ? "bg-blue-100 text-blue-700 font-semibold"
        : "text-gray-600 hover:text-blue-600"
    }`;

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
              className={timerNavClass("people")}
              onClick={() => setTimerSection("people")}
            >
              Partecipanti
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
            <TimerPreviewSection
              people={people}
              duration={duration}
              presets={presets}
              presetsEnabled={presetsEnabled}
            />
          )}

          {timerSection === "settings" && (
            <TimerSettingsSection
              duration={duration}
              onDurationChange={onDurationChange}
              presets={presets}
              presetsEnabled={presetsEnabled}
              newPresetMinutes={newPresetMinutes}
              onPresetMinutesChange={onPresetMinutesChange}
              addPreset={addPreset}
              removePreset={removePreset}
              handlePresetToggle={handlePresetToggle}
              soundsEnabled={soundsEnabled}
              audioVolume={audioVolume}
              handleSoundToggle={handleSoundToggle}
              handleVolumeChange={handleVolumeChange}
              reminderEnabled={reminderEnabled}
              reminderSecondsInput={reminderSecondsInput}
              toggleReminderSetting={toggleReminderSetting}
              onReminderSecondsChange={onReminderSecondsChange}
              filterJiraByUser={filterJiraByUser}
              toggleFilter={toggleFilter}
            />
          )}

          {timerSection === "people" && (
            <TimerPeopleSection
              people={people}
              updatePerson={updatePerson}
              removePerson={removePerson}
              addPerson={addPerson}
            />
          )}
        </div>
      </div>
      <Toast message={timerToast} />
    </>
  );
}
