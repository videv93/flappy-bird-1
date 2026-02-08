import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getPusher } from '@/lib/pusher-server';

export async function POST(request: NextRequest) {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = await request.formData();
  const socketId = body.get('socket_id') as string;
  const channel = body.get('channel_name') as string;

  const isPrivateUserChannel = channel === `private-user-${session.user.id}`;
  const isPresenceRoomChannel = channel.startsWith('presence-room-');

  if (!isPrivateUserChannel && !isPresenceRoomChannel) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const pusher = getPusher();
  if (!pusher) {
    return NextResponse.json({ error: 'Pusher not configured' }, { status: 503 });
  }

  if (isPresenceRoomChannel) {
    const authResponse = pusher.authorizeChannel(socketId, channel, {
      user_id: session.user.id,
      user_info: {
        name: session.user.name || 'Anonymous',
        avatarUrl: session.user.image || null,
      },
    });
    return NextResponse.json(authResponse);
  }

  const authResponse = pusher.authorizeChannel(socketId, channel, {
    user_id: session.user.id,
  });

  return NextResponse.json(authResponse);
}
