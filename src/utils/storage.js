const STORAGE_KEY = 'viaje_config';

const defaultConfig = {
    nombreViaje: "Mendoza 2026",
    portadaViaje: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop",
    usuario: {
        nombre: "",
        apellido: "",
        apodo: "",
        fotoPerfil: ""
    }
};

export const obtenerViajeStorage = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : defaultConfig;
    } catch (error) {
        console.error("Error leyendo localStorage:", error);
        return defaultConfig;
    }
};

export const guardarViajeStorage = (nuevoEstado) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevoEstado));
    } catch (error) {
        console.error("Error guardando en localStorage:", error);
    }
};