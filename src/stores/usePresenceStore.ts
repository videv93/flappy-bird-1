import { create } from 'zustand';

export interface PresenceMember {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export type ConnectionMode = 'realtime' | 'polling' | 'disconnected';

interface PresenceState {
  members: Map<string, PresenceMember>;
  currentChannel: string | null;
  isConnected: boolean;
  connectionMode: ConnectionMode;

  joinChannel: (channelName: string) => void;
  leaveChannel: () => void;
  setMembers: (members: Map<string, PresenceMember>) => void;
  addMember: (member: PresenceMember) => void;
  removeMember: (memberId: string) => void;
  setConnectionMode: (mode: ConnectionMode) => void;
  reset: () => void;
}

const initialState = {
  members: new Map<string, PresenceMember>(),
  currentChannel: null as string | null,
  isConnected: false,
  connectionMode: 'disconnected' as ConnectionMode,
};

export const usePresenceStore = create<PresenceState>()((set) => ({
  ...initialState,

  joinChannel: (channelName: string) =>
    set({
      currentChannel: channelName,
    }),

  leaveChannel: () =>
    set({
      currentChannel: null,
      isConnected: false,
      connectionMode: 'disconnected',
      members: new Map(),
    }),

  setMembers: (members: Map<string, PresenceMember>) => set({ members }),

  addMember: (member: PresenceMember) =>
    set((state) => {
      const newMembers = new Map(state.members);
      newMembers.set(member.id, member);
      return { members: newMembers };
    }),

  removeMember: (memberId: string) =>
    set((state) => {
      const newMembers = new Map(state.members);
      newMembers.delete(memberId);
      return { members: newMembers };
    }),

  setConnectionMode: (mode: ConnectionMode) =>
    set({ connectionMode: mode, isConnected: mode !== 'disconnected' }),

  reset: () => set({ ...initialState, members: new Map() }),
}));
