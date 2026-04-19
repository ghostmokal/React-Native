import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInAnonymously } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

export interface AuthUser {
  uid: string;
  displayName: string;
  avatarColor: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  setDisplayName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setDisplayName: async () => {},
});

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#DDA0DD', '#F7DC6F', '#BB8FCE', '#82E0AA',
];

function getAvatarColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    try {
      const savedName = await AsyncStorage.getItem('chat_displayName');
      const credential = await signInAnonymously(auth);
      const uid = credential.user.uid;
      const avatarColor = getAvatarColor(uid);

      if (savedName) {
        setUser({ uid, displayName: savedName, avatarColor });
      }
    } catch (error) {
      console.error('Auth init error:', error);
    } finally {
      setLoading(false);
    }
  };

  const setDisplayName = useCallback(async (name: string) => {
    await AsyncStorage.setItem('chat_displayName', name);
    const uid = auth?.currentUser?.uid ?? Date.now().toString();
    const avatarColor = getAvatarColor(uid);
    setUser({ uid, displayName: name, avatarColor });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
