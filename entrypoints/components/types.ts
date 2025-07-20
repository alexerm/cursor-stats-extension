export interface DailyMetric {
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

export interface AnalyticsData {
  dailyMetrics: DailyMetric[];
  period: {
    startDate: string;
    endDate: string;
  };
  totalMembersInTeam: number;
}

export interface CalendarData {
  day: string;
  value: number;
}

export interface BarChartData {
  day: string;
  subscription: number;
  usage: number;
  [key: string]: string | number;
}

export interface CostData {
  day: string;
  subscription: number;
  usage: number;
  [key: string]: string | number;
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheWriteTokens?: number;
  cacheReadTokens?: number;
  totalCents?: number;
}

export interface UsageEvent {
  timestamp: string;
  model: string;
  kind: string;
  requestsCosts?: number;
  usageBasedCosts?: string;
  isTokenBasedCall: boolean;
  tokenUsage?: TokenUsage;
  owningUser: string;
}

export interface UsageEventsData {
  totalUsageEventsCount: number;
  usageEventsDisplay: UsageEvent[];
}
