import { useCurrency } from '@/contexts/CurrencyContext';
import { Button } from '@/components/ui/button';
import { DollarSign, Coins } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CurrencySwitcher() {
  const { currency, setCurrency, rate, formatPrice } = useCurrency();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          {currency === 'USD' ? (
            <DollarSign className="h-4 w-4" />
          ) : (
            <Coins className="h-4 w-4" />
          )}
          {currency}
          <span className="text-xs text-muted-foreground ml-1">
            1 USD = {rate.toFixed(2)} ETB
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setCurrency('USD')}>
          <DollarSign className="h-4 w-4 mr-2" />
          USD
          {currency === 'USD' && (
            <span className="ml-auto text-green-600">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCurrency('ETB')}>
          <Coins className="h-4 w-4 mr-2" />
          ETB
          {currency === 'ETB' && (
            <span className="ml-auto text-green-600">✓</span>
          )}
        </DropdownMenuItem>
        <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1">
          Rate: 1 USD = {rate.toFixed(2)} ETB
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}