'use client';

import { useEffect, useState } from 'react';
import { StreamChat } from 'stream-chat';
import { Chat } from 'stream-chat-react';
import { useSession } from '@/lib/auth-client';
import { generateStreamToken } from '@/actions/stream';

export function StreamChatProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY;
    if (!apiKey || !session?.user) {
      return;
    }

    const client = StreamChat.getInstance(apiKey);
    let didCancel = false;

    async function connectUser() {
      try {
        const result = await generateStreamToken();
        if (didCancel || !result.success) return;

        await client.connectUser(
          {
            id: session!.user.id,
            name: session!.user.name ?? undefined,
            image: session!.user.image ?? undefined,
          },
          result.data.token,
        );

        if (!didCancel) {
          setChatClient(client);
        }
      } catch (error) {
        console.error('Failed to connect Stream Chat user:', error);
      }
    }

    connectUser();

    return () => {
      didCancel = true;
      setChatClient(null);
      client.disconnectUser();
    };
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!chatClient) {
    return <>{children}</>;
  }

  return <Chat client={chatClient}>{children}</Chat>;
}
