import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as fbSignOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    where,
} from 'firebase/firestore';

// ─── Config Firebase depuis les variables d'environnement (.env.local) ───────
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ── Auth helpers ────────────────────────────────────────────
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signOut = () => fbSignOut(auth);
export { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword };

// ── User profile ────────────────────────────────────────────
export const createOrUpdateUserProfile = async(user) => {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            createdAt: serverTimestamp(),
        });
    }
    return snap.data();
};

export const getUserProfile = async(uid) => {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// ── Gallery (user memes - stored as base64 in Firestore) ────
// Save: use addDoc directly in App.jsx with imageDataUrl field

export const subscribeToUserMemes = (uid, callback) => {
    // On écoute TOUS les mèmes sans orderBy pour éviter les erreurs Firestore
    // quand des mèmes mis à jour n'ont pas de createdAt
    const q = query(
        collection(db, 'users', uid, 'memes'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(
        q,
        (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        // Fallback : si l'index/champ createdAt pose problème, on récupère sans tri
        async(err) => {
            console.warn('subscribeToUserMemes fallback (no orderBy):', err.code);
            const fallbackQ = collection(db, 'users', uid, 'memes');
            const snap = await getDocs(fallbackQ);
            const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            // Tri côté client
            docs.sort((a, b) => {
                const ta = a.createdAt ?
                    a.createdAt.toDate() :
                    (a.updatedAt ? a.updatedAt.toDate() : new Date(0));

                const tb = b.createdAt ?
                    b.createdAt.toDate() :
                    (b.updatedAt ? b.updatedAt.toDate() : new Date(0));

                return tb - ta;
            });
            callback(docs);
        }
    );
};

export const deleteUserMeme = async(uid, memeId) => {
    await deleteDoc(doc(db, 'users', uid, 'memes', memeId));
};

export const updateUserMeme = async(uid, memeId, data) => {
    await updateDoc(doc(db, 'users', uid, 'memes', memeId), data);
};