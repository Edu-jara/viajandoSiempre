import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
    ShieldAlert,
    PhoneCall,
    LocateFixed,
    Users,
    FileText,
    Copy,
    Check,
} from 'lucide-react';
import { useViaje } from '../../context/ViajeContext';

const STORAGE_UBICACIONES_KEY = 'viaje_ubicaciones';
const CENTRO_DEFAULT = [19.4326, -99.1332];

// Controla flyTo / fitBounds solo cuando el usuario lo dispara explícitamente
const ControlMapa = ({ target, disparoCentro, boundsGrupo, disparoBounds }) => {
    const map = useMap();

    useEffect(() => {
        if (disparoCentro > 0 && Array.isArray(target) && target.length === 2) {
            map.flyTo(target, 15, { duration: 1.1 });
        }
    }, [disparoCentro, target, map]);

    useEffect(() => {
        if (disparoBounds > 0 && Array.isArray(boundsGrupo) && boundsGrupo.length > 0) {
            if (boundsGrupo.length === 1) {
                map.flyTo(boundsGrupo[0], 15, { duration: 1.1 });
            } else {
                map.fitBounds(boundsGrupo, { padding: [45, 45], maxZoom: 15 });
            }
        }
    }, [disparoBounds, boundsGrupo, map]);

    return null;
};

// Creador de pines personalizados con el avatar o inicial del integrante
const crearPinAvatar = (participante, esActivo) => {
    const inicial = (participante.apodo || participante.nombre || 'U').charAt(0).toUpperCase();
    const bordeColor = esActivo ? '#10b981' : '#f59e0b';

    const contenido = participante.fotoPerfil
        ? `<img src="${participante.fotoPerfil}" alt="${inicial}" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;" />`
        : `<span style="color:${bordeColor};font-weight:900;font-size:13px;">${inicial}</span>`;

    return L.divIcon({
        className: 'custom-avatar-pin',
        html: `
            <div style="
                width: 38px;
                height: 38px;
                border-radius: 9999px;
                background-color: #18181b;
                border: 3px solid ${bordeColor};
                box-shadow: 0 4px 12px rgba(0,0,0,0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            ">
                ${contenido}
            </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38],
    });
};

const SeguridadYMapaSection = () => {
    const contextoViaje = useViaje();
    const { viajeState, participantes = [] } = contextoViaje;
    const actualizarUbicacionContexto = contextoViaje.actualizarUbicacionIntegrante;

    const [ubicacionesLocales, setUbicacionesLocales] = useState(() => {
        try {
            const guardadas = localStorage.getItem(STORAGE_UBICACIONES_KEY);
            return guardadas ? JSON.parse(guardadas) : {};
        } catch {
            return {};
        }
    });

    // Combina respaldo local y ubicaciones compartidas en viajeState
    const ubicaciones = useMemo(() => {
        const compartidas = viajeState?.ubicaciones;
        if (compartidas && typeof compartidas === 'object') {
            return { ...ubicacionesLocales, ...compartidas };
        }
        return ubicacionesLocales;
    }, [viajeState?.ubicaciones, ubicacionesLocales]);

    const coordsActivas = useMemo(() => {
        return participantes
            .map((p) => ubicaciones[p.id])
            .filter((u) => u && typeof u.lat === 'number' && typeof u.lng === 'number')
            .map((u) => [u.lat, u.lng]);
    }, [participantes, ubicaciones]);

    const [centroMapa, setCentroMapa] = useState(() => coordsActivas[0] || CENTRO_DEFAULT);
    const [disparoCentro, setDisparoCentro] = useState(0);
    const [disparoBounds, setDisparoBounds] = useState(0);
    const [integranteSeleccionado, setIntegranteSeleccionado] = useState(null);
    const [cargandoGPS, setCargandoGPS] = useState(false);
    const [estadoGPS, setEstadoGPS] = useState('');
    const [copiadoPoliza, setCopiadoPoliza] = useState(false);
    const [mostrarInfoPoliza, setMostrarInfoPoliza] = useState(false);

    const handleActualizarMiUbicacion = () => {
        if (!navigator.geolocation) {
            setEstadoGPS('Este dispositivo no soporta geolocalización.');
            return;
        }

        setCargandoGPS(true);
        setEstadoGPS('');

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                const miId = viajeState?.usuario?.id || participantes[0]?.id || 'usuario_actual';
                const payloadUbicacion = {
                    lat: latitude,
                    lng: longitude,
                    precision: Math.round(accuracy || 0),
                    hora: new Date().toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    actualizadoEn: Date.now(),
                };

                const siguientes = {
                    ...ubicaciones,
                    [miId]: payloadUbicacion,
                };

                setUbicacionesLocales(siguientes);
                try {
                    localStorage.setItem(STORAGE_UBICACIONES_KEY, JSON.stringify(siguientes));
                } catch {
                    // Ignorar errores de storage
                }

                if (typeof actualizarUbicacionContexto === 'function') {
                    try {
                        await actualizarUbicacionContexto(miId, payloadUbicacion);
                    } catch {
                        // Mantiene respaldo local si falla la red
                    }
                }

                setCentroMapa([latitude, longitude]);
                setDisparoCentro((n) => n + 1);
                setIntegranteSeleccionado(miId);
                setCargandoGPS(false);
                setEstadoGPS(`Ubicación reportada a las ${payloadUbicacion.hora} hs.`);
            },
            () => {
                setCargandoGPS(false);
                setEstadoGPS('No se pudo obtener el GPS. Revisá los permisos de ubicación.');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
        );
    };

    const handleSeleccionarIntegrante = (participante) => {
        const ubi = ubicaciones[participante.id];
        setIntegranteSeleccionado(participante.id);
        if (ubi && typeof ubi.lat === 'number' && typeof ubi.lng === 'number') {
            setCentroMapa([ubi.lat, ubi.lng]);
            setDisparoCentro((n) => n + 1);
            setEstadoGPS(
                `Viendo a ${participante.apodo || participante.nombre || 'Viajero'} (${ubi.hora} hs).`
            );
        } else {
            setEstadoGPS(
                `${participante.apodo || participante.nombre || 'Viajero'} aún no reportó su GPS.`
            );
        }
    };

    const handleVerTodoElGrupo = () => {
        if (coordsActivas.length === 0) {
            setEstadoGPS('Nadie reportó GPS todavía para encuadrar en el mapa.');
            return;
        }
        setDisparoBounds((n) => n + 1);
        setEstadoGPS(`Mostrando ${coordsActivas.length} integrante(s) con GPS activo.`);
    };

    const handleCopiarPoliza = async () => {
        const texto = 'Póliza Assist Card / Universal Assistance: AR-99887766-01';
        try {
            await navigator.clipboard.writeText(texto);
            setCopiadoPoliza(true);
            setTimeout(() => setCopiadoPoliza(false), 2000);
        } catch {
            setCopiadoPoliza(false);
        }
    };

    return (
        <div className="space-y-5 pb-10">
            {/* 1. RADAR SUPERIOR DE INTEGRANTES */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 space-y-3 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-emerald-400" />
                        <div>
                            <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
                                Radar del Grupo
                            </h3>
                            {viajeState?.nombreViaje && (
                                <p className="text-[10px] text-zinc-400 font-medium">
                                    Viaje: <span className="text-zinc-200 font-bold">{viajeState.nombreViaje}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {coordsActivas.length > 0 && (
                            <button
                                type="button"
                                onClick={handleVerTodoElGrupo}
                                className="px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold text-[11px] rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                                title="Encuadrar a todos los integrantes con GPS"
                            >
                                <Users className="w-3.5 h-3.5 text-emerald-400" />
                                Ver grupo
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={handleActualizarMiUbicacion}
                            disabled={cargandoGPS}
                            className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-50 text-zinc-950 font-black text-[11px] uppercase tracking-wider rounded-xl shadow-md shadow-emerald-500/15 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                            <LocateFixed className={`w-3.5 h-3.5 ${cargandoGPS ? 'animate-spin' : ''}`} />
                            {cargandoGPS ? 'Ubicando...' : 'Reportar mi GPS'}
                        </button>
                    </div>
                </div>

                {/* Fila de Avatares */}
                <div className="flex items-center gap-3 overflow-x-auto py-1">
                    {participantes.map((p, idx) => {
                        const ubi = ubicaciones[p.id];
                        const tieneGPS = Boolean(ubi && typeof ubi.lat === 'number' && typeof ubi.lng === 'number');
                        const seleccionado = integranteSeleccionado === p.id;
                        const inicial = (p.apodo || p.nombre || 'U').charAt(0).toUpperCase();
                        const nombreMostrar = p.apodo || p.nombre || 'Viajero';

                        return (
                            <button
                                key={p.id || idx}
                                type="button"
                                onClick={() => handleSeleccionarIntegrante(p)}
                                className={`flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-2xl transition-all cursor-pointer ${seleccionado
                                        ? 'bg-zinc-800/90 ring-1 ring-emerald-500/50'
                                        : 'hover:bg-zinc-800/40'
                                    }`}
                            >
                                <div className="relative">
                                    <div
                                        className={`w-12 h-12 rounded-full bg-zinc-800 border-2 overflow-hidden flex items-center justify-center text-xs font-black bg-cover bg-center ${tieneGPS
                                                ? 'border-emerald-400 text-emerald-400'
                                                : 'border-zinc-700 text-zinc-400'
                                            }`}
                                        style={{
                                            backgroundImage: p.fotoPerfil ? `url("${p.fotoPerfil}")` : undefined,
                                        }}
                                    >
                                        {!p.fotoPerfil && inicial}
                                    </div>
                                    <span
                                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${tieneGPS ? 'bg-emerald-400' : 'bg-zinc-600'
                                            }`}
                                    />
                                </div>
                                <span className="text-[11px] font-bold text-zinc-200 max-w-[64px] truncate">
                                    {nombreMostrar}
                                </span>
                                <span className="text-[9px] font-medium text-zinc-400">
                                    {tieneGPS ? ubi.hora : 'Sin GPS'}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {estadoGPS && (
                    <p className="text-[11px] text-emerald-300/90 font-medium">
                        {estadoGPS}
                    </p>
                )}
            </div>

            {/* 2. MAPA INTERACTIVO CON LOS PINES DEL GRUPO */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-3 shadow-xl space-y-2">
                <div
                    className="w-full rounded-2xl overflow-hidden border border-zinc-800 relative z-0"
                    style={{ height: '350px' }}
                >
                    <MapContainer
                        center={centroMapa}
                        zoom={13}
                        scrollWheelZoom={false}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution="&copy; OpenStreetMap contributors"
                            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ControlMapa
                            target={centroMapa}
                            disparoCentro={disparoCentro}
                            boundsGrupo={coordsActivas}
                            disparoBounds={disparoBounds}
                        />

                        {participantes.map((p) => {
                            const ubi = ubicaciones[p.id];
                            if (!ubi || typeof ubi.lat !== 'number' || typeof ubi.lng !== 'number') {
                                return null;
                            }

                            return (
                                <Marker
                                    key={p.id}
                                    position={[ubi.lat, ubi.lng]}
                                    icon={crearPinAvatar(p, integranteSeleccionado === p.id)}
                                >
                                    <Popup>
                                        <div className="text-zinc-900 text-xs font-sans space-y-0.5">
                                            <p className="font-black">{p.apodo || p.nombre || 'Viajero'}</p>
                                            <p className="text-[11px] text-zinc-600">
                                                Última señal: {ubi.hora} hs
                                                {ubi.precision ? ` · ±${ubi.precision}m` : ''}
                                            </p>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
                <p className="text-[10px] text-zinc-500 text-center">
                    Tocá un integrante arriba para centrar su última ubicación o usá &ldquo;Ver grupo&rdquo;.
                </p>
            </div>

            {/* 3. CONTACTOS DE EMERGENCIA Y CREDENCIAL */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-widest">
                            Contactos de Emergencia y Asistencia
                        </h3>
                    </div>
                    <span className="text-[10px] text-zinc-400">
                        Útiles en destino
                    </span>
                </div>

                <div className="space-y-2.5">
                    <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                Asistencia Médica
                            </span>
                            <p className="text-xs font-bold text-white">Seguro de Viaje (Global Assistance)</p>
                            <p className="text-xs font-black text-zinc-300 mt-0.5">+54 11 5555-1234</p>
                        </div>
                        <a
                            href="tel:+541155551234"
                            className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                        >
                            <PhoneCall className="w-3.5 h-3.5" /> Llamar
                        </a>
                    </div>

                    <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                Familiar / Emergencia Casa
                            </span>
                            <p className="text-xs font-bold text-white">Contacto de Confianza</p>
                            <p className="text-xs font-black text-zinc-300 mt-0.5">+54 9 11 4444-5678</p>
                        </div>
                        <a
                            href="tel:+5491144445678"
                            className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                        >
                            <PhoneCall className="w-3.5 h-3.5" /> Llamar
                        </a>
                    </div>
                </div>

                {/* TARJETA DE ASISTENCIA AL VIAJERO */}
                <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                                <ShieldAlert className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                Asistencia Médica Internacional
                            </span>
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-extrabold shrink-0">
                            Póliza Activa
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4">
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                Empresa / Aseguradora
                            </p>
                            <p className="text-xs font-black text-white mt-0.5">
                                Assist Card / Universal Assistance
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                Nro. de Póliza / Contrato
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs font-black text-amber-400 tracking-wider">
                                    AR-99887766-01
                                </p>
                                <button
                                    type="button"
                                    onClick={handleCopiarPoliza}
                                    className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer"
                                    title="Copiar número de póliza"
                                    aria-label="Copiar número de póliza"
                                >
                                    {copiadoPoliza ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {mostrarInfoPoliza && (
                        <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-amber-500/25 text-xs text-zinc-300 space-y-1">
                            <p className="font-bold text-amber-300">Detalle de cobertura rápida</p>
                            <p className="text-[11px] text-zinc-400">
                                Tené a mano el número de póliza <span className="text-zinc-200 font-semibold">AR-99887766-01</span> y el pasaporte/DNI al comunicarte con la central.
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <a
                            href="tel:+18005550199"
                            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <PhoneCall className="w-4 h-4 stroke-[2.5]" /> Llamar a Central Médica
                        </a>
                        <button
                            type="button"
                            onClick={() => setMostrarInfoPoliza((prev) => !prev)}
                            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            {mostrarInfoPoliza ? 'Ocultar Póliza' : 'Ver Póliza'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeguridadYMapaSection;