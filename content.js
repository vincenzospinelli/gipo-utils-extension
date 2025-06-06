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
  // DOM Setup
  const container = document.createElement("div");
  container.id = "gipo-timer-widget";
  container.innerHTML = `
    <div class="gipo-timer-container"> 
      <div class="clock">
        <div class="hand minute" id="minute-hand"></div>
        <div class="hand second" id="second-hand"></div>
      </div>
      <div class="person-display" id="current-person"></div>
      <div class="gipo-timer">
        <div id="gipo-timer-display">00:00:00</div> 
      </div>
      <div class="gipo-timer-options">
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
  document.body.appendChild(container);

  makeDraggable(container);

  // Timer Logic
  let personList = [];
  let currentIndex = 0;
  let timerDuration = 60;
  let startTime = null;
  let intervalId = null;

  const defaultPeople =
    "Alessandro\nClaudio\nDiego\nElisa\nFedeD\nFedeG\nFrancesco\nGabriele\nLuca\nMatteo\nNicola\nRoberto\nStefano\nVincenzo";
  const defaultDuration = 60;

  const format = (ms) => {
    const sec = Math.floor(ms / 1000);
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const updateDisplay = () => {
    const remaining = startTime - Date.now();
    if (remaining <= 0) {
      clearInterval(intervalId);
      intervalId = null;
      document.getElementById("gipo-timer-display").textContent = "00:00:00";
      return;
    }
    document.getElementById("gipo-timer-display").textContent =
      format(remaining);
  };

  // UI Updates
  const updateClock = () => {
    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();

    const secondDeg = seconds * 6;
    const minuteDeg = minutes * 6 + seconds * 0.1;

    const secHand = document.getElementById("second-hand");
    const minHand = document.getElementById("minute-hand");

    if (secHand && minHand) {
      secHand.style.transform = `rotate(${secondDeg}deg)`;
      minHand.style.transform = `rotate(${minuteDeg}deg)`;
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

  setInterval(updateClock, 1000);
  updateClock();

  // Configuration
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

  // Event Listeners
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
        intervalId = setInterval(updateDisplay, 1000);
      });
    }
  };

  document.getElementById("start-timer").onclick = () => {
    if (intervalId) return;
    startTime = startTime || Date.now() + timerDuration * 1000;
    intervalId = setInterval(updateDisplay, 1000);
  };

  document.getElementById("stop-timer").onclick = () => {
    clearInterval(intervalId);
    intervalId = null;
  };

  document.getElementById("reset-timer").onclick = () => {
    clearInterval(intervalId);
    intervalId = null;
    startTime = null;
    document.getElementById("gipo-timer-display").textContent = "00:00:00";
  };

  document.getElementById("prev-person").onclick = () => changePerson(-1);
  document.getElementById("next-person").onclick = () => changePerson(1);

  document.getElementById("open-settings").onclick = () => {
    chrome.runtime.sendMessage({action: "open-options"});
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

  chrome.storage.sync.get("theme", (data) => {
    const theme = data.theme || "dark";
    container.classList.add(theme);
    document.getElementById("toggle-theme").textContent =
      theme === "dark" ? "🌙" : "☀️";
  });

  loadConfiguration();
}
