import {useEffect} from "react";

import {SettingsSection} from "../SettingsSection";

export function WheelGeneralSection({
  canvasRef,
  winner,
  spinning,
  onSpin,
  onShuffle,
  onReset,
  drawWheel,
}) {
  useEffect(() => {
    if (canvasRef.current) {
      drawWheel();
    }
  }, [canvasRef, drawWheel]);

  return (
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
        <div id="wheel-status" className="text-sm text-green-600 h-5"></div>
      </SettingsSection>
    </div>
  );
}
