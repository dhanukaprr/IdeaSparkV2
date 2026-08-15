import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firestore with the provisioned custom database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// Ensure anonymous authentication for multi-device sync
let authInitPromise: Promise<string> | null = null;
export async function ensureAuth(): Promise<string> {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  if (!authInitPromise) {
    authInitPromise = (async () => {
      try {
        const cred = await signInAnonymously(auth);
        return cred.user.uid;
      } catch (err) {
        console.warn('Anonymous auth note (proceeding in guest mode):', err);
        return 'anon_' + Math.random().toString(36).substring(2, 9);
      }
    })();
  }
  return authInitPromise;
}

// Auto-trigger auth on load
if (typeof window !== 'undefined') {
  ensureAuth().catch(console.error);
}
