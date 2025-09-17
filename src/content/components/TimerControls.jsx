import {
  Pause as PauseIcon,
  Play as PlayIcon,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";

export function TimerControls({onPrev, onStart, onPause, onReset, onNext}) {
  return (
    <div className="flex gap-2 flex-wrap justify-center items-center">
      <button className="gipo-button" onClick={onPrev} aria-label="Precedente">
        <SkipBack size={16} />
      </button>
      <button className="gipo-button" onClick={onStart} aria-label="Play">
        <PlayIcon size={16} />
      </button>
      <button className="gipo-button" onClick={onPause} aria-label="Pausa">
        <PauseIcon size={16} />
      </button>
      <button className="gipo-button" onClick={onReset} aria-label="Reset">
        <Square size={16} />
      </button>
      <button
        className="gipo-button"
        onClick={onNext}
        aria-label="Successivo"
      >
        <SkipForward size={16} />
      </button>
    </div>
  );
}
