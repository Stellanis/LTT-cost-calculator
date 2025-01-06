# LTT Store Currency Converter

A browser extension designed specifically for the LTT Store, providing real-time currency conversion with VAT and shipping calculations.

## Features

- **LTT Store Integration**: Automatically detects and converts prices on lttstore.com
- **Real-time Currency Conversion**: Supports multiple currencies with live exchange rates
- **VAT Customization**: Easily adjust VAT rates for accurate pricing
- **Shipping Cost Inclusion**: Calculates total price including shipping
- **Currency Selector**: Quick access dropdown for currency selection
- **Price Breakdown**: Shows detailed price components (base price, VAT, shipping)
- **Exchange Rate Caching**: Maintains accurate rates even with spotty connections

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/currency-converter.git
   ```
2. Load as unpacked extension:
   - **Chrome**: 
     1. Go to `chrome://extensions/`
     2. Enable "Developer mode"
     3. Click "Load unpacked" and select the extension folder
   - **Firefox**:
     1. Go to `about:debugging#/runtime/this-firefox`
     2. Click "Load Temporary Add-on" and select any file in the extension folder

## Usage

1. Visit [LTT Store](https://www.lttstore.com)
2. The extension will automatically:
   - Convert all prices to your selected currency
   - Show VAT and shipping breakdowns
   - Display total prices in your preferred currency

3. Use the currency selector (bottom-right) to change currencies
4. Click the VAT button to customize VAT rates

## Supported Currencies

- € Euro (EUR)
- $ US Dollar (USD)
- £ British Pound (GBP)
- ¥ Japanese Yen (JPY)
- CA$ Canadian Dollar (CAD)
- A$ Australian Dollar (AUD)

## License

MIT License
