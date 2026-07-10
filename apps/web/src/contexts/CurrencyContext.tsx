import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '@/api/client';

type Currency = 'USD' | 'ETB';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  rate: number;
  convertPrice: (usdAmount: number) => number;
  formatPrice: (usdAmount: number) => string;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [rate, setRate] = useState<number>(1620);
  const [loading, setLoading] = useState(true);

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('weapply_currency') as Currency;
    if (saved && (saved === 'USD' || saved === 'ETB')) {
      setCurrency(saved);
    }
  }, []);

  // Fetch exchange rate
  useEffect(() => {
    const fetchRate = async () => {
      try {
        console.log('🔄 Fetching exchange rate...');
        
        // Try to get the rate directly from the rate endpoint
        const response = await apiClient.get('/payment/rate');
        console.log('📊 Rate response:', response.data);
        
        if (response.data.data && response.data.data.rate) {
          setRate(response.data.data.rate);
          console.log(`✅ Rate set to: ${response.data.data.rate} ETB/USD`);
        } else {
          // Fallback: get from plans
          const plansResponse = await apiClient.get('/payment/plans');
          if (plansResponse.data.data && plansResponse.data.data.length > 0) {
            const plan = plansResponse.data.data[0];
            if (plan.rate) {
              setRate(plan.rate);
              console.log(`✅ Rate from plans: ${plan.rate} ETB/USD`);
            }
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('❌ Error fetching exchange rate:', error);
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  // Save preference to localStorage
  const handleSetCurrency = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    localStorage.setItem('weapply_currency', newCurrency);
  };

  const convertPrice = (usdAmount: number): number => {
    if (currency === 'ETB') {
      return Math.round(usdAmount * rate);
    }
    return usdAmount;
  };

  const formatPrice = (usdAmount: number): string => {
    const amount = convertPrice(usdAmount);
    if (currency === 'ETB') {
      return `${amount.toLocaleString()} ETB`;
    }
    return `$${amount.toFixed(2)}`;
  };

  const value = {
    currency,
    setCurrency: handleSetCurrency,
    rate,
    convertPrice,
    formatPrice,
    loading,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}