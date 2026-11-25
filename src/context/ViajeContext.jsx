import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const ViajeContext = createContext();

const VIAJE_DOC_REF = doc(db, 'viajes', 'viaje-grupal-principal');
const PORTADA_DEFAULT = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop';
const MAX_HISTORIAL_ELIMINADOS = 10;

const normalizarUsuario = (raw = {}, fallbackId = Date.now()) => ({
    id: raw.id || fallbackId,
    nombre: (raw.nombre || '').trim(),
    apellido: (raw.apellido || '').trim(),
    apodo: (raw.apodo || '').trim(),
    alias: (raw.alias || '').trim(),
    descripcion: (raw.descripcion || '').trim(),
    fotoPerfil: raw.fotoPerfil || ''
});

const normalizarParticipante = (raw = {}) => ({
    ...raw,
    id: raw.id || `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nombre: (raw.nombre || '').trim(),
    apellido: (raw.apellido || '').trim(),
    apodo: (raw.apodo || '').trim(),
    alias: (raw.alias || '').trim(),
    descripcion: (raw.descripcion || '').trim(),
    fotoPerfil: raw.fotoPerfil || ''
});

const normalizarCotizacion = (valor, destino, origen) => {
    if ((destino || 'ARS') === (origen || 'USD')) return 1;
    const num = Number(valor);
    return Number.isFinite(num) && num > 0 ? num : 1;
};

export const ViajeProvider = ({ children }) => {
    const [usuarioLocal, setUsuarioLocal] = useState(() => {
        try {
            const saved = localStorage.getItem('viaje_usuario_local');
            const parsed = saved ? JSON.parse(saved) : {};
            return normalizarUsuario(parsed, Date.now());
        } catch {
            return normalizarUsuario({}, Date.now());
        }
    });

    const [nombreViaje, setNombreViaje] = useState('Mendoza 2026');
    const [portadaViaje, setPortadaViaje] = useState(PORTADA_DEFAULT);
    const [monedaDestino, setMonedaDestino] = useState('ARS');
    const [monedaOrigen, setMonedaOrigen] = useState('USD');
    const [cotizacion, setCotizacion] = useState(1);
    const [gastosList, setGastosList] = useState([]);
    const [gastosEliminados, setGastosEliminados] = useState([]);
    const [participantesList, setParticipantesList] = useState([]);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(VIAJE_DOC_REF, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.nombreViaje !== undefined) setNombreViaje(data.nombreViaje);
                if (data.portadaViaje !== undefined) setPortadaViaje(data.portadaViaje);

                const destinoDoc = data.monedaDestino || 'ARS';
                const origenDoc = data.monedaOrigen || 'USD';
                setMonedaDestino(destinoDoc);
                setMonedaOrigen(origenDoc);
                if (data.cotizacion !== undefined) {
                    setCotizacion(normalizarCotizacion(data.cotizacion, destinoDoc, origenDoc));
                }

                setGastosList(Array.isArray(data.gastos) ? data.gastos : []);
                setGastosEliminados(Array.isArray(data.gastosEliminados) ? data.gastosEliminados : []);
                setParticipantesList(
                    Array.isArray(data.participantes)
                        ? data.participantes.map(normalizarParticipante)
                        : []
                );
            } else {
                setDoc(VIAJE_DOC_REF, {
                    nombreViaje: 'Mendoza 2026',
                    portadaViaje: PORTADA_DEFAULT,
                    monedaDestino: 'ARS',
                    monedaOrigen: 'USD',
                    cotizacion: 1,
                    gastos: [],
                    gastosEliminados: [],
                    participantes: []
                });
            }
        }, (error) => {
            console.error("Error sincronizando con Firebase:", error);
        });

        return () => unsubscribe();
    }, []);

    const viajeState = {
        nombreViaje,
        portadaViaje,
        monedaDestino,
        monedaOrigen,
        cotizacion,
        usuario: usuarioLocal
    };

    const guardarConfiguracion = async (nuevosDatos) => {
        const nombreLimpio = nuevosDatos.nombreViaje ?? nombreViaje;
        const portadaLimpia = nuevosDatos.portadaViaje ?? portadaViaje;
        const destinoLimpio = nuevosDatos.monedaDestino ?? monedaDestino ?? 'ARS';
        const origenLimpio = nuevosDatos.monedaOrigen ?? monedaOrigen ?? 'USD';
        const cotizacionLimpia = normalizarCotizacion(
            nuevosDatos.cotizacion ?? cotizacion,
            destinoLimpio,
            origenLimpio
        );

        let usuarioActualizado = usuarioLocal;
        if (nuevosDatos.usuario) {
            usuarioActualizado = normalizarUsuario(
                { ...usuarioLocal, ...nuevosDatos.usuario },
                usuarioLocal.id || Date.now()
            );
            setUsuarioLocal(usuarioActualizado);
            localStorage.setItem('viaje_usuario_local', JSON.stringify(usuarioActualizado));
        }

        const payload = {
            nombreViaje: nombreLimpio,
            portadaViaje: portadaLimpia,
            monedaDestino: destinoLimpio,
            monedaOrigen: origenLimpio,
            cotizacion: cotizacionLimpia
        };

        if (usuarioActualizado?.nombre) {
            const listaSegura = Array.isArray(participantesList) ? participantesList : [];
            const existe = listaSegura.some(p => p.id === usuarioActualizado.id);
            const participantesActualizados = existe
                ? listaSegura.map(p => (p.id === usuarioActualizado.id ? normalizarParticipante({ ...p, ...usuarioActualizado }) : normalizarParticipante(p)))
                : [...listaSegura.map(normalizarParticipante), normalizarParticipante(usuarioActualizado)];

            setParticipantesList(participantesActualizados);
            payload.participantes = participantesActualizados;
        }

        setNombreViaje(nombreLimpio);
        setPortadaViaje(portadaLimpia);
        setMonedaDestino(destinoLimpio);
        setMonedaOrigen(origenLimpio);
        setCotizacion(cotizacionLimpia);

        await setDoc(VIAJE_DOC_REF, payload, { merge: true });
    };

    const agregarGasto = async (nuevoGasto) => {
        const pagadorNombre = (nuevoGasto?.pagadoPor || '').trim();
        let participantesActualizados = Array.isArray(participantesList)
            ? participantesList.map(normalizarParticipante)
            : [];

        if (pagadorNombre) {
            const target = pagadorNombre.toLowerCase();
            const yaExiste = participantesActualizados.some((p) => {
                const nombreCompleto = `${p.nombre || ''} ${p.apellido || ''}`.trim().toLowerCase();
                const soloNombre = (p.nombre || '').trim().toLowerCase();
                const apodo = (p.apodo || '').trim().toLowerCase();

                return (
                    target === nombreCompleto ||
                    target === soloNombre ||
                    (apodo && target === apodo)
                );
            });

            if (!yaExiste) {
                participantesActualizados.push(
                    normalizarParticipante({
                        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                        nombre: pagadorNombre,
                        apellido: '',
                        apodo: '',
                        alias: '',
                        descripcion: '',
                        fotoPerfil: ''
                    })
                );
            }
        }

        const gastoNormalizado = {
            ...nuevoGasto,
            id: nuevoGasto?.id || `gasto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            pagadoPor: pagadorNombre || nuevoGasto?.pagadoPor || ''
        };

        const nuevaListaGastos = [gastoNormalizado, ...gastosList];

        setParticipantesList(participantesActualizados);
        setGastosList(nuevaListaGastos);

        await setDoc(
            VIAJE_DOC_REF,
            {
                gastos: nuevaListaGastos,
                participantes: participantesActualizados
            },
            { merge: true }
        );
    };

    const eliminarGasto = async (gastoId, gastoFallback = null, indiceGlobal = -1) => {
        const listaActual = Array.isArray(gastosList) ? gastosList : [];
        if (listaActual.length === 0) return;

        const existePorId = gastoId !== undefined && gastoId !== null && gastoId !== ''
            ? listaActual.some((g) => g?.id === gastoId)
            : false;

        let gastoEliminadoObj = null;
        const nuevaListaGastos = listaActual.filter((g, idx) => {
            const esElBuscado = existePorId
                ? g?.id === gastoId
                : (gastoFallback && g === gastoFallback) || (indiceGlobal >= 0 && idx === indiceGlobal);

            if (esElBuscado && !gastoEliminadoObj) {
                gastoEliminadoObj = g;
                return false;
            }
            return true;
        });

        if (!gastoEliminadoObj || nuevaListaGastos.length === listaActual.length) return;

        const quienBorro = (usuarioLocal?.apodo || usuarioLocal?.nombre || '').trim();
        const ahora = new Date();
        const horaStr = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const fechaStr = ahora.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });

        const registroEliminado = {
            ...gastoEliminadoObj,
            id: gastoEliminadoObj.id || `gasto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            eliminadoId: `del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            eliminadoPor: quienBorro,
            eliminadoEl: `${fechaStr} ${horaStr}`
        };

        const historialActualizado = [
            registroEliminado,
            ...(Array.isArray(gastosEliminados) ? gastosEliminados : [])
        ].slice(0, MAX_HISTORIAL_ELIMINADOS);

        setGastosList(nuevaListaGastos);
        setGastosEliminados(historialActualizado);

        await setDoc(
            VIAJE_DOC_REF,
            {
                gastos: nuevaListaGastos,
                gastosEliminados: historialActualizado
            },
            { merge: true }
        );
    };

    const restaurarGasto = async (itemEliminado) => {
        if (!itemEliminado) return;

        const { eliminadoId, eliminadoPor, eliminadoEl, ...gastoOriginal } = itemEliminado;
        const gastoRestaurado = {
            ...gastoOriginal,
            id: gastoOriginal.id || `gasto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        };

        const listaActual = Array.isArray(gastosList) ? gastosList : [];
        const yaExiste = listaActual.some((g) => g?.id === gastoRestaurado.id);
        const nuevaListaGastos = yaExiste ? listaActual : [gastoRestaurado, ...listaActual];

        const historialActual = Array.isArray(gastosEliminados) ? gastosEliminados : [];
        const nuevoHistorial = historialActual.filter((item) =>
            eliminadoId ? item.eliminadoId !== eliminadoId : item !== itemEliminado
        );

        setGastosList(nuevaListaGastos);
        setGastosEliminados(nuevoHistorial);

        await setDoc(
            VIAJE_DOC_REF,
            {
                gastos: nuevaListaGastos,
                gastosEliminados: nuevoHistorial
            },
            { merge: true }
        );
    };

    const agregarParticipante = async (nuevoParticipante) => {
        const participanteLimpio = normalizarParticipante(nuevoParticipante);
        const nuevaLista = [...participantesList.map(normalizarParticipante), participanteLimpio];
        setParticipantesList(nuevaLista);
        await setDoc(VIAJE_DOC_REF, { participantes: nuevaLista }, { merge: true });
    };

    const sincronizarUsuarioEnGrupo = async (datosUsuario) => {
        if (!datosUsuario || !datosUsuario.nombre?.trim()) return;

        const usuarioCompleto = normalizarUsuario(
            { ...usuarioLocal, ...datosUsuario },
            usuarioLocal.id || Date.now()
        );

        setUsuarioLocal(usuarioCompleto);
        localStorage.setItem('viaje_usuario_local', JSON.stringify(usuarioCompleto));

        const listaSegura = Array.isArray(participantesList) ? participantesList : [];
        const existe = listaSegura.some(p => p.id === usuarioCompleto.id);

        const nuevaLista = existe
            ? listaSegura.map(p => (p.id === usuarioCompleto.id ? normalizarParticipante({ ...p, ...usuarioCompleto }) : normalizarParticipante(p)))
            : [...listaSegura.map(normalizarParticipante), normalizarParticipante(usuarioCompleto)];

        setParticipantesList(nuevaLista);
        await setDoc(VIAJE_DOC_REF, { participantes: nuevaLista }, { merge: true });
    };

    // Reinicia gastos y participantes en Firestore, manteniendo al usuario actual si ya tiene perfil
    const reiniciarViaje = async (nuevoNombre = 'Nuevo Viaje') => {
        const confirmar = window.confirm(
            '¿Querés reiniciar el viaje? Se borrarán todos los gastos y participantes compartidos en el grupo.'
        );
        if (!confirmar) return;

        const nombreLimpio = (typeof nuevoNombre === 'string' && nuevoNombre.trim())
            ? nuevoNombre.trim()
            : 'Nuevo Viaje';

        const tienePerfil = Boolean(usuarioLocal?.nombre && usuarioLocal.nombre.trim() !== '');
        const usuarioInicial = tienePerfil
            ? normalizarUsuario(usuarioLocal, usuarioLocal.id || Date.now())
            : null;

        const participantesIniciales = usuarioInicial ? [normalizarParticipante(usuarioInicial)] : [];

        try {
            if (usuarioInicial) {
                setUsuarioLocal(usuarioInicial);
                localStorage.setItem('viaje_usuario_local', JSON.stringify(usuarioInicial));
            }

            await setDoc(VIAJE_DOC_REF, {
                nombreViaje: nombreLimpio,
                portadaViaje: PORTADA_DEFAULT,
                monedaDestino,
                monedaOrigen,
                cotizacion,
                gastos: [],
                gastosEliminados: [],
                participantes: participantesIniciales
            });

            setNombreViaje(nombreLimpio);
            setPortadaViaje(PORTADA_DEFAULT);
            setGastosList([]);
            setGastosEliminados([]);
            setParticipantesList(participantesIniciales);

            localStorage.removeItem('viaje_state');
            localStorage.removeItem('viaje_gastos');
            localStorage.removeItem('viaje_participantes');

            alert('Viaje reiniciado. Ya pueden cargar los datos del nuevo viaje.');
        } catch (error) {
            console.error('Error al reiniciar el viaje:', error);
            alert('No se pudo reiniciar el viaje. Revisá la conexión a internet.');
        }
    };

    // ==========================================
    // CÁLCULOS FINANCIEROS Y DEUDAS
    // ==========================================
    const totalGastos = gastosList.reduce((acc, item) => acc + Number(item.monto || 0), 0);
    const cuotaPorPersona = participantesList.length > 0 ? totalGastos / participantesList.length : 0;

    const balanceParticipantes = participantesList.map(p => {
        const participante = normalizarParticipante(p);
        const nombreCompleto = `${participante.nombre || ''} ${participante.apellido || ''}`.trim().toLowerCase();
        const soloNombre = (participante.nombre || '').trim().toLowerCase();
        const apodo = (participante.apodo || '').trim().toLowerCase();

        const totalPagado = gastosList
            .filter(gasto => {
                const pagadorGasto = (gasto.pagadoPor || '').trim().toLowerCase();
                if (!pagadorGasto) return false;

                return (
                    (nombreCompleto && pagadorGasto === nombreCompleto) ||
                    (soloNombre && pagadorGasto === soloNombre) ||
                    (apodo && pagadorGasto === apodo)
                );
            })
            .reduce((sum, gasto) => sum + Number(gasto.monto || 0), 0);

        const saldo = totalPagado - cuotaPorPersona;

        return {
            ...participante,
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
                    alias: acreedor.alias || '',
                    descripcion: acreedor.descripcion || '',
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
            gastosEliminados,
            participantes: participantesList,
            totalGastos,
            cuotaPorPersona,
            balanceParticipantes,
            pagosSugeridos,
            isConfigOpen,
            setIsConfigOpen,
            guardarConfiguracion,
            agregarGasto,
            eliminarGasto,
            restaurarGasto,
            agregarParticipante,
            sincronizarUsuarioEnGrupo,
            reiniciarViaje,
        }}>
            {children}
        </ViajeContext.Provider>
    );
};

export const useViaje = () => {
    const context = useContext(ViajeContext);
    if (!context) {
        throw new Error('useViaje debe ser usado dentro de un ViajeProvider');
    }
    return context;
};