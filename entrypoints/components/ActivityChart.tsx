import React, { useEffect, useState } from 'react';
import { ResponsiveCalendar, CalendarCanvasProps } from '@nivo/calendar';

interface DailyMetric {
  date: string;
  activeUsers?: number;
  linesAdded?: number;
  linesDeleted?: number;
  acceptedLinesAdded?: number;
  acceptedLinesDeleted?: number;
  totalApplies?: number;
  totalAccepts?: number;
  totalRejects?: number;
  totalTabsShown?: number;
  totalTabsAccepted?: number;
  agentRequests?: number;
  subscriptionIncludedReqs?: number;
  usageBasedReqs?: number;
  chatRequests?: number;
  cmdkUsages?: number;
  modelUsage?: Array<{ name: string; count: number }>;
  extensionUsage?: Array<{ name: string; count: number }>;
  tabExtensionUsage?: Array<{ name: string; count: number }>;
  clientVersionUsage?: Array<{ name: string; count: number }>;
}

interface AnalyticsData {
  dailyMetrics: DailyMetric[];
  period: {
    startDate: string;
    endDate: string;
  };
  totalMembersInTeam: number;
}

interface CalendarData {
  day: string;
  value: number;
}

const ActivityChart: React.FC = () => {
  const [data, setData] = useState<CalendarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async (): Promise<AnalyticsData | null> => {
    try {
      // Calculate date range (current year)
      const currentYear = new Date().getFullYear();
      const startDate = new Date(currentYear, 0, 1); // January 1st of current year
      const endDate = new Date(currentYear, 11, 31, 23, 59, 59); // December 31st of current year

      const requestBody = {
        teamId: 0,
        userId: 0,
        startDate: startDate.getTime().toString(),
        endDate: endDate.getTime().toString()
      };

      const response = await fetch('https://cursor.com/api/dashboard/get-user-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const analyticsData: AnalyticsData = await response.json();
      return analyticsData;
    } catch (err) {
      console.error('Error fetching analytics:', err);
      return null;
    }
  };

  const transformDataForCalendar = (analyticsData: AnalyticsData): CalendarData[] => {
    const groupedByDay = analyticsData.dailyMetrics.reduce((acc, metric) => {
      const day = new Date(parseInt(metric.date)).toISOString().split('T')[0];
      if (!acc[day]) {
        acc[day] = {
          linesAdded: 0,
          agentRequests: 0,
          totalApplies: 0,
          chatRequests: 0,
          count: 0
        };
      }
      acc[day].linesAdded += metric.linesAdded || 0;
      acc[day].agentRequests += metric.agentRequests || 0;
      acc[day].totalApplies += metric.totalApplies || 0;
      acc[day].chatRequests += metric.chatRequests || 0;
      acc[day].count += 1;
      return acc;
    }, {} as Record<string, { linesAdded: number; agentRequests: number; totalApplies: number; chatRequests: number; count: number }>);

    return Object.entries(groupedByDay).map(([day, metrics]) => {
      return { day, value: metrics.count };
    });
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      const analyticsData = await fetchAnalyticsData();
      
      if (analyticsData) {
        const calendarData = transformDataForCalendar(analyticsData);
        setData(calendarData);
      } else {
        setError('Failed to load analytics data');
      }
      
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-5 text-center">
        <div className="inline-block w-5 h-5 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
        <p className="mt-2.5 text-gray-400 text-sm">Loading activity data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-brand-dashboard-card dark:bg-brand-dashboard-card p-6 rounded-lg border border-gray-600 text-red-400">
        <h3 className="m-0 mb-2 text-base font-bold">
          Unable to Load Activity Chart
        </h3>
        <p className="m-0 text-sm">{error}</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const theme: CalendarCanvasProps['theme'] = {
    labels: {
      text: {
        fill: '#9ca3af', // gray-400
        fontSize: 12,
      },
    },
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    year: {
      text: {
        fill: '#9ca3af',
        fontSize: 32,
        fontWeight: 'bold',
      }
    },
    tooltip: {
      container: {
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#f9fafb', // gray-50
        border: '1px solid #4b5563', // gray-600
        borderRadius: '6px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
      },
    },
  };

  return (
    <div className="bg-brand-dashboard-card dark:bg-brand-dashboard-card p-6 rounded-xl border border-gray-600 shadow-lg">
      <div className="mb-5">
        <h2 className="m-0 mb-2 text-xl font-bold text-gray-50">
          Cursor Activity
        </h2>
        <p className="m-0 text-sm text-gray-400">
          {data.length > 0 ? `${data.reduce((acc, d) => acc + d.value, 0)} contributions` : 'No contributions'} in {currentYear}
        </p>
      </div>

      <div style={{ height: '180px' }} className="w-full">
        <ResponsiveCalendar
          data={data}
          from={`${currentYear}-01-01`}
          to={`${currentYear}-12-31`}
          emptyColor="#374152"
          colors={['#065f46', '#047857', '#059669', '#10b981']}
          margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
          yearSpacing={40}
          monthBorderWidth={0}
          monthBorderColor="transparent"
          dayBorderWidth={2}
          dayBorderColor="transparent"
          daySpacing={2}
          theme={theme}
          tooltip={({ day, value }) => (
            <div className="bg-gray-900 text-gray-50 px-3 py-2 rounded-md text-xs font-bold border border-gray-600 shadow-lg">
              <strong>{value} contributions</strong> on {day}
            </div>
          )}
          legends={[
            {
              anchor: 'bottom-right',
              direction: 'row',
              translateY: 36,
              itemCount: 4,
              itemWidth: 42,
              itemHeight: 36,
              itemsSpacing: 14,
              itemDirection: 'right-to-left',
            },
          ]}
        />
      </div>

      <div className="mt-4 text-xs text-gray-400 flex items-center justify-between">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-2.5 h-2.5 bg-gray-700 rounded-sm" />
          <div className="w-2.5 h-2.5 bg-emerald-800 rounded-sm" />
          <div className="w-2.5 h-2.5 bg-emerald-700 rounded-sm" />
          <div className="w-2.5 h-2.5 bg-emerald-600 rounded-sm" />
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

export default ActivityChart; 