import {useMemo, useRef, useState} from "react";

import {TimerAnalogClock} from "../../content/components/TimerAnalogClock";
import {TimerControls} from "../../content/components/TimerControls";
import {
  DEFAULT_DURATION,
  DEFAULT_TIMER_PRESETS,
} from "../../shared/constants";
import {formatDuration} from "../../shared/time";

const noop = () => {};

export function TimerPreview({people, duration, presets, presetsEnabled = true}) {
  const secondHandRef = useRef(null);
  const [previewTheme, setPreviewTheme] = useState("light");

  const {currentPerson, currentDisplay, previewPresets} = useMemo(() => {
    const validPeople = Array.isArray(people)
      ? people.filter((person) => person?.name)
      : [];
    const displayDuration = Number.parseInt(duration, 10);
    const safeDuration =
      Number.isFinite(displayDuration) && displayDuration > 0
        ? displayDuration
        : DEFAULT_DURATION;
    const sanitizedPresets = (Array.isArray(presets) ? presets : [])
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value) && value > 0);
    const presetList = sanitizedPresets.length
      ? sanitizedPresets
      : DEFAULT_TIMER_PRESETS;

    return {
      currentPerson: validPeople[0]?.name || "Nessuno selezionato",
      currentDisplay: formatDuration(safeDuration * 1000),
      previewPresets: presetList,
    };
  }, [duration, people, presets]);

  const formatPresetLabel = (seconds) => {
    if (!Number.isFinite(seconds)) return "?";
    if (seconds % 60 === 0) {
      return `${seconds / 60} min`;
    }
    return formatDuration(seconds * 1000);
  };

  const isDark = previewTheme === "dark";
  const containerClasses = [
    "flex flex-col items-center gap-4 rounded-xl border p-6 transition-colors",
    isDark
      ? "dark border-gray-700 bg-gray-900 text-gray-100"
      : "border-gray-200 bg-gray-50 text-gray-700",
  ].join(" ");

  const toggleButtonClass = (theme) =>
    `px-3 py-1 text-sm rounded border transition-colors ${
      previewTheme === theme
        ? "bg-blue-600 text-white border-blue-600"
        : "border-gray-300 text-gray-600 hover:bg-gray-100"
    }`;

  const disabledMessageClasses = isDark
    ? "rounded border border-dashed border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300"
    : "rounded border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500";

  const helperTextClass = isDark
    ? "text-xs text-gray-400 text-center"
    : "text-xs text-gray-500 text-center";

  return (
    <div className={containerClasses}>
      <div className="self-end -mt-2 -mr-2 flex gap-2">
        <button
          type="button"
          onClick={() => setPreviewTheme("light")}
          className={toggleButtonClass("light")}
        >
          Light
        </button>
        <button
          type="button"
          onClick={() => setPreviewTheme("dark")}
          className={toggleButtonClass("dark")}
        >
          Dark
        </button>
      </div>
      <TimerAnalogClock secondHandRef={secondHandRef} />
      <div className="text-xl font-semibold text-center">{currentPerson}</div>
      <div className="text-2xl font-mono">{currentDisplay}</div>
      {presetsEnabled ? (
        <div className="flex flex-wrap justify-center gap-2">
          {previewPresets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="gipo-button cursor-default opacity-80"
              aria-disabled
            >
              {formatPresetLabel(preset)}
            </button>
          ))}
        </div>
      ) : (
        <div className={disabledMessageClasses}>Preset disabilitati</div>
      )}
      <div className="pointer-events-none">
        <TimerControls
          onPrev={noop}
          onStart={noop}
          onPause={noop}
          onReset={noop}
          onNext={noop}
        />
      </div>
      <p className={helperTextClass}>
        Anteprima statica: i controlli sono disattivati in questa vista.
      </p>
    </div>
  );
}
