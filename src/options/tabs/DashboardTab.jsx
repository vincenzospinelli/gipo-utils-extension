import {useEffect, useMemo, useState} from "react";

import {Toast} from "../components/Toast";
import {
  CARD_BASE_CLASS,
  CARD_BODY_CLASS,
  CARD_HEADER_CLASS,
} from "../constants/layout";
import {useAutoToast} from "../hooks/useAutoToast";
import {MAX_SESSION_HISTORY} from "../../shared/constants";
import {readSyncStorage, writeSyncStorage} from "../../shared/storage";
import {formatDuration} from "../../shared/time";
import {summarizeHistory} from "../../shared/timer";

export function DashboardTab() {
  const [sessionHistory, setSessionHistory] = useState([]);
  const {toastMessage: dashboardToast, showToast: showDashboardToast} =
    useAutoToast();

  useEffect(() => {
    let active = true;
    readSyncStorage(["sessionHistory"]).then((data) => {
      if (!active) return;
      const storedHistory = Array.isArray(data.sessionHistory)
        ? data.sessionHistory.slice(0, MAX_SESSION_HISTORY)
        : [];
      setSessionHistory(storedHistory);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const listener = (changes, areaName) => {
      if (areaName !== "sync") return;
      if (changes.sessionHistory) {
        const history = Array.isArray(changes.sessionHistory.newValue)
          ? changes.sessionHistory.newValue.slice(0, MAX_SESSION_HISTORY)
          : [];
        setSessionHistory(history);
      }
    };
    try {
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    } catch {
      return () => {};
    }
  }, []);

  const clearHistory = () => {
    setSessionHistory([]);
    writeSyncStorage({sessionHistory: []});
    showDashboardToast("Cronologia azzerata");
  };

  const totalSessions = sessionHistory.length;
  const totalDurationMs = useMemo(
    () =>
      sessionHistory.reduce(
        (acc, entry) => acc + Math.max(0, entry?.durationMs || 0),
        0
      ),
    [sessionHistory]
  );

  const topTalkers = useMemo(() => {
    const summary = summarizeHistory(sessionHistory);
    return summary
      .slice()
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 10);
  }, [sessionHistory]);

  const latestSessions = useMemo(
    () => sessionHistory.slice(0, 15),
    [sessionHistory]
  );

  return (
    <>
      <div className={CARD_BASE_CLASS}>
        <div className={CARD_HEADER_CLASS}>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-2">
            Panoramica delle sessioni accumulate dal widget.
          </p>
        </div>
        <div className={`${CARD_BODY_CLASS} space-y-6`}>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-xs uppercase text-gray-500">
                Sessioni registrate
              </h3>
              <div className="text-3xl font-semibold text-gray-800">
                {totalSessions}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-xs uppercase text-gray-500">Tempo totale</h3>
              <div className="text-3xl font-semibold text-gray-800">
                {formatDuration(totalDurationMs)}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col gap-2">
              <h3 className="text-xs uppercase text-gray-500">Azioni</h3>
              <button
                type="button"
                onClick={clearHistory}
                disabled={!sessionHistory.length}
                className="self-start px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-400"
              >
                Svuota cronologia
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Top 10 speaker
              </h3>
              {topTalkers.length ? (
                <ul className="space-y-2">
                  {topTalkers.map((item) => (
                    <li
                      key={item.personName}
                      className="flex justify-between text-sm text-gray-700"
                    >
                      <span className="font-medium">{item.personName}</span>
                      <span className="font-mono">
                        {formatDuration(item.durationMs)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  Nessun dato disponibile: avvia qualche sessione dal widget.
                </p>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Ultime sessioni
              </h3>
              {latestSessions.length ? (
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-200">
                  {latestSessions.map((entry, idx) => {
                    const startedLabel = entry.startedAt
                      ? new Date(entry.startedAt).toLocaleString()
                      : "";
                    return (
                      <div
                        key={`${entry.personName}-${entry.startedAt}-${idx}`}
                        className="py-3 text-sm text-gray-700 flex flex-col gap-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {entry.personName}
                          </span>
                          <span className="font-mono">
                            {formatDuration(entry.durationMs)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>{startedLabel}</span>
                          <span
                            className={
                              entry.completed
                                ? "text-green-600"
                                : "text-orange-500"
                            }
                          >
                            {entry.completed ? "Completo" : "Interrotto"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Nessuna sessione recente registrata.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Toast message={dashboardToast} />
    </>
  );
}
