// Valori di default per la lista di persone e la durata del timer
const defaultPeople =
  "Alessandro\nClaudio\nDiego\nElisa\nFedeD\nFedeG\nFrancesco\nGabriele\nLuca\nMatteo\nNicola\nRoberto\nStefano\nVincenzo";
const defaultDuration = 60;

// Inizializzazione della pagina al caricamento
window.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get(["people", "duration"], (data) => {
    const people = data.people || defaultPeople;
    const duration = data.duration || defaultDuration;

    document.getElementById("person-list").value = people;
    document.getElementById("timer-duration").value = duration;

    document.getElementById("wheel-person-list").value = people;

    const names = people
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    drawWheel(names);

    // Se non ci sono dati salvati, imposta i valori di default
    // Salva i default se non erano presenti
    if (!data.people || !data.duration) {
      chrome.storage.sync.set({people, duration});
    }
  });
});

// Salva le impostazioni del timer (durata e lista)
document.getElementById("save").addEventListener("click", () => {
  const people = document.getElementById("person-list").value;
  const duration =
    parseInt(document.getElementById("timer-duration").value, 10) ||
    defaultDuration;
  chrome.storage.sync.set({people, duration}, () => {
    const status = document.getElementById("status");
    status.textContent = "Salvato!";
    setTimeout(() => (status.textContent = ""), 2000);
  });
});

// Salva la lista della ruota nel local storage
document.getElementById("wheel-save").addEventListener("click", () => {
  const people = document.getElementById("wheel-person-list").value;
  chrome.storage.sync.set({people}, () => {
    document.getElementById("wheel-status").textContent = "Lista salvata!";
    setTimeout(
      () => (document.getElementById("wheel-status").textContent = ""),
      2000
    );
  });
});

const canvas = document.getElementById("wheel-canvas");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spin");
const winnerDisplay = document.getElementById("winner");

let spinning = false;
let angle = 0;
let angularVelocity = 0;
let selectedPerson = null;
let selectedIndex = -1;

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
    ctx.translate(radius * 0.8, 0); // più lontano dal centro
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
    chrome.storage.sync.set({people: updatedList});
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

drawWheel(defaultPeople.split("\n"));

// Navigazione tra le sezioni timer e ruota
document.getElementById("nav-timer").addEventListener("click", () => {
  document.getElementById("section-timer").classList.remove("hidden");
  document.getElementById("section-wheel").classList.add("hidden");
});

document.getElementById("nav-wheel").addEventListener("click", () => {
  document.getElementById("section-timer").classList.add("hidden");
  document.getElementById("section-wheel").classList.remove("hidden");
});

// Ripristina la lista originale della ruota
document.getElementById("wheel-reset").addEventListener("click", () => {
  document.getElementById("wheel-person-list").value = defaultPeople;
  chrome.storage.sync.set({people: defaultPeople}, () => {
    document.getElementById("wheel-status").textContent = "Lista ripristinata!";
    setTimeout(
      () => (document.getElementById("wheel-status").textContent = ""),
      2000
    );
    drawWheel(defaultPeople.split("\n"));
  });
});

// Mischia casualmente la lista della ruota
document.getElementById("wheel-shuffle").addEventListener("click", () => {
  const textarea = document.getElementById("wheel-person-list");
  const names = textarea.value
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  // Algoritmo di Fisher-Yates per mischiare la lista
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }

  const shuffled = names.join("\n");
  textarea.value = shuffled;
  chrome.storage.sync.set({people: shuffled});
  drawWheel(names);
});

const confettiCanvas = document.getElementById("confetti-canvas");
const confettiCtx = confettiCanvas.getContext("2d");
let confettiParticles = [];

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
