// Auth feature types

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface Session {
  user: User;
}

export interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface OAuthButtonsProps {
  callbackUrl?: string;
}
