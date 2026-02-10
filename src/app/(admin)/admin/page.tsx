import { BookCheck, Shield, Users, BarChart3 } from 'lucide-react';
import { getDashboardStats } from '@/actions/admin/getDashboardStats';
import { DashboardStatCard } from '@/components/features/admin/DashboardStatCard';
import { AdminActivityLog } from '@/components/features/admin/AdminActivityLog';

export default async function AdminDashboardPage() {
  const result = await getDashboardStats();

  if (!result.success) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  const { pendingClaimsCount, moderationCount, userWarningCount, totalUsersCount, recentActions } = result.data;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6">
      <h2 className="text-xl font-semibold mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardStatCard
          label="Pending Claims"
          count={pendingClaimsCount}
          icon={BookCheck}
          href="/admin/claims"
        />
        <DashboardStatCard
          label="Moderation Queue"
          count={moderationCount}
          icon={Shield}
          href="/admin/moderation"
        />
        <DashboardStatCard
          label="User Warnings"
          count={userWarningCount}
          icon={Users}
        />
        <DashboardStatCard
          label="Total Users"
          count={totalUsersCount}
          icon={BarChart3}
          href="/admin/metrics"
        />
      </div>

      <div>
        <h3 className="text-lg font-medium mb-3">Recent Activity</h3>
        <AdminActivityLog actions={recentActions} />
      </div>
    </div>
  );
}
