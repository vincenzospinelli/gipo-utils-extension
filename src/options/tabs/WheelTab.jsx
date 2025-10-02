import {useState} from "react";

import {WheelGeneralSection} from "../components/wheel/WheelGeneralSection";
import {WheelSettingsSection} from "../components/wheel/WheelSettingsSection";
import {WheelTeamSection} from "../components/wheel/WheelTeamSection";
import {Toast} from "../components/Toast";
import {
  CARD_BASE_CLASS,
  CARD_BODY_CLASS,
  CARD_HEADER_CLASS,
} from "../constants/layout";
import {useWheelSettings} from "../hooks/useWheelSettings";

export function WheelTab() {
  const {
    wheelToast,
    people,
    winner,
    lastWinner,
    spinning,
    canvasRef,
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
    removeWinnerFromRoster,
  } = useWheelSettings();

  const [wheelSection, setWheelSection] = useState("general");

  const wheelNavClass = (section) =>
    `px-3 py-2 rounded transition-colors ${
      wheelSection === section
        ? "bg-blue-100 text-blue-700 font-semibold"
        : "text-gray-600 hover:text-blue-600"
    }`;

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
            <WheelGeneralSection
              canvasRef={canvasRef}
              winner={winner}
              lastWinner={lastWinner}
              spinning={spinning}
              onSpin={onSpin}
              onShuffle={onShuffle}
              onReset={onReset}
              drawWheel={drawWheel}
              removeWinnerFromRoster={removeWinnerFromRoster}
            />
          )}

          {wheelSection === "team" && (
            <WheelTeamSection
              people={people}
              updateWheelPerson={updateWheelPerson}
              removeWheelPerson={removeWheelPerson}
              addWheelPerson={addWheelPerson}
              onShuffle={onShuffle}
              onReset={onReset}
            />
          )}

          {wheelSection === "settings" && (
            <WheelSettingsSection
              wheelConfettiEnabled={wheelConfettiEnabled}
              handleConfettiToggle={handleConfettiToggle}
              wheelSoundsEnabled={wheelSoundsEnabled}
              handleWheelToggle={handleWheelToggle}
              wheelAudioVolume={wheelAudioVolume}
              handleWheelVolumeChange={handleWheelVolumeChange}
            />
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
