import { useAuth } from '@/lib/AuthContext';

/**
 * Returns the current user from AuthContext (already loaded, no extra network call).
 * - undefined: auth is still loading (don't trigger loadData yet)
 * - null: user is not logged in
 * - object: user is logged in
 */
export const useUser = () => {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return undefined; // signal: still loading
  return user; // null or user object
};