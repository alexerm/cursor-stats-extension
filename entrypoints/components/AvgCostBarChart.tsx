import React from 'react';
import { ResponsiveBar } from '@nivo/bar';

interface CostData {
  day: string;
  subscription: number;
  usage: number;
  [key: string]: string | number;
}

interface AvgCostBarChartProps {
  data: CostData[];
  theme: Record<string, unknown>;
}

const AvgCostBarChart: React.FC<AvgCostBarChartProps> = ({ data, theme }) => {
  const formatCostValue = (value: number) => {
    if (value >= 100) {
      return `$${(value / 100).toFixed(3)}`;
    }
    return `${value.toFixed(2)}¢`;
  };

  // If no data, show a message
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No cost data available for the last 14 days
      </div>
    );
  }

  // Check if all values are zero
  const hasAnyCosts = data.some((item) => (item.subscription || 0) > 0 || (item.usage || 0) > 0);
  if (!hasAnyCosts) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        No costs recorded for the last 14 days
      </div>
    );
  }

  return (
    <ResponsiveBar
      data={data}
      keys={['subscription', 'usage']}
      indexBy="day"
      margin={{ top: 32, right: 32, bottom: 70, left: 80 }}
      padding={0.4}
      valueScale={{ type: 'linear' }}
      indexScale={{ type: 'band', round: true }}
      colors={['#06B6D4', '#8B5CF6']}
      borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: -45,
        legend: 'Day',
        legendPosition: 'middle',
        legendOffset: 45,
        format: (value: string) => {
          // Convert YYYY-MM-DD to MM/DD for display
          const parts = value.split('-');
          return parts.length === 3 ? `${parts[1]}/${parts[2]}` : value;
        },
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'Avg Cost/Request',
        legendPosition: 'middle',
        legendOffset: -65,
        format: formatCostValue,
      }}
      enableLabel={false}
      legends={[
        {
          dataFrom: 'keys',
          anchor: 'bottom',
          direction: 'row',
          justify: false,
          translateX: 0,
          translateY: 70,
          itemsSpacing: 2,
          itemWidth: 100,
          itemHeight: 20,
          itemDirection: 'left-to-right',
          itemOpacity: 0.85,
          symbolSize: 12,
          effects: [
            {
              on: 'hover',
              style: {
                itemOpacity: 1,
              },
            },
          ],
        },
      ]}
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
      tooltip={({ id, value, color, data }) => (
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
          <strong style={{ display: 'block', marginBottom: '8px' }}>{data.day}</strong>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: color,
                marginRight: 8,
                borderRadius: '2px',
              }}
            ></div>
            <span style={{ textTransform: 'capitalize' }}>{id}</span>:{' '}
            {formatCostValue(value as number)}/request
          </div>
        </div>
      )}
    />
  );
};

export default AvgCostBarChart;
