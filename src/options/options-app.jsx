import {useEffect, useState} from "react";

import {ChangelogTab} from "./tabs/ChangelogTab";
import {DashboardTab} from "./tabs/DashboardTab";
import {TimerTab} from "./tabs/TimerTab";
import {WheelTab} from "./tabs/WheelTab";

export function OptionsApp() {
  const [active, setActive] = useState("timer");

  useEffect(() => {
    const setFromHash = () => {
      const hash = window.location.hash.replace("#", "") || "timer";
      setActive(hash);
    };
    setFromHash();
    window.addEventListener("hashchange", setFromHash);
    return () => window.removeEventListener("hashchange", setFromHash);
  }, []);

  const go = (tab) => {
    window.location.hash = tab;
  };

  const navButtonClass = (tab) =>
    `hover:text-blue-600 transition-colors ${
      active === tab ? "text-blue-600 font-semibold" : "text-gray-600"
    }`;

  return (
    <>
      <header className="absolute top-0 left-0 w-full bg-white shadow-md py-4 px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="../assets/images/icon.png" alt="Logo" className="w-8 h-8" />
          <span className="text-xl font-semibold text-gray-700">
            Configurazioni
          </span>
        </div>
        <nav className="flex gap-4 font-medium">
          <button
            onClick={() => go("dashboard")}
            className={navButtonClass("dashboard")}
          >
            Dashboard
          </button>
          <button
            onClick={() => go("timer")}
            className={navButtonClass("timer")}
          >
            GipoTimer
          </button>
          <button
            onClick={() => go("wheel")}
            className={navButtonClass("wheel")}
          >
            GipoWheel
          </button>
          <button
            onClick={() => go("changelog")}
            className={navButtonClass("changelog")}
          >
            Changelog
          </button>
        </nav>
      </header>
      <div className="flex flex-wrap gap-8 justify-center mt-8 w-full px-4">
        {active === "timer" && <TimerTab />}
        {active === "dashboard" && <DashboardTab />}
        {active === "wheel" && <WheelTab />}
        {active === "changelog" && <ChangelogTab />}
      </div>
      <canvas
        id="confetti-canvas"
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-50"
      />
    </>
  );
}
