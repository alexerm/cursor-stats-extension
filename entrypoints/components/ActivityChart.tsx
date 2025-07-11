import React, { useEffect, useState } from 'react';
import {
  AnalyticsData,
  BarChartData,
  CalendarData,
  UsageEvent,
  UsageEventsData,
} from './types';
import UsageCalendar from './UsageCalendar';
import AcceptedLinesCalendar from './AcceptedLinesCalendar';
import TokensBarChart from './TokensBarChart';

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
    <div className="space-y-6">
      <div className="rounded-xl text-brand-foreground border-brand-neutrals-100 dark:border-brand-neutrals-800 border-0 bg-brand-dashboard-card p-6 dark:bg-brand-dashboard-card">
        <h3 className="text-base font-semibold text-gray-200">AI Chat Requests</h3>
        <div style={{ height: '200px' }}>
          <UsageCalendar data={usageData} from={from} to={to} theme={theme} />
        </div>
      </div>
      <div className="rounded-xl text-brand-foreground border-brand-neutrals-100 dark:border-brand-neutrals-800 border-0 bg-brand-dashboard-card p-6 dark:bg-brand-dashboard-card">
        <h3 className="text-base font-semibold text-gray-200">Accepted Code Suggestions</h3>
        <div style={{ height: '200px' }} >
          <AcceptedLinesCalendar data={acceptedLinesData} from={from} to={to} theme={theme} />
        </div>
      </div>
      <div className="rounded-xl text-brand-foreground border-brand-neutrals-100 dark:border-brand-neutrals-800 border-0 bg-brand-dashboard-card p-6 dark:bg-brand-dashboard-card">
        <h3 className="text-base font-semibold text-gray-200">Token Usage (last 30 days)</h3>
        <p className="px-6 text-sm text-gray-500">Approximation of token usage. Does not include data from models like GPT-4o, Claude 3 Opus, etc.</p>
        <div style={{ height: '400px' }} className="p-3">
          <TokensBarChart data={tokensData} theme={theme} />
        </div>
      </div>
    </div>
  );
};

export default ActivityChart; 