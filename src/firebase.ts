import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Primary Firestore instance (configured database ID or default)
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Secondary fallback Firestore instance (default database)
export const fallbackDb: Firestore = getFirestore(app);

// Non-blocking anonymous auth for multi-device sync
let authInitPromise: Promise<string> | null = null;
export async function ensureAuth(): Promise<string> {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  if (!authInitPromise) {
    authInitPromise = (async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 1500)
        );
        const cred = await Promise.race([signInAnonymously(auth), timeoutPromise]);
        return cred.user.uid;
      } catch (err) {
        // Fallback to guest mode
        return 'anon_' + Math.random().toString(36).substring(2, 11);
      }
    })();
  }
  return authInitPromise;
}

// Trigger background auth initialization on load
if (typeof window !== 'undefined') {
  ensureAuth().catch(() => {});
}
