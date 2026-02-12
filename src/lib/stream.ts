import { StreamChat } from 'stream-chat';

let _client: StreamChat | null = null;

export function getStreamServerClient(): StreamChat {
  if (_client) return _client;

  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error(
      'Missing Stream environment variables: STREAM_API_KEY and STREAM_API_SECRET must be set',
    );
  }

  _client = StreamChat.getInstance(apiKey, apiSecret);
  return _client;
}
