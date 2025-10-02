import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {
  ensureUnitVolume,
  percentToUnit,
  unitToPercent,
} from "../../shared/audio";
import {
  DEFAULT_PEOPLE_WHEEL,
  DEFAULT_WHEEL_CONFETTI_ENABLED,
  DEFAULT_WHEEL_SOUNDS_ENABLED,
  DEFAULT_WHEEL_VOLUME_PERCENT,
  DEFAULT_WHEEL_VOLUME_UNIT,
} from "../../shared/constants";
import {sanitizePeopleWheelList} from "../../shared/people";
import {readSyncStorage, writeSyncStorage} from "../../shared/storage";
import {useAutoToast} from "./useAutoToast";

export function useWheelSettings() {
  const [people, setPeople] = useState(DEFAULT_PEOPLE_WHEEL);
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
  const alignmentAnimationRef = useRef(null);

  const cancelAlignment = useCallback(() => {
    if (alignmentAnimationRef.current) {
      cancelAnimationFrame(alignmentAnimationRef.current);
      alignmentAnimationRef.current = null;
    }
  }, []);

  const wheelAudioRef = useRef(null);
  const winnerAnimatingRef = useRef(false);
  const winnerPulseRef = useRef(0);
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
  const TAU = 2 * Math.PI;
  const POINTER = Math.PI / 2;

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

  const drawWheel = useCallback(
    (namesList = names) => {
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

      namesList.forEach((name, index) => {
        ctx.beginPath();
        const isSelected = index === selectedIndex;
        const r = isSelected
          ? radius + 12 * Math.max(0, Math.min(1, winnerPulseRef.current))
          : radius;
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, index * step, (index + 1) * step);
        ctx.fillStyle = isSelected
          ? `hsl(${(index * 360) / namesList.length}, 90%, 50%)`
          : `hsl(${(index * 360) / namesList.length}, 70%, 70%)`;
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.rotate(index * step + step / 2);
        ctx.translate(r * 0.8, 0);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = "#000";
        ctx.font = "bold 14px sans-serif";
        const letters = name.toUpperCase().split("");
        letters.forEach((char, letterIndex) => {
          ctx.fillText(
            char,
            -ctx.measureText(char).width / 2,
            letterIndex * 16
          );
        });
        ctx.restore();

        if (isSelected && winnerAnimatingRef.current) {
          ctx.save();
          ctx.strokeStyle = "rgba(255, 215, 0, 0.9)";
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(0, 0, r, index * step, (index + 1) * step);
          ctx.stroke();
          ctx.restore();
        }
      });

      ctx.restore();
    },
    [names, selectedIndex]
  );

  const persistWheelPeople = useCallback(
    (list) => {
      writeSyncStorage({wheelPeople: sanitizePeopleWheelList(list)});
      showWheelToast();
    },
    [showWheelToast]
  );

  const updateWheelPerson = useCallback(
    (idx, value) => {
      setPeople((prev) => {
        const next = prev.map((person, index) =>
          index === idx ? {...person, name: value} : person
        );
        persistWheelPeople(next);
        return next;
      });
    },
    [persistWheelPeople]
  );

  const addWheelPerson = useCallback(() => {
    cancelAlignment();
    setPeople((prev) => {
      const next = [...prev, {name: "", jiraId: ""}];
      persistWheelPeople(next);
      return next;
    });
  }, [cancelAlignment, persistWheelPeople]);

  const removeWheelPerson = useCallback(
    (idx) => {
      cancelAlignment();
      setPeople((prev) => {
        const next = prev.filter((_, index) => index !== idx);
        persistWheelPeople(next);
        return next.length ? next : [{name: "", jiraId: ""}];
      });
    },
    [cancelAlignment, persistWheelPeople]
  );

  const smoothAlignToAngle = useCallback(
    (targetAngle, namesList, onComplete) => {
      cancelAlignment();
      const startAngle = angleRef.current;
      const deltaAngle = targetAngle - startAngle;
      const duration = 650;
      const startTime =
        typeof performance !== "undefined" ? performance.now() : Date.now();

      const step = (timestamp) => {
        const now =
          typeof timestamp === "number"
            ? timestamp
            : typeof performance !== "undefined"
              ? performance.now()
              : Date.now();
        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        angleRef.current = startAngle + deltaAngle * eased;
        drawWheel(namesList);
        if (progress < 1) {
          alignmentAnimationRef.current = requestAnimationFrame(step);
        } else {
          alignmentAnimationRef.current = null;
          onComplete?.();
        }
      };

      alignmentAnimationRef.current = requestAnimationFrame(step);
    },
    [cancelAlignment, drawWheel]
  );

  const updateConfetti = useCallback(() => {
    const canvas = confettiCanvasRef.current;
    const ctx = confettiCtxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let particles = confettiParticlesRef.current;
    particles.forEach((particle) => {
      particle.y += Math.cos(particle.d) + 1 + particle.r / 2;
      particle.x += Math.sin(0);
      particle.tiltAngle += particle.tiltAngleIncrement;
      particle.tilt = Math.sin(particle.tiltAngle) * 15;

      ctx.beginPath();
      ctx.lineWidth = particle.r;
      ctx.strokeStyle = particle.color;
      ctx.moveTo(
        particle.x + particle.tilt + particle.r / 2,
        particle.y
      );
      ctx.lineTo(
        particle.x + particle.tilt,
        particle.y + particle.tilt + particle.r / 2
      );
      ctx.stroke();
    });
    particles = particles.filter((particle) => particle.y < canvas.height);
    confettiParticlesRef.current = particles;
    if (particles.length > 0) requestAnimationFrame(updateConfetti);
  }, []);

  const startConfetti = useCallback(() => {
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
  }, [updateConfetti, wheelConfettiEnabled]);

  const startWinnerAnimation = useCallback(
    (selectedPerson, selectedPeopleIndex) => {
      winnerAnimatingRef.current = true;
      const start = Date.now();
      const duration = 1800;

      const stepAnim = () => {
        const t = (Date.now() - start) / duration;
        if (t >= 1) {
          winnerPulseRef.current = 0;
          winnerAnimatingRef.current = false;
          setPeople((prev) => {
            const removalIndex =
              typeof selectedPeopleIndex === "number" &&
              selectedPeopleIndex >= 0
                ? selectedPeopleIndex
                : prev.findIndex((person) => person.name === selectedPerson);
            const updatedPeople =
              removalIndex >= 0
                ? prev.filter((_, index) => index !== removalIndex)
                : prev.filter((person) => person.name !== selectedPerson);
            persistWheelPeople(updatedPeople);
            const updatedNames = updatedPeople
              .map((person) => person.name)
              .filter((name) => name);
            setSelectedIndex(-1);
            drawWheel(updatedNames);
            return updatedPeople;
          });
          return;
        }
        const amp = Math.abs(Math.sin(t * 6 * Math.PI)) * (1 - t);
        winnerPulseRef.current = amp;
        drawWheel(names);
        requestAnimationFrame(stepAnim);
      };

      requestAnimationFrame(stepAnim);
    },
    [drawWheel, names, persistWheelPeople]
  );

  const animate = useCallback(() => {
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
      const finalAngle = angleRef.current + delta;
      const namesSnapshot = [...names];
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
      smoothAlignToAngle(finalAngle, namesSnapshot, () =>
        startWinnerAnimation(selectedPerson, selectedPeopleIndex)
      );
      return;
    }
    const remaining = Math.max(0, spinEndRef.current - now);
    const fraction = spinDurRef.current > 0 ? remaining / spinDurRef.current : 0;
    velRef.current = 0.35 * Math.max(0.05, fraction * fraction);
    requestAnimationFrame(animate);
    drawWheel(names);
  }, [
    TAU,
    POINTER,
    drawWheel,
    nameIndices,
    names,
    smoothAlignToAngle,
    startConfetti,
    startWinnerAnimation,
    wheelAudioVolume,
    wheelConfettiEnabled,
    wheelSoundsEnabled,
  ]);

  const onSpin = useCallback(() => {
    if (winnerAnimatingRef.current) return;
    cancelAlignment();
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
    const duration = 3000 + Math.random() * 2000;
    spinDurRef.current = duration;
    spinEndRef.current = Date.now() + duration;
    velRef.current = 0.35;
    requestAnimationFrame(animate);
  }, [animate, cancelAlignment, names]);

  const onReset = useCallback(() => {
    cancelAlignment();
    setPeople(DEFAULT_PEOPLE_WHEEL);
    persistWheelPeople(DEFAULT_PEOPLE_WHEEL);
    drawWheel(DEFAULT_PEOPLE_WHEEL.map((person) => person.name));
    angleRef.current = 0;
    velRef.current = 0;
    setSpinning(false);
    spinningRef.current = false;
    setLastWinner(null);
    lastWinnerRef.current = null;
  }, [cancelAlignment, drawWheel, persistWheelPeople]);

  const onShuffle = useCallback(() => {
    cancelAlignment();
    setPeople((prev) => {
      const shuffled = [...prev];
      for (let index = shuffled.length - 1; index > 0; index--) {
        const j = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[j]] = [shuffled[j], shuffled[index]];
      }
      persistWheelPeople(shuffled);
      return shuffled;
    });
  }, [cancelAlignment, persistWheelPeople]);

  const handleWheelToggle = useCallback(
    (enabled) => {
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
    },
    [showWheelToast, wheelAudioVolume]
  );

  const handleWheelVolumeChange = useCallback(
    (volume) => {
      const safeValue = Number.isNaN(volume) ? 0 : volume;
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
    },
    [showWheelToast, wheelSoundsEnabled]
  );

  const handleConfettiToggle = useCallback(
    (enabled) => {
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
    },
    [showWheelToast]
  );

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
        : DEFAULT_PEOPLE_WHEEL;
      setPeople(storedPeople);
      drawWheel(storedPeople.map((person) => person.name));
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
        defaultsPayload.wheelPeople = sanitizePeopleWheelList(storedPeople);
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

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  useEffect(() => () => cancelAlignment(), [cancelAlignment]);

  return {
    wheelToast,
    people,
    winner,
    lastWinner,
    spinning,
    canvasRef,
    confettiCanvasRef,
    wheelAudioRef,
    drawWheel,
    wheelSoundsEnabled,
    wheelAudioVolume,
    wheelConfettiEnabled,
    onSpin,
    onReset,
    onShuffle,
    handleWheelToggle,
    handleWheelVolumeChange,
    handleConfettiToggle,
    updateWheelPerson,
    addWheelPerson,
    removeWheelPerson,
  };
}
