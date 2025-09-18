import {useMemo, useRef} from "react";

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

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 text-gray-700">
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
        <div className="rounded border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500">
          Preset disabilitati
        </div>
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
      <p className="text-xs text-gray-500 text-center">
        Anteprima statica: i controlli sono disattivati in questa vista.
      </p>
    </div>
  );
}
