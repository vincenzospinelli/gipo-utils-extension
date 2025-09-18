import {useEffect, useMemo, useRef, useState} from "react";

import {
  ensureUnitVolume,
  percentToUnit,
  unitToPercent,
} from "../../shared/audio";
import {
  DEFAULT_PEOPLE,
  DEFAULT_WHEEL_CONFETTI_ENABLED,
  DEFAULT_WHEEL_SOUNDS_ENABLED,
  DEFAULT_WHEEL_VOLUME_PERCENT,
  DEFAULT_WHEEL_VOLUME_UNIT,
} from "../../shared/constants";
import {sanitizePeopleList} from "../../shared/people";
import {readSyncStorage, writeSyncStorage} from "../../shared/storage";
import {SettingsSection} from "../components/SettingsSection";
import {Toast} from "../components/Toast";
import {
  CARD_BASE_CLASS,
  CARD_BODY_CLASS,
  CARD_HEADER_CLASS,
} from "../constants/layout";
import {useAutoToast} from "../hooks/useAutoToast";

export function WheelTab() {
  const [people, setPeople] = useState(DEFAULT_PEOPLE);
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
  const {toastMessage: wheelToast, showToast: showWheelToast} = useAutoToast();
  const [wheelSoundsEnabled, setWheelSoundsEnabled] = useState(
    DEFAULT_WHEEL_SOUNDS_ENABLED
  );
  const [wheelAudioVolume, setWheelAudioVolume] = useState(
    DEFAULT_WHEEL_VOLUME_PERCENT
  );
  const [wheelConfettiEnabled, setWheelConfettiEnabled] = useState(
    DEFAULT_WHEEL_CONFETTI_ENABLED
  );
  const [wheelSection, setWheelSection] = useState("general");
  const wheelNavClass = (section) =>
    `px-3 py-2 rounded transition-colors ${
      wheelSection === section
        ? "bg-blue-100 text-blue-700 font-semibold"
        : "text-gray-600 hover:text-blue-600"
    }`;

  const handleWheelToggle = (enabled) => {
    setWheelSoundsEnabled(enabled);
    writeSyncStorage({
      wheelAudioMuted: !enabled,
      wheelAudioVolume: percentToUnit(wheelAudioVolume),
    });
    if (wheelAudioRef.current) {
      wheelAudioRef.current.volume = enabled
        ? ensureUnitVolume(percentToUnit(wheelAudioVolume))
        : 0;
    }
    showWheelToast();
  };

  const handleWheelVolumeChange = (vol) => {
    const safeValue = Number.isNaN(vol) ? 0 : vol;
    setWheelAudioVolume(safeValue);
    writeSyncStorage({
      wheelAudioMuted: !wheelSoundsEnabled,
      wheelAudioVolume: percentToUnit(safeValue),
    });
    if (wheelAudioRef.current) {
      wheelAudioRef.current.volume = wheelSoundsEnabled
        ? ensureUnitVolume(percentToUnit(safeValue))
        : 0;
    }
    showWheelToast();
  };

  const handleConfettiToggle = (enabled) => {
    setWheelConfettiEnabled(enabled);
    writeSyncStorage({wheelConfettiEnabled: enabled});
    showWheelToast();
    if (!enabled) {
      const canvas = confettiCanvasRef.current;
      const ctx = confettiCtxRef.current;
      if (canvas && ctx) {
        confettiParticlesRef.current = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const persistWheelPeople = (list) => {
    writeSyncStorage({wheelPeople: sanitizePeopleList(list)});
    showWheelToast();
  };

  const updateWheelPerson = (idx, value) => {
    setPeople((prev) => {
      const next = prev.map((p, i) => (i === idx ? {...p, name: value} : p));
      persistWheelPeople(next);
      return next;
    });
  };

  const addWheelPerson = () => {
    setPeople((prev) => {
      const next = [...prev, {name: "", jiraId: ""}];
      persistWheelPeople(next);
      return next;
    });
  };

  const removeWheelPerson = (idx) => {
    setPeople((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      persistWheelPeople(next);
      return next.length ? next : [{name: "", jiraId: ""}];
    });
  };

  const winnerAnimatingRef = useRef(false);
  const winnerPulseRef = useRef(0);
  const TAU = 2 * Math.PI;
  const POINTER = Math.PI / 2;

  useEffect(() => {
    let active = true;
    readSyncStorage([
      "wheelPeople",
      "wheelAudioMuted",
      "wheelAudioVolume",
      "wheelConfettiEnabled",
    ]).then((data) => {
      if (!active) return;
      const storedPeople = Array.isArray(data.wheelPeople)
        ? data.wheelPeople
        : DEFAULT_PEOPLE;
      setPeople(storedPeople);
      drawWheel(storedPeople.map((p) => p.name));
      const volumeUnit = ensureUnitVolume(
        data.wheelAudioVolume,
        DEFAULT_WHEEL_VOLUME_UNIT
      );
      const volumePercent = unitToPercent(volumeUnit);
      const soundsEnabledValue =
        data.wheelAudioMuted === undefined
          ? DEFAULT_WHEEL_SOUNDS_ENABLED
          : !Boolean(data.wheelAudioMuted);
      setWheelSoundsEnabled(soundsEnabledValue);
      setWheelAudioVolume(volumePercent);
      const confettiEnabledValue =
        data.wheelConfettiEnabled === undefined
          ? DEFAULT_WHEEL_CONFETTI_ENABLED
          : Boolean(data.wheelConfettiEnabled);
      setWheelConfettiEnabled(confettiEnabledValue);
      if (wheelAudioRef.current) {
        wheelAudioRef.current.volume = soundsEnabledValue ? volumeUnit : 0;
      }
      const defaultsPayload = {};
      if (!Array.isArray(data.wheelPeople)) {
        defaultsPayload.wheelPeople = sanitizePeopleList(storedPeople);
      }
      if (data.wheelAudioVolume === undefined) {
        defaultsPayload.wheelAudioVolume = DEFAULT_WHEEL_VOLUME_UNIT;
      }
      if (data.wheelAudioMuted === undefined) {
        defaultsPayload.wheelAudioMuted = !DEFAULT_WHEEL_SOUNDS_ENABLED;
      }
      if (data.wheelConfettiEnabled === undefined) {
        defaultsPayload.wheelConfettiEnabled = DEFAULT_WHEEL_CONFETTI_ENABLED;
      }
      if (Object.keys(defaultsPayload).length > 0) {
        writeSyncStorage(defaultsPayload);
      }
    });
    if (typeof document !== "undefined") {
      const confettiCanvas = document.getElementById("confetti-canvas");
      if (confettiCanvas) {
        confettiCanvasRef.current = confettiCanvas;
        confettiCtxRef.current = confettiCanvas.getContext("2d");
      }
    }
    return () => {
      active = false;
      confettiCtxRef.current = null;
      confettiCanvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (wheelAudioRef.current) {
      wheelAudioRef.current.volume = wheelSoundsEnabled
        ? percentToUnit(wheelAudioVolume)
        : 0;
    }
  }, [wheelSoundsEnabled, wheelAudioVolume]);

  const {names, nameIndices} = useMemo(() => {
    const filledNames = [];
    const indices = [];
    people.forEach((person, index) => {
      if (person.name) {
        filledNames.push(person.name);
        indices.push(index);
      }
    });
    return {names: filledNames, nameIndices: indices};
  }, [people]);

  useEffect(() => {
    if (wheelSection !== "general") return;
    drawWheel(names);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names, selectedIndex, wheelSection]);

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

      if (isSelected && winnerAnimatingRef.current) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 215, 0, 0.9)";
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
    if (!names.length) {
      setSpinning(false);
      spinningRef.current = false;
      return;
    }
    angleRef.current += velRef.current;
    const now = Date.now();
    if (now >= spinEndRef.current) {
      setSpinning(false);
      spinningRef.current = false;
      const normalizedAngle = ((angleRef.current % TAU) + TAU) % TAU;
      const step = TAU / names.length;
      const pointerAngle = (TAU - normalizedAngle + POINTER) % TAU;
      const index = Math.floor(pointerAngle / step) % names.length;
      const selectedPerson = names[index];
      setWinner(`Il vincitore è ${selectedPerson}!`);
      setSelectedIndex(index);
      const selectedPeopleIndex = nameIndices[index] ?? -1;
      const centerOfIndex = index * step + step / 2;
      const targetNormalized = (POINTER - centerOfIndex + TAU) % TAU;
      const delta =
        ((targetNormalized - normalizedAngle + Math.PI) % TAU) - Math.PI;
      angleRef.current += delta;
      if (wheelConfettiEnabled) {
        startConfetti();
      }
      try {
        if (wheelSoundsEnabled && wheelAudioRef.current) {
          wheelAudioRef.current.currentTime = 0;
          wheelAudioRef.current.volume = percentToUnit(wheelAudioVolume);
          wheelAudioRef.current.play?.();
        }
      } catch {}
      setLastWinner(selectedPerson);
      lastWinnerRef.current = selectedPerson;
      startWinnerAnimation(selectedPerson, selectedPeopleIndex);
      return;
    } else {
      const rem = Math.max(0, spinEndRef.current - now);
      const frac = spinDurRef.current > 0 ? rem / spinDurRef.current : 0;
      velRef.current = 0.35 * Math.max(0.05, frac * frac);
      requestAnimationFrame(animate);
    }
    drawWheel(names);
  }

  function startWinnerAnimation(selectedPerson, selectedPeopleIndex) {
    winnerAnimatingRef.current = true;
    const start = Date.now();
    const duration = 1800;

    const stepAnim = () => {
      const t = (Date.now() - start) / duration;
      if (t >= 1) {
        winnerPulseRef.current = 0;
        winnerAnimatingRef.current = false;
        const removalIndex =
          typeof selectedPeopleIndex === "number" && selectedPeopleIndex >= 0
            ? selectedPeopleIndex
            : people.findIndex((p) => p.name === selectedPerson);
        const updatedPeople =
          removalIndex >= 0
            ? people.filter((_, i) => i !== removalIndex)
            : people.filter((p) => p.name !== selectedPerson);
        const updatedNames = updatedPeople
          .map((p) => p.name)
          .filter((name) => name);
        setPeople(updatedPeople);
        persistWheelPeople(updatedPeople);
        setSelectedIndex(-1);
        drawWheel(updatedNames);
        return;
      }
      const amp = Math.abs(Math.sin(t * 6 * Math.PI)) * (1 - t);
      winnerPulseRef.current = amp;
      drawWheel(names);
      requestAnimationFrame(stepAnim);
    };
    requestAnimationFrame(stepAnim);
  }

  function onSpin() {
    if (winnerAnimatingRef.current) return;
    if (names.length < 2) {
      alert("Inserisci almeno due nomi per usare la ruota.");
      return;
    }
    setLastWinner(null);
    lastWinnerRef.current = null;
    setSpinning(true);
    spinningRef.current = true;
    setWinner("");
    setSelectedIndex(-1);
    const confettiCanvas = confettiCanvasRef.current;
    const confettiCtx = confettiCtxRef.current;
    if (confettiCanvas && confettiCtx) {
      confettiParticlesRef.current = [];
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
    const dur = 3000 + Math.random() * 2000;
    spinDurRef.current = dur;
    spinEndRef.current = Date.now() + dur;
    velRef.current = 0.35;
    requestAnimationFrame(animate);
  }

  function onReset() {
    setPeople(DEFAULT_PEOPLE);
    persistWheelPeople(DEFAULT_PEOPLE);
    drawWheel(DEFAULT_PEOPLE.map((p) => p.name));
    angleRef.current = 0;
    velRef.current = 0;
    setSpinning(false);
    spinningRef.current = false;
    setLastWinner(null);
    lastWinnerRef.current = null;
  }

  function onShuffle() {
    const shuffled = [...people];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setPeople(shuffled);
    persistWheelPeople(shuffled);
  }

  function startConfetti() {
    if (!wheelConfettiEnabled) return;
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = confettiCtxRef.current || canvas.getContext("2d");
    if (!ctx) return;
    confettiCtxRef.current = ctx;
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
    <>
      <div id="section-wheel" className={CARD_BASE_CLASS}>
        <div className={CARD_HEADER_CLASS}>
          <h2 className="text-2xl font-bold text-gray-800">
            Configurazione GipoWheel of Names
          </h2>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              className={wheelNavClass("general")}
              onClick={() => setWheelSection("general")}
            >
              Ruota
            </button>
            <button
              type="button"
              className={wheelNavClass("team")}
              onClick={() => setWheelSection("team")}
            >
              Team
            </button>
            <button
              type="button"
              className={wheelNavClass("settings")}
              onClick={() => setWheelSection("settings")}
            >
              Impostazioni
            </button>
          </div>
        </div>
        <div className={CARD_BODY_CLASS}>
          {wheelSection === "general" && (
            <div className="flex flex-col gap-4">
              <SettingsSection title="Ruota">
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
                  <div
                    id="winner"
                    className="text-center text-xl font-bold text-blue-700 mt-2"
                  >
                    {winner}
                  </div>
                </div>
              </SettingsSection>

              <SettingsSection
                title="Azioni rapide"
                description="Avvia la ruota, mischia l'ordine o ripristina l'elenco originale."
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    id="spin"
                    onClick={onSpin}
                    disabled={spinning}
                    className={`text-white font-semibold py-2 px-4 rounded ${
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
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded"
                  >
                    Mischia
                  </button>
                  <button
                    id="wheel-reset"
                    onClick={onReset}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
                  >
                    Ripristina
                  </button>
                </div>
                <div
                  id="wheel-status"
                  className="text-sm text-green-600 h-5"
                ></div>
              </SettingsSection>
            </div>
          )}

          {wheelSection === "team" && (
            <div className="flex flex-col gap-4">
              <SettingsSection
                title="Team"
                description="Modifica i nomi della ruota. Ogni riga rappresenta una slice."
              >
                <div className="flex flex-col gap-2">
                  {people.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder={`Partecipante ${i + 1}`}
                        value={p.name}
                        onChange={(e) => updateWheelPerson(i, e.target.value)}
                        className="flex-1 border border-gray-300 rounded p-2 focus:outline-none focus:ring focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeWheelPerson(i)}
                        className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                      >
                        Rimuovi
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addWheelPerson}
                    className="self-start bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded"
                  >
                    Aggiungi
                  </button>
                </div>
              </SettingsSection>

              <SettingsSection
                title="Strumenti elenco"
                description="Mischia l'ordine o ripristina l'elenco di default."
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={onShuffle}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded"
                  >
                    Mischia elenco
                  </button>
                  <button
                    onClick={onReset}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded"
                  >
                    Ripristina elenco iniziale
                  </button>
                </div>
              </SettingsSection>
            </div>
          )}

          {wheelSection === "settings" && (
            <div className="flex flex-col gap-4">
              <SettingsSection
                title="Effetti grafici"
                description="Mostra i confetti alla proclamazione del vincitore."
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="wheel-confetti-enabled"
                    checked={wheelConfettiEnabled}
                    onChange={(e) => handleConfettiToggle(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="wheel-confetti-enabled"
                    className="text-sm font-medium text-gray-700"
                  >
                    Confetti abilitati
                  </label>
                </div>
              </SettingsSection>

              <SettingsSection
                title="Suoni della ruota"
                description="Gestisci il suono riprodotto quando viene annunciato un vincitore."
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="wheel-sounds-enabled"
                    checked={wheelSoundsEnabled}
                    onChange={(e) => handleWheelToggle(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="wheel-sounds-enabled"
                    className="text-sm font-medium text-gray-700"
                  >
                    Suono proclamazione vincitore abilitato
                  </label>
                </div>
                <div>
                  <label
                    htmlFor="wheel-audio-volume"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Volume suono: {wheelAudioVolume}%
                  </label>
                  <input
                    type="range"
                    id="wheel-audio-volume"
                    min={0}
                    max={100}
                    step={1}
                    value={wheelAudioVolume}
                    onChange={(e) =>
                      handleWheelVolumeChange(parseInt(e.target.value, 10))
                    }
                    className="w-full"
                  />
                </div>
              </SettingsSection>
            </div>
          )}
        </div>
      </div>
      <Toast message={wheelToast} />
      <audio
        ref={wheelAudioRef}
        src={chrome.runtime.getURL("assets/sounds/lose.mp3")}
        preload="auto"
      />
    </>
  );
}
