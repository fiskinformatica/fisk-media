import { initializeApp } from 'firebase/app'
import { doc, getDoc, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let _db = null

function getDb() {
  if (!_db) {
    const app = initializeApp(firebaseConfig)
    _db = getFirestore(app)
  }
  return _db
}

/**
 * Fetches the access config document from Firestore (config/access).
 * Returns null if Firebase is not configured or the document doesn't exist.
 *
 * Expected document shape:
 *   { staffPin: string, dailySalt: string }
 */
export async function fetchAccessConfig() {
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) return null

  try {
    const firestore = getDb()
    const ref = doc(firestore, 'config', 'access')
    const snap = await getDoc(ref)
    return snap.exists() ? snap.data() : null
  } catch (error) {
    console.warn('[Firebase] Could not load access config:', error.message)
    return null
  }
}
