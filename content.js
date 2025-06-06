function makeDraggable(element) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  element.style.cursor = "move";

  element.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    element.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      element.style.left = `${e.clientX - offsetX}px`;
      element.style.top = `${e.clientY - offsetY}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    element.style.userSelect = "auto";
  });
}

if (!document.getElementById("gipo-timer-widget")) {
  // === DOM Setup ===

  // Timer HTML markupπ
  const TIMER_HTML = `
    <div class="flex flex-col items-center gap-4 p-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg text-gray-800 dark:text-white text-sm">
      <div class="w-24 h-24 rounded-full border-4 border-black dark:border-white relative">
        <!-- centro -->
        <div class="absolute w-2 h-2 bg-black dark:bg-white rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"></div>

        <!-- lancetta dei secondi -->
        <div id="second-hand"
             class="absolute left-1/2 top-1/2 w-0.5 h-12 bg-red-500 origin-top -translate-x-1/2 -translate-y-1/2 z-0"
             style="transform: rotate(-180deg);"></div>
      </div>
      <div id="current-person" class="font-semibold text-center text-base"></div>
      <div id="gipo-timer-display" class="text-2xl font-mono"></div>
      <div class="flex gap-2 flex-wrap justify-center">
        <button class="gipo-button" id="prev-person">⏮</button>
        <button class="gipo-button" id="start-timer">▶</button>
        <button class="gipo-button" id="stop-timer">⏸</button>
        <button class="gipo-button" id="reset-timer">⏹</button>
        <button class="gipo-button" id="next-person">⏭</button>
        <button class="gipo-button" id="toggle-theme">🌙</button>
        <button class="gipo-button" id="open-settings">⚙️</button>
      </div>
    </div>
  `;

  // Create container element
  const container = document.createElement("div");
  container.id = "gipo-timer-widget";
  container.style.right = "16px";
  container.style.bottom = "16px";
  container.style.position = "fixed";
  container.style.zIndex = "9999";

  // Set inner HTML
  container.innerHTML = TIMER_HTML;

  // Create and append audio element
  const audio = document.createElement("audio");
  audio.src = chrome.runtime.getURL("assets/sounds/beep.mp3");
  audio.id = "beep-sound";
  audio.preload = "auto";
  container.appendChild(audio);

  // Append container to body
  document.body.appendChild(container);
  // Imposta subito il display a 00:00:00 per renderlo visibile
  document.getElementById("gipo-timer-display").textContent = "00:00:00";

  // === Utility functions ===
  const playBeep = () => {
    const beep = document.getElementById("beep-sound");
    if (beep) {
      beep.currentTime = 0;
      beep
        .play()
        .catch((e) => console.warn("Impossibile riprodurre il suono:", e));
    }
  };

  const format = (ms) => {
    const sec = Math.floor(ms / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // === Timer Logic ===
  let personList = [];
  let currentIndex = 0;
  let timerDuration = 60;
  let startTime = null;
  let intervalId = null;

  const defaultPeople =
    "Alessandro\nClaudio\nDiego\nElisa\nFedeD\nFedeG\nFrancesco\nGabriele\nLuca\nMatteo\nNicola\nRoberto\nStefano\nVincenzo";
  const defaultDuration = 60;

  const updateDisplay = () => {
    const remaining = startTime - Date.now();
    if (remaining <= 0) {
      clearInterval(intervalId);
      intervalId = null;
      document.getElementById("gipo-timer-display").textContent = "00:00:00";

      const sound = document.getElementById("timer-end-sound");
      if (sound) {
        sound
          .play()
          .catch((e) => console.warn("Impossibile riprodurre il suono:", e));
      }

      return;
    }
    document.getElementById("gipo-timer-display").textContent =
      format(remaining);
  };

  // === UI Updates ===
  const updateClock = () => {
    if (!startTime) return;
    const remaining = startTime - Date.now();
    const secondsRemaining = Math.max(0, Math.floor(remaining / 1000));
    const secondDeg = (60 - secondsRemaining) * 6 - 180;

    const secHand = document.getElementById("second-hand");
    if (secHand) {
      secHand.style.transform = `rotate(${secondDeg}deg)`;
    }
  };

  const updateCurrentPerson = () => {
    const display = document.getElementById("current-person");
    if (personList.length === 0) {
      display.textContent = "Nessuno selezionato";
    } else {
      display.textContent = `${personList[currentIndex]}`;
    }
  };

  // === Configuration ===
  const loadConfiguration = () => {
    chrome.storage.sync.get(["people", "duration"], (data) => {
      const people = data.people || defaultPeople;
      timerDuration = parseInt(data.duration, 10) || defaultDuration;

      personList = people
        .split("\n")
        .map((p) => p.trim())
        .filter((p) => p);
      currentIndex = 0;
      updateCurrentPerson();
    });
  };

  // === Event Listeners ===
  const changePerson = (increment) => {
    if (personList.length > 0) {
      currentIndex =
        (currentIndex + increment + personList.length) % personList.length;
      updateCurrentPerson();
      chrome.storage.sync.get("duration", (data) => {
        if (data.duration) {
          timerDuration = parseInt(data.duration, 10);
        }
        clearInterval(intervalId);
        intervalId = null;
        startTime = Date.now() + timerDuration * 1000;
        document.getElementById("gipo-timer-display").textContent = "00:00:00";
        const secHand = document.getElementById("second-hand");
        if (secHand) {
          secHand.style.transform = "rotate(-180deg)";
        }
        intervalId = setInterval(() => {
          updateDisplay();
          updateClock();
        }, 1000);
      });
    }
  };

  document.getElementById("start-timer").onclick = () => {
    playBeep();
    if (intervalId) return;
    startTime = startTime || Date.now() + timerDuration * 1000;
    intervalId = setInterval(() => {
      updateDisplay();
      updateClock();
    }, 1000);
  };

  document.getElementById("stop-timer").onclick = () => {
    playBeep();
    clearInterval(intervalId);
    intervalId = null;
    startTime = null;
    document.getElementById("gipo-timer-display").textContent = "00:00:00";
    const secHand = document.getElementById("second-hand");
    if (secHand) {
      secHand.style.transform = "rotate(-180deg)";
    }
  };

  document.getElementById("reset-timer").onclick = () => {
    clearInterval(intervalId);
    intervalId = null;
    startTime = null;
    document.getElementById("gipo-timer-display").textContent = "00:00:00";
    const secHand = document.getElementById("second-hand");
    if (secHand) {
      secHand.style.transform = "rotate(-180deg)";
    }
  };

  document.getElementById("prev-person").onclick = () => {
    playBeep();
    changePerson(-1);
  };
  document.getElementById("next-person").onclick = () => {
    playBeep();
    changePerson(1);
  };

  document.getElementById("open-settings").onclick = () => {
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({action: "open-options"});
    } else {
      console.warn("chrome.runtime non disponibile");
    }
  };

  document.getElementById("toggle-theme").onclick = () => {
    const currentTheme = container.classList.contains("dark")
      ? "dark"
      : "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    container.classList.remove(currentTheme);
    container.classList.add(newTheme);
    chrome.storage.sync.set({theme: newTheme});

    document.getElementById("toggle-theme").textContent =
      newTheme === "dark" ? "🌙" : "☀️";
  };

  // === Initial calls ===
  chrome.storage.sync.get("theme", (data) => {
    const theme = data.theme || "dark";
    container.classList.add(theme);
    document.getElementById("toggle-theme").textContent =
      theme === "dark" ? "🌙" : "☀️";
  });

  loadConfiguration();

  makeDraggable(container);
}
