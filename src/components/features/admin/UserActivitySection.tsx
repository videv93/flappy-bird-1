'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { UserDetailResult } from '@/actions/admin/getUserDetail';

interface UserActivitySectionProps {
  recentActivity: UserDetailResult['recentActivity'];
  moderationSummary: UserDetailResult['moderationSummary'];
}

export function UserActivitySection({ recentActivity, moderationSummary }: UserActivitySectionProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Last login: </span>
            {recentActivity.lastLogin
              ? new Date(recentActivity.lastLogin).toLocaleString()
              : 'Never'}
          </div>
          <div>
            <span className="text-muted-foreground">Current reading room: </span>
            {recentActivity.currentRoom
              ? `In room (joined ${new Date(recentActivity.currentRoom.joinedAt).toLocaleString()})`
              : 'None'}
          </div>

          {recentActivity.recentKudosGiven.length > 0 && (
            <div>
              <span className="text-muted-foreground block mb-1">
                Recent kudos given ({recentActivity.recentKudosGiven.length})
              </span>
              <div className="space-y-1">
                {recentActivity.recentKudosGiven.map((k) => (
                  <div key={k.id} className="text-xs text-muted-foreground">
                    To {k.receiverId} - {new Date(k.createdAt).toLocaleDateString()}
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentActivity.recentKudosReceived.length > 0 && (
            <div>
              <span className="text-muted-foreground block mb-1">
                Recent kudos received ({recentActivity.recentKudosReceived.length})
              </span>
              <div className="space-y-1">
                {recentActivity.recentKudosReceived.map((k) => (
                  <div key={k.id} className="text-xs text-muted-foreground">
                    From {k.giverId} - {new Date(k.createdAt).toLocaleDateString()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Moderation Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground block">Warnings</span>
            <span>{moderationSummary.warningCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Suspensions</span>
            <span>{moderationSummary.suspensionCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Flags Received</span>
            <span>{moderationSummary.flagsReceived}</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Flags Submitted</span>
            <span>{moderationSummary.flagsSubmitted}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
