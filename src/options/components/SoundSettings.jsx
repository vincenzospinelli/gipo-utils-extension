export function SoundSettings({
  checkboxId,
  sliderId,
  enabled,
  volume,
  onToggle,
  onVolumeChange,
  enabledLabel,
  volumeLabel,
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={checkboxId}
          checked={enabled}
          onChange={(event) => onToggle(event.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor={checkboxId}
          className="text-sm font-medium text-gray-700"
        >
          {enabledLabel}
        </label>
      </div>
      <label
        htmlFor={sliderId}
        className="block text-sm font-medium text-gray-700"
      >
        {volumeLabel}: {volume}%
      </label>
      <input
        type="range"
        id={sliderId}
        min={0}
        max={100}
        step={1}
        value={volume}
        onChange={(event) => onVolumeChange(parseInt(event.target.value, 10))}
        className="w-full"
      />
    </div>
  );
}
