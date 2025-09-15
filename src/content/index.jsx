import {
  X as CloseIcon,
  Menu as MenuIcon,
  Moon,
  Pause as PauseIcon,
  Play as PlayIcon,
  Settings,
  SkipBack,
  SkipForward,
  Square,
  Sun,
} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";

function makeDraggable(element) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  element.style.cursor = "move";
  element.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = element.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    element.style.userSelect = "none";
  });
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    element.style.left = `${e.clientX - offsetX}px`;
    element.style.top = `${e.clientY - offsetY}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
  });
  document.addEventListener("mouseup", () => {
    isDragging = false;
    element.style.userSelect = "auto";
    // Persist position on mouse up
    try {
      const left = element.style.left;
      const top = element.style.top;
      if (left && top) {
        chrome.storage.sync.set({widgetPosition: {left, top}});
      }
    } catch {}
  });
}

function waitForSelector(selector, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) {
        clearInterval(interval);
        resolve(el);
      } else if (performance.now() - start > timeout) {
        clearInterval(interval);
        reject();
      }
    }, 100);
  });
}

function changeJiraView(person) {
  if (!person?.jiraId) return;
  const jiraId = person.jiraId;
  const labelSelector = `label[for="assignee-${jiraId}"]`;
  const popoverBtnSelector = `button[id="${jiraId}"][role="menuitemcheckbox"]`;
  document
    .querySelectorAll('[aria-checked="true"]')
    .forEach((el) => el.click());
  const showMoreBtn = document.querySelector(
    '[data-testid="filters.ui.filters.assignee.stateless.show-more-button.assignee-filter-show-more"]'
  );
  if (showMoreBtn) showMoreBtn.click();
  const el =
    document.querySelector(labelSelector) ||
    document.querySelector(popoverBtnSelector);
  if (el && el.offsetParent !== null) {
    el.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    return;
  }
  waitForSelector(popoverBtnSelector, 2000)
    .then((el) => el.dispatchEvent(new MouseEvent("click", {bubbles: true})))
    .catch(() =>
      console.warn("Assignee non trovato nemmeno dopo retry:", jiraId)
    );
}

const defaultPeople = [
  {name: "Alessandro M", jiraId: ""},
  {name: "Claudio B", jiraId: ""},
  {name: "Diego M", jiraId: ""},
  {name: "Elisa C", jiraId: ""},
  {name: "Enrico S", jiraId: ""},
  {name: "Fede D", jiraId: ""},
  {name: "Fede G", jiraId: ""},
  {name: "Francesco A", jiraId: ""},
  {name: "Gabriele R", jiraId: ""},
  {name: "Luca M", jiraId: ""},
  {name: "Matteo T", jiraId: ""},
  {name: "Nicola L", jiraId: ""},
  {name: "Roberto M", jiraId: ""},
  {name: "Stefano S", jiraId: ""},
  {name: "Vincenzo S", jiraId: ""},
];

function format(ms) {
  const sec = Math.floor(ms / 1000);
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function TimerWidget({containerEl, hostEl}) {
  const [people, setPeople] = useState(defaultPeople);
  const [index, setIndex] = useState(0);
  const [duration, setDuration] = useState(60);
  const [startTime, setStartTime] = useState(null);
  const [pausedMs, setPausedMs] = useState(0);
  const [filterJiraByUser, setFilterJiraByUser] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [visible, setVisible] = useState(true);
  const [display, setDisplay] = useState("00:00:00");
  const [menuOpen, setMenuOpen] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.1);
  const secHandRef = useRef(null);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);
  const tickAudioRef = useRef(null);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);

  useEffect(() => {
    chrome.storage.sync.get(
      [
        "peopleWithIds",
        "duration",
        "filterJiraByUser",
        "theme",
        "widgetVisible",
        "audioMuted",
        "audioVolume",
      ],
      (data) => {
        const p = data.peopleWithIds || defaultPeople;
        setPeople(
          p
            .filter((x) => x && x.name)
            .map((x) => ({name: x.name, jiraId: x.jiraId}))
        );
        setDuration(parseInt(data.duration, 10) || 60);
        setFilterJiraByUser(Boolean(data.filterJiraByUser));
        setTheme(data.theme || "dark");
        setVisible(data.widgetVisible !== false);
        setAudioMuted(Boolean(data.audioMuted));
        setAudioVolume(
          typeof data.audioVolume === "number"
            ? Math.max(0, Math.min(1, data.audioVolume))
            : 0.1
        );
      }
    );
  }, []);

  // keep audio elements in sync with settings
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = audioMuted ? 0 : audioVolume;
    if (tickAudioRef.current) tickAudioRef.current.volume = audioMuted ? 0 : audioVolume;
  }, [audioMuted, audioVolume]);

  useEffect(() => {
    if (!startTime) return;
    const tick = () => {
      const remaining = startTime - Date.now();
      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setStartTime(null);
        setDisplay("00:00:00");
        if (secHandRef.current)
          secHandRef.current.style.transform = "rotate(-180deg)";
        // stop ticking sound
        if (tickAudioRef.current) {
          try {
            tickAudioRef.current.pause();
            tickAudioRef.current.currentTime = 0;
          } catch {}
        }
        if (!audioMuted && audioRef.current) {
          try {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          } catch {}
        }
        return;
      }
      setDisplay(format(remaining));
      const secondsRemaining = Math.max(0, Math.floor(remaining / 1000));
      const secondDeg = (60 - secondsRemaining) * 6 - 180;
      if (secHandRef.current)
        secHandRef.current.style.transform = `rotate(${secondDeg}deg)`;
      // play ticking sound every second
      if (!audioMuted && tickAudioRef.current) {
        try {
          tickAudioRef.current.currentTime = 0;
          tickAudioRef.current.play().catch(() => {});
        } catch {}
      }
    };
    intervalRef.current = setInterval(tick, 1000);
    tick();
    return () => clearInterval(intervalRef.current);
  }, [startTime]);

  useEffect(() => {
    if (!containerEl) return;
    containerEl.classList.remove("light", "dark");
    containerEl.classList.add(theme);
  }, [theme, containerEl]);

  // Close menu on outside click (also outside widget)
  useEffect(() => {
    const onDocMouseDown = (e) => {
      // If click happens outside hostEl, close menu
      if (hostEl && !hostEl.contains(e.target)) {
        setMenuOpen(false);
        return;
      }
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () =>
      document.removeEventListener("mousedown", onDocMouseDown, true);
  }, [hostEl]);

  function playBeep() {
    if (audioMuted) return;
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } catch {}
    }
  }

  function changePerson(delta) {
    if (people.length === 0) return;
    const next = (index + delta + people.length) % people.length;
    setIndex(next);
    if (filterJiraByUser) changeJiraView(people[next]);
    chrome.storage.sync.get("duration", (data) => {
      const d = parseInt(data.duration, 10) || duration;
      setDuration(d);
      setStartTime(Date.now() + d * 1000);
      setDisplay("00:00:00");
      if (secHandRef.current)
        secHandRef.current.style.transform = "rotate(-180deg)";
    });
  }

  function start() {
    playBeep();
    if (!startTime) {
      if (filterJiraByUser && people[index]) changeJiraView(people[index]);
      if (pausedMs > 0) {
        setStartTime(Date.now() + pausedMs);
        setPausedMs(0);
      } else {
        setStartTime(Date.now() + duration * 1000);
      }
    }
  }
  function stop() {
    playBeep();
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    // stop ticking sound
    if (tickAudioRef.current) {
      try {
        tickAudioRef.current.pause();
        tickAudioRef.current.currentTime = 0;
      } catch {}
    }
    if (startTime) {
      const remaining = Math.max(0, startTime - Date.now());
      setPausedMs(remaining);
      setDisplay(format(remaining));
    }
    setStartTime(null);
  }
  function reset() {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (tickAudioRef.current) {
      try {
        tickAudioRef.current.pause();
        tickAudioRef.current.currentTime = 0;
      } catch {}
    }
    setStartTime(null);
    setPausedMs(0);
    setDisplay("00:00:00");
    if (secHandRef.current)
      secHandRef.current.style.transform = "rotate(-180deg)";
  }
  function toggleTheme() {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    chrome.storage.sync.set({theme: newTheme});
  }
  function openSettings() {
    chrome.runtime.sendMessage({action: "open-options"});
  }
  function hideWidget() {
    setVisible(false);
    chrome.storage.sync.set({widgetVisible: false});
  }

  useEffect(() => {
    const handler = (message) => {
      if (message?.action === "show-widget") {
        setVisible(true);
        chrome.storage.sync.set({widgetVisible: true});
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  // React to option changes (live sync for audio, duration, theme, visibility, people, filters)
  useEffect(() => {
    const onStorageChanged = (changes, areaName) => {
      if (areaName !== "sync") return;
      if (changes.audioMuted) {
        setAudioMuted(Boolean(changes.audioMuted.newValue));
      }
      if (changes.audioVolume) {
        const v = changes.audioVolume.newValue;
        setAudioVolume(
          typeof v === "number" ? Math.max(0, Math.min(1, v)) : 0.1
        );
      }
      if (changes.duration) {
        const newD = parseInt(changes.duration.newValue, 10);
        const oldD = parseInt(changes.duration.oldValue, 10);
        if (!Number.isNaN(newD) && newD > 0) {
          setDuration(newD);
          const now = Date.now();
          const oldMs = !Number.isNaN(oldD) && oldD > 0 ? oldD * 1000 : null;
          if (startTime) {
            // Active countdown: keep the same completion fraction
            const remaining = Math.max(0, startTime - now);
            let newRemaining = remaining;
            if (oldMs && oldMs > 0) {
              const frac = Math.max(0, Math.min(1, remaining / oldMs));
              newRemaining = Math.round(frac * newD * 1000);
            } else {
              newRemaining = Math.round(newD * 1000);
            }
            setStartTime(now + newRemaining);
            setDisplay(format(newRemaining));
            // update second hand immediately
            const secondsRemaining = Math.max(0, Math.floor(newRemaining / 1000));
            const secondDeg = (60 - secondsRemaining) * 6 - 180;
            if (secHandRef.current)
              secHandRef.current.style.transform = `rotate(${secondDeg}deg)`;
          } else if (pausedMs > 0) {
            // Paused: rescale the paused remaining time
            if (oldMs && oldMs > 0) {
              const frac = Math.max(0, Math.min(1, pausedMs / oldMs));
              const newPaused = Math.round(frac * newD * 1000);
              setPausedMs(newPaused);
              setDisplay(format(newPaused));
            } else {
              const newPaused = Math.round(newD * 1000);
              setPausedMs(newPaused);
              setDisplay(format(newPaused));
            }
          }
        }
      }
      if (changes.theme) {
        const t = changes.theme.newValue;
        if (t === "light" || t === "dark") setTheme(t);
      }
      if (changes.widgetVisible) {
        setVisible(changes.widgetVisible.newValue !== false);
      }
      if (changes.filterJiraByUser) {
        setFilterJiraByUser(Boolean(changes.filterJiraByUser.newValue));
      }
      if (changes.peopleWithIds) {
        const p = Array.isArray(changes.peopleWithIds.newValue)
          ? changes.peopleWithIds.newValue
          : defaultPeople;
        const cleaned = p
          .filter((x) => x && x.name)
          .map((x) => ({name: x.name, jiraId: x.jiraId}));
        setPeople(cleaned);
        // ensure current index is within bounds
        setIndex((idx) => (cleaned.length ? Math.min(idx, cleaned.length - 1) : 0));
      }
    };
    try {
      chrome.storage.onChanged.addListener(onStorageChanged);
      return () => chrome.storage.onChanged.removeListener(onStorageChanged);
    } catch {
      return () => {};
    }
  }, []);

  if (!visible) return null;

  const current = people[index]?.name || "Nessuno selezionato";

  return (
    <div className="flex flex-col items-center gap-4 pt-8 pr-4 pb-4 pl-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg text-gray-800 dark:text-white text-sm relative">
      <div className="absolute top-1 left-1 z-10">
        <div className="relative inline-block text-left min-w-max">
          <button
            className="gipo-button"
            ref={menuBtnRef}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MenuIcon size={16} />
          </button>
          {menuOpen && (
            <div
              id="menu-content"
              ref={menuRef}
              className="absolute flex flex-col gap-2 left-0 mt-2 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-md z-20"
            >
              <button
                className="flex w-full h-8 items-center justify-center gap-2 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 whitespace-nowrap"
                onClick={toggleTheme}
              >
                {theme === "dark" ? (
                  <Moon size={18} style={{color: "inherit"}} />
                ) : (
                  <Sun size={18} s style={{color: "inherit"}} />
                )}
              </button>
              <button
                className="flex w-full h-8 items-center justify-center gap-2 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 whitespace-nowrap"
                onClick={openSettings}
              >
                <Settings size={18} style={{color: "inherit"}} />
              </button>
            </div>
          )}
        </div>
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
      <div className="w-24 h-24 rounded-full border-4 border-black dark:border-white relative">
        <div className="absolute w-2 h-2 bg-black dark:bg-white rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"></div>
        <div
          ref={secHandRef}
          id="second-hand"
          className="absolute left-1/2 top-1/2 w-0.5 h-12 bg-red-500 origin-top -translate-x-1/2 -translate-y-1/2 z-0"
          style={{transform: "rotate(-180deg)"}}
        ></div>
      </div>
      <div id="current-person" className="font-semibold text-center text-xl">
        {current}
      </div>
      <div id="gipo-timer-display" className="text-2xl font-mono">
        {display}
      </div>
      <div className="flex gap-2 flex-wrap justify-center items-center">
        <button
          className="gipo-button"
          onClick={() => changePerson(-1)}
          aria-label="Precedente"
        >
          <SkipBack size={16} />
        </button>
        <button className="gipo-button" onClick={start} aria-label="Play">
          <PlayIcon size={16} />
        </button>
        <button className="gipo-button" onClick={stop} aria-label="Pausa">
          <PauseIcon size={16} />
        </button>
        <button className="gipo-button" onClick={reset} aria-label="Reset">
          <Square size={16} />
        </button>
        <button
          className="gipo-button"
          onClick={() => changePerson(1)}
          aria-label="Successivo"
        >
          <SkipForward size={16} />
        </button>
      </div>
      <audio
        ref={audioRef}
        src={chrome.runtime.getURL("assets/sounds/beep.mp3")}
        preload="auto"
      />
      <audio
        ref={tickAudioRef}
        src={chrome.runtime.getURL("assets/sounds/tick.mp3")}
        preload="auto"
      />
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
    // Restore last saved position if present
    try {
      chrome.storage.sync.get(["widgetPosition"], (data) => {
        const pos = data.widgetPosition;
        if (pos && pos.left && pos.top) {
          host.style.left = pos.left;
          host.style.top = pos.top;
          host.style.right = "auto";
          host.style.bottom = "auto";
        } else {
          host.style.right = "16px";
          host.style.bottom = "16px";
        }
      });
    } catch {
      host.style.right = "16px";
      host.style.bottom = "16px";
    }

    document.body.appendChild(host);
    makeDraggable(host);

    // Attach shadow root to isolate widget styles from the page
    const shadow = host.attachShadow({mode: "open"});

    // Inject Tailwind CSS into the shadow root (no global CSS leakage)
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

    // React app container inside shadow DOM
    const themeContainer = document.createElement("div");
    shadow.appendChild(themeContainer);
    // default theme dark until storage loads
    themeContainer.classList.add("dark");
    const appRoot = document.createElement("div");
    themeContainer.appendChild(appRoot);
    const root = createRoot(appRoot);
    root.render(<TimerWidget containerEl={themeContainer} hostEl={host} />);
  };
  if (document.body) doMount();
  else window.addEventListener("DOMContentLoaded", doMount, {once: true});
}

// Mount immediately (or after DOM ready) if not present
mountApp();
