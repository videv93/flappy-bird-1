import { Users, BookOpen, Heart, Library } from 'lucide-react';
import { getPlatformMetrics } from '@/actions/admin/getPlatformMetrics';
import { getMetricsTrends } from '@/actions/admin/getMetricsTrends';
import { MetricsCategoryCard } from '@/components/features/admin/MetricsCategoryCard';
import type { MetricRow } from '@/components/features/admin/MetricsCategoryCard';
import type { MetricsTrends } from '@/actions/admin/getMetricsTrends';
import { MetricsBreakdownView } from '@/components/features/admin/MetricsBreakdownView';

export const dynamic = 'force-dynamic';

export default async function MetricsPage() {
  const [metricsResult, trendsResult] = await Promise.all([
    getPlatformMetrics(),
    getMetricsTrends(),
  ]);

  if (!metricsResult.success) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <p className="text-destructive">{metricsResult.error}</p>
      </div>
    );
  }

  const metrics = metricsResult.data;
  const trends: MetricsTrends | null = trendsResult.success ? trendsResult.data : null;

  const userMetrics: MetricRow[] = [
    { label: 'Total Users', value: metrics.user.totalUsers, trend: trends?.newUsers },
    { label: 'New Today', value: metrics.user.newUsersToday },
    { label: 'New This Week', value: metrics.user.newUsersThisWeek },
    { label: 'New This Month', value: metrics.user.newUsersThisMonth },
    { label: 'DAU', value: metrics.user.dailyActiveUsers },
    { label: 'MAU', value: metrics.user.monthlyActiveUsers },
    { label: 'DAU/MAU Ratio', value: metrics.user.dauMauRatio },
  ];

  const engagementMetrics: MetricRow[] = [
    {
      label: 'Total Sessions',
      value: metrics.engagement.totalSessions,
      trend: trends?.activeSessions,
    },
    { label: 'Total Reading Time', value: `${metrics.engagement.totalReadingTimeHours}h` },
    { label: 'Avg Session', value: `${metrics.engagement.avgSessionDurationMinutes}m` },
    { label: 'Active Streaks', value: metrics.engagement.activeStreaks },
    { label: 'Avg Streak Length', value: metrics.engagement.avgStreakLength },
  ];

  const socialMetrics: MetricRow[] = [
    { label: 'Kudos Today', value: metrics.social.kudosToday, trend: trends?.kudosGiven },
    { label: 'Kudos All-Time', value: metrics.social.kudosAllTime },
    { label: 'Active Rooms', value: metrics.social.activeReadingRooms },
    { label: 'Total Follows', value: metrics.social.totalFollows },
  ];

  const contentMetrics: MetricRow[] = [
    { label: 'Books in System', value: metrics.content.totalBooks, trend: trends?.newBooks },
    { label: 'Verified Authors', value: metrics.content.verifiedAuthors },
    { label: 'Pending Claims', value: metrics.content.pendingAuthorClaims },
  ];

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold mb-6">Platform Health Metrics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <MetricsCategoryCard title="Users" icon={Users} metrics={userMetrics} />
        <MetricsCategoryCard title="Engagement" icon={BookOpen} metrics={engagementMetrics} />
        <MetricsCategoryCard title="Social" icon={Heart} metrics={socialMetrics} />
        <MetricsCategoryCard title="Content" icon={Library} metrics={contentMetrics} />
      </div>

      <MetricsBreakdownView />
    </div>
  );
}
