let filterJiraByUser = false;
chrome.storage.sync.get("filterJiraByUser", (data) => {
  filterJiraByUser = Boolean(data.filterJiraByUser);
});

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

function changeJiraView(person) {
  if (!person?.jiraId) return;

  const jiraId = person.jiraId;
  const labelSelector = `label[for="assignee-${jiraId}"]`;
  const popoverBtnSelector = `button[id="${jiraId}"][role="menuitemcheckbox"]`;

  // Deseleziona attivi
  document.querySelectorAll('[aria-checked="true"]').forEach((el) => {
    el.click();
  });

  // Mostra il popover se presente
  const showMoreBtn = document.querySelector(
    '[data-testid="filters.ui.filters.assignee.stateless.show-more-button.assignee-filter-show-more"]'
  );
  if (showMoreBtn) showMoreBtn.click();

  // Funzione di attesa
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

  // Prova a cliccare subito se disponibile
  let el =
    document.querySelector(labelSelector) ||
    document.querySelector(popoverBtnSelector);
  if (el && el.offsetParent !== null) {
    el.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    return;
  }

  // Altrimenti, attendi che appaia
  waitForSelector(popoverBtnSelector, 2000)
    .then((el) => {
      el.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    })
    .catch(() =>
      console.warn("Assignee non trovato nemmeno dopo retry:", jiraId)
    );
}

if (!document.getElementById("gipo-timer-widget")) {
  // === DOM Setup ===

  // Timer HTML markupπ
  const TIMER_HTML = `
    <div class="flex flex-col items-center gap-4 pt-8 pr-4 pb-4 pl-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg text-gray-800 dark:text-white text-sm relative">
      <div class="absolute top-1 left-1 z-10">
        <div class="relative inline-block text-left min-w-max">
          <button class="gipo-button" id="menu-toggle">☰</button>
          <div id="menu-content" class="hidden absolute left-0 mt-2 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-md z-20">
            <button class="flex w-full justify-center px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600" id="toggle-theme">🌙</button>
            <button class="flex w-full justify-center px-4 py-2 text-sm text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600" id="open-settings">⚙️</button>
          </div>
        </div>
      </div>
      <div class="absolute top-1 right-1 z-10">
        <button class="gipo-button" id="hide-widget">X</button>
      </div>
      <div class="w-24 h-24 rounded-full border-4 border-black dark:border-white relative">
        <!-- centro -->
        <div class="absolute w-2 h-2 bg-black dark:bg-white rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"></div>

        <!-- lancetta dei secondi -->
        <div id="second-hand"
             class="absolute left-1/2 top-1/2 w-0.5 h-12 bg-red-500 origin-top -translate-x-1/2 -translate-y-1/2 z-0"
             style="transform: rotate(-180deg);"></div>
      </div>
      <div id="current-person" class="font-semibold text-center text-xl"></div>
      <div id="gipo-timer-display" class="text-2xl font-mono"></div>
      <div class="flex gap-2 flex-wrap justify-center items-center">
        <button class="gipo-button" id="prev-person">⏮</button>
        <button class="gipo-button" id="start-timer">▶</button>
        <button class="gipo-button" id="stop-timer">⏸</button>
        <button class="gipo-button" id="reset-timer">⏹</button>
        <button class="gipo-button" id="next-person">⏭</button>
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

  const defaultPeople = [
    {name: "Alessandro M", jiraId: "617aa59316119e0069442a6b"},
    {name: "Claudio B", jiraId: "712020:35edea3d-1d8f-4974-83a8-4211d0a72ffc"},
    {name: "Diego M", jiraId: "5d6cce0a94e3580d923b094a"},
    {name: "Elisa C", jiraId: ""},
    {name: "Enrico S", jiraId: "5ee71feeb04ccf0aae582f1f"},
    {name: "Fede D", jiraId: "5cd54c5d254e450fd8d1f022"},
    {name: "Fede G", jiraId: "6110f69c8ad5b6007039f600"},
    {name: "Francesco A", jiraId: "641188d37222b08f3e70eb17"},
    {name: "Gabriele R", jiraId: "712020:28cd82e1-1d78-4ddb-872f-d2aa0ea76748"},
    {name: "Luca M", jiraId: "712020:638f74b4-f89d-4d97-a8e7-17b5e1751221"},
    {name: "Matteo T", jiraId: "641188d30152b5f4f9f04779"},
    {name: "Nicola L", jiraId: "5eb00c556c84140b9e713401"},
    {name: "Roberto M", jiraId: "712020:68d63d5b-cc98-4e72-bc6b-f508992de65e"},
    {name: "Stefano S", jiraId: "712020:449c0f67-b6ba-4f7d-8f6e-fa2c5a541e9c"},
    {name: "Vincenzo S", jiraId: "63bc2177df0fa548e8e84a62"},
  ];
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
      const currentPerson = personList[currentIndex];
      display.textContent = currentPerson.name || "";
    }
  };

  // === Configuration ===
  const loadConfiguration = () => {
    chrome.storage.sync.get(["peopleWithIds", "duration"], (data) => {
      const people = data.peopleWithIds || defaultPeople;
      timerDuration = parseInt(data.duration, 10) || defaultDuration;

      personList = people
        .filter((p) => p && p.name)
        .map((p) => ({name: p.name, jiraId: p.jiraId}));
      currentIndex = 0;
      updateCurrentPerson();
    });
  };

  // === Event Listeners ===
  const changePerson = (increment) => {
    if (personList.length > 0) {
      currentIndex =
        (currentIndex + increment + personList.length) % personList.length;

      const currentJiraId = personList[currentIndex].jiraId;

      // Deseleziona tutti i filtri attivi (checkbox o popover)
      const activeCheckboxes = document.querySelectorAll(
        'input[type="checkbox"]:checked'
      );
      activeCheckboxes.forEach((el) => el.click());

      const showMoreBtn = document.querySelector(
        '[data-testid="filters.ui.filters.assignee.stateless.show-more-button.assignee-filter-show-more"]'
      );
      if (showMoreBtn) showMoreBtn.click();

      setTimeout(() => {
        const activeButtons = document.querySelectorAll(
          'button[role="menuitemcheckbox"][aria-checked="true"]'
        );
        activeButtons.forEach((btn) => {
          if (btn.id !== currentJiraId) {
            btn.dispatchEvent(new MouseEvent("click", {bubbles: true}));
          }
        });
      }, 100);

      updateCurrentPerson();
      if (filterJiraByUser) {
        changeJiraView(personList[currentIndex]);
      }

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
    if (filterJiraByUser) {
      changeJiraView(personList[currentIndex]);
    }
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

  document.getElementById("hide-widget").onclick = () => {
    container.style.display = "none";
    chrome.storage.sync.set({widgetVisible: false});
  };

  // Menu toggle handlers
  const menuToggle = document.getElementById("menu-toggle");
  const menuContent = document.getElementById("menu-content");

  menuToggle.addEventListener("click", () => {
    menuContent.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!menuContent.contains(e.target) && e.target !== menuToggle) {
      menuContent.classList.add("hidden");
    }
  });

  // === Initial calls ===
  chrome.storage.sync.get("theme", (data) => {
    const theme = data.theme || "dark";
    container.classList.add(theme);
    document.getElementById("toggle-theme").textContent =
      theme === "dark" ? "🌙" : "☀️";
  });

  loadConfiguration();

  makeDraggable(container);

  chrome.storage.sync.get("widgetVisible", (data) => {
    if (data.widgetVisible === false) {
      container.style.display = "none";
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "show-widget") {
    const widget = document.getElementById("gipo-timer-widget");

    if (!widget) {
      // Se non esiste, rigenera
      location.reload();
    } else {
      widget.style.display = "block";
      chrome.storage.sync.set({widgetVisible: true});
    }
  }
});
