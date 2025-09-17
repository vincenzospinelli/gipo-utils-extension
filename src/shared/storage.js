const noop = () => {};

const getSyncStorage = () => {
  if (typeof chrome === "undefined" || !chrome?.storage?.sync) return null;
  return chrome.storage.sync;
};

export const readSyncStorage = (keys = []) =>
  new Promise((resolve) => {
    const storage = getSyncStorage();
    if (!storage) {
      resolve({});
      return;
    }
    try {
      storage.get(keys, (data) => {
        resolve(data || {});
      });
    } catch (err) {
      console.warn("Errore lettura storage", err);
      resolve({});
    }
  });

export const writeSyncStorage = (payload = {}) =>
  new Promise((resolve) => {
    const storage = getSyncStorage();
    if (!storage) {
      resolve(false);
      return;
    }
    try {
      storage.set(payload, () => resolve(true));
    } catch (err) {
      console.warn("Errore scrittura storage", err);
      resolve(false);
    }
  });

export const subscribeSyncStorage = (listener) => {
  if (typeof chrome === "undefined" || !chrome?.storage?.onChanged)
    return noop;
  try {
    chrome.storage.onChanged.addListener(listener);
    return () => {
      try {
        chrome.storage.onChanged.removeListener(listener);
      } catch (err) {
        console.warn("Errore deregistrazione listener storage", err);
      }
    };
  } catch (err) {
    console.warn("Errore registrazione listener storage", err);
    return noop;
  }
};
