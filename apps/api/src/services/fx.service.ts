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
        return this.cache.rate;
      }
    }

    try {
      // Try Frankfurter API first
      const response = await axios.get<ExchangeRateResponse>(
        'https://api.frankfurter.app/latest?from=USD&to=ETB'
      );
      
      const rate = response.data.rates.ETB;
      
      // Update cache
      this.cache.rate = rate;
      this.cache.timestamp = Date.now();
      
      return rate;
    } catch (error) {
      console.warn('⚠️ Frankfurter API failed, trying fallback...');
      
      // Fallback: ExchangeRate.host
      try {
        const response = await axios.get(
          'https://api.exchangerate.host/convert?from=USD&to=ETB'
        );
        const rate = response.data.result;
        
        this.cache.rate = rate;
        this.cache.timestamp = Date.now();
        
        return rate;
      } catch (fallbackError) {
        console.warn('⚠️ ExchangeRate.host failed, using cached or default rate...');
        
        // Last resort: return cached rate or default
        if (this.cache.rate) {
          return this.cache.rate;
        }
        
        // Default rate (fallback)
        return 1620; // 1 USD ≈ 1620 ETB (approximate)
      }
    }
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