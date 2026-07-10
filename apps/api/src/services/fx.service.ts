import axios from 'axios';

interface ExchangeRateResponse {
  rates: {
    ETB: number;
  };
  base: string;
  date: string;
}

export class FXService {
  private static cache: {
    rate: number | null;
    timestamp: number | null;
  } = {
    rate: null,
    timestamp: null,
  };

  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get current USD to ETB exchange rate
   */
  static async getUSDtoETB(): Promise<number> {
    // Check cache first
    if (this.cache.rate && this.cache.timestamp) {
      const age = Date.now() - this.cache.timestamp;
      if (age < this.CACHE_TTL) {
        console.log(`📊 Using cached rate: 1 USD = ${this.cache.rate} ETB`);
        return this.cache.rate;
      }
    }

    const sources = [
      // Primary: Frankfurter
      async () => {
        const response = await axios.get<ExchangeRateResponse>(
          'https://api.frankfurter.app/latest?from=USD&to=ETB',
          { timeout: 5000 }
        );
        return response.data.rates.ETB;
      },
      // Fallback 1: ExchangeRate.host
      async () => {
        const response = await axios.get(
          'https://api.exchangerate.host/convert?from=USD&to=ETB',
          { timeout: 5000 }
        );
        return response.data.result;
      },
      // Fallback 2: exchangerate-api.com (free, no API key needed)
      async () => {
        const response = await axios.get(
          'https://api.exchangerate-api.com/v4/latest/USD',
          { timeout: 5000 }
        );
        return response.data.rates.ETB;
      },
      // Fallback 3: Currency API (jsdelivr CDN)
      async () => {
        const response = await axios.get(
          'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
          { timeout: 5000 }
        );
        return response.data.usd.etb;
      },
      // Fallback 4: ExchangeRate-API (free tier)
      async () => {
        const response = await axios.get(
          'https://open.er-api.com/v6/latest/USD',
          { timeout: 5000 }
        );
        return response.data.rates.ETB;
      },
    ];

    let lastError: Error | null = null;

    for (const source of sources) {
      try {
        const rate = await source();
        if (rate && rate > 0) {
          // Update cache
          this.cache.rate = rate;
          this.cache.timestamp = Date.now();
          console.log(`✅ Exchange rate updated: 1 USD = ${rate} ETB`);
          return rate;
        }
      } catch (error) {
        console.warn(`⚠️ FX source failed:`, error);
        lastError = error as Error;
        // Continue to next source
      }
    }

    // Last resort: return cached rate or default
    if (this.cache.rate) {
      console.log(`📊 Using cached rate: 1 USD = ${this.cache.rate} ETB`);
      return this.cache.rate;
    }

    // Default fallback rate (will be updated when API works)
    const defaultRate = 162.00;
    console.log(`⚠️ Using default rate: 1 USD = ${defaultRate} ETB`);
    return defaultRate;
  }

  /**
   * Convert USD to ETB
   */
  static async usdToETB(usdAmount: number): Promise<number> {
    const rate = await this.getUSDtoETB();
    return Math.round(usdAmount * rate);
  }

  /**
   * Get formatted ETB price for display
   */
  static async getETBPrice(usdAmount: number): Promise<string> {
    const etb = await this.usdToETB(usdAmount);
    return `${etb.toLocaleString()} ETB`;
  }

  /**
   * Get both USD and ETB prices for display
   */
  static async getDualPrice(usdAmount: number): Promise<{
    usd: string;
    etb: string;
    rate: number;
    raw: {
      usd: number;
      etb: number;
    };
  }> {
    const rate = await this.getUSDtoETB();
    const etb = Math.round(usdAmount * rate);
    
    return {
      usd: `$${usdAmount.toFixed(2)}`,
      etb: `${etb.toLocaleString()} ETB`,
      rate,
      raw: {
        usd: usdAmount,
        etb,
      },
    };
  }
}