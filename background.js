chrome.runtime.onInstalled.addListener(() => {
    // Set default values
    chrome.storage.sync.set({
        targetCurrency: 'EUR',
        vatRate: 0.20
    });
}); 