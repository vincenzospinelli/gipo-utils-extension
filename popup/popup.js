document.getElementById("configure-timer").addEventListener("click", () => {
  const url = chrome.runtime.getURL("options/options.html#timer");
  chrome.tabs.create({url});
});

document.getElementById("configure-wheel").addEventListener("click", () => {
  const url = chrome.runtime.getURL("options/options.html#wheel");
  chrome.tabs.create({url});
});

document.getElementById("show-widget").addEventListener("click", () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action: "show-widget"});
  });
});
