chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "open-options") {
    chrome.runtime.openOptionsPage();
  }
});
