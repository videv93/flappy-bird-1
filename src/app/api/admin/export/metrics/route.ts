import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/admin';

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!adminUser || !isAdmin(adminUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const [totalUsers, totalSessions, totalKudos, totalBooks, totalFollows] = await Promise.all([
      prisma.user.count(),
      prisma.readingSession.count(),
      prisma.kudos.count(),
      prisma.book.count(),
      prisma.follow.count(),
    ]);

    const readingTime = await prisma.readingSession.aggregate({ _sum: { duration: true } });
    const totalHours = Math.round(((readingTime._sum.duration ?? 0) / 3600) * 10) / 10;

    const activeStreaks = await prisma.userStreak.count({ where: { currentStreak: { gt: 0 } } });
    const verifiedAuthors = await prisma.authorClaim.count({ where: { status: 'APPROVED' } });
    const pendingClaims = await prisma.authorClaim.count({ where: { status: 'PENDING' } });

    const rows = [
      ['Metric', 'Value', 'Export Date'],
      ['Total Users', String(totalUsers), now.toISOString()],
      ['Total Reading Sessions', String(totalSessions), now.toISOString()],
      ['Total Reading Time (hours)', String(totalHours), now.toISOString()],
      ['Active Streaks', String(activeStreaks), now.toISOString()],
      ['Total Kudos', String(totalKudos), now.toISOString()],
      ['Total Follows', String(totalFollows), now.toISOString()],
      ['Total Books', String(totalBooks), now.toISOString()],
      ['Verified Authors', String(verifiedAuthors), now.toISOString()],
      ['Pending Author Claims', String(pendingClaims), now.toISOString()],
    ];

    const csv = rows.map((row) => row.join(',')).join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="platform-metrics-${now.toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export metrics error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
