import { base44 } from '@/api/base44Client';

/**
 * Safely get the current user. Returns null if not logged in or token expired.
 * Prevents pages from hanging on an infinite loading spinner.
 */
export const getUser = async () => {
  try {
    return await base44.auth.me();
  } catch {
    return null;
  }
};