import {createRoot} from "react-dom/client";

import {TimerWidget} from "./components/TimerWidget";
import {makeElementDraggable} from "../shared/dom";
import {readSyncStorage, writeSyncStorage} from "../shared/storage";

const HOST_ID = "gipo-timer-widget";
const DEFAULT_OFFSET = {right: "16px", bottom: "16px"};

async function buildHostElement() {
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.position = "fixed";
  host.style.zIndex = "9999";
  host.style.outline = "none";
  host.style.border = "none";
  host.style.boxShadow = "none";

  const {widgetPosition} = await readSyncStorage(["widgetPosition"]);
  if (widgetPosition?.left && widgetPosition?.top) {
    host.style.left = widgetPosition.left;
    host.style.top = widgetPosition.top;
    host.style.right = "auto";
    host.style.bottom = "auto";
  } else {
    host.style.right = DEFAULT_OFFSET.right;
    host.style.bottom = DEFAULT_OFFSET.bottom;
  }

  document.body.appendChild(host);

  makeElementDraggable(host, {
    onDrop: ({left, top}) => {
      if (left && top) {
        writeSyncStorage({widgetPosition: {left, top}});
      }
    },
  });

  return host;
}

async function injectStyles(shadowRoot) {
  try {
    const cssUrl = chrome.runtime.getURL("assets/styles/tailwind.css");
    const res = await fetch(cssUrl);
    const cssText = await res.text();
    const styleEl = document.createElement("style");
    styleEl.textContent = cssText;
    shadowRoot.appendChild(styleEl);
  } catch (error) {
    console.warn("Impossibile caricare CSS del widget:", error);
  }
}

async function mountTimerWidget() {
  if (document.getElementById(HOST_ID)) return;

  const host = await buildHostElement();
  const shadow = host.attachShadow({mode: "open"});
  await injectStyles(shadow);

  const themeContainer = document.createElement("div");
  themeContainer.classList.add("dark");
  shadow.appendChild(themeContainer);

  const appRoot = document.createElement("div");
  themeContainer.appendChild(appRoot);

  const root = createRoot(appRoot);
  root.render(<TimerWidget containerEl={themeContainer} hostEl={host} />);
}

if (document.body) {
  mountTimerWidget();
} else {
  window.addEventListener("DOMContentLoaded", mountTimerWidget, {once: true});
}
