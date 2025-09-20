// utils/storage.js

export const Storage = {
  async set(key, value) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(true);
      });
    });
  },
  async get(key, defaultValue = undefined) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(result[key] ?? defaultValue);
      });
    });
  }
};
