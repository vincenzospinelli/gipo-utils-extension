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
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [audioVolume, setAudioVolume] = useState(10);
  const [status, setStatus] = useState("");

  useEffect(() => {
    chrome.storage.sync.get(
      [
        "peopleWithIds",
        "duration",
        "filterJiraByUser",
        "audioMuted",
        "audioVolume",
      ],
      (data) => {
        setPeople(data.peopleWithIds || defaultPeople);
        setDuration(parseInt(data.duration, 10) || defaultDuration);
        setFilterJiraByUser(Boolean(data.filterJiraByUser));
        setSoundsEnabled(!Boolean(data.audioMuted));
        setAudioVolume(
          typeof data.audioVolume === "number"
            ? Math.max(0, Math.min(100, Math.round(data.audioVolume * 100)))
            : 10
        );
        if (!data.peopleWithIds || !data.duration) {
          chrome.storage.sync.set({
            peopleWithIds: data.peopleWithIds || defaultPeople,
            duration: data.duration || defaultDuration,
          });
        }
      }
    );
  }, []);

  const persistPeople = (list) => {
    const cleaned = list
      .filter((p) => p.name?.trim())
      .map((p) => ({name: p.name.trim(), jiraId: (p.jiraId || "").trim()}));
    chrome.storage.sync.set({peopleWithIds: cleaned});
  };

  const updatePerson = (idx, field, value) => {
    setPeople((prev) => {
      const next = prev.map((p, i) => (i === idx ? {...p, [field]: value} : p));
      persistPeople(next);
      return next;
    });
  };
  const addPerson = () =>
    setPeople((prev) => {
      const next = [...prev, {name: "", jiraId: ""}];
      persistPeople(next);
      return next;
    });
  const removePerson = (idx) =>
    setPeople((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      persistPeople(next);
      return next;
    });

  // Live-save duration as user types
  const onDurationChange = (val) => {
    const n = parseInt(val, 10);
    setDuration(val);
    if (!Number.isNaN(n) && n > 0) {
      chrome.storage.sync.set({duration: n});
    }
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
        onChange={(e) => onDurationChange(e.target.value)}
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

      <div className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          id="timer-sounds-enabled"
          checked={soundsEnabled}
          onChange={(e) => {
            const enabled = e.target.checked;
            setSoundsEnabled(enabled);
            chrome.storage.sync.set({
              audioMuted: !enabled,
              audioVolume: Math.max(0, Math.min(1, audioVolume / 100)),
            });
          }}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor="timer-sounds-enabled"
          className="text-sm font-medium text-gray-700"
        >
          Suoni timer abilitati (beep e tick)
        </label>
      </div>

      <label
        htmlFor="timer-audio-volume"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Volume suoni: {audioVolume}%
      </label>
      <input
        type="range"
        id="timer-audio-volume"
        min={0}
        max={100}
        step={1}
        value={audioVolume}
        onChange={(e) => {
          const vol = parseInt(e.target.value, 10);
          setAudioVolume(vol);
          chrome.storage.sync.set({
            audioMuted: !soundsEnabled,
            audioVolume: Math.max(0, Math.min(1, vol / 100)),
          });
        }}
        className="w-full mb-4"
      />
      <div id="status" className="text-sm text-green-600 h-5">{status}</div>
    </div>
  );
}

function WheelTab() {
  const [people, setPeople] = useState(defaultPeople);
  const [textarea, setTextarea] = useState(
    defaultPeople.map((p) => p.name).join("\n")
  );
  const [winner, setWinner] = useState("");
  const [lastWinner, setLastWinner] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [spinning, setSpinning] = useState(false);
  const spinningRef = useRef(false);
  const lastWinnerRef = useRef(null);
  const angleRef = useRef(0);
  const velRef = useRef(0);
  const spinEndRef = useRef(0);
  const spinDurRef = useRef(0);
  const canvasRef = useRef(null);
  const confettiCanvasRef = useRef(null);
  const confettiCtxRef = useRef(null);
  const confettiParticlesRef = useRef([]);
  const wheelAudioRef = useRef(null);
  const [wheelSoundsEnabled, setWheelSoundsEnabled] = useState(true);
  const [wheelAudioVolume, setWheelAudioVolume] = useState(10); // percent 0..100
  // Post-win animation state
  const winnerAnimatingRef = useRef(false);
  const winnerPulseRef = useRef(0); // 0..1 amplitude used by drawWheel for the selected slice

  useEffect(() => {
    chrome.storage.sync.get(["peopleWithIds", "wheelAudioMuted", "wheelAudioVolume"], (data) => {
      const pw = data.peopleWithIds || defaultPeople;
      setPeople(pw);
      setTextarea(pw.map((p) => p.name).join("\n"));
      drawWheel(pw.map((p) => p.name));
      // audio settings
      const vol =
        typeof data.wheelAudioVolume === "number"
          ? Math.max(0, Math.min(100, Math.round(data.wheelAudioVolume * 100)))
          : 10;
      setWheelSoundsEnabled(!Boolean(data.wheelAudioMuted));
      setWheelAudioVolume(vol);
      // apply volume to audio element
      if (wheelAudioRef.current) {
        wheelAudioRef.current.volume = (!data.wheelAudioMuted)
          ? Math.max(0, Math.min(1, vol / 100))
          : 0;
      }
    });
    const c = confettiCanvasRef.current;
    if (c) {
      confettiCtxRef.current = c.getContext("2d");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep wheel audio element in sync when user changes controls
  useEffect(() => {
    if (wheelAudioRef.current) {
      wheelAudioRef.current.volume = wheelSoundsEnabled
        ? Math.max(0, Math.min(1, wheelAudioVolume / 100))
        : 0;
    }
  }, [wheelSoundsEnabled, wheelAudioVolume]);

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
      const isSelected = i === selectedIndex;
      const r = isSelected
        ? radius + 12 * Math.max(0, Math.min(1, winnerPulseRef.current))
        : radius;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, i * step, (i + 1) * step);
      ctx.fillStyle = isSelected
        ? `hsl(${(i * 360) / namesList.length}, 90%, 50%)`
        : `hsl(${(i * 360) / namesList.length}, 70%, 70%)`;
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.rotate(i * step + step / 2);
      ctx.translate(r * 0.8, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "#000";
      ctx.font = "bold 14px sans-serif";
      const letters = name.toUpperCase().split("");
      letters.forEach((char, index) => {
        ctx.fillText(char, -ctx.measureText(char).width / 2, index * 16);
      });
      ctx.restore();

      // Add a soft glow around the winning slice
      if (isSelected && winnerAnimatingRef.current) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 215, 0, 0.9)"; // gold
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, r, i * step, (i + 1) * step);
        ctx.stroke();
        ctx.restore();
      }
    });

    ctx.restore();
  }

  function animate() {
    if (!spinningRef.current) return;
    angleRef.current += velRef.current;
    const now = Date.now();
    if (now >= spinEndRef.current) {
      setSpinning(false);
      spinningRef.current = false;
      const TAU = 2 * Math.PI;
      const normalizedAngle = ((angleRef.current % TAU) + TAU) % TAU;
      const step = TAU / names.length;
      // Pointer at South in canvas coordinates (0 = East)
      const POINTER = Math.PI / 2;
      // Angle of pointer expressed in wheel coordinates
      const pointerAngle = (TAU - normalizedAngle + POINTER) % TAU;
      // Sector under the pointer (by containment)
      const index = Math.floor(pointerAngle / step) % names.length;
      const selectedPerson = names[index];
      setWinner(`Il vincitore è ${selectedPerson}!`);
      setSelectedIndex(index);
      // Snap the wheel so the center of the winning sector aligns exactly with the pointer
      const centerOfIndex = index * step + step / 2; // wheel coords
      const targetNormalized = (POINTER - centerOfIndex + TAU) % TAU; // canvas coords
      const delta =
        ((targetNormalized - normalizedAngle + Math.PI) % TAU) - Math.PI; // shortest delta
      angleRef.current += delta; // apply snap correction
      startConfetti();
      try {
        if (wheelSoundsEnabled) {
          if (wheelAudioRef.current) {
            wheelAudioRef.current.volume = Math.max(0, Math.min(1, wheelAudioVolume / 100));
          }
          wheelAudioRef.current?.play?.();
        }
      } catch {}
      setLastWinner(selectedPerson);
      lastWinnerRef.current = selectedPerson;

      // Start a brief winner animation, then remove the winner from the list
      startWinnerAnimation(selectedPerson);
      return;
    } else {
      const rem = Math.max(0, spinEndRef.current - now);
      const frac = spinDurRef.current > 0 ? rem / spinDurRef.current : 0;
      velRef.current = 0.35 * Math.max(0.05, frac * frac);
      requestAnimationFrame(animate);
    }
    drawWheel(names);
  }

  function startWinnerAnimation(selectedPerson) {
    winnerAnimatingRef.current = true;
    const start = Date.now();
    const duration = 1800; // ms

    const stepAnim = () => {
      const t = (Date.now() - start) / duration;
      if (t >= 1) {
        winnerPulseRef.current = 0;
        winnerAnimatingRef.current = false;
        // After a smooth pause, remove the winner and redraw
        const updatedNames = names.filter((n) => n !== selectedPerson);
        setTextarea(updatedNames.join("\n"));
        const updatedPeople = people.filter((p) => p.name !== selectedPerson);
        setPeople(updatedPeople);
        chrome.storage.sync.set({peopleWithIds: updatedPeople});
        setSelectedIndex(-1);
        drawWheel(updatedNames);
        return;
      }
      // Pulsating amplitude decays over time
      const amp = Math.abs(Math.sin(t * 6 * Math.PI)) * (1 - t);
      winnerPulseRef.current = amp;
      drawWheel(names);
      requestAnimationFrame(stepAnim);
    };
    requestAnimationFrame(stepAnim);
  }

  function onSpin() {
    if (winnerAnimatingRef.current) return; // avoid spinning during winner animation
    if (names.length < 2) {
      alert("Inserisci almeno due nomi per usare la ruota.");
      return;
    }
    // Winner is now removed immediately at the end of the previous spin
    setLastWinner(null);
    lastWinnerRef.current = null;
    setSpinning(true);
    spinningRef.current = true;
    setWinner("");
    setSelectedIndex(-1);
    const dur = 3000 + Math.random() * 2000; // 3-5s
    spinDurRef.current = dur;
    spinEndRef.current = Date.now() + dur;
    velRef.current = 0.35;
    requestAnimationFrame(animate);
  }

  // Auto-save the wheel list when the textarea changes (debounced)
  useEffect(() => {
    const handle = setTimeout(() => {
      const updated = names.map((name) => {
        const found = people.find((p) => p.name === name);
        return found || {name};
      });
      setPeople(updated);
      chrome.storage.sync.set({peopleWithIds: updated});
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names]);

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
    setLastWinner(null);
    lastWinnerRef.current = null;
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
              disabled={spinning}
              className={`flex-1 text-white font-semibold py-2 px-4 rounded ${
                spinning
                  ? "bg-green-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {spinning ? "Girando…" : "Gira"}
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
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="wheel-sounds-enabled"
                checked={wheelSoundsEnabled}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setWheelSoundsEnabled(enabled);
                  chrome.storage.sync.set({
                    wheelAudioMuted: !enabled,
                    wheelAudioVolume: Math.max(0, Math.min(1, wheelAudioVolume / 100)),
                  });
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="wheel-sounds-enabled" className="text-sm font-medium text-gray-700">
                Suono proclamazione vincitore abilitato
              </label>
            </div>
            <label htmlFor="wheel-audio-volume" className="block text-sm font-medium text-gray-700 mb-1">
              Volume suono: {wheelAudioVolume}%
            </label>
            <input
              type="range"
              id="wheel-audio-volume"
              min={0}
              max={100}
              step={1}
              value={wheelAudioVolume}
              onChange={(e) => {
                const vol = parseInt(e.target.value, 10);
                setWheelAudioVolume(vol);
                chrome.storage.sync.set({
                  wheelAudioMuted: !wheelSoundsEnabled,
                  wheelAudioVolume: Math.max(0, Math.min(1, vol / 100)),
                });
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>
      <canvas
        ref={confettiCanvasRef}
        id="confetti-canvas"
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
      ></canvas>
      <audio
        ref={wheelAudioRef}
        src={chrome.runtime.getURL("assets/sounds/lose.mp3")}
        preload="auto"
      />
    </div>
  );
}

function ChangelogTab() {
  const [content, setContent] = useState("Caricamento changelog...");
  const mdToHtml = (md) => {
    if (!md) return "";
    // Escape HTML
    const escape = (s) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    // Handle code blocks ``` ``` first
    let html = "";
    const lines = md.replace(/\r\n?/g, "\n").split("\n");
    let i = 0;
    let inCode = false;
    let codeLang = "";
    let codeBuf = [];
    const out = [];
    const flushParagraph = (buf) => {
      const txt = buf.join("\n").trim();
      if (!txt) return;
      out.push(`<p>${inline(txt)}</p>`);
      buf.length = 0;
    };
    const ulStack = [];
    const olStack = [];

    const inline = (text) => {
      const e = escape(text);
      return e
        // bold
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        // italics
        .replace(/(^|[^*])\*(?!\s)(.+?)(?!\s)\*(?!\*)/g, "$1<em>$2</em>")
        .replace(/(^|[^_])_(?!\s)(.+?)(?!\s)_(?!_)/g, "$1<em>$2</em>")
        // strikethrough
        .replace(/~~(.+?)~~/g, "<del>$1</del>")
        // inline code
        .replace(/`([^`]+?)`/g, "<code>$1</code>")
        // links
        .replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+\"([^\"]*)\")?\)/g, (m, t, url, title) => {
          const tt = title ? ` title=\"${escape(title)}\"` : "";
          return `<a href=\"${url}\" target=\"_blank\" rel=\"noopener noreferrer\"${tt}>${t}</a>`;
        });
    };

    const closeLists = () => {
      while (ulStack.length) out.push("</ul>") && ulStack.pop();
      while (olStack.length) out.push("</ol>") && olStack.pop();
    };

    let paraBuf = [];
    while (i < lines.length) {
      const line = lines[i];
      // fenced code start/end
      const fence = line.match(/^```\s*(\w+)?\s*$/);
      if (fence) {
        if (inCode) {
          // close code
          out.push(
            `<pre class=\"overflow-auto rounded bg-gray-100 p-3 text-sm\"><code class=\"language-${codeLang}\">${escape(
              codeBuf.join("\n")
            )}</code></pre>`
          );
          codeBuf = [];
          codeLang = "";
          inCode = false;
        } else {
          flushParagraph(paraBuf);
          closeLists();
          inCode = true;
          codeLang = fence[1] || "";
        }
        i++;
        continue;
      }
      if (inCode) {
        codeBuf.push(line);
        i++;
        continue;
      }

      // headings
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        flushParagraph(paraBuf);
        closeLists();
        const level = h[1].length;
        out.push(`<h${level} class=\"mt-4 mb-2 font-bold\">${inline(h[2])}</h${level}>`);
        i++;
        continue;
      }
      // blockquote
      const bq = line.match(/^>\s?(.*)$/);
      if (bq) {
        flushParagraph(paraBuf);
        closeLists();
        out.push(`<blockquote class=\"border-l-4 pl-3 italic text-gray-600\">${inline(bq[1])}</blockquote>`);
        i++;
        continue;
      }
      // lists
      const ul = line.match(/^\s*[-*]\s+(.*)$/);
      const ol = line.match(/^\s*\d+\.\s+(.*)$/);
      if (ul) {
        flushParagraph(paraBuf);
        if (!ulStack.length) out.push("<ul class=\"list-disc ml-6 my-2\">") && ulStack.push(true);
        out.push(`<li>${inline(ul[1])}</li>`);
        i++;
        continue;
      }
      if (ol) {
        flushParagraph(paraBuf);
        if (!olStack.length) out.push("<ol class=\"list-decimal ml-6 my-2\">") && olStack.push(true);
        out.push(`<li>${inline(ol[1])}</li>`);
        i++;
        continue;
      }
      // horizontal rule
      if (/^\s*([-*_]){3,}\s*$/.test(line)) {
        flushParagraph(paraBuf);
        closeLists();
        out.push("<hr class=\"my-4\"/>");
        i++;
        continue;
      }
      // blank line => paragraph break
      if (/^\s*$/.test(line)) {
        flushParagraph(paraBuf);
        closeLists();
        i++;
        continue;
      }
      // accumulate paragraph text
      paraBuf.push(line);
      i++;
    }
    flushParagraph(paraBuf);
    closeLists();
    html = out.join("\n");
    return html;
  };
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
      <div
        id="changelog-content"
        className="text-sm text-gray-800 leading-6 max-h-[500px] overflow-auto"
        dangerouslySetInnerHTML={{__html: mdToHtml(content)}}
      />
    </div>
  );
}
