'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useSession as useBetterAuthSession } from '@/lib/auth-client';

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface Session {
  user: User;
}

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useBetterAuthSession();

  const value: AuthContextValue = {
    session: session
      ? {
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name ?? null,
            image: session.user.image ?? null,
          },
        }
      : null,
    isLoading: isPending,
    isAuthenticated: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
