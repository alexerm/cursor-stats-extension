import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { AnalyticsData } from './types';

interface HeatmapDataPoint {
  x: string;
  y: number;
}

interface SeparateHeatmapData {
  messages: Array<{ id: string; data: HeatmapDataPoint[] }>;
  acceptedLines: Array<{ id: string; data: HeatmapDataPoint[] }>;
}

interface Last7DaysHeatmapProps {
  data: SeparateHeatmapData;
  theme?: object;
}

export const transformDataForLast7DaysHeatmap = (analyticsData: AnalyticsData) => {
  const today = new Date();
  const last7Days = [];

  // Generate last 7 days including today
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    last7Days.push(date.toISOString().split('T')[0]);
  }

  // Create a map for quick lookup
  const metricsMap = new Map();
  analyticsData.dailyMetrics.forEach((metric) => {
    const date = new Date(parseInt(metric.date, 10));
    const day = date.toISOString().split('T')[0];
    metricsMap.set(day, metric);
  });

  const messagesData = [];
  const acceptedLinesData = [];

  // Create separate datasets for messages and accepted lines
  last7Days.forEach((day) => {
    const metric = metricsMap.get(day);
    const dayName = new Date(day).toLocaleDateString('en-US', { weekday: 'short' });

    messagesData.push({
      x: dayName,
      y: metric?.agentRequests || 0,
    });

    acceptedLinesData.push({
      x: dayName,
      y: metric?.acceptedLinesAdded || 0,
    });
  });

  return {
    messages: [{ id: 'Messages', data: messagesData }],
    acceptedLines: [{ id: 'Accepted Lines', data: acceptedLinesData }],
  };
};

const Last7DaysHeatmap: React.FC<Last7DaysHeatmapProps> = ({ data, theme }) => {
  // Calculate individual max values for each heatmap
  const messagesMaxValue = Math.max(...data.messages[0].data.map((d) => d.y), 1);
  const acceptedLinesMaxValue = Math.max(...data.acceptedLines[0].data.map((d) => d.y), 1);

  // Light green color scheme for better dark text contrast
  const calendarColors = ['#e8f5e8', '#c8e6c8', '#4caf50', '#2e7d32'];
  const emptyColor = '#f5f5f5';

  // Common props for both heatmaps
  const baseHeatmapProps = {
    valueFormat: '>-.0f',
    axisLeft: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: '',
      legendPosition: 'middle' as const,
      legendOffset: -72,
    },
    colors: {
      type: 'quantize' as const,
      colors: calendarColors,
    },
    emptyColor,
    enableLabels: true,
    labelTextColor: {
      from: 'color',
      modifiers: [['darker', 1.8]] as const,
    },
    animate: true,
    motionConfig: 'wobbly' as const,
    hoverTarget: 'cell' as const,
    cellHoverOthersOpacity: 0.25,
    theme,
  };

  // Messages chart props (top chart - remove bottom axis)
  const messagesHeatmapProps = {
    ...baseHeatmapProps,
    margin: { top: 20, right: 20, bottom: 0, left: 100 },
    axisBottom: null,
    axisTop: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: '',
      legendPosition: 'middle' as const,
      legendOffset: -15,
    },
  };

  // Accepted lines chart props (bottom chart - remove top axis)
  const acceptedLinesHeatmapProps = {
    ...baseHeatmapProps,
    margin: { top: 0, right: 20, bottom: 20, left: 100 },
    axisTop: null,
    axisBottom: {
      tickSize: 5,
      tickPadding: 5,
      tickRotation: 0,
      legend: '',
      legendPosition: 'middle' as const,
      legendOffset: 30,
    },
  };

  return (
    <div className="space-y-1">
      {/* Messages Heatmap */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">Messages</h4>
        <div style={{ height: '80px' }}>
          <ResponsiveHeatMap
            data={data.messages}
            {...messagesHeatmapProps}
            minValue={0}
            maxValue={messagesMaxValue}
            tooltip={({ cell }) => (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: '#f9fafb',
                  padding: '12px',
                  border: '1px solid #4b5563',
                  borderRadius: '6px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                }}
              >
                <strong>Messages</strong>
                <br />
                {cell.data.x}: {cell.data.y}
              </div>
            )}
          />
        </div>
      </div>

      {/* Accepted Lines Heatmap */}
      <div>
        <div style={{ height: '80px' }}>
          <ResponsiveHeatMap
            data={data.acceptedLines}
            {...acceptedLinesHeatmapProps}
            minValue={0}
            maxValue={acceptedLinesMaxValue}
            tooltip={({ cell }) => (
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: '#f9fafb',
                  padding: '12px',
                  border: '1px solid #4b5563',
                  borderRadius: '6px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                }}
              >
                <strong>Accepted Lines</strong>
                <br />
                {cell.data.x}: {cell.data.y}
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default Last7DaysHeatmap;
