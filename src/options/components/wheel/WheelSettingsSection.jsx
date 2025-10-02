import {SettingsSection} from "../SettingsSection";

export function WheelSettingsSection({
  wheelConfettiEnabled,
  handleConfettiToggle,
  wheelSoundsEnabled,
  handleWheelToggle,
  wheelAudioVolume,
  handleWheelVolumeChange,
}) {
  return (
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
            onChange={(event) => handleConfettiToggle(event.target.checked)}
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
            onChange={(event) => handleWheelToggle(event.target.checked)}
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
            onChange={(event) =>
              handleWheelVolumeChange(parseInt(event.target.value, 10))
            }
            className="w-full"
          />
        </div>
      </SettingsSection>
    </div>
  );
}
