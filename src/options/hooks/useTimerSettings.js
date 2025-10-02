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
  DEFAULT_TIMER_FILTER_JIRA,
  DEFAULT_TIMER_PRESETS,
  DEFAULT_TIMER_PRESETS_ENABLED,
  DEFAULT_TIMER_SOUNDS_ENABLED,
  DEFAULT_TIMER_VOLUME_PERCENT,
  DEFAULT_TIMER_VOLUME_UNIT,
} from "../../shared/constants";
import {sanitizePeopleList} from "../../shared/people";
import {readSyncStorage, writeSyncStorage} from "../../shared/storage";
import {sanitizePresets} from "../../shared/timer";
import {useAutoToast} from "./useAutoToast";

export function useTimerSettings() {
  const [people, setPeople] = useState(DEFAULT_PEOPLE);
  const [duration, setDuration] = useState(String(DEFAULT_DURATION));
  const [filterJiraByUser, setFilterJiraByUser] = useState(
    DEFAULT_TIMER_FILTER_JIRA
  );
  const [soundsEnabled, setSoundsEnabled] = useState(
    DEFAULT_TIMER_SOUNDS_ENABLED
  );
  const [audioVolume, setAudioVolume] = useState(DEFAULT_TIMER_VOLUME_PERCENT);
  const [presets, setPresets] = useState(DEFAULT_TIMER_PRESETS);
  const [presetsEnabled, setPresetsEnabled] = useState(
    DEFAULT_TIMER_PRESETS_ENABLED
  );
  const [newPresetMinutes, setNewPresetMinutes] = useState("5");
  const [reminderEnabled, setReminderEnabled] = useState(
    DEFAULT_REMINDER_ENABLED
  );
  const [reminderSecondsInput, setReminderSecondsInput] = useState(
    String(DEFAULT_REMINDER_SECONDS)
  );
  const {toastMessage, showToast} = useAutoToast();

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
      const safeDuration =
        !Number.isNaN(storedDuration) && storedDuration > 0
          ? storedDuration
          : DEFAULT_DURATION;
      setDuration(String(safeDuration));

      const filterValue =
        data.filterJiraByUser === undefined
          ? DEFAULT_TIMER_FILTER_JIRA
          : Boolean(data.filterJiraByUser);
      setFilterJiraByUser(filterValue);

      const soundsValue =
        data.audioMuted === undefined
          ? DEFAULT_TIMER_SOUNDS_ENABLED
          : !Boolean(data.audioMuted);
      setSoundsEnabled(soundsValue);

      const volumeUnit = ensureUnitVolume(
        data.audioVolume,
        DEFAULT_TIMER_VOLUME_UNIT
      );
      setAudioVolume(unitToPercent(volumeUnit));

      const reminderEnabledValue =
        typeof data.reminderEnabled === "boolean"
          ? data.reminderEnabled
          : DEFAULT_REMINDER_ENABLED;
      setReminderEnabled(reminderEnabledValue);

      const parsedReminderSeconds = parseInt(data.reminderSeconds, 10);
      const safeReminderSeconds =
        !Number.isNaN(parsedReminderSeconds) && parsedReminderSeconds > 0
          ? parsedReminderSeconds
          : DEFAULT_REMINDER_SECONDS;
      setReminderSecondsInput(String(safeReminderSeconds));

      const sanitizedPresets = sanitizePresets(data.timerPresets);
      setPresets(sanitizedPresets);
      setPresetsEnabled(
        data.timerPresetsEnabled === undefined
          ? DEFAULT_TIMER_PRESETS_ENABLED
          : data.timerPresetsEnabled !== false
      );

      const defaultsPayload = {};
      if (!data.peopleWithIds) {
        defaultsPayload.peopleWithIds = sanitizePeopleList(storedPeople);
      }
      if (!data.duration) {
        defaultsPayload.duration = safeDuration;
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
        defaultsPayload.timerPresetsEnabled = DEFAULT_TIMER_PRESETS_ENABLED;
      }
      if (data.filterJiraByUser === undefined) {
        defaultsPayload.filterJiraByUser = DEFAULT_TIMER_FILTER_JIRA;
      }
      if (data.audioMuted === undefined) {
        defaultsPayload.audioMuted = !DEFAULT_TIMER_SOUNDS_ENABLED;
      }
      if (data.audioVolume === undefined) {
        defaultsPayload.audioVolume = DEFAULT_TIMER_VOLUME_UNIT;
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

  const persistPeople = (list) => {
    writeSyncStorage({peopleWithIds: sanitizePeopleList(list)});
    showToast();
  };

  const updatePerson = (idx, field, value) => {
    setPeople((prev) => {
      const next = prev.map((person, i) =>
        i === idx ? {...person, [field]: value} : person
      );
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

  const onDurationChange = (value) => {
    setDuration(value);
    const numeric = parseInt(value, 10);
    if (!Number.isNaN(numeric) && numeric > 0) {
      writeSyncStorage({duration: numeric});
      showToast();
    }
  };

  const toggleFilter = (checked) => {
    setFilterJiraByUser(checked);
    writeSyncStorage({filterJiraByUser: checked});
    showToast();
  };

  const handleSoundToggle = (enabled) => {
    setSoundsEnabled(enabled);
    writeSyncStorage({
      audioMuted: !enabled,
      audioVolume: percentToUnit(audioVolume),
    });
    showToast();
  };

  const handleVolumeChange = (vol) => {
    const safeValue = Number.isNaN(vol) ? 0 : vol;
    setAudioVolume(safeValue);
    writeSyncStorage({
      audioMuted: !soundsEnabled,
      audioVolume: percentToUnit(safeValue),
    });
    showToast();
  };

  const toggleReminderSetting = (enabled) => {
    setReminderEnabled(enabled);
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
    showToast();
  };

  const onReminderSecondsChange = (value) => {
    setReminderSecondsInput(value);
    const numeric = parseInt(value, 10);
    if (!Number.isNaN(numeric) && numeric > 0) {
      writeSyncStorage({reminderSeconds: numeric});
      showToast();
    }
  };

  const onPresetMinutesChange = (value) => {
    setNewPresetMinutes(value);
  };

  const addPreset = () => {
    if (!presetsEnabled) return;
    const normalized = parseFloat(newPresetMinutes.replace(/,/g, "."));
    if (Number.isNaN(normalized) || normalized <= 0) {
      showToast("Inserisci minuti validi");
      return;
    }
    const seconds = Math.round(normalized * 60);
    if (presets.includes(seconds)) {
      showToast("Preset già presente");
      setNewPresetMinutes("");
      return;
    }
    const next = sanitizePresets([...presets, seconds]);
    setPresets(next);
    writeSyncStorage({timerPresets: next});
    setNewPresetMinutes("");
    showToast("Preset aggiunto");
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
    showToast("Preset aggiornati");
  };

  const handlePresetToggle = (enabled) => {
    setPresetsEnabled(enabled);
    writeSyncStorage({timerPresetsEnabled: enabled});
    showToast();
  };

  return {
    timerToast: toastMessage,
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
  };
}
