import React, { useEffect, useState } from 'react';
import {
  AnalyticsData,
  BarChartData,
  CalendarData,
  CostData,
  UsageEvent,
  UsageEventsData,
} from './types';
import UsageCalendar from './UsageCalendar';
import AcceptedLinesCalendar from './AcceptedLinesCalendar';
import TokensBarChart from './TokensBarChart';
import CostBarChart from './CostBarChart';
import DaysOfWeekDistribution, { transformDataForDaysOfWeek } from './DaysOfWeekDistribution';
import Last7DaysHeatmap, { transformDataForLast7DaysHeatmap } from './Last7DaysHeatmap';

/* global localStorage */
// Caching helpers for usage events to avoid refetching on every load
const USAGE_EVENTS_CACHE_KEY = 'cursorUsageEventsCache_v1';
const USAGE_EVENTS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const loadCachedUsageEvents = (): UsageEvent[] | null => {
  try {
    const cachedString = localStorage.getItem(USAGE_EVENTS_CACHE_KEY);
    if (!cachedString) return null;
    const cached = JSON.parse(cachedString) as { timestamp: number; events: UsageEvent[] };
    if (Date.now() - cached.timestamp < USAGE_EVENTS_CACHE_TTL_MS) {
      return cached.events;
    }
  } catch {
    // ignore malformed cache
  }
  return null;
};

const saveCachedUsageEvents = (events: UsageEvent[]) => {
  try {
    localStorage.setItem(USAGE_EVENTS_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), events }));
  } catch {
    // ignore quota or serialization errors
  }
};

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
    const day = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!dailyTokens[day]) {
      dailyTokens[day] = { subscription: 0, usage: 0 };
    }

    if (event.tokenUsage) {
      const totalTokens =
        (event.tokenUsage.inputTokens || 0) +
        (event.tokenUsage.outputTokens || 0) +
        (event.tokenUsage.cacheReadTokens || 0) +
        (event.tokenUsage.cacheWriteTokens || 0);

      if (
        event.kind === 'USAGE_EVENT_KIND_INCLUDED_IN_PRO' ||
        event.kind === 'USAGE_EVENT_KIND_INCLUDED_IN_ULTRA'
      ) {
        dailyTokens[day].subscription += totalTokens;
      } else if (event.kind === 'USAGE_EVENT_KIND_USAGE_BASED') {
        dailyTokens[day].usage += totalTokens;
      }
    }
  });

  return Object.keys(dailyTokens)
    .map((day) => ({
      day,
      ...dailyTokens[day],
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
};

const transformDataForCostBarChart = (usageEvents: UsageEvent[]): CostData[] => {
  const dailyCosts: { [day: string]: { subscription: number; usage: number } } = {};

  usageEvents.forEach((event) => {
    const date = new Date(parseInt(event.timestamp, 10));
    const day = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!dailyCosts[day]) {
      dailyCosts[day] = { subscription: 0, usage: 0 };
    }

    if (event.tokenUsage && event.tokenUsage.totalCents) {
      if (
        event.kind === 'USAGE_EVENT_KIND_INCLUDED_IN_PRO' ||
        event.kind === 'USAGE_EVENT_KIND_INCLUDED_IN_ULTRA'
      ) {
        dailyCosts[day].subscription += event.tokenUsage.totalCents;
      } else if (event.kind === 'USAGE_EVENT_KIND_USAGE_BASED') {
        dailyCosts[day].usage += event.tokenUsage.totalCents;
      }
    }
  });

  return Object.keys(dailyCosts)
    .map((day) => ({
      day,
      ...dailyCosts[day],
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
};

const fetchAllUsageEvents = async (
  startDate: string,
  endDate: string,
  onProgress?: (events: UsageEvent[], progress: { fetched: number; total: number }) => void,
): Promise<UsageEvent[]> => {
  let allEvents: UsageEvent[] = [];
  let page = 1;
  const pageSize = 600;
  let totalEvents = 0;
  let fetchedEvents = 0;

  while (true) {
    const response = await fetch('https://cursor.com/api/dashboard/get-filtered-usage-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
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

    const data: UsageEventsData = await response.json();
    allEvents = allEvents.concat(data.usageEventsDisplay);

    if (page === 1) {
      totalEvents = data.totalUsageEventsCount;
    }
    fetchedEvents += data.usageEventsDisplay.length;

    // Call progress callback with current events
    if (onProgress) {
      onProgress(allEvents, { fetched: fetchedEvents, total: totalEvents });
    }

    page++;

    if (fetchedEvents >= totalEvents || data.usageEventsDisplay.length === 0) {
      break;
    }
  }

  return allEvents;
};

const ActivityChart: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [usageEventsLoading, setUsageEventsLoading] = useState(true);
  const [usageEventsProgress, setUsageEventsProgress] = useState({ fetched: 0, total: 0 });
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [usageEventsError, setUsageEventsError] = useState<string | null>(null);

  useEffect(() => {
    const startDate = new Date('2024-01-01T00:00:00Z').getTime().toString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999); // End of tomorrow to ensure we get all of today's data
    const endDate = tomorrow.getTime().toString();

    // Try to load usage events from localStorage cache
    const cachedEvents = loadCachedUsageEvents();
    if (cachedEvents && cachedEvents.length > 0) {
      setUsageEvents(cachedEvents);
      setUsageEventsLoading(false);
    }

    // Fetch analytics data independently
    const fetchAnalyticsData = async () => {
      try {
        const response = await fetch('https://cursor.com/api/dashboard/get-user-analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
          body: JSON.stringify({
            teamId: 0,
            userId: 0,
            startDate,
            endDate,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setAnalyticsData(data);
      } catch (e: unknown) {
        setAnalyticsError(e instanceof Error ? e.message : 'Unknown error');
      }
    };

    // Fetch usage events independently with progress updates
    const fetchUsageEventsData = async () => {
      try {
        setUsageEventsLoading(true);
        const finalEvents = await fetchAllUsageEvents(startDate, endDate, (events, progress) => {
          setUsageEvents(events);
          setUsageEventsProgress(progress);
        });
        setUsageEventsLoading(false);
        saveCachedUsageEvents(finalEvents); // Save events after successful fetch
      } catch (e: unknown) {
        setUsageEventsError(e instanceof Error ? e.message : 'Unknown error');
        setUsageEventsLoading(false);
      }
    };

    // Start both fetches independently
    fetchAnalyticsData();
    if (!cachedEvents || cachedEvents.length === 0) {
      fetchUsageEventsData();
    }
  }, []);

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

  const currentYear = new Date().getFullYear();
  const from = `${currentYear}-01-01`;
  const to = `${currentYear}-12-31`;

  // Calculate data for charts that are ready
  const usageData = analyticsData ? transformDataForUsageCalendar(analyticsData) : [];
  const acceptedLinesData = analyticsData
    ? transformDataForAcceptedLinesCalendar(analyticsData)
    : [];
  const daysOfWeekData = analyticsData ? transformDataForDaysOfWeek(analyticsData) : [];
  const heatmapData = analyticsData
    ? transformDataForLast7DaysHeatmap(analyticsData)
    : { messages: [], acceptedLines: [] };

  // Calculate tokens data from current usage events (even if still loading)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0); // Start of day 14 days ago
  const last14DaysUsageEvents = usageEvents.filter((event) => {
    const eventDate = new Date(parseInt(event.timestamp, 10));
    return eventDate >= fourteenDaysAgo;
  });
  const tokensData = transformDataForTokensBarChart(last14DaysUsageEvents);

  // Calculate cost data from current usage events for last 14 days
  const fourteenDaysAgoCost = new Date();
  fourteenDaysAgoCost.setDate(fourteenDaysAgoCost.getDate() - 14);
  fourteenDaysAgoCost.setHours(0, 0, 0, 0); // Start of day 14 days ago
  const last14DaysUsageEventsCost = usageEvents.filter((event) => {
    const eventDate = new Date(parseInt(event.timestamp, 10));
    return eventDate >= fourteenDaysAgoCost;
  });
  const costData = transformDataForCostBarChart(last14DaysUsageEventsCost);

  return (
    <div className="space-y-6">
      {/* AI Chat Requests - Shows when analyticsData is ready */}
      <div className="rounded-xl text-brand-foreground border-brand-neutrals-100 dark:border-brand-neutrals-800 border-0 bg-brand-dashboard-card p-6 dark:bg-brand-dashboard-card">
        <h3 className="text-base font-semibold text-gray-200">Agent Messages</h3>
        {analyticsError ? (
          <div className="text-red-500 text-sm mt-2">Error loading data: {analyticsError}</div>
        ) : !analyticsData ? (
          <div className="text-gray-50 text-sm mt-2">Loading...</div>
        ) : (
          <div style={{ height: '200px' }}>
            <UsageCalendar data={usageData} from={from} to={to} theme={theme} />
          </div>
        )}
      </div>

      {/* Accepted Code Suggestions - Shows when analyticsData is ready */}
      <div className="rounded-xl text-brand-foreground border-brand-neutrals-100 dark:border-brand-neutrals-800 border-0 bg-brand-dashboard-card p-6 dark:bg-brand-dashboard-card">
        <h3 className="text-base font-semibold text-gray-200">Accepted Lines of Code</h3>
        {analyticsError ? (
          <div className="text-red-500 text-sm mt-2">Error loading data: {analyticsError}</div>
        ) : !analyticsData ? (
          <div className="text-gray-50 text-sm mt-2">Loading...</div>
        ) : (
          <div style={{ height: '200px' }}>
            <AcceptedLinesCalendar data={acceptedLinesData} from={from} to={to} theme={theme} />
          </div>
        )}
      </div>

      {/* Last 7 Days Heatmap - Shows when analyticsData is ready */}
      <div className="rounded-xl text-brand-foreground border-brand-neutrals-100 dark:border-brand-neutrals-800 border-0 bg-brand-dashboard-card p-6 dark:bg-brand-dashboard-card">
        <h3 className="text-base font-semibold text-gray-200">Last 7 Days Activity</h3>
        {analyticsError ? (
          <div className="text-red-500 text-sm mt-2">Error loading data: {analyticsError}</div>
        ) : !analyticsData ? (
          <div className="text-gray-50 text-sm mt-2">Loading...</div>
        ) : (
          <div style={{ height: '240px' }}>
            <Last7DaysHeatmap data={heatmapData} theme={theme} />
          </div>
        )}
      </div>

      {/* Days of Week Distribution - Shows when analyticsData is ready */}
      <div className="rounded-xl text-brand-foreground border-brand-neutrals-100 dark:border-brand-neutrals-800 border-0 bg-brand-dashboard-card p-6 dark:bg-brand-dashboard-card">
        <h3 className="text-base font-semibold text-gray-200">Usage by Day of Week</h3>
        {analyticsError ? (
          <div className="text-red-500 text-sm mt-2">Error loading data: {analyticsError}</div>
        ) : !analyticsData ? (
          <div className="text-gray-50 text-sm mt-2">Loading...</div>
        ) : (
          <div style={{ height: '300px' }}>
            <DaysOfWeekDistribution data={daysOfWeekData} theme={theme} />
          </div>
        )}
      </div>

      {/* Token Usage - Updates progressively as data loads */}
      <div className="rounded-xl text-brand-foreground border-brand-neutrals-100 dark:border-brand-neutrals-800 border-0 bg-brand-dashboard-card p-6 dark:bg-brand-dashboard-card">
        <h3 className="text-base font-semibold text-gray-200">
          Token Usage (last 14 days)
          {usageEventsLoading && usageEventsProgress.total > 0 && (
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({Math.round((usageEventsProgress.fetched / usageEventsProgress.total) * 100)}%
              loaded)
            </span>
          )}
        </h3>
        <p className="px-6 text-sm text-gray-500">
          Approximation of token usage. Does not include data from models like GPT-4o, Claude 3
          Opus, etc.
        </p>
        {usageEventsError ? (
          <div className="text-red-500 text-sm mt-2 px-6">
            Error loading usage data: {usageEventsError}
          </div>
        ) : (
          <div style={{ height: '400px' }} className="p-3">
            {tokensData.length === 0 && usageEventsLoading ? (
              <div className="flex items-center justify-center h-full text-gray-50 text-sm">
                Loading usage events...
              </div>
            ) : (
              <TokensBarChart data={tokensData} theme={theme} />
            )}
          </div>
        )}
      </div>

      {/* Cost Usage - Updates progressively as data loads */}
      <div className="rounded-xl text-brand-foreground border-brand-neutrals-100 dark:border-brand-neutrals-800 border-0 bg-brand-dashboard-card p-6 dark:bg-brand-dashboard-card">
        <h3 className="text-base font-semibold text-gray-200">
          Cost Usage (last 14 days)
          {usageEventsLoading && usageEventsProgress.total > 0 && (
            <span className="text-sm font-normal text-gray-400 ml-2">
              ({Math.round((usageEventsProgress.fetched / usageEventsProgress.total) * 100)}%
              loaded)
            </span>
          )}
        </h3>
        <p className="px-6 text-sm text-gray-500">
          Daily cost breakdown for API usage in cents, split by subscription and usage-based costs.
        </p>
        {usageEventsError ? (
          <div className="text-red-500 text-sm mt-2 px-6">
            Error loading usage data: {usageEventsError}
          </div>
        ) : (
          <div style={{ height: '400px' }} className="p-3">
            {costData.length === 0 && usageEventsLoading ? (
              <div className="flex items-center justify-center h-full text-gray-50 text-sm">
                Loading usage events...
              </div>
            ) : (
              <CostBarChart data={costData} theme={theme} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityChart;
