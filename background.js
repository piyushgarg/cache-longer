const runtime = typeof browser !== 'undefined' ? browser.runtime : chrome.runtime;

runtime.onInstalled.addListener(() => {
    console.log("Cache Longer MV3 service worker registered successfully.");
});