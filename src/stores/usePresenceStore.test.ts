import { describe, it, expect, beforeEach } from 'vitest';
import { usePresenceStore, type PresenceMember } from './usePresenceStore';

describe('usePresenceStore', () => {
  beforeEach(() => {
    usePresenceStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts with empty members', () => {
      const state = usePresenceStore.getState();
      expect(state.members.size).toBe(0);
    });

    it('starts with no channel', () => {
      expect(usePresenceStore.getState().currentChannel).toBeNull();
    });

    it('starts disconnected', () => {
      const state = usePresenceStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.connectionMode).toBe('disconnected');
    });
  });

  describe('joinChannel', () => {
    it('sets the current channel name', () => {
      usePresenceStore.getState().joinChannel('presence-room-book-123');
      expect(usePresenceStore.getState().currentChannel).toBe('presence-room-book-123');
    });

    it('does not change connection mode', () => {
      usePresenceStore.getState().joinChannel('presence-room-book-123');
      expect(usePresenceStore.getState().connectionMode).toBe('disconnected');
    });

    it('does not change isConnected', () => {
      usePresenceStore.getState().joinChannel('presence-room-book-123');
      expect(usePresenceStore.getState().isConnected).toBe(false);
    });
  });

  describe('leaveChannel', () => {
    it('clears the current channel', () => {
      usePresenceStore.getState().joinChannel('presence-room-book-123');
      usePresenceStore.getState().leaveChannel();
      expect(usePresenceStore.getState().currentChannel).toBeNull();
    });

    it('sets connected to false', () => {
      usePresenceStore.getState().joinChannel('presence-room-book-123');
      usePresenceStore.getState().leaveChannel();
      expect(usePresenceStore.getState().isConnected).toBe(false);
    });

    it('sets connection mode to disconnected', () => {
      usePresenceStore.getState().joinChannel('presence-room-book-123');
      usePresenceStore.getState().leaveChannel();
      expect(usePresenceStore.getState().connectionMode).toBe('disconnected');
    });

    it('clears the members list', () => {
      const member: PresenceMember = { id: 'u1', name: 'Alice', avatarUrl: null };
      usePresenceStore.getState().addMember(member);
      usePresenceStore.getState().leaveChannel();
      expect(usePresenceStore.getState().members.size).toBe(0);
    });
  });

  describe('setMembers', () => {
    it('replaces the entire members map', () => {
      const members = new Map<string, PresenceMember>([
        ['u1', { id: 'u1', name: 'Alice', avatarUrl: null }],
        ['u2', { id: 'u2', name: 'Bob', avatarUrl: 'https://example.com/bob.jpg' }],
      ]);
      usePresenceStore.getState().setMembers(members);
      expect(usePresenceStore.getState().members.size).toBe(2);
      expect(usePresenceStore.getState().members.get('u1')?.name).toBe('Alice');
    });
  });

  describe('addMember', () => {
    it('adds a member to the map', () => {
      usePresenceStore.getState().addMember({ id: 'u1', name: 'Alice', avatarUrl: null });
      expect(usePresenceStore.getState().members.size).toBe(1);
      expect(usePresenceStore.getState().members.get('u1')?.name).toBe('Alice');
    });

    it('updates existing member if same id', () => {
      usePresenceStore.getState().addMember({ id: 'u1', name: 'Alice', avatarUrl: null });
      usePresenceStore.getState().addMember({ id: 'u1', name: 'Alice Updated', avatarUrl: 'new.jpg' });
      expect(usePresenceStore.getState().members.size).toBe(1);
      expect(usePresenceStore.getState().members.get('u1')?.name).toBe('Alice Updated');
    });

    it('adds multiple members', () => {
      usePresenceStore.getState().addMember({ id: 'u1', name: 'Alice', avatarUrl: null });
      usePresenceStore.getState().addMember({ id: 'u2', name: 'Bob', avatarUrl: null });
      expect(usePresenceStore.getState().members.size).toBe(2);
    });
  });

  describe('removeMember', () => {
    it('removes a member by id', () => {
      usePresenceStore.getState().addMember({ id: 'u1', name: 'Alice', avatarUrl: null });
      usePresenceStore.getState().addMember({ id: 'u2', name: 'Bob', avatarUrl: null });
      usePresenceStore.getState().removeMember('u1');
      expect(usePresenceStore.getState().members.size).toBe(1);
      expect(usePresenceStore.getState().members.has('u1')).toBe(false);
      expect(usePresenceStore.getState().members.has('u2')).toBe(true);
    });

    it('does nothing if member id not found', () => {
      usePresenceStore.getState().addMember({ id: 'u1', name: 'Alice', avatarUrl: null });
      usePresenceStore.getState().removeMember('nonexistent');
      expect(usePresenceStore.getState().members.size).toBe(1);
    });
  });

  describe('setConnectionMode', () => {
    it('sets connection mode to polling', () => {
      usePresenceStore.getState().setConnectionMode('polling');
      expect(usePresenceStore.getState().connectionMode).toBe('polling');
      expect(usePresenceStore.getState().isConnected).toBe(true);
    });

    it('sets connection mode to disconnected', () => {
      usePresenceStore.getState().joinChannel('test');
      usePresenceStore.getState().setConnectionMode('disconnected');
      expect(usePresenceStore.getState().connectionMode).toBe('disconnected');
      expect(usePresenceStore.getState().isConnected).toBe(false);
    });

    it('sets connection mode to realtime', () => {
      usePresenceStore.getState().setConnectionMode('realtime');
      expect(usePresenceStore.getState().connectionMode).toBe('realtime');
      expect(usePresenceStore.getState().isConnected).toBe(true);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      usePresenceStore.getState().joinChannel('presence-room-book-123');
      usePresenceStore.getState().addMember({ id: 'u1', name: 'Alice', avatarUrl: null });
      usePresenceStore.getState().reset();

      const state = usePresenceStore.getState();
      expect(state.members.size).toBe(0);
      expect(state.currentChannel).toBeNull();
      expect(state.isConnected).toBe(false);
      expect(state.connectionMode).toBe('disconnected');
    });
  });
});
