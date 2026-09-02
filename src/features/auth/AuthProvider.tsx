import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { getSupabaseClient } from '../../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  passwordRecovery: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;
    let receivedAuthEvent = false;

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      receivedAuthEvent = true;
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
      setLoading(false);
    });

    // getSession is a fallback for clients/tests where INITIAL_SESSION is delayed.
    // Never let this initial snapshot overwrite a newer callback/session event.
    void supabase.auth.getSession()
      .then(({ data: sessionData }) => {
        if (!active || receivedAuthEvent) return;
        setSession(sessionData.session);
        setLoading(false);
      })
      .catch(() => {
        if (!active || receivedAuthEvent) return;
        setLoading(false);
      });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ session, loading, passwordRecovery }), [session, loading, passwordRecovery]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
