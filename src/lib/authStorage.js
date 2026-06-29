/**
 * Ultra-robust persistent authentication storage manager for Romety.
 * Protects session state across app restarts, force-closes, PWA reloads, and mobile WebKit storage purges.
 */

const STORAGE_KEYS = [
  'romety_user_session',
  'romety_mock_user',
  'romety_persistent_user',
  'base44_user_session'
];

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Helper to format cookie string with explicit GMT Expires date
const formatCookie = (key, valueStr) => {
  const expiresDate = new Date(Date.now() + ONE_YEAR_MS).toUTCString();
  return `${key}=${encodeURIComponent(valueStr)}; path=/; expires=${expiresDate}; max-age=31536000; SameSite=Lax`;
};

const formatClearCookie = (key) => {
  return `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax`;
};

// ── In-Memory Backup Cache ──
let inMemoryUser = null;

// ── IndexedDB Operations for mobile resilience ──
const DB_NAME = 'romety_auth_db';
const STORE_NAME = 'session_store';

const openDB = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
};

const setIDBUser = async (userObj) => {
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(userObj, 'active_user');
  } catch (e) {}
};

const getIDBUser = async () => {
  try {
    const db = await openDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('active_user');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

const clearIDBUser = async () => {
  try {
    const db = await openDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete('active_user');
  } catch (e) {}
};

export const authStorage = {
  /**
   * Synchronously attempts to recover logged in user from all available synchronous stores.
   */
  getUserSync: () => {
    if (inMemoryUser && (inMemoryUser.email || inMemoryUser.user_email)) {
      return inMemoryUser;
    }

    let foundUser = null;

    // 1. Check localStorage across all keys
    for (const key of STORAGE_KEYS) {
      try {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          if (parsed && (parsed.email || parsed.user_email || parsed.id)) {
            foundUser = parsed;
            break;
          }
        }
      } catch (e) {}
    }

    // 2. Check sessionStorage if not found
    if (!foundUser) {
      for (const key of STORAGE_KEYS) {
        try {
          const val = sessionStorage.getItem(key);
          if (val) {
            const parsed = JSON.parse(val);
            if (parsed && (parsed.email || parsed.user_email || parsed.id)) {
              foundUser = parsed;
              break;
            }
          }
        } catch (e) {}
      }
    }

    // 3. Check cookies if not found
    if (!foundUser && typeof document !== 'undefined') {
      try {
        for (const key of STORAGE_KEYS) {
          const regex = new RegExp(`(?:^|; )${key}=([^;]*)`);
          const match = document.cookie.match(regex);
          if (match && match[1]) {
            const parsed = JSON.parse(decodeURIComponent(match[1]));
            if (parsed && (parsed.email || parsed.user_email || parsed.id)) {
              foundUser = parsed;
              break;
            }
          }
        }
      } catch (e) {}
    }

    if (foundUser) {
      inMemoryUser = foundUser;
      // Self-heal synchronous stores asynchronously
      setTimeout(() => authStorage.saveUser(foundUser), 0);
    }

    return foundUser;
  },

  /**
   * Asynchronously attempts to recover user, including IndexedDB fallback.
   */
  getUserAsync: async () => {
    const syncUser = authStorage.getUserSync();
    if (syncUser) return syncUser;

    const idbUser = await getIDBUser();
    if (idbUser && (idbUser.email || idbUser.user_email || idbUser.id)) {
      inMemoryUser = idbUser;
      authStorage.saveUser(idbUser);
      return idbUser;
    }

    return null;
  },

  /**
   * Saves user to ALL storage mediums with long expiration.
   */
  saveUser: (userObj) => {
    if (!userObj) return;
    // Normalize email field for consistency
    if (!userObj.email && userObj.user_email) {
      userObj.email = userObj.user_email;
    }
    inMemoryUser = userObj;
    const str = JSON.stringify(userObj);

    // Write to localStorage
    STORAGE_KEYS.forEach((key) => {
      try { localStorage.setItem(key, str); } catch (e) {}
    });

    // Write to sessionStorage
    STORAGE_KEYS.forEach((key) => {
      try { sessionStorage.setItem(key, str); } catch (e) {}
    });

    // Write to cookies with explicit GMT Expires
    if (typeof document !== 'undefined') {
      STORAGE_KEYS.forEach((key) => {
        try { document.cookie = formatCookie(key, str); } catch (e) {}
      });
    }

    // Write to IndexedDB
    setIDBUser(userObj);
  },

  /**
   * Clears user from ALL storage mediums.
   */
  clearUser: () => {
    inMemoryUser = null;
    STORAGE_KEYS.forEach((key) => {
      try { localStorage.removeItem(key); } catch (e) {}
      try { sessionStorage.removeItem(key); } catch (e) {}
    });

    if (typeof document !== 'undefined') {
      STORAGE_KEYS.forEach((key) => {
        try { document.cookie = formatClearCookie(key); } catch (e) {}
      });
    }

    clearIDBUser();
  }
};
