import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBecbtpuqc3TkY0-p_rP00yy7QKMZD2Fbg",
    authDomain: "guessnumber-92898.firebaseapp.com",
    projectId: "guessnumber-92898",
    storageBucket: "guessnumber-92898.appspot.com",
    messagingSenderId: "343860343588",
    appId: "1:343860343588:web:a9cc5aad6bf6126a5ff9b1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
