import { useMemo, useState } from 'react';
import { clearSession, getUser } from '../lib/auth';

export function useAuthState() {
  const [user, setUser] = useState(getUser());
  const isAuthed = useMemo(() => !!user, [user]);
  const logout = () => {
    clearSession();
    setUser(null);
  };
  return { user, setUser, isAuthed, logout };
}
