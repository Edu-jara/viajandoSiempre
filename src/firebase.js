import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBRRQPdc8dQuSiHJZZxHVi_uPkPJQ2vqdw",
    authDomain: "viajando-siempre-76faa.firebaseapp.com",
    projectId: "viajando-siempre-76faa",
    storageBucket: "viajando-siempre-76faa.firebasestorage.app",
    messagingSenderId: "959530316772",
    appId: "1:959530316772:web:934958e680232cb3720df1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);