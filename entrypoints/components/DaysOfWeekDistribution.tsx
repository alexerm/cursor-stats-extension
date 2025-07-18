import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { AnalyticsData } from './types';

interface DaysOfWeekData {
  day: string;
  value: number;
  fullName: string;
  [key: string]: string | number;
}

interface DaysOfWeekDistributionProps {
  data: DaysOfWeekData[];
  theme: Record<string, unknown>;
}

const DaysOfWeekDistribution: React.FC<DaysOfWeekDistributionProps> = ({ data, theme }) => {
  const formatValue = (value: number) => {
    return value.toLocaleString();
  };

  return (
    <ResponsiveBar
      data={data}
      keys={['value']}
      indexBy="day"
      margin={{ top: 32, right: 32, bottom: 70, left: 70 }}
      padding={0.4}
      valueScale={{ type: 'linear' }}
      indexScale={{ type: 'band', round: true }}
      colors={['#8B5CF6']}
      borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Day of Week',
        legendPosition: 'middle',
        legendOffset: 45,
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Usage Count',
        legendPosition: 'middle',
        legendOffset: -60,
        format: formatValue,
      }}
      enableLabel={false}
      theme={{
        ...theme,
        legends: {
          text: {
            fill: '#d4d4d8',
          },
        },
      }}
      animate={true}
      motionConfig="gentle"
      tooltip={({ value, data: tooltipData }) => (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.85)',
            color: '#fff',
            border: '1px solid transparent',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          <strong style={{ display: 'block', marginBottom: '8px' }}>{tooltipData.fullName}</strong>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>Usage: {formatValue(value as number)}</span>
          </div>
        </div>
      )}
    />
  );
};

export const transformDataForDaysOfWeek = (analyticsData: AnalyticsData): DaysOfWeekData[] => {
  const daysOfWeek = [
    { day: 'Mon', fullName: 'Monday' },
    { day: 'Tue', fullName: 'Tuesday' },
    { day: 'Wed', fullName: 'Wednesday' },
    { day: 'Thu', fullName: 'Thursday' },
    { day: 'Fri', fullName: 'Friday' },
    { day: 'Sat', fullName: 'Saturday' },
    { day: 'Sun', fullName: 'Sunday' },
  ];

  const dayUsage: { [key: string]: number } = {};

  // Initialize all days with 0
  daysOfWeek.forEach(({ day }) => {
    dayUsage[day] = 0;
  });

  // Aggregate usage by day of week
  analyticsData.dailyMetrics.forEach((metric) => {
    const date = new Date(parseInt(metric.date, 10));
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayIndex = (dayOfWeek + 6) % 7; // Convert to Mon=0, Tue=1, etc.
    const dayKey = daysOfWeek[dayIndex].day;

    // Use agentRequests as the primary metric for usage
    dayUsage[dayKey] += metric.agentRequests || 0;
  });

  return daysOfWeek.map(({ day, fullName }) => ({
    day,
    fullName,
    value: dayUsage[day],
  }));
};

export default DaysOfWeekDistribution;
