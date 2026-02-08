import PusherClient from 'pusher-js';

let pusherClient: PusherClient | null = null;

export function getPusherClient(): PusherClient | null {
  if (typeof window === 'undefined') return null;
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY || !process.env.NEXT_PUBLIC_PUSHER_CLUSTER) {
    console.warn('Pusher env vars not configured — real-time notifications disabled');
    return null;
  }
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      authEndpoint: '/api/pusher/auth',
    });
  }
  return pusherClient;
}
