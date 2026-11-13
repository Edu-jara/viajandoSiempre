import { db } from '../firebase';
import { doc, getDoc, setDoc } from "firebase/firestore";

// ID único para que los 5 amigos compartan exactamente el mismo viaje
const VIAJE_ID = 'viaje-grupal-principal';

const defaultConfig = {
    nombreViaje: "Mendoza 2026",
    portadaViaje: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
    usuario: {
        nombre: "",
        apellido: "",
        apodo: "",
        fotoPerfil: ""
    },
    gastos: [],
    participantes: []
};

export const obtenerViajeStorage = async () => {
    try {
        const docRef = doc(db, "viajes", VIAJE_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            // Si es la primera vez, inicializa el documento en la nube
            await setDoc(docRef, defaultConfig);
            return defaultConfig;
        }
    } catch (error) {
        console.error("Error leyendo Firestore:", error);
        return defaultConfig;
    }
};

export const guardarViajeStorage = async (nuevoEstado) => {
    try {
        const docRef = doc(db, "viajes", VIAJE_ID);
        // { merge: true } asegura que actualicemos sin pisar campos por error
        await setDoc(docRef, nuevoEstado, { merge: true });
    } catch (error) {
        console.error("Error guardando en Firestore:", error);
    }
};