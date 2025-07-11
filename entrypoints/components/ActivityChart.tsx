import React, { useEffect, useState } from 'react';
import { ResponsiveCalendar } from '@nivo/calendar';
import { ResponsiveBar } from '@nivo/bar';

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

interface BarChartData {
  day: string;
  subscription: number;
  usage: number;
  [key: string]: string | number;
}

interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  totalCents?: number;
}

interface UsageEvent {
  timestamp: string;
  model: string;
  kind: string;
  requestsCosts?: number;
  usageBasedCosts?: string;
  isTokenBasedCall: boolean;
  tokenUsage?: TokenUsage;
  owningUser: string;
}

interface UsageEventsData {
  totalUsageEventsCount: number;
  usageEventsDisplay: UsageEvent[];
}

const transformDataForUsageCalendar = (analyticsData: AnalyticsData): CalendarData[] => {
  return analyticsData.dailyMetrics.map((metric) => {
    const date = new Date(parseInt(metric.date, 10));
    const day = date.toISOString().split('T')[0];
    return {
      day,
      value: metric.agentRequests || 0,
    };
  });
};

const transformDataForAcceptedLinesCalendar = (analyticsData: AnalyticsData): CalendarData[] => {
  return analyticsData.dailyMetrics.map((metric) => {
    const date = new Date(parseInt(metric.date, 10));
    const day = date.toISOString().split('T')[0];
    return {
      day,
      value: metric.acceptedLinesAdded || 0,
    };
  });
};

const transformDataForTokensBarChart = (usageEvents: UsageEvent[]): BarChartData[] => {
  const dailyTokens: { [day: string]: { subscription: number; usage: number } } = {};

  usageEvents.forEach((event) => {
    // Not filtering any model for now, will add a note as requested.
    const date = new Date(parseInt(event.timestamp, 10));
    const day = date.toISOString().split('T')[0].substring(5); // MM-DD

    if (!dailyTokens[day]) {
      dailyTokens[day] = { subscription: 0, usage: 0 };
    }

    if (event.tokenUsage) {
      const totalTokens = (event.tokenUsage.inputTokens || 0) + (event.tokenUsage.outputTokens || 0);

      if (event.kind === 'USAGE_EVENT_KIND_INCLUDED_IN_PRO') {
        dailyTokens[day].subscription += totalTokens;
      } else if (event.kind === 'USAGE_EVENT_KIND_USAGE_BASED') {
        dailyTokens[day].usage += totalTokens;
      }
    }
  });

  return Object.keys(dailyTokens).map((day) => ({
    day,
    ...dailyTokens[day],
  })).sort((a, b) => a.day.localeCompare(b.day));
};

const fetchAllUsageEvents = async (startDate: string, endDate: string): Promise<UsageEvent[]> => {
  let allEvents: UsageEvent[] = [];
  let page = 1;
  const pageSize = 600;
  let totalEvents = 0;
  let fetchedEvents = 0;
  let data: UsageEventsData;

  do {
    const response = await fetch('https://cursor.com/api/dashboard/get-filtered-usage-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId: 0,
        startDate,
        endDate,
        page,
        pageSize,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    data = await response.json();
    allEvents = allEvents.concat(data.usageEventsDisplay);

    if (page === 1) {
      totalEvents = data.totalUsageEventsCount;
    }
    fetchedEvents += data.usageEventsDisplay.length;
    page++;

  } while (fetchedEvents < totalEvents && data.usageEventsDisplay.length > 0);

  return allEvents;
};

const ActivityChart: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const startDate = new Date('2024-01-01T00:00:00Z').getTime().toString();
        const today = new Date();
        const endDate = new Date(today.setDate(today.getDate() + 1)).getTime().toString();

        const [analyticsDataResponse, usageEventsData] = await Promise.all([
          fetch('https://cursor.com/api/dashboard/get-user-analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teamId: 0,
              userId: 0,
              startDate,
              endDate,
            }),
          }),
          fetchAllUsageEvents(startDate, endDate)
        ]);
        
        if (!analyticsDataResponse.ok) {
          throw new Error(`HTTP error! status: ${analyticsDataResponse.status}`);
        }

        const analyticsData = await analyticsDataResponse.json();
        setAnalyticsData(analyticsData);
        setUsageEvents(usageEventsData);
      } catch (e: any) {
        setError(e.message);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return <div className="p-6 text-red-500">Error fetching data: {error}</div>;
  }

  if (!analyticsData || !usageEvents) {
    return <div className="p-6 text-gray-50">Loading analytics data...</div>;
  }
  
  const usageData = transformDataForUsageCalendar(analyticsData);
  const acceptedLinesData = transformDataForAcceptedLinesCalendar(analyticsData);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const last30DaysUsageEvents = usageEvents.filter(event => {
    const eventDate = new Date(parseInt(event.timestamp, 10));
    return eventDate >= thirtyDaysAgo;
  });
  const tokensData = transformDataForTokensBarChart(last30DaysUsageEvents);

  const currentYear = new Date().getFullYear();
  const from = `${currentYear}-01-01`;
  const to = `${currentYear}-12-31`;

  const theme = {
    labels: {
      text: {
        fill: '#9ca3af',
        fontSize: 12,
      },
    },
    tooltip: {
      container: {
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#f9fafb',
        border: '1px solid #4b5563',
        borderRadius: '6px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
      },
    },
    axis: {
      ticks: {
          text: {
              fill: '#9ca3af',
          },
      },
      legend: {
          text: {
              fill: '#9ca3af',
          },
      },
  },
  };

  return (
    <div className="p-6 rounded-xl space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-50 mb-2">Usage per Day</h2>
        <div style={{ height: '200px' }}>
          <ResponsiveCalendar
            data={usageData}
            from={from}
            to={to}
            emptyColor="#374152"
            colors={['#064e3b', '#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7']}
            margin={{ top: 40, right: 40, bottom: 0, left: 40 }}
            yearSpacing={40}
            monthBorderWidth={0}
            dayBorderWidth={2}
            dayBorderColor="transparent"
            daySpacing={2}
            theme={theme}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-50 mb-2">Accepted Lines per Day</h2>
        <div style={{ height: '200px' }}>
          <ResponsiveCalendar
            data={acceptedLinesData}
            from={from}
            to={to}
            emptyColor="#374152"
            colors={['#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46']}
            margin={{ top: 40, right: 40, bottom: 0, left: 40 }}
            yearSpacing={40}
            monthBorderWidth={0}
            dayBorderWidth={2}
            dayBorderColor="transparent"
            daySpacing={2}
            theme={theme}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-50 mb-2">Subscription vs Usage-Based Tokens</h2>
        <div style={{ height: '300px' }}>
          <ResponsiveBar
            data={tokensData}
            keys={['subscription', 'usage']}
            indexBy="day"
            margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={{ scheme: 'nivo' }}
            borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Day',
              legendPosition: 'middle',
              legendOffset: 32,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Requests',
              legendPosition: 'middle',
              legendOffset: -40,
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
            legends={[
              {
                dataFrom: 'keys',
                anchor: 'bottom-right',
                direction: 'column',
                justify: false,
                translateX: 120,
                translateY: 0,
                itemsSpacing: 2,
                itemWidth: 100,
                itemHeight: 20,
                itemDirection: 'left-to-right',
                itemOpacity: 0.85,
                symbolSize: 20,
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
            theme={theme}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          * Note: Default model tokens are excluded from this chart.
        </p>
      </div>
    </div>
  );
};

export default ActivityChart; 