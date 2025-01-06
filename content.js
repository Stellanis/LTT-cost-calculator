// API configuration
const API_KEY = ''; // Will be set through storage
const API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`;

let conversionRate = 0.92; // Fallback rate

// Add caching variables
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Update rates object to include all currency codes as fallback
const rates = {
    'USD': 1,      // Base currency
    'EUR': 0.92,
    'GBP': 0.79,
    'JPY': 144.50,
    'CAD': 1.35,
    'AUD': 1.56
};

// Store all conversion rates from API
let allConversionRates = {};

// Add VAT settings
let vatRate = 0.20; // Default 20%
let vatCustomized = false;

// Add supported currencies
const supportedCurrencies = {
    'EUR': { symbol: '€', name: 'Euro' },
    'USD': { symbol: '$', name: 'US Dollar' },
    'GBP': { symbol: '£', name: 'British Pound' },
    'JPY': { symbol: '¥', name: 'Japanese Yen' },
    'CAD': { symbol: 'CA$', name: 'Canadian Dollar' },
    'AUD': { symbol: 'A$', name: 'Australian Dollar' }
};

// Default target currency
let targetCurrency = 'EUR';

// Add currency selector
function addCurrencySelector() {
    if (!isLTTStore()) return;
    
    const currencySelector = document.createElement('select');
    currencySelector.id = 'currency-selector';
    currencySelector.style.position = 'fixed';
    currencySelector.style.bottom = '60px';
    currencySelector.style.right = '20px';
    currencySelector.style.zIndex = '1000000';
    currencySelector.style.margin = '10px';
    currencySelector.style.padding = '6px 12px';
    currencySelector.style.backgroundColor = '#333';
    currencySelector.style.color = '#fff';
    currencySelector.style.border = 'none';
    currencySelector.style.borderRadius = '4px';
    currencySelector.style.cursor = 'pointer';

    // Add options
    Object.entries(supportedCurrencies).forEach(([code, info]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${info.symbol} ${info.name}`;
        if (code === targetCurrency) option.selected = true;
        currencySelector.appendChild(option);
    });

    // Add change handler
    currencySelector.addEventListener('change', (e) => {
        targetCurrency = e.target.value;
        console.log(`Target currency changed to ${targetCurrency}`);
    });

    document.body.appendChild(currencySelector);
}

// Initialize currency selector when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCurrencySelector);
} else {
    addCurrencySelector();
}

// Add VAT control button
function addVATControl() {
    if (!isLTTStore()) return;
    
    const vatButton = document.createElement('button');
    vatButton.id = 'vat-control';
    vatButton.style.position = 'fixed';
    vatButton.style.bottom = '20px';
    vatButton.style.right = '20px';
    vatButton.style.zIndex = '1000000';
    vatButton.textContent = 'VAT: 20%';
    vatButton.style.margin = '10px';
    vatButton.style.padding = '8px 16px';
    vatButton.style.backgroundColor = '#333';
    vatButton.style.color = '#fff';
    vatButton.style.border = 'none';
    vatButton.style.borderRadius = '4px';
    vatButton.style.cursor = 'pointer';
    
    vatButton.addEventListener('click', () => {
        const newVAT = prompt('Enter new VAT rate (e.g., 20 for 20%):', vatRate * 100);
        if (newVAT !== null) {
            const parsedVAT = parseFloat(newVAT);
            if (!isNaN(parsedVAT) && parsedVAT >= 0 && parsedVAT <= 100) {
                vatRate = parsedVAT / 100;
                vatCustomized = true;
                vatButton.textContent = `VAT: ${parsedVAT}%`;
                vatButton.style.backgroundColor = '#555'; // Indicate custom VAT
                console.log(`VAT rate updated to ${parsedVAT}%`);
            } else {
                alert('Please enter a valid percentage between 0 and 100');
            }
        }
    });

    document.body.appendChild(vatButton);
}

// Add function to get API key from storage
async function getAPIKey() {
    return new Promise(resolve => {
        chrome.storage.sync.get(['apiKey'], function(data) {
            resolve(data.apiKey || '');
        });
    });
}

// Update getExchangeRate to use caching
async function getExchangeRate() {
    try {
        const apiKey = await getAPIKey();
        if (!apiKey) {
            console.warn('No API key configured');
            return;
        }
        
        const now = Date.now();
        if (now - lastFetchTime < CACHE_DURATION) {
            console.log('Using cached exchange rates');
            return;
        }

        const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
        const data = await response.json();
        if (data.result === 'success') {
            allConversionRates = data.conversion_rates;
            lastFetchTime = now;
            console.log('Updated all conversion rates');
            // Save to storage
            chrome.storage.local.set({
                exchangeRates: allConversionRates,
                lastFetchTime: now
            });
        } else {
            console.warn('Failed to fetch rates, using fallback:', data['error-type']);
        }
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
    }
}

// Load cached rates on startup
chrome.storage.local.get(['exchangeRates', 'lastFetchTime'], function(data) {
    if (data.exchangeRates && data.lastFetchTime) {
        allConversionRates = data.exchangeRates;
        lastFetchTime = data.lastFetchTime;
        console.log('Loaded cached exchange rates');
    }
});

// Update rates on initial load and every hour
getExchangeRate();
setInterval(getExchangeRate, CACHE_DURATION);

// Update regex to better handle yen and other currencies
const currencyRegex = /(USD|\$|US\$|EUR|€|GBP|£|JPY|¥|CAD|CA\$|AUD|A\$)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|([\$€£¥]\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i;

// Restore LTTStore shipping cost calculation
function calculateShipping(priceUSD) {
    const shippingTiers = [
        { max: 50, cost: 17.99 },
        { max: 100, cost: 19.99 },
        { max: 150, cost: 21.99 },
        { max: 200, cost: 23.99 },
        { max: 250, cost: 25.99 },
        { max: 300, cost: 27.99 },
        { max: Infinity, cost: 30.00 }
    ];

    // Find the appropriate shipping tier
    const tier = shippingTiers.find(t => priceUSD <= t.max);
    return tier ? tier.cost : 30.00;
}

// Restore LTTStore specific tax and duty calculation
function calculateLTTTotal(priceUSD) {
    const shippingFeeUSD = calculateShipping(priceUSD);
    const targetRate = allConversionRates[targetCurrency] || rates[targetCurrency];
    
    const baseProduct = priceUSD * targetRate;
    const shippingFee = shippingFeeUSD * targetRate;
    const vat = (baseProduct + shippingFee) * vatRate;
    const total = baseProduct + shippingFee + vat;
    
    return {
        base: baseProduct,
        shipping: shippingFee,
        vat: vat,
        total: total
    };
}

function showConversionPopup(event) {
    try {
        const selection = window.getSelection().toString().trim();
        const match = selection.match(currencyRegex);
        
        if (match) {
            let symbol, amount;
            
            // Handle different match groups
            if (match[1] && match[2]) {
                symbol = match[1].trim();
                amount = match[2].trim();
            } else if (match[3]) {
                // Extract symbol from the beginning of the amount
                symbol = match[3][0];
                amount = match[3].substring(1).trim();
            }
            
            // Special handling for yen symbol
            if (symbol === '¥' && !amount.includes('.')) {
                amount = amount.replace(/,/g, ''); // Remove commas for yen amounts
            }
            
            if (symbol && amount) {
                const cleanAmount = amount.replace(/[^0-9.]/g, '');
                const numericAmount = parseFloat(cleanAmount);
                
                if (!isNaN(numericAmount)) {
                    // Get the currency code
                    const currencyCode = getCurrencyCode(symbol);
                    
                    if (currencyCode) {
                        // Get the conversion rate for target currency
                        const targetRate = allConversionRates[targetCurrency] || rates[targetCurrency];
                        const sourceRate = allConversionRates[currencyCode] || rates[currencyCode];
                        
                        if (targetRate && sourceRate) {
                            const convertedAmount = (numericAmount / sourceRate) * targetRate;
                            const targetSymbol = supportedCurrencies[targetCurrency].symbol;
                            
                            let popupText = `≈${targetSymbol}${convertedAmount.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })} (live rate)`;
                            
                            // Only show detailed breakdown on LTTStore
                            if (isLTTStore()) {
                                const totalDetails = calculateLTTTotal(numericAmount);
                                popupText = `
                                    <div class="price-breakdown">
                                        <div class="price-row">
                                            <span>Product:</span>
                                            <span>${targetSymbol}${totalDetails.base.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                        </div>
                                        <div class="price-row">
                                            <span>Shipping:</span>
                                            <span>${targetSymbol}${totalDetails.shipping.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                        </div>
                                        <div class="price-row">
                                            <span>VAT:</span>
                                            <span>${targetSymbol}${totalDetails.vat.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                        </div>
                                        <div class="price-row total">
                                            <span>Total:</span>
                                            <span>${targetSymbol}${totalDetails.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                                        </div>
                                    </div>
                                `;
                            }
                            
                            const popup = document.createElement('div');
                            popup.className = 'currency-popup';
                            const safeHTML = new DOMParser().parseFromString(popupText, 'text/html');
                            popup.appendChild(safeHTML.body.firstChild);
                            
                            popup.style.left = `${event.clientX + 10}px`;
                            popup.style.top = `${event.clientY + 10}px`;
                            
                            document.body.appendChild(popup);
                            setTimeout(() => popup.remove(), 2000);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Currency conversion error:', error);
    }
}

// Helper function to get currency code from symbol
function getCurrencyCode(symbol) {
    const symbolToCode = {
        '$': 'USD',
        'US$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
        'CA$': 'CAD',
        'A$': 'AUD'
    };
    
    // If symbol is already a code (like USD, EUR)
    if (symbol.length === 3 && symbol === symbol.toUpperCase()) {
        return symbol;
    }
    
    return symbolToCode[symbol] || null;
}

// Add event listener for text selection
document.addEventListener('mouseup', showConversionPopup);

// Add styles dynamically
const style = document.createElement('style');
style.textContent = `
.currency-popup {
    position: fixed;
    background: #333;
    color: #fff;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 14px;
    z-index: 1000000;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    line-height: 1.4;
}
.currency-popup small {
    font-size: 12px;
    color: #ddd;
    display: block;
    margin-top: 4px;
}
`; 
document.head.appendChild(style); 

// Enhanced function to update cart display
function updateCartDisplay() {
    try {
        // Find the totals container
        const totalsContainer = document.querySelector('.totals');
        if (!totalsContainer) {
            console.log('Totals container not found, retrying...');
            setTimeout(updateCartDisplay, 1000);
            return;
        }

        // Find the subtotal element
        const subtotalElement = totalsContainer.querySelector('.totals__subtotal');
        if (!subtotalElement) {
            console.log('Subtotal element not found, retrying...');
            setTimeout(updateCartDisplay, 1000);
            return;
        }

        // Get the next sibling which should contain the price
        const priceElement = subtotalElement.nextElementSibling;
        if (!priceElement || !priceElement.textContent.includes('$')) {
            console.log('Price element not found, retrying...');
            setTimeout(updateCartDisplay, 1000);
            return;
        }

        // Get subtotal amount
        const subtotalText = priceElement.textContent.trim();
        const subtotalMatch = subtotalText.match(/\$([\d,.]+)/);
        
        if (!subtotalMatch) {
            console.warn('Could not parse subtotal amount');
            return;
        }
        
        const subtotalUSD = parseFloat(subtotalMatch[1].replace(/,/g, ''));
        const totalDetails = calculateLTTTotal(subtotalUSD);
        const formattedTotal = totalDetails.total.toLocaleString('en-US', {
            style: 'currency',
            currency: targetCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        // Create or update EUR total display
        let eurTotalElement = totalsContainer.querySelector('.totals__eur-total');
        if (!eurTotalElement) {
            eurTotalElement = document.createElement('div');
            eurTotalElement.className = 'totals__eur-total';
            // Insert after the last totals row
            totalsContainer.appendChild(eurTotalElement);
        }
        
        const template = document.createElement('template');
        const row = document.createElement('div');
        row.className = 'totals__row';

        const label = document.createElement('h3');
        label.className = 'totals__label';
        label.textContent = 'Total (incl. VAT & shipping)';

        const value = document.createElement('span');
        value.className = 'totals__value';
        value.textContent = formattedTotal;

        row.appendChild(label);
        row.appendChild(value);
        template.content.appendChild(row);

        eurTotalElement.appendChild(template.content.cloneNode(true));
    } catch (error) {
        console.error('Error updating cart display:', error);
        setTimeout(updateCartDisplay, 1000);
    }
}

// Update styles to match LTTStore's design
style.textContent += `
.totals__eur-total {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #eee;
}
.totals__eur-total .totals__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.totals__eur-total .totals__label {
    font-size: 14px;
    color: #666;
}
.totals__eur-total .totals__value {
    font-weight: bold;
    color: white;
    font-size: 16px;
}
`;

// Update cart observer to watch the correct container
function initCartObserver() {
    try {
        const cartContainer = document.querySelector('.cart__contents') || 
                            document.querySelector('.cart-contents') ||
                            document.querySelector('.cart__main');
        
        if (cartContainer) {
            const cartObserver = new MutationObserver((mutations) => {
                try {
                    if (mutations.some(mutation => mutation.type === 'childList')) {
                        updateCartDisplay();
                    }
                } catch (error) {
                    console.error('MutationObserver error:', error);
                }
            });
            
            cartObserver.observe(cartContainer, {
                childList: true,
                subtree: true,
                characterData: true
            });
            
            setTimeout(updateCartDisplay, 1500);
        } else {
            console.log('Cart container not found, retrying...');
            setTimeout(initCartObserver, 1000);
        }
    } catch (error) {
        console.error('Error initializing cart observer:', error);
        setTimeout(initCartObserver, 1000);
    }
}

// Initialize cart observer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartObserver);
} else {
    initCartObserver();
} 

// Update styles for price breakdown
style.textContent += `
.price-breakdown {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
}
.price-row.total {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid #444;
    font-weight: bold;
}
.price-row span:first-child {
    color: #ddd;
}
.price-row span:last-child {
    color: #fff;
}
`; 

// Update styles for VAT control
style.textContent += `
#vat-control {
    transition: background-color 0.2s;
}
#vat-control:hover {
    background-color: #444 !important;
}
`;

// Initialize VAT control when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addVATControl);
} else {
    addVATControl();
} 

// Update styles
style.textContent += `
#currency-selector {
    transition: background-color 0.2s;
}
#currency-selector:hover {
    background-color: #444;
}
#currency-selector option {
    background-color: #333;
    color: #fff;
}
`; 

// Initialize settings

// Load settings from storage
chrome.storage.sync.get(['targetCurrency'], function(data) {
    if (data.targetCurrency) targetCurrency = data.targetCurrency;
    
    if (isLTTStore()) {
        addCurrencySelector();
        addVATControl();
    }
});

// Listen for settings updates
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateSettings') {
        targetCurrency = message.targetCurrency;
        
        const currencySelector = document.getElementById('currency-selector');
        if (currencySelector) {
            currencySelector.value = targetCurrency;
        }
    }
}); 

// Helper function to check if we're on LTTStore
function isLTTStore() {
    return window.location.hostname.includes('lttstore.com');
} 