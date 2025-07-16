// === Costanti e variabili globali ===
const defaultPeople = [
  {name: "Alessandro", jiraId: "617aa59316119e0069442a6b"},
  {name: "Claudio", jiraId: "712020:35edea3d-1d8f-4974-83a8-4211d0a72ffc"},
  {name: "Diego", jiraId: "5d6cce0a94e3580d923b094a"},
  {name: "Elisa"},
  {name: "Enrico", jiraId: "5ee71feeb04ccf0aae582f1f"},
  {name: "FedeD"},
  {name: "FedeG", jiraId: "6110f69c8ad5b6007039f600"},
  {name: "Francesco", jiraId: "641188d37222b08f3e70eb17"},
  {name: "Gabriele", jiraId: "712020:28cd82e1-1d78-4ddb-872f-d2aa0ea76748"},
  {name: "Luca", jiraId: "712020:638f74b4-f89d-4d97-a8e7-17b5e1751221"},
  {name: "Matteo", jiraId: "641188d30152b5f4f9f04779"},
  {name: "Nicola", jiraId: "5eb00c556c84140b9e713401"},
  {name: "Roberto", jiraId: "712020:68d63d5b-cc98-4e72-bc6b-f508992de65e"},
  {name: "Stefano", jiraId: "712020:449c0f67-b6ba-4f7d-8f6e-fa2c5a541e9c"},
  {name: "Vincenzo", jiraId: "63bc2177df0fa548e8e84a62"},
];
const defaultDuration = 60;
const canvas = document.getElementById("wheel-canvas");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spin");
const winnerDisplay = document.getElementById("winner");
const confettiCanvas = document.getElementById("confetti-canvas");
const confettiCtx = confettiCanvas.getContext("2d");

let spinning = false;
let angle = 0;
let angularVelocity = 0;
let selectedPerson = null;
let selectedIndex = -1;
let confettiParticles = [];

// === Helper functions for people list UI ===
function createPersonRow(person = {name: "", jiraId: ""}) {
  const div = document.createElement("div");
  div.className = "flex gap-2 items-center";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = "Nome";
  nameInput.value = person.name || "";
  nameInput.className = "flex-grow border rounded px-2 py-1";

  const jiraInput = document.createElement("input");
  jiraInput.type = "text";
  jiraInput.placeholder = "Jira ID (opzionale)";
  jiraInput.value = person.jiraId || "";
  jiraInput.className = "w-32 border rounded px-2 py-1";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "✕";
  removeBtn.className = "text-red-600 font-bold px-2 py-1 hover:text-red-800";
  removeBtn.addEventListener("click", () => {
    removePerson(div);
  });

  div.appendChild(nameInput);
  div.appendChild(jiraInput);
  div.appendChild(removeBtn);

  return div;
}

function renderPeopleList(people) {
  const container = document.getElementById("people-list");
  container.innerHTML = "";
  people.forEach((person) => {
    const row = createPersonRow(person);
    container.appendChild(row);
  });
}

function getCurrentPeopleFromForm() {
  const container = document.getElementById("people-list");
  const people = [];
  container.querySelectorAll("div").forEach((div) => {
    const inputs = div.querySelectorAll("input");
    const name = inputs[0].value.trim();
    const jiraId = inputs[1].value.trim();
    if (name) {
      people.push(jiraId ? {name, jiraId} : {name});
    }
  });
  return people;
}

function addPerson() {
  const container = document.getElementById("people-list");
  const row = createPersonRow();
  container.appendChild(row);
}

function removePerson(row) {
  row.remove();
}

// === Inizializzazione pagina ===
window.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get(["peopleWithIds", "duration"], (data) => {
    const peopleWithIds = data.peopleWithIds || defaultPeople;
    const duration = data.duration || defaultDuration;

    renderPeopleList(peopleWithIds);
    document.getElementById("timer-duration").value = duration;

    // Update wheel-person-list textarea with names only
    document.getElementById("wheel-person-list").value = peopleWithIds
      .map((p) => p.name)
      .join("\n");

    const names = peopleWithIds.map((p) => p.name);
    drawWheel(names);

    // Se non ci sono dati salvati, imposta i valori di default
    // Salva i default se non erano presenti
    if (!data.peopleWithIds || !data.duration) {
      chrome.storage.sync.set({peopleWithIds, duration});
    }

    if (peopleWithIds.length > 0) {
      changeJiraView(peopleWithIds[0]);
    }
  });

  document.getElementById("add-person").addEventListener("click", addPerson);
});

// === Eventi salvataggio dati ===
// Salva le impostazioni del timer (durata e lista)
document.getElementById("save").addEventListener("click", () => {
  const peopleWithIds = getCurrentPeopleFromForm();
  const duration =
    parseInt(document.getElementById("timer-duration").value, 10) ||
    defaultDuration;
  chrome.storage.sync.set({peopleWithIds, duration}, () => {
    const status = document.getElementById("status");
    status.textContent = "Salvato!";
    setTimeout(() => (status.textContent = ""), 2000);
  });
});

// Salva la lista della ruota nel local storage
document.getElementById("wheel-save").addEventListener("click", () => {
  const peopleNames = document
    .getElementById("wheel-person-list")
    .value.split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  // To keep jiraId info, try to match with current peopleWithIds from form
  const currentPeople = getCurrentPeopleFromForm();
  const peopleWithIds = peopleNames.map((name) => {
    const found = currentPeople.find((p) => p.name === name);
    return found || {name};
  });

  chrome.storage.sync.set({peopleWithIds}, () => {
    document.getElementById("wheel-status").textContent = "Lista salvata!";
    setTimeout(
      () => (document.getElementById("wheel-status").textContent = ""),
      2000
    );
  });
});

// === Ruota: disegno e animazione ===
// Disegna la ruota con i nomi specificati
function drawWheel(names) {
  const radius = canvas.width / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createRadialGradient(
    radius * 0.5,
    radius * 0.5,
    radius * 0.2,
    radius,
    radius,
    radius
  );
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.7, "#cccccc");
  gradient.addColorStop(1, "#999999");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, 2 * Math.PI);
  ctx.fill();

  const step = (2 * Math.PI) / names.length;

  ctx.save();
  ctx.translate(radius, radius);
  ctx.rotate(angle);

  // Disegna ogni spicchio con il nome corrispondente
  names.forEach((name, i) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, i * step, (i + 1) * step);
    ctx.fillStyle =
      i === selectedIndex
        ? `hsl(${(i * 360) / names.length}, 90%, 50%)`
        : `hsl(${(i * 360) / names.length}, 70%, 70%)`;
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(i * step + step / 2);
    ctx.translate(radius * 0.8, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = "#000";
    ctx.font = "bold 14px sans-serif";
    const letters = name.toUpperCase().split("");
    letters.forEach((char, index) => {
      ctx.fillText(char, -ctx.measureText(char).width / 2, index * 16);
    });
    ctx.restore();
  });

  ctx.restore();
}

// Animazione della rotazione della ruota e selezione del vincitore
function animate(names) {
  if (!spinning) return;

  angle += angularVelocity;
  angularVelocity *= 0.98;

  if (angularVelocity < 0.002) {
    spinning = false;
    const normalizedAngle =
      ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const step = (2 * Math.PI) / names.length;
    const pointerAngle =
      (2 * Math.PI - normalizedAngle + Math.PI / 2) % (2 * Math.PI);
    const index = Math.floor(pointerAngle / step) % names.length;
    selectedPerson = names[index];
    selectedIndex = index;
    winnerDisplay.textContent = `Il vincitore è ${selectedPerson}!`;

    startConfetti();

    // Aggiorna la lista rimuovendo il vincitore
    const listEl = document.getElementById("wheel-person-list");
    const updatedList = names.filter((n) => n !== selectedPerson).join("\n");
    listEl.value = updatedList;

    // Also update peopleWithIds storage removing the winner
    const currentPeople = getCurrentPeopleFromForm();
    const updatedPeople = currentPeople.filter(
      (p) => p.name !== selectedPerson
    );
    renderPeopleList(updatedPeople);
    chrome.storage.sync.set({peopleWithIds: updatedPeople});
  } else {
    requestAnimationFrame(() => animate(names));
  }

  drawWheel(names);
}

// Gestione click sul pulsante "Gira la ruota"
spinBtn.addEventListener("click", () => {
  const listEl = document.getElementById("wheel-person-list");
  const names = listEl.value
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  if (names.length < 2) {
    alert("Inserisci almeno due nomi per usare la ruota.");
    return;
  }

  spinning = true;
  angularVelocity = Math.random() * 0.3 + 0.25;
  winnerDisplay.textContent = "";
  selectedIndex = -1;

  animate(names);
});

drawWheel(defaultPeople.map((p) => p.name));

// Ripristina la lista originale della ruota
document.getElementById("wheel-reset").addEventListener("click", () => {
  renderPeopleList(defaultPeople);
  document.getElementById("wheel-person-list").value = defaultPeople
    .map((p) => p.name)
    .join("\n");
  chrome.storage.sync.set({peopleWithIds: defaultPeople}, () => {
    document.getElementById("wheel-status").textContent = "Lista ripristinata!";
    setTimeout(
      () => (document.getElementById("wheel-status").textContent = ""),
      2000
    );
    drawWheel(defaultPeople.map((p) => p.name));
  });
});

// Mischia casualmente la lista della ruota
document.getElementById("wheel-shuffle").addEventListener("click", () => {
  const textarea = document.getElementById("wheel-person-list");
  const names = textarea.value
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  // Algoritmo per mischiare la lista
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }

  const shuffled = names.join("\n");
  textarea.value = shuffled;

  // Update peopleWithIds accordingly, preserving jiraId if possible
  const currentPeople = getCurrentPeopleFromForm();
  const shuffledPeople = names.map((name) => {
    const found = currentPeople.find((p) => p.name === name);
    return found || {name};
  });

  chrome.storage.sync.set({peopleWithIds: shuffledPeople});
  drawWheel(names);
});

// === Navigazione UI ===
document.getElementById("nav-timer").addEventListener("click", () => {
  document.getElementById("section-timer").classList.remove("hidden");
  document.getElementById("section-wheel").classList.add("hidden");
});

document.getElementById("nav-wheel").addEventListener("click", () => {
  document.getElementById("section-timer").classList.add("hidden");
  document.getElementById("section-wheel").classList.remove("hidden");
});

// === Confetti ===
function startConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiParticles = Array.from({length: 150}, () => ({
    x: Math.random() * confettiCanvas.width,
    y: Math.random() * confettiCanvas.height - confettiCanvas.height,
    r: Math.random() * 6 + 4,
    d: Math.random() * 40 + 10,
    color: `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`,
    tilt: Math.random() * 10 - 5,
    tiltAngleIncrement: Math.random() * 0.1 + 0.05,
    tiltAngle: 0,
  }));

  requestAnimationFrame(updateConfetti);
}

function updateConfetti() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach((p) => {
    p.y += Math.cos(p.d) + 1 + p.r / 2;
    p.x += Math.sin(0);
    p.tiltAngle += p.tiltAngleIncrement;
    p.tilt = Math.sin(p.tiltAngle) * 15;

    confettiCtx.beginPath();
    confettiCtx.lineWidth = p.r;
    confettiCtx.strokeStyle = p.color;
    confettiCtx.moveTo(p.x + p.tilt + p.r / 2, p.y);
    confettiCtx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
    confettiCtx.stroke();
  });

  confettiParticles = confettiParticles.filter(
    (p) => p.y < confettiCanvas.height
  );
  if (confettiParticles.length > 0) {
    requestAnimationFrame(updateConfetti);
  }
}

// === Gestione hash per navigazione ===
window.addEventListener("hashchange", handleHash);
window.addEventListener("DOMContentLoaded", handleHash);

function handleHash() {
  const hash = window.location.hash;
  if (hash === "#wheel") {
    document.getElementById("nav-wheel").click();
  } else {
    document.getElementById("nav-timer").click();
  }
}
