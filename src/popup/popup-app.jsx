function openOptions(hash) {
  const url = chrome.runtime.getURL(
    `options/index.html${hash ? "#" + hash : ""}`
  );
  chrome.tabs.create({url});
}

function showWidget() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab?.id) return;
    const tabId = tab.id;

    // Guard: content scripts cannot be injected on special pages
    const url = tab.url || "";
    const isAllowed = /^(https?:|file:)/.test(url);
    if (!isAllowed) {
      alert(
        "Impossibile mostrare il widget su questa pagina. Apri una pagina web (http/https) e riprova."
      );
      return;
    }

    chrome.tabs.sendMessage(tabId, {action: "show-widget"}, () => {
      if (chrome.runtime.lastError) {
        // Fallback: inject content script then retry
        chrome.scripting.executeScript(
          {target: {tabId}, files: ["content.js"]},
          (results) => {
            if (chrome.runtime.lastError) {
              alert(
                "Non riesco a iniettare il widget in questa scheda. Verifica i permessi e riprova."
              );
              return;
            }
            // Retry after successful injection
            chrome.tabs.sendMessage(tabId, {action: "show-widget"});
          }
        );
      }
    });
  });
}

export function App() {
  return (
    <>
      <header className="mb-4 flex items-center gap-3">
        <img src="../assets/images/icon.png" alt="Icona" className="w-6 h-6" />
        <h1 className="text-base font-semibold text-gray-800">Gipo Utils</h1>
      </header>
      <div className="space-y-2">
        <button
          onClick={() => openOptions("timer")}
          className="w-full px-3 py-2 text-sm font-medium text-gray-800 bg-gray-200 rounded hover:bg-gray-300 transition"
        >
          Configura GipoTimer
        </button>
        <button
          onClick={() => openOptions("wheel")}
          className="w-full px-3 py-2 text-sm font-medium text-gray-800 bg-gray-200 rounded hover:bg-gray-300 transition"
        >
          Configura GipoWheel
        </button>
        <button
          onClick={showWidget}
          className="w-full px-3 py-2 text-sm font-medium text-gray-800 bg-gray-200 rounded hover:bg-gray-300 transition"
        >
          Mostra Widget
        </button>
      </div>
    </>
  );
}
