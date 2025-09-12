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

function TimerWidget({containerEl}) {
  const [people, setPeople] = useState(defaultPeople);
  const [index, setIndex] = useState(0);
  const [duration, setDuration] = useState(60);
  const [startTime, setStartTime] = useState(null);
  const [filterJiraByUser, setFilterJiraByUser] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [visible, setVisible] = useState(true);
  const [display, setDisplay] = useState("00:00:00");
  const secHandRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    chrome.storage.sync.get(
      [
        "peopleWithIds",
        "duration",
        "filterJiraByUser",
        "theme",
        "widgetVisible",
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
      }
    );
  }, []);

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
        const audio = document.getElementById("beep-sound");
        audio && audio.play().catch(() => {});
        return;
      }
      setDisplay(format(remaining));
      const secondsRemaining = Math.max(0, Math.floor(remaining / 1000));
      const secondDeg = (60 - secondsRemaining) * 6 - 180;
      if (secHandRef.current)
        secHandRef.current.style.transform = `rotate(${secondDeg}deg)`;
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

  function playBeep() {
    const beep = document.getElementById("beep-sound");
    if (beep) {
      beep.currentTime = 0;
      beep.play().catch(() => {});
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
      setStartTime(Date.now() + duration * 1000);
    }
  }
  function stop() {
    playBeep();
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setStartTime(null);
    setDisplay("00:00:00");
    if (secHandRef.current) {
      secHandRef.current.style.transform = "rotate(-180deg)";
    }
  }
  function reset() {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setStartTime(null);
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

  if (!visible) return null;

  const current = people[index]?.name || "Nessuno selezionato";

  return (
    <div className="flex flex-col items-center gap-4 pt-8 pr-4 pb-4 pl-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg text-gray-800 dark:text-white text-sm relative">
      <div className="absolute top-1 left-1 z-10">
        <div className="relative inline-block text-left min-w-max">
          <button
            className="gipo-button"
            onClick={(e) => {
              const m = document.getElementById("menu-content");
              m?.classList.toggle("hidden");
            }}
          >
            ☰
          </button>
          <div
            id="menu-content"
            className="hidden absolute left-0 mt-2 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-md z-20"
          >
            <button
              className="flex w-full justify-center px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={toggleTheme}
            >
              {theme === "dark" ? "🌙" : "☀️"}
            </button>
            <button
              className="flex w-full justify-center px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
              onClick={openSettings}
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>
      <div className="absolute top-1 right-1 z-10">
        <button className="gipo-button" onClick={hideWidget}>
          X
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
        <button className="gipo-button" onClick={() => changePerson(-1)}>
          ⏮
        </button>
        <button className="gipo-button" onClick={start}>
          ▶
        </button>
        <button className="gipo-button" onClick={stop}>
          ⏸
        </button>
        <button className="gipo-button" onClick={reset}>
          ⏹
        </button>
        <button className="gipo-button" onClick={() => changePerson(1)}>
          ⏭
        </button>
      </div>
      <audio
        id="beep-sound"
        src={chrome.runtime.getURL("assets/sounds/beep.mp3")}
        preload="auto"
      />
    </div>
  );
}

function mountApp() {
  if (document.getElementById("gipo-timer-widget")) return;
  const doMount = () => {
    if (document.getElementById("gipo-timer-widget")) return;
    const host = document.createElement("div");
    host.id = "gipo-timer-widget";
    host.style.right = "16px";
    host.style.bottom = "16px";
    host.style.position = "fixed";
    host.style.zIndex = "9999";
    document.body.appendChild(host);
    makeDraggable(host);
    const root = createRoot(host);
    root.render(<TimerWidget containerEl={host} />);
  };
  if (document.body) doMount();
  else window.addEventListener("DOMContentLoaded", doMount, {once: true});
}

// Mount immediately (or after DOM ready) if not present
mountApp();
