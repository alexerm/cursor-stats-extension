import React from 'react';
import { ResponsiveCalendar } from '@nivo/calendar';
import { CalendarData } from './types';

interface AcceptedLinesCalendarProps {
  data: CalendarData[];
  from: string;
  to: string;
  theme: object;
}

const AcceptedLinesCalendar: React.FC<AcceptedLinesCalendarProps> = ({ data, from, to, theme }) => {
  const filteredData = data.filter((item) => item.value > 0);
  return (
    <ResponsiveCalendar
      data={filteredData}
      from={from}
      to={to}
      emptyColor="#151b23"
      colors={['#003d19', '#006d32', '#26a641', '#39d353']}
      margin={{ top: 24, right: 24, bottom: 24, left: 24 }}
      yearSpacing={40}
      monthBorderWidth={1}
      monthBorderColor="#23272f"
      dayBorderWidth={2}
      dayBorderColor="transparent"
      daySpacing={2}
      theme={theme}
      minValue={1}
    />
  );
};

export default AcceptedLinesCalendar;
