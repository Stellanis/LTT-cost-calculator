// Add caching for API key validation
let lastValidationTime = 0;
const VALIDATION_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function validateAPIKey(apiKey) {
    try {
        const now = Date.now();
        if (now - lastValidationTime < VALIDATION_CACHE_DURATION) {
            console.log('Using cached API key validation');
            return true;
        }

        const testUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
        const response = await fetch(testUrl);
        const data = await response.json();
        
        if (data.result === 'success') {
            lastValidationTime = now;
            chrome.storage.local.set({ lastValidationTime: now });
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

// Load cached validation time
chrome.storage.local.get(['lastValidationTime'], function(data) {
    if (data.lastValidationTime) {
        lastValidationTime = data.lastValidationTime;
    }
});

// Add real-time API key validation
const apiKeyInput = document.getElementById('api-key');
const statusElement = document.getElementById('api-status');
const statusIcon = statusElement.querySelector('.status-icon');
const statusText = statusElement.querySelector('.status-text');

let validationTimeout = null;

apiKeyInput.addEventListener('input', () => {
    clearTimeout(validationTimeout);
    const apiKey = apiKeyInput.value.trim();
    
    if (apiKey.length === 0) {
        statusElement.className = 'api-status';
        statusText.textContent = '';
        return;
    }
    
    if (apiKey.length !== 24) {
        statusElement.className = 'api-status invalid';
        statusText.textContent = 'API key must be 24 characters';
        return;
    }
    
    // Show loading state
    statusElement.className = 'api-status loading';
    statusText.textContent = 'Validating API key...';
    
    validationTimeout = setTimeout(async () => {
        try {
            const isValid = await validateAPIKey(apiKey);
            if (isValid) {
                statusElement.className = 'api-status valid';
                statusText.textContent = 'API key is valid';
            } else {
                statusElement.className = 'api-status invalid';
                statusText.textContent = 'Invalid API key';
            }
        } catch (error) {
            statusElement.className = 'api-status invalid';
            statusText.textContent = 'Validation failed';
        }
    }, 1000); // Wait 1 second after typing stops
});

// Update save settings to use the same validation
document.getElementById('save-settings').addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (statusElement.classList.contains('invalid')) {
        statusElement.className = 'api-status invalid';
        statusText.textContent = 'Please fix API key before saving';
        return;
    }
    
    if (statusElement.classList.contains('loading')) {
        statusElement.className = 'api-status invalid';
        statusText.textContent = 'Please wait for validation to complete';
        return;
    }
    
    const targetCurrency = document.getElementById('currency-select').value;
    const vatRate = parseFloat(document.getElementById('vat-rate').value) / 100;
    
    // Validate API key
    statusElement.textContent = 'Validating API key...';
    statusElement.style.color = '#666';
    
    const isValid = await validateAPIKey(apiKey);
    
    if (!isValid) {
        statusElement.textContent = '❌ Invalid API key';
        statusElement.style.color = '#ff4444';
        return;
    }
    
    // Save settings if valid
    chrome.storage.sync.set({ 
        targetCurrency, 
        vatRate,
        apiKey
    }, () => {
        statusElement.textContent = '✔️ API key valid - Settings saved!';
        statusElement.style.color = '#4CAF50';
        
        // Update current tab
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateSettings',
                targetCurrency,
                vatRate
            });
        });
        
        // Close popup after 1 second
        setTimeout(() => window.close(), 1000);
    });
});

// Load saved settings with API status
chrome.storage.sync.get(['targetCurrency', 'vatRate', 'apiKey'], async function(data) {
    document.getElementById('currency-select').value = data.targetCurrency || 'EUR';
    document.getElementById('vat-rate').value = (data.vatRate || 0.20) * 100;
    
    if (data.apiKey) {
        const statusElement = document.getElementById('api-status');
        statusElement.textContent = 'Checking API key...';
        statusElement.style.color = '#666';
        
        const isValid = await validateAPIKey(data.apiKey);
        if (isValid) {
            statusElement.textContent = '✔️ API key is valid';
            statusElement.style.color = '#4CAF50';
        } else {
            statusElement.textContent = '❌ API key is invalid';
            statusElement.style.color = '#ff4444';
        }
    }
});