import { initializeApp } from 'firebase/app'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let _app = null
let _db = null
let _auth = null

function getAppInstance() {
  if (!_app) {
    _app = initializeApp(firebaseConfig)
  }
  return _app
}

function getDb() {
  if (!_db) {
    _db = getFirestore(getAppInstance())
  }
  return _db
}

export function getFirebaseAuth() {
  if (!_auth) {
    _auth = getAuth(getAppInstance())
  }
  return _auth
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

/**
 * Updates staffPin in Firestore (config/access).
 * Requires the user to be authenticated in Firebase Auth.
 */
export async function saveStaffPinToFirestore(newPin) {
  if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) return false

  const firestore = getDb()
  const ref = doc(firestore, 'config', 'access')
  await setDoc(ref, { staffPin: newPin }, { merge: true })
  return true
}

/**
 * Signs in an admin user using email and password.
 */
export async function signInAdmin(email, password) {
  const auth = getFirebaseAuth()
  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

/**
 * Signs out the admin user.
 */
export async function signOutAdmin() {
  const auth = getFirebaseAuth()
  await signOut(auth)
}

/**
 * Listens to authentication state changes.
 */
export function onAdminAuthStateChanged(callback) {
  const auth = getFirebaseAuth()
  return onAuthStateChanged(auth, callback)
}
