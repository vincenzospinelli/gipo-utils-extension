import {X as CloseIcon} from "lucide-react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {applyVolume, ensureUnitVolume} from "../../shared/audio";
import {
  DEFAULT_DURATION,
  DEFAULT_PEOPLE,
  DEFAULT_REMINDER_ENABLED,
  DEFAULT_REMINDER_SECONDS,
  DEFAULT_TIMER_FILTER_JIRA,
  DEFAULT_TIMER_PRESETS,
  DEFAULT_TIMER_PRESETS_ENABLED,
  DEFAULT_TIMER_SOUNDS_ENABLED,
  DEFAULT_TIMER_VOLUME_UNIT,
  MAX_SESSION_HISTORY,
} from "../../shared/constants";
import {ensureIndexInBounds, sanitizePeopleList} from "../../shared/people";
import {
  readSyncStorage,
  subscribeSyncStorage,
  writeSyncStorage,
} from "../../shared/storage";
import {formatDuration} from "../../shared/time";
import {
  appendSessionHistory,
  buildSessionEntry,
  sanitizePresets,
  summarizeHistory,
} from "../../shared/timer";
import {changeJiraView} from "../utils/jira";
import {TimerAnalogClock} from "./TimerAnalogClock";
import {TimerAudio} from "./TimerAudio";
import {TimerControls} from "./TimerControls";
import {TimerMenu} from "./TimerMenu";

const HAND_RESET_DEG = -180;

export function TimerWidget({containerEl, hostEl}) {
  const [people, setPeople] = useState(DEFAULT_PEOPLE);
  const [index, setIndex] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [startTime, setStartTime] = useState(null);
  const [pausedMs, setPausedMs] = useState(0);
  const [filterJiraByUser, setFilterJiraByUser] = useState(
    DEFAULT_TIMER_FILTER_JIRA
  );
  const [theme, setTheme] = useState("dark");
  const [visible, setVisible] = useState(true);
  const [display, setDisplay] = useState("00:00:00");
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioMuted, setAudioMuted] = useState(
    !DEFAULT_TIMER_SOUNDS_ENABLED
  );
  const [audioVolume, setAudioVolume] = useState(DEFAULT_TIMER_VOLUME_UNIT);
  const [reminderEnabled, setReminderEnabled] = useState(
    DEFAULT_REMINDER_ENABLED
  );
  const [reminderSeconds, setReminderSeconds] = useState(
    DEFAULT_REMINDER_SECONDS
  );
  const [reminderFlash, setReminderFlash] = useState(false);
  const [presets, setPresets] = useState(DEFAULT_TIMER_PRESETS);
  const [presetsEnabled, setPresetsEnabled] = useState(
    DEFAULT_TIMER_PRESETS_ENABLED
  );
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);

  const totalsByPerson = useMemo(() => {
    const summary = summarizeHistory(sessionHistory);
    const map = new Map();
    summary.forEach(({personName, durationMs}) => {
      if (personName) map.set(personName, durationMs);
    });
    return map;
  }, [sessionHistory]);

  const secHandRef = useRef(null);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);
  const tickAudioRef = useRef(null);
  const startTimeRef = useRef(startTime);
  const pausedMsRef = useRef(pausedMs);
  const reminderTriggeredRef = useRef(false);
  const sessionStartRef = useRef(null);
  const sessionAccumulatedRef = useRef(0);

  const setSecondHand = useCallback((deg) => {
    if (secHandRef.current) {
      secHandRef.current.style.transform = `rotate(${deg}deg)`;
    }
  }, []);

  const stopTick = useCallback(() => {
    const tickEl = tickAudioRef.current;
    if (!tickEl) return;
    try {
      tickEl.pause();
      tickEl.currentTime = 0;
    } catch {}
  }, []);

  const playTick = useCallback(() => {
    if (audioMuted) return;
    const tickEl = tickAudioRef.current;
    if (!tickEl) return;
    try {
      tickEl.currentTime = 0;
      tickEl.play().catch(() => {});
    } catch {}
  }, [audioMuted]);

  const playBeep = useCallback(() => {
    if (audioMuted) return;
    const beepEl = audioRef.current;
    if (!beepEl) return;
    try {
      beepEl.currentTime = 0;
      beepEl.play().catch(() => {});
    } catch {}
  }, [audioMuted]);

  const clearReminderFlash = useCallback(() => {
    setReminderFlash(false);
  }, []);

  const triggerReminder = useCallback(() => {
    reminderTriggeredRef.current = true;
    setReminderFlash(true);
    playBeep();
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(200);
      }
    } catch {}
  }, [playBeep]);

  const resetReminderState = useCallback(() => {
    reminderTriggeredRef.current = false;
    clearReminderFlash();
  }, [clearReminderFlash]);

  const accumulateSessionProgress = useCallback(() => {
    if (sessionStartRef.current) {
      sessionAccumulatedRef.current += Math.max(
        0,
        Date.now() - sessionStartRef.current
      );
      sessionStartRef.current = null;
    }
  }, []);

  const resetSessionTracking = useCallback(() => {
    sessionStartRef.current = null;
    sessionAccumulatedRef.current = 0;
  }, []);

  const finalizeSession = useCallback(
    (completed) => {
      accumulateSessionProgress();
      const totalMs = sessionAccumulatedRef.current;
      if (totalMs < 1000) {
        resetSessionTracking();
        return;
      }
      const personName = people[index]?.name || "Nessuno";
      const entry = buildSessionEntry({
        personName,
        durationMs: totalMs,
        startedAt: Date.now(),
        completed: Boolean(completed),
      });
      setSessionHistory((prev) => {
        const next = appendSessionHistory(prev, entry, MAX_SESSION_HISTORY);
        writeSyncStorage({sessionHistory: next});
        return next;
      });
      resetSessionTracking();
    },
    [
      accumulateSessionProgress,
      index,
      people,
      resetSessionTracking,
      setSessionHistory,
    ]
  );

  const handleSelectPreset = useCallback(
    (seconds) => {
      if (!presetsEnabled) return;
      if (startTime) return;
      const normalized = Math.round(seconds);
      if (!Number.isFinite(normalized) || normalized <= 0) return;
      setDuration(normalized);
      setSelectedPreset(normalized);
      writeSyncStorage({duration: normalized});
    },
    [presetsEnabled, setDuration, setSelectedPreset, startTime]
  );

  useEffect(() => {
    let active = true;
    readSyncStorage([
      "peopleWithIds",
      "duration",
      "filterJiraByUser",
      "theme",
      "widgetVisible",
      "audioMuted",
      "audioVolume",
      "reminderEnabled",
      "reminderSeconds",
      "timerPresets",
      "timerPresetsEnabled",
      "sessionHistory",
    ]).then((data) => {
      if (!active) return;
      const sanitized = sanitizePeopleList(
        data.peopleWithIds || DEFAULT_PEOPLE
      );
      setPeople(sanitized.length ? sanitized : DEFAULT_PEOPLE);

      const storedDuration = parseInt(data.duration, 10);
      const safeDuration =
        !Number.isNaN(storedDuration) && storedDuration > 0
          ? storedDuration
          : DEFAULT_DURATION;
      setDuration(safeDuration);

      const filterValue =
        data.filterJiraByUser === undefined
          ? DEFAULT_TIMER_FILTER_JIRA
          : Boolean(data.filterJiraByUser);
      setFilterJiraByUser(filterValue);
      setTheme(data.theme === "light" ? "light" : "dark");
      setVisible(data.widgetVisible !== false);
      const audioMutedValue =
        data.audioMuted === undefined
          ? !DEFAULT_TIMER_SOUNDS_ENABLED
          : Boolean(data.audioMuted);
      setAudioMuted(audioMutedValue);
      const audioUnit = ensureUnitVolume(
        data.audioVolume,
        DEFAULT_TIMER_VOLUME_UNIT
      );
      setAudioVolume(audioUnit);
      setReminderEnabled(
        typeof data.reminderEnabled === "boolean"
          ? data.reminderEnabled
          : DEFAULT_REMINDER_ENABLED
      );
      const storedReminderSeconds = parseInt(data.reminderSeconds, 10);
      setReminderSeconds(
        !Number.isNaN(storedReminderSeconds) && storedReminderSeconds > 0
          ? storedReminderSeconds
          : DEFAULT_REMINDER_SECONDS
      );
      const sanitizedPresets = sanitizePresets(data.timerPresets);
      const presetsFlag =
        data.timerPresetsEnabled === undefined
          ? DEFAULT_TIMER_PRESETS_ENABLED
          : data.timerPresetsEnabled !== false;
      setPresetsEnabled(presetsFlag);
      setPresets(sanitizedPresets);
      const maybeSelected = sanitizedPresets.includes(safeDuration)
        ? safeDuration
        : null;
      setSelectedPreset(presetsFlag ? maybeSelected : null);
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
    applyVolume(audioRef.current, audioMuted, audioVolume);
    applyVolume(tickAudioRef.current, audioMuted, audioVolume);
  }, [audioMuted, audioVolume]);

  useEffect(() => {
    if (!presetsEnabled) {
      setSelectedPreset(null);
      return;
    }
    if (presets.includes(duration)) {
      setSelectedPreset(duration);
    } else {
      setSelectedPreset(null);
    }
  }, [duration, presets, presetsEnabled]);

  useEffect(() => {
    startTimeRef.current = startTime;
  }, [startTime]);

  useEffect(() => {
    pausedMsRef.current = pausedMs;
  }, [pausedMs]);

  useEffect(() => {
    if (!startTime) return undefined;

    const tick = () => {
      const remaining = startTime - Date.now();
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setStartTime(null);
        setPausedMs(0);
        setDisplay("00:00:00");
        setSecondHand(HAND_RESET_DEG);
        stopTick();
        playBeep();
        finalizeSession(true);
        resetReminderState();
        return;
      }

      setDisplay(formatDuration(remaining));
      const secondsRemaining = Math.max(0, Math.floor(remaining / 1000));
      const secondDeg = (60 - secondsRemaining) * 6 + HAND_RESET_DEG;
      setSecondHand(secondDeg);
      if (
        reminderEnabled &&
        !reminderTriggeredRef.current &&
        reminderSeconds > 0 &&
        remaining > 0 &&
        remaining <= reminderSeconds * 1000
      ) {
        triggerReminder();
      }
      playTick();
    };

    intervalRef.current = setInterval(tick, 1000);
    tick();
    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [
    startTime,
    playBeep,
    playTick,
    setSecondHand,
    stopTick,
    reminderEnabled,
    reminderSeconds,
    triggerReminder,
    resetReminderState,
  ]);

  useEffect(() => {
    if (!containerEl) return;
    containerEl.classList.remove("light", "dark");
    containerEl.classList.add(theme);
  }, [theme, containerEl]);

  useEffect(() => {
    const onDocMouseDown = (event) => {
      if (hostEl && !hostEl.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown, true);
    };
  }, [hostEl]);

  useEffect(() => {
    const messageHandler = (message) => {
      if (message?.action === "show-widget") {
        setVisible(true);
        writeSyncStorage({widgetVisible: true});
      }
    };
    chrome.runtime.onMessage.addListener(messageHandler);
    return () => chrome.runtime.onMessage.removeListener(messageHandler);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSyncStorage((changes, areaName) => {
      if (areaName !== "sync") return;

      if (changes.audioMuted) {
        setAudioMuted(Boolean(changes.audioMuted.newValue));
      }

      if (changes.audioVolume) {
        setAudioVolume(
          ensureUnitVolume(
            changes.audioVolume.newValue,
            DEFAULT_TIMER_VOLUME_UNIT
          )
        );
      }

      if (changes.duration) {
        const newSeconds = parseInt(changes.duration.newValue, 10);
        const oldSeconds = parseInt(changes.duration.oldValue, 10);
        if (Number.isNaN(newSeconds) || newSeconds <= 0) return;

        setDuration(newSeconds);
        const now = Date.now();
        const currentStart = startTimeRef.current;
        const currentPaused = pausedMsRef.current;
        const oldMs =
          !Number.isNaN(oldSeconds) && oldSeconds > 0
            ? oldSeconds * 1000
            : null;

        if (currentStart) {
          const remaining = Math.max(0, currentStart - now);
          let newRemaining = remaining;
          if (oldMs && oldMs > 0) {
            const fraction = Math.max(0, Math.min(1, remaining / oldMs));
            newRemaining = Math.round(fraction * newSeconds * 1000);
          } else {
            newRemaining = Math.round(newSeconds * 1000);
          }
          setStartTime(now + newRemaining);
          setDisplay(formatDuration(newRemaining));
          const secondsRemaining = Math.max(0, Math.floor(newRemaining / 1000));
          const secondDeg = (60 - secondsRemaining) * 6 + HAND_RESET_DEG;
          setSecondHand(secondDeg);
        } else if (currentPaused > 0) {
          if (oldMs && oldMs > 0) {
            const fraction = Math.max(0, Math.min(1, currentPaused / oldMs));
            const newPaused = Math.round(fraction * newSeconds * 1000);
            setPausedMs(newPaused);
            setDisplay(formatDuration(newPaused));
          } else {
            const newPaused = Math.round(newSeconds * 1000);
            setPausedMs(newPaused);
            setDisplay(formatDuration(newPaused));
          }
        }
      }

      if (changes.theme) {
        const value = changes.theme.newValue;
        if (value === "light" || value === "dark") setTheme(value);
      }

      if (changes.widgetVisible) {
        setVisible(changes.widgetVisible.newValue !== false);
      }

      if (changes.filterJiraByUser) {
        setFilterJiraByUser(Boolean(changes.filterJiraByUser.newValue));
      }

      if (changes.reminderEnabled) {
        const enabled = Boolean(changes.reminderEnabled.newValue);
        setReminderEnabled(enabled);
        if (!enabled) resetReminderState();
      }

      if (changes.reminderSeconds) {
        const next = parseInt(changes.reminderSeconds.newValue, 10);
        if (!Number.isNaN(next) && next > 0) {
          setReminderSeconds(next);
        }
      }

      if (changes.timerPresets) {
        const sanitized = sanitizePresets(changes.timerPresets.newValue);
        setPresets(sanitized);
      }

      if (changes.timerPresetsEnabled) {
        const enabled = changes.timerPresetsEnabled.newValue !== false;
        setPresetsEnabled(enabled);
        if (!enabled) setSelectedPreset(null);
      }

      if (changes.sessionHistory) {
        const history = Array.isArray(changes.sessionHistory.newValue)
          ? changes.sessionHistory.newValue.slice(0, MAX_SESSION_HISTORY)
          : [];
        setSessionHistory(history);
      }

      if (changes.peopleWithIds) {
        const sanitized = sanitizePeopleList(changes.peopleWithIds.newValue);
        setPeople(sanitized);
        setIndex((prev) => ensureIndexInBounds(prev, sanitized));
      }
    });

    return unsubscribe;
  }, [resetReminderState, setSecondHand]);

  useEffect(() => {
    if (!reminderEnabled) {
      resetReminderState();
    }
  }, [reminderEnabled, resetReminderState]);

  useEffect(
    () => () => {
      resetReminderState();
      resetSessionTracking();
    },
    [resetReminderState, resetSessionTracking]
  );

  const changePerson = useCallback(
    (delta) => {
      if (!people.length) return;
      finalizeSession(false);
      stopTick();
      const nextIndex = (index + delta + people.length) % people.length;
      setIndex(nextIndex);
      if (filterJiraByUser) changeJiraView(people[nextIndex]);
      setPausedMs(0);
      resetReminderState();
      resetSessionTracking();
      sessionStartRef.current = Date.now();
      setStartTime(Date.now() + duration * 1000);
      setDisplay("00:00:00");
      setSecondHand(HAND_RESET_DEG);
    },
    [
      finalizeSession,
      people,
      index,
      filterJiraByUser,
      duration,
      resetReminderState,
      resetSessionTracking,
      setSecondHand,
      stopTick,
    ]
  );

  const start = useCallback(() => {
    playBeep();
    if (startTime) return;
    if (filterJiraByUser && people[index]) changeJiraView(people[index]);
    if (pausedMs > 0) {
      resetReminderState();
      sessionStartRef.current = Date.now();
      setStartTime(Date.now() + pausedMs);
      setPausedMs(0);
      return;
    }
    resetReminderState();
    resetSessionTracking();
    sessionStartRef.current = Date.now();
    setStartTime(Date.now() + duration * 1000);
  }, [
    duration,
    filterJiraByUser,
    index,
    pausedMs,
    people,
    playBeep,
    resetReminderState,
    resetSessionTracking,
    startTime,
  ]);

  const stop = useCallback(() => {
    playBeep();
    resetReminderState();
    accumulateSessionProgress();
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    stopTick();
    if (startTime) {
      const remaining = Math.max(0, startTime - Date.now());
      setPausedMs(remaining);
      setDisplay(formatDuration(remaining));
    }
    setStartTime(null);
  }, [
    accumulateSessionProgress,
    playBeep,
    resetReminderState,
    startTime,
    stopTick,
  ]);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    stopTick();
    finalizeSession(false);
    resetReminderState();
    resetSessionTracking();
    setStartTime(null);
    setPausedMs(0);
    setDisplay("00:00:00");
    setSecondHand(HAND_RESET_DEG);
  }, [
    finalizeSession,
    resetReminderState,
    resetSessionTracking,
    setSecondHand,
    stopTick,
  ]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    writeSyncStorage({theme: nextTheme});
  }, [theme]);

  const openSettings = useCallback(() => {
    chrome.runtime.sendMessage({action: "open-options"});
  }, []);

  const hideWidget = useCallback(() => {
    setVisible(false);
    writeSyncStorage({widgetVisible: false});
  }, []);

  if (!visible) return null;

  const currentPersonName = people[index]?.name || "";
  const currentPerson = currentPersonName || "Nessuno selezionato";
  const currentPersonTotal = totalsByPerson.get(currentPersonName) || 0;
  const isRunning = Boolean(startTime);
  const formatPresetLabel = (seconds) => {
    if (!Number.isFinite(seconds)) return "?";
    if (seconds % 60 === 0) {
      return `${seconds / 60} min`;
    }
    return formatDuration(seconds * 1000);
  };
  const containerClassName = [
    "flex flex-col items-center gap-4 pt-8 pr-4 pb-4 pl-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg text-gray-800 dark:text-white text-sm relative",
    reminderFlash ? "ring-4 ring-red-500 animate-pulse" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <div className="absolute top-1 left-1 z-10">
        <TimerMenu
          isOpen={menuOpen}
          onToggle={() => setMenuOpen((value) => !value)}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSettings={openSettings}
        />
      </div>
      <div className="absolute top-1 right-1 z-10">
        <button
          className="gipo-button"
          onClick={hideWidget}
          aria-label="Chiudi"
        >
          <CloseIcon size={14} />
        </button>
      </div>
      <TimerAnalogClock secondHandRef={secHandRef} />
      <div id="current-person" className="font-semibold text-center text-xl">
        {currentPerson}
      </div>
      {currentPersonName && currentPersonTotal > 0 && (
        <div className="text-xs text-gray-500">
          Totale parlato: {formatDuration(currentPersonTotal)}
        </div>
      )}
      <div id="gipo-timer-display" className="text-2xl font-mono">
        {display}
      </div>
      {presetsEnabled ? (
        <div className="flex gap-2 flex-wrap justify-center items-center">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={`gipo-button ${
                selectedPreset === preset ? "ring-2 ring-blue-500" : ""
              }`}
              disabled={isRunning}
              onClick={() => handleSelectPreset(preset)}
              aria-pressed={selectedPreset === preset}
              title={`Imposta ${formatPresetLabel(preset)}`}
            >
              {formatPresetLabel(preset)}
            </button>
          ))}
        </div>
      ) : (
        ""
      )}
      <TimerControls
        onPrev={() => changePerson(-1)}
        onStart={start}
        onPause={stop}
        onReset={reset}
        onNext={() => changePerson(1)}
      />
      <TimerAudio beepRef={audioRef} tickRef={tickAudioRef} />
    </div>
  );
}
