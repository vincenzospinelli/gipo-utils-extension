import {X as CloseIcon} from "lucide-react";
import {useCallback, useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";

import {TimerAudio} from "./components/TimerAudio";
import {TimerControls} from "./components/TimerControls";
import {TimerMenu} from "./components/TimerMenu";
import {TimerAnalogClock} from "./components/TimerAnalogClock";
import {
  DEFAULT_DURATION,
  DEFAULT_PEOPLE,
  DEFAULT_REMINDER_ENABLED,
  DEFAULT_REMINDER_SECONDS,
} from "../shared/constants";
import {applyVolume, ensureUnitVolume} from "../shared/audio";
import {makeElementDraggable, waitForSelector} from "../shared/dom";
import {sanitizePeopleList, ensureIndexInBounds} from "../shared/people";
import {formatDuration} from "../shared/time";
import {
  readSyncStorage,
  subscribeSyncStorage,
  writeSyncStorage,
} from "../shared/storage";

const HAND_RESET_DEG = -180;

function changeJiraView(person) {
  if (!person?.jiraId) return;
  const {jiraId} = person;
  const labelSelector = `label[for="assignee-${jiraId}"]`;
  const popoverBtnSelector = `button[id="${jiraId}"][role="menuitemcheckbox"]`;

  document
    .querySelectorAll('[aria-checked="true"]')
    .forEach((el) => el.click());

  const showMoreBtn = document.querySelector(
    '[data-testid="filters.ui.filters.assignee.stateless.show-more-button.assignee-filter-show-more"]'
  );
  if (showMoreBtn) showMoreBtn.click();

  const candidate =
    document.querySelector(labelSelector) ||
    document.querySelector(popoverBtnSelector);

  if (candidate && candidate.offsetParent !== null) {
    candidate.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    return;
  }

  waitForSelector(popoverBtnSelector, {timeout: 2000})
    .then((el) => el.dispatchEvent(new MouseEvent("click", {bubbles: true})))
    .catch(() => console.warn("Assignee non trovato nemmeno dopo retry:", jiraId));
}

function TimerWidget({containerEl, hostEl}) {
  const [people, setPeople] = useState(DEFAULT_PEOPLE);
  const [index, setIndex] = useState(0);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [startTime, setStartTime] = useState(null);
  const [pausedMs, setPausedMs] = useState(0);
  const [filterJiraByUser, setFilterJiraByUser] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [visible, setVisible] = useState(true);
  const [display, setDisplay] = useState("00:00:00");
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.1);
  const [reminderEnabled, setReminderEnabled] = useState(DEFAULT_REMINDER_ENABLED);
  const [reminderSeconds, setReminderSeconds] = useState(DEFAULT_REMINDER_SECONDS);
  const [reminderFlash, setReminderFlash] = useState(false);

  const secHandRef = useRef(null);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);
  const tickAudioRef = useRef(null);
  const startTimeRef = useRef(startTime);
  const pausedMsRef = useRef(pausedMs);
  const reminderTriggeredRef = useRef(false);

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

      setFilterJiraByUser(Boolean(data.filterJiraByUser));
      setTheme(data.theme === "light" ? "light" : "dark");
      setVisible(data.widgetVisible !== false);
      setAudioMuted(Boolean(data.audioMuted));
      setAudioVolume(ensureUnitVolume(data.audioVolume, 0.1));
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
        setAudioVolume(ensureUnitVolume(changes.audioVolume.newValue, 0.1));
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
          !Number.isNaN(oldSeconds) && oldSeconds > 0 ? oldSeconds * 1000 : null;

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

  useEffect(() => () => {
    resetReminderState();
  }, [resetReminderState]);

  const changePerson = useCallback(
    (delta) => {
      if (!people.length) return;
      const nextIndex = (index + delta + people.length) % people.length;
      setIndex(nextIndex);
      if (filterJiraByUser) changeJiraView(people[nextIndex]);
      setPausedMs(0);
      resetReminderState();
      setStartTime(Date.now() + duration * 1000);
      setDisplay("00:00:00");
      setSecondHand(HAND_RESET_DEG);
    },
    [people, index, filterJiraByUser, duration, resetReminderState, setSecondHand]
  );

  const start = useCallback(() => {
    playBeep();
    if (startTime) return;
    if (filterJiraByUser && people[index]) changeJiraView(people[index]);
    if (pausedMs > 0) {
      clearReminderFlash();
      setStartTime(Date.now() + pausedMs);
      setPausedMs(0);
      return;
    }
    resetReminderState();
    setStartTime(Date.now() + duration * 1000);
  }, [
    clearReminderFlash,
    duration,
    filterJiraByUser,
    index,
    pausedMs,
    people,
    playBeep,
    resetReminderState,
    startTime,
  ]);

  const stop = useCallback(() => {
    playBeep();
    clearReminderFlash();
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    stopTick();
    if (startTime) {
      const remaining = Math.max(0, startTime - Date.now());
      setPausedMs(remaining);
      setDisplay(formatDuration(remaining));
    }
    setStartTime(null);
  }, [clearReminderFlash, playBeep, startTime, stopTick]);

  const reset = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    stopTick();
    resetReminderState();
    setStartTime(null);
    setPausedMs(0);
    setDisplay("00:00:00");
    setSecondHand(HAND_RESET_DEG);
  }, [resetReminderState, setSecondHand, stopTick]);

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

  const currentPerson = people[index]?.name || "Nessuno selezionato";
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
        <button className="gipo-button" onClick={hideWidget} aria-label="Chiudi">
          <CloseIcon size={14} />
        </button>
      </div>
      <TimerAnalogClock secondHandRef={secHandRef} />
      <div id="current-person" className="font-semibold text-center text-xl">
        {currentPerson}
      </div>
      <div id="gipo-timer-display" className="text-2xl font-mono">
        {display}
      </div>
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

function mountApp() {
  if (document.getElementById("gipo-timer-widget")) return;

  const doMount = async () => {
    if (document.getElementById("gipo-timer-widget")) return;

    const host = document.createElement("div");
    host.id = "gipo-timer-widget";
    host.style.position = "fixed";
    host.style.zIndex = "9999";
    host.style.outline = "none";
    host.style.border = "none";
    host.style.boxShadow = "none";

    const {widgetPosition} = await readSyncStorage(["widgetPosition"]);
    if (widgetPosition?.left && widgetPosition?.top) {
      host.style.left = widgetPosition.left;
      host.style.top = widgetPosition.top;
      host.style.right = "auto";
      host.style.bottom = "auto";
    } else {
      host.style.right = "16px";
      host.style.bottom = "16px";
    }

    document.body.appendChild(host);

    makeElementDraggable(host, {
      onDrop: ({left, top}) => {
        if (left && top) {
          writeSyncStorage({widgetPosition: {left, top}});
        }
      },
    });

    const shadow = host.attachShadow({mode: "open"});

    try {
      const cssUrl = chrome.runtime.getURL("assets/styles/tailwind.css");
      const res = await fetch(cssUrl);
      const cssText = await res.text();
      const styleEl = document.createElement("style");
      styleEl.textContent = cssText;
      shadow.appendChild(styleEl);
    } catch (err) {
      console.warn("Impossibile caricare CSS del widget:", err);
    }

    const themeContainer = document.createElement("div");
    shadow.appendChild(themeContainer);
    themeContainer.classList.add("dark");

    const appRoot = document.createElement("div");
    themeContainer.appendChild(appRoot);

    const root = createRoot(appRoot);
    root.render(<TimerWidget containerEl={themeContainer} hostEl={host} />);
  };

  if (document.body) {
    doMount();
  } else {
    window.addEventListener("DOMContentLoaded", doMount, {once: true});
  }
}

mountApp();
