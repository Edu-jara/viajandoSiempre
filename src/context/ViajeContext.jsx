import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

// 1. Creamos el contexto
const ViajeContext = createContext();

// Documento único en Firestore para que los 5 amigos compartan los mismos datos
const VIAJE_DOC_REF = doc(db, 'viajes', 'viaje-grupal-principal');

// 2. Creamos el Proveedor (Provider) que envuelve la app
export const ViajeProvider = ({ children }) => {
    // El perfil personal de quien tiene el teléfono en la mano sí va en localStorage
    const [usuarioLocal, setUsuarioLocal] = useState(() => {
        const saved = localStorage.getItem('viaje_usuario_local');
        return saved ? JSON.parse(saved) : {
            id: Date.now(),
            nombre: '',
            apellido: '',
            apodo: '',
            fotoPerfil: ''
        };
    });

    // Estados compartidos en la nube (Firestore)
    const [nombreViaje, setNombreViaje] = useState('Mendoza 2026');
    const [portadaViaje, setPortadaViaje] = useState('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop');
    const [gastosList, setGastosList] = useState([]);
    const [participantesList, setParticipantesList] = useState([]);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Suscripción en tiempo real a Firebase Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(VIAJE_DOC_REF, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.nombreViaje !== undefined) setNombreViaje(data.nombreViaje);
                if (data.portadaViaje !== undefined) setPortadaViaje(data.portadaViaje);
                setGastosList(Array.isArray(data.gastos) ? data.gastos : []);
                setParticipantesList(Array.isArray(data.participantes) ? data.participantes : []);
            } else {
                // Si es la primera vez que se abre, crea el viaje en la nube
                setDoc(VIAJE_DOC_REF, {
                    nombreViaje: 'Mendoza 2026',
                    portadaViaje: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
                    gastos: [],
                    participantes: []
                });
            }
        }, (error) => {
            console.error("Error sincronizando con Firebase:", error);
        });

        return () => unsubscribe();
    }, []);

    // Armamos viajeState compatible con el resto de tus componentes
    const viajeState = {
        nombreViaje,
        portadaViaje,
        usuario: usuarioLocal
    };

    // Acciones de negocio (Escriben directo en Firebase)
    const guardarConfiguracion = async (nuevosDatos) => {
        if (nuevosDatos.usuario) {
            const usuarioConId = {
                ...nuevosDatos.usuario,
                id: nuevosDatos.usuario.id || usuarioLocal.id || Date.now()
            };
            setUsuarioLocal(usuarioConId);
            localStorage.setItem('viaje_usuario_local', JSON.stringify(usuarioConId));
        }

        await setDoc(VIAJE_DOC_REF, {
            nombreViaje: nuevosDatos.nombreViaje ?? nombreViaje,
            portadaViaje: nuevosDatos.portadaViaje ?? portadaViaje
        }, { merge: true });
    };

    const agregarGasto = async (nuevoGasto) => {
        const nuevaLista = [nuevoGasto, ...gastosList];
        await setDoc(VIAJE_DOC_REF, { gastos: nuevaLista }, { merge: true });
    };

    const agregarParticipante = async (nuevoParticipante) => {
        const nuevaLista = [...participantesList, nuevoParticipante];
        await setDoc(VIAJE_DOC_REF, { participantes: nuevaLista }, { merge: true });
    };

    const sincronizarUsuarioEnGrupo = async (datosUsuario) => {
        if (!datosUsuario || !datosUsuario.nombre?.trim()) return;

        const idUsuario = datosUsuario.id || usuarioLocal.id || Date.now();
        const usuarioCompleto = { ...datosUsuario, id: idUsuario };

        // Guardamos su sesión local en su celular
        setUsuarioLocal(usuarioCompleto);
        localStorage.setItem('viaje_usuario_local', JSON.stringify(usuarioCompleto));

        // Lo agregamos o actualizamos en la lista compartida en Firebase
        const listaSegura = Array.isArray(participantesList) ? participantesList : [];
        const existe = listaSegura.some(p => p.id === idUsuario);

        const nuevaLista = existe
            ? listaSegura.map(p => (p.id === idUsuario ? { ...p, ...usuarioCompleto } : p))
            : [...listaSegura, usuarioCompleto];

        await setDoc(VIAJE_DOC_REF, { participantes: nuevaLista }, { merge: true });
    };

    // ==========================================
    // CÁLCULOS FINANCIEROS Y DEUDAS
    // ==========================================
    const totalGastos = gastosList.reduce((acc, item) => acc + Number(item.monto || 0), 0);
    const cuotaPorPersona = participantesList.length > 0 ? totalGastos / participantesList.length : 0;

    const balanceParticipantes = participantesList.map(p => {
        const nombreCompleto = `${p.nombre || ''} ${p.apellido || ''}`.trim().toLowerCase();
        const soloNombre = (p.nombre || '').trim().toLowerCase();
        const apodo = (p.apodo || '').trim().toLowerCase();

        const totalPagado = gastosList
            .filter(gasto => {
                const pagadorGasto = (gasto.pagadoPor || '').trim().toLowerCase();
                if (!pagadorGasto) return false;

                return (
                    pagadorGasto === nombreCompleto ||
                    pagadorGasto === soloNombre ||
                    pagadorGasto === apodo ||
                    (soloNombre && pagadorGasto.includes(soloNombre))
                );
            })
            .reduce((sum, gasto) => sum + Number(gasto.monto || 0), 0);

        const saldo = totalPagado - cuotaPorPersona;

        return {
            ...p,
            totalPagado,
            saldo
        };
    });

    const calcularTransferencias = () => {
        let deudores = balanceParticipantes
            .filter(p => p.saldo < -0.01)
            .map(p => ({ ...p, saldoRestante: Math.abs(p.saldo) }));
        let acreedores = balanceParticipantes
            .filter(p => p.saldo > 0.01)
            .map(p => ({ ...p, saldoRestante: p.saldo }));

        let transferencias = [];
        let d = 0;
        let a = 0;

        while (d < deudores.length && a < acreedores.length) {
            let deudor = deudores[d];
            let acreedor = acreedores[a];
            let montoAPagar = Math.min(deudor.saldoRestante, acreedor.saldoRestante);

            if (montoAPagar > 0) {
                transferencias.push({
                    de: deudor.nombre || deudor.apodo,
                    para: acreedor.nombre || acreedor.apodo,
                    monto: Number(montoAPagar.toFixed(2))
                });
            }

            deudor.saldoRestante -= montoAPagar;
            acreedor.saldoRestante -= montoAPagar;

            if (deudor.saldoRestante < 0.01) d++;
            if (acreedor.saldoRestante < 0.01) a++;
        }

        return transferencias;
    };

    const pagosSugeridos = calcularTransferencias();

    return (
        <ViajeContext.Provider value={{
            viajeState,
            gastosList,
            participantes: participantesList,
            totalGastos,
            cuotaPorPersona,
            balanceParticipantes,
            pagosSugeridos,
            isConfigOpen,
            setIsConfigOpen,
            guardarConfiguracion,
            agregarGasto,
            agregarParticipante,
            sincronizarUsuarioEnGrupo,
        }}>
            {children}
        </ViajeContext.Provider>
    );
};

// 3. Custom Hook para consumir el contexto de forma limpia
export const useViaje = () => {
    const context = useContext(ViajeContext);
    if (!context) {
        throw new Error('useViaje debe ser usado dentro de un ViajeProvider');
    }
    return context;
};