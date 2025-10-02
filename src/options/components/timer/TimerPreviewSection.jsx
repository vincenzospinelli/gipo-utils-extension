import {SettingsSection} from "../SettingsSection";
import {TimerPreview} from "../TimerPreview";

export function TimerPreviewSection({
  people,
  duration,
  presets,
  presetsEnabled,
}) {
  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Anteprima timer"
        description="Visualizza come appare il widget GipoTimer con le impostazioni correnti."
      >
        <TimerPreview
          people={people}
          duration={duration}
          presets={presets}
          presetsEnabled={presetsEnabled}
        />
      </SettingsSection>
    </div>
  );
}
