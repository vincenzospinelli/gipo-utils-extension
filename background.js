chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open-options") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "update") {
    chrome.tabs.create({
      url: "https://github.com/vincenzospinelli/gipo-utils-extension/blob/main/CHNAGELOG.md",
    });
  }
});
