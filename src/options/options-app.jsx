import {useEffect, useMemo, useRef, useState} from "react";

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

const defaultDuration = 60;

export function OptionsApp() {
  const [active, setActive] = useState("timer");

  useEffect(() => {
    const setFromHash = () => {
      const hash = window.location.hash.replace("#", "") || "timer";
      setActive(hash);
    };
    setFromHash();
    window.addEventListener("hashchange", setFromHash);
    return () => window.removeEventListener("hashchange", setFromHash);
  }, []);

  const go = (tab) => {
    window.location.hash = tab;
  };

  return (
    <>
      <header className="absolute top-0 left-0 w-full bg-white shadow-md py-4 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="../assets/images/icon.png" alt="Logo" className="w-8 h-8" />
          <span className="text-xl font-semibold text-gray-700">
            Configurazioni
          </span>
        </div>
        <nav className="flex gap-4 text-gray-600 font-medium">
          <button onClick={() => go("timer")} className="hover:text-blue-600">
            GipoTimer
          </button>
          <button onClick={() => go("wheel")} className="hover:text-blue-600">
            GipoWheel
          </button>
          <button
            onClick={() => go("changelog")}
            className="hover:text-blue-600"
          >
            Changelog
          </button>
        </nav>
      </header>
      <div className="flex flex-wrap gap-8 justify-center mt-8 w-full px-4">
        {active === "timer" && <TimerTab />}
        {active === "wheel" && <WheelTab />}
        {active === "changelog" && <ChangelogTab />}
      </div>
      <canvas
        id="confetti-canvas"
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
      />
    </>
  );
}

function TimerTab() {
  const [people, setPeople] = useState(defaultPeople);
  const [duration, setDuration] = useState(defaultDuration);
  const [filterJiraByUser, setFilterJiraByUser] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    chrome.storage.sync.get(
      ["peopleWithIds", "duration", "filterJiraByUser"],
      (data) => {
        setPeople(data.peopleWithIds || defaultPeople);
        setDuration(parseInt(data.duration, 10) || defaultDuration);
        setFilterJiraByUser(Boolean(data.filterJiraByUser));
        if (!data.peopleWithIds || !data.duration) {
          chrome.storage.sync.set({
            peopleWithIds: data.peopleWithIds || defaultPeople,
            duration: data.duration || defaultDuration,
          });
        }
      }
    );
  }, []);

  const updatePerson = (idx, field, value) => {
    setPeople((prev) =>
      prev.map((p, i) => (i === idx ? {...p, [field]: value} : p))
    );
  };
  const addPerson = () =>
    setPeople((prev) => [...prev, {name: "", jiraId: ""}]);
  const removePerson = (idx) =>
    setPeople((prev) => prev.filter((_, i) => i !== idx));

  const save = () => {
    const cleaned = people
      .filter((p) => p.name?.trim())
      .map((p) => ({name: p.name.trim(), jiraId: (p.jiraId || "").trim()}));
    const dur = parseInt(duration, 10) || defaultDuration;
    chrome.storage.sync.set({peopleWithIds: cleaned, duration: dur}, () => {
      setStatus("Salvato!");
      setTimeout(() => setStatus(""), 2000);
    });
  };

  const toggleFilter = (checked) => {
    setFilterJiraByUser(checked);
    chrome.storage.sync.set({filterJiraByUser: checked});
  };

  return (
    <div
      id="section-timer"
      className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full"
    >
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Configurazione GipoTimer
      </h2>
      <label
        htmlFor="timer-duration"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Durata timer (in secondi)
      </label>
      <input
        type="number"
        id="timer-duration"
        placeholder="60"
        min={1}
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:ring focus:border-blue-500"
      />

      <div className="flex flex-col gap-2 mb-4">
        <label className="text-sm font-medium text-gray-700 mb-1">
          Utenti e Jira ID
        </label>
      </div>
      <div id="people-list" className="flex flex-col gap-2 mb-4">
        {people.map((p, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Nome"
              value={p.name}
              onChange={(e) => updatePerson(i, "name", e.target.value)}
              className="flex-grow border rounded p-2"
            />
            <input
              type="text"
              placeholder="Jira ID (opzionale)"
              value={p.jiraId || ""}
              onChange={(e) => updatePerson(i, "jiraId", e.target.value)}
              className="w-full border rounded p-2"
            />
            <button
              type="button"
              onClick={() => removePerson(i)}
              className="text-red-600 font-bold px-2 py-1 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        id="add-person"
        type="button"
        onClick={addPerson}
        className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded mb-4"
      >
        + Aggiungi Persona
      </button>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          id="jira-user-filter"
          checked={filterJiraByUser}
          onChange={(e) => toggleFilter(e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor="jira-user-filter"
          className="text-sm font-medium text-gray-700"
        >
          Filtra la board Jira per utente (Beta)
        </label>
      </div>
      <button
        id="save"
        onClick={save}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded mb-2"
      >
        Salva
      </button>
      <div id="status" className="text-sm text-green-600 h-5">
        {status}
      </div>
    </div>
  );
}

function WheelTab() {
  const [people, setPeople] = useState(defaultPeople);
  const [textarea, setTextarea] = useState(
    defaultPeople.map((p) => p.name).join("\n")
  );
  const [winner, setWinner] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [spinning, setSpinning] = useState(false);
  const spinningRef = useRef(false);
  const angleRef = useRef(0);
  const velRef = useRef(0);
  const canvasRef = useRef(null);
  const confettiCanvasRef = useRef(null);
  const confettiCtxRef = useRef(null);
  const confettiParticlesRef = useRef([]);

  useEffect(() => {
    chrome.storage.sync.get(["peopleWithIds"], (data) => {
      const pw = data.peopleWithIds || defaultPeople;
      setPeople(pw);
      setTextarea(pw.map((p) => p.name).join("\n"));
      drawWheel(pw.map((p) => p.name));
    });
    const c = confettiCanvasRef.current;
    if (c) {
      confettiCtxRef.current = c.getContext("2d");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const names = useMemo(
    () =>
      textarea
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean),
    [textarea]
  );

  useEffect(() => {
    drawWheel(names);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names, selectedIndex]);

  function drawWheel(namesList) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
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

    if (namesList.length === 0) return;
    const step = (2 * Math.PI) / namesList.length;

    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(angleRef.current);

    namesList.forEach((name, i) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, i * step, (i + 1) * step);
      ctx.fillStyle =
        i === selectedIndex
          ? `hsl(${(i * 360) / namesList.length}, 90%, 50%)`
          : `hsl(${(i * 360) / namesList.length}, 70%, 70%)`;
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

  function animate() {
    if (!spinningRef.current) return;
    angleRef.current += velRef.current;
    velRef.current *= 0.98;
    if (velRef.current < 0.002) {
      setSpinning(false);
      spinningRef.current = false;
      const normalizedAngle =
        ((angleRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const step = (2 * Math.PI) / names.length;
      const pointerAngle =
        (2 * Math.PI - normalizedAngle + Math.PI / 2) % (2 * Math.PI);
      const index = Math.floor(pointerAngle / step) % names.length;
      const selectedPerson = names[index];
      setWinner(`Il vincitore è ${selectedPerson}!`);
      setSelectedIndex(index);
      startConfetti();

      // Remove winner from textarea and storage, preserve jiraId if possible
      const updatedNames = names.filter((n) => n !== selectedPerson);
      setTextarea(updatedNames.join("\n"));
      const updatedPeople = people.filter((p) => p.name !== selectedPerson);
      setPeople(updatedPeople);
      chrome.storage.sync.set({peopleWithIds: updatedPeople});
    } else {
      requestAnimationFrame(animate);
    }
    drawWheel(names);
  }

  function onSpin() {
    if (names.length < 2) {
      alert("Inserisci almeno due nomi per usare la ruota.");
      return;
    }
    setSpinning(true);
    spinningRef.current = true;
    setWinner("");
    setSelectedIndex(-1);
    velRef.current = Math.random() * 0.3 + 0.25;
    requestAnimationFrame(animate);
  }

  function onSaveWheel() {
    const peopleNames = names;
    const updated = peopleNames.map((name) => {
      const found = people.find((p) => p.name === name);
      return found || {name};
    });
    setPeople(updated);
    chrome.storage.sync.set({peopleWithIds: updated});
  }

  function onReset() {
    setPeople(defaultPeople);
    setTextarea(defaultPeople.map((p) => p.name).join("\n"));
    chrome.storage.sync.set({peopleWithIds: defaultPeople});
    drawWheel(defaultPeople.map((p) => p.name));
    // Reset motion refs
    angleRef.current = 0;
    velRef.current = 0;
    setSpinning(false);
    spinningRef.current = false;
  }

  function onShuffle() {
    const arr = [...names];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setTextarea(arr.join("\n"));
    const shuffledPeople = arr.map(
      (name) => people.find((p) => p.name === name) || {name}
    );
    setPeople(shuffledPeople);
    chrome.storage.sync.set({peopleWithIds: shuffledPeople});
    drawWheel(arr);
  }

  function startConfetti() {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const particles = Array.from({length: 150}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * 40 + 10,
      color: `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`,
      tilt: Math.random() * 10 - 5,
      tiltAngleIncrement: Math.random() * 0.1 + 0.05,
      tiltAngle: 0,
    }));
    confettiParticlesRef.current = particles;
    requestAnimationFrame(updateConfetti);
  }

  function updateConfetti() {
    const canvas = confettiCanvasRef.current;
    const ctx = confettiCtxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let particles = confettiParticlesRef.current;
    particles.forEach((p) => {
      p.y += Math.cos(p.d) + 1 + p.r / 2;
      p.x += Math.sin(0);
      p.tiltAngle += p.tiltAngleIncrement;
      p.tilt = Math.sin(p.tiltAngle) * 15;

      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });
    particles = particles.filter((p) => p.y < canvas.height);
    confettiParticlesRef.current = particles;
    if (particles.length > 0) requestAnimationFrame(updateConfetti);
  }

  return (
    <div
      id="section-wheel"
      className="bg-white shadow-lg rounded-lg p-8 max-w-5xl w-full"
    >
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Configurazione GipoWheel of Names
      </h2>
      <div className="flex gap-8 justify-center items-start">
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[24px] border-b-red-600 absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10 drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)]"></div>
            <canvas
              ref={canvasRef}
              id="wheel-canvas"
              width="500"
              height="500"
              className="block"
            ></canvas>
          </div>
          <div id="winner" className="mt-4 text-xl font-bold text-blue-700">
            {winner}
          </div>
        </div>
        <div className="flex flex-col w-1/2">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Utenti</h3>
          <textarea
            id="wheel-person-list"
            rows={20}
            cols={30}
            placeholder="Una persona per riga..."
            value={textarea}
            onChange={(e) => setTextarea(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:ring focus:border-blue-500"
          ></textarea>
          <div className="flex gap-2">
            <button
              id="spin"
              onClick={onSpin}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded"
            >
              Gira
            </button>
            <button
              id="wheel-save"
              onClick={onSaveWheel}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
            >
              Salva
            </button>
            <button
              id="wheel-shuffle"
              onClick={onShuffle}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded"
            >
              Mischia
            </button>
            <button
              id="wheel-reset"
              onClick={onReset}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
            >
              Ripristina
            </button>
          </div>
          <div
            id="wheel-status"
            className="text-sm text-green-600 h-5 mt-2"
          ></div>
        </div>
      </div>
      <canvas
        ref={confettiCanvasRef}
        id="confetti-canvas"
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
      ></canvas>
    </div>
  );
}

function ChangelogTab() {
  const [content, setContent] = useState("Caricamento changelog...");
  useEffect(() => {
    fetch(chrome.runtime.getURL("CHANGELOG.md"))
      .then((r) => r.text())
      .then((t) => setContent(t))
      .catch(() => setContent("Errore nel caricamento del changelog."));
  }, []);
  return (
    <div
      id="section-changelog"
      className="bg-white shadow-lg rounded-lg p-8 max-w-3xl w-full"
    >
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Changelog</h2>
      <pre
        id="changelog-content"
        className="whitespace-pre-wrap text-sm text-gray-700 max-h-[500px] overflow-auto"
      >
        {content}
      </pre>
    </div>
  );
}
