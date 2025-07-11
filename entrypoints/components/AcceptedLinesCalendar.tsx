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
    const filteredData = data.filter(item => item.value > 0);
    return (
        <div>
            <h2 className="text-xl font-bold text-gray-50 mb-2">Accepted Lines per Day</h2>
            <div style={{ height: '200px' }}>
                <ResponsiveCalendar
                    data={filteredData}
                    from={from}
                    to={to}
                    emptyColor="#151b23"
                    colors={['#003d19', '#006d32', '#26a641', '#39d353']}
                    margin={{ top: 40, right: 40, bottom: 0, left: 40 }}
                    yearSpacing={40}
                    monthBorderWidth={1}
                    monthBorderColor="#23272f"
                    dayBorderWidth={2}
                    dayBorderColor="transparent"
                    daySpacing={2}
                    theme={theme}
                    minValue={1}
                />
            </div>
        </div>
    )
}

export default AcceptedLinesCalendar; 