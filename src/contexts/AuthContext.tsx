'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '../utils/supabase';
import { Profile, Tenant, AuthState, UserRole } from '../types';
import { hasPermission } from '../lib/auth';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role?: UserRole) => Promise<{ error: string | null; tenantId?: string }>;
  signOut: () => Promise<void>;
  checkPermission: (permission: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return null;
      }
      return data as Profile;
    } catch {
      return null;
    }
  }, [supabase]);

  const fetchTenant = useCallback(async (tenantId: string) => {
    try {
      const { data, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError) {
        console.error('Tenant fetch error:', tenantError);
        return null;
      }
      return data as Tenant;
    } catch {
      return null;
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) {
      setProfile(p);
      if (p.tenant_id) {
        const t = await fetchTenant(p.tenant_id);
        setTenant(t);
      }
    }
  }, [user, fetchProfile, fetchTenant]);

  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        const p = await fetchProfile(session.user.id);
        if (p) {
          setProfile(p);
          if (p.tenant_id) {
            const t = await fetchTenant(p.tenant_id);
            setTenant(t);
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, fetchProfile, fetchTenant]);

  useEffect(() => {
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: Session | null) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (p) {
            setProfile(p);
            if (p.tenant_id) {
              const t = await fetchTenant(p.tenant_id);
              setTenant(t);
            }
          }
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setTenant(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: UserRole = 'hotel_admin') => {
    try {
      setError(null);

      // 1. Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role }
        }
      });

      if (signUpError) return { error: signUpError.message };

      // 2. If hotel_admin, create tenant
      let tenantId: string | undefined;
      if (role === 'hotel_admin' && data.user) {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .insert({
            name: `${fullName} Oteli`,
            slug: fullName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            owner_id: data.user.id,
            status: 'inactive',
            subscription_plan: 'none',
            subscription_expires_at: new Date(Date.now() - 1000).toISOString()
          })
          .select()
          .single();

        if (!tenantError && tenantData) {
          tenantId = tenantData.id;
          // Update profile with tenant_id
          await supabase
            .from('profiles')
            .update({ tenant_id: tenantData.id, role: 'hotel_admin' })
            .eq('id', data.user.id);

          // Create default locations
          await supabase
            .from('locations')
            .insert([
              { tenant_id: tenantData.id, name: 'Resepsiyon', slug: 'reception', icon: 'Building' },
              { tenant_id: tenantData.id, name: 'Restoran', slug: 'restaurant', icon: 'UtensilsCrossed' },
              { tenant_id: tenantData.id, name: 'Bar', slug: 'bar', icon: 'Wine' },
              { tenant_id: tenantData.id, name: 'Spa', slug: 'spa', icon: 'Sparkles' },
            ]);
        }
      }

      return { error: null, tenantId };
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const signOutFn = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setTenant(null);
  };

  const checkPermission = (permission: string): boolean => {
    if (!profile) return false;
    return hasPermission(profile.role, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        tenant,
        isLoading,
        error,
        signIn,
        signUp,
        signOut: signOutFn,
        checkPermission,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
