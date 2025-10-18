import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { addDays, formatISO, startOfDay } from 'date-fns';
import { useEffect, useState } from 'react';

interface DayDatePickerProps {
  maxAdvanceDays: number;
  value: Date;
  onChange: (date: Date) => void;
}

export function DayDatePicker({ maxAdvanceDays, value, onChange }: DayDatePickerProps) {
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');

  useEffect(() => {
    const today = startOfDay(new Date());
    const maxDate = startOfDay(addDays(today, Math.max(0, maxAdvanceDays)));
    setMin(formatISO(today, { representation: 'date' }));
    setMax(formatISO(maxDate, { representation: 'date' }));
  }, [maxAdvanceDays]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Select Day</CardTitle>
      </CardHeader>
      <CardContent>
        <input
          type="date"
          className="w-full border rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground dark:bg-background dark:text-foreground dark:border-border cursor-pointer"
          min={min}
          max={max}
          value={formatISO(value, { representation: 'date' })}
          onChange={(e) => onChange(startOfDay(new Date(e.target.value)))}
          onClick={(e) => {
            const target = e.target as HTMLInputElement;
            if (target.showPicker) {
              target.showPicker();
            }
          }}
        />
      </CardContent>
    </Card>
  );
}
