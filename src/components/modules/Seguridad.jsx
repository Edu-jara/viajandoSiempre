import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, ShieldAlert, PhoneCall, Navigation, LocateFixed, Home } from 'lucide-react';
import { useViaje } from '../../context/ViajeContext';

// Helper para centrar el mapa suavemente cuando seleccionas a un amigo
const CentrarMapa = ({ coords }) => {
    const map = useMap();
    if (coords) {
        map.flyTo(coords, 15, { duration: 1.2 });
    }
    return null;
};

// Creador de pines personalizados con el avatar o inicial del integrante
const crearPinAvatar = (participante, esActivo) => {
    const inicial = (participante.apodo || participante.nombre || 'U').charAt(0).toUpperCase();
    const bordeColor = esActivo ? '#10b981' : '#f59e0b'; // Esmeralda si está seleccionado, Mostaza por defecto

    const contenido = participante.fotoPerfil
        ? `<img src="${participante.fotoPerfil}" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;" />`
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
        popupAnchor: [0, -38]
    });
};

const SeguridadYMapaSection = () => {
    const { viajeState, participantes } = useViaje();

    // Coordenadas por defecto (ej. centro de destino o Ciudad de México / Buenos Aires)
    const [centroMapa, setCentroMapa] = useState([19.4326, -99.1332]);
    const [integranteSeleccionado, setIntegranteSeleccionado] = useState(null);
    const [cargandoGPS, setCargandoGPS] = useState(false);

    // Estado de ubicaciones reportadas (en localStorage hoy, en tiempo real con Firebase mañana)
    const [ubicaciones, setUbicaciones] = useState(() => {
        const guardadas = localStorage.getItem('viaje_ubicaciones');
        return guardadas ? JSON.parse(guardadas) : {};
    });

    const [contactosEmergencia] = useState([
        { id: 1, titulo: 'Asistencia al Viajero / Seguro', telefono: '+54 800 555 3333' },
        { id: 2, titulo: 'Emergencias Locales', telefono: '911' }
    ]);

    // Obtener GPS real del dispositivo y actualizar mi pin
    const handleActualizarMiUbicacion = () => {
        if (!navigator.geolocation) {
            alert('Tu navegador o dispositivo no soporta geolocalización.');
            return;
        }

        setCargandoGPS(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const miId = viajeState?.usuario?.id || participantes[0]?.id || 'usuario_actual';
                const nuevasUbicaciones = {
                    ...ubicaciones,
                    [miId]: {
                        lat: latitude,
                        lng: longitude,
                        hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
                    }
                };

                setUbicaciones(nuevasUbicaciones);
                localStorage.setItem('viaje_ubicaciones', JSON.stringify(nuevasUbicaciones));
                setCentroMapa([latitude, longitude]);
                setIntegranteSeleccionado(miId);
                setCargandoGPS(false);
            },
            (err) => {
                console.error(err);
                alert('No se pudo obtener la ubicación. Verifica los permisos de GPS de tu navegador.');
                setCargandoGPS(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleSeleccionarIntegrante = (participante) => {
        const ubi = ubicaciones[participante.id];
        setIntegranteSeleccionado(participante.id);
        if (ubi) {
            setCentroMapa([ubi.lat, ubi.lng]);
        }
    };

    return (
        <div className="space-y-5 pb-10">

            {/* 1. BANNER SUPERIOR DE INTEGRANTES INTERACTIVO */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
                            Radar del Grupo
                        </h3>
                    </div>
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

                {/* Fila de Avatares */}
                <div className="flex items-center gap-3 overflow-x-auto py-1">
                    {participantes.map((p, idx) => {
                        const ubi = ubicaciones[p.id];
                        const seleccionado = integranteSeleccionado === p.id;
                        const inicial = (p.apodo || p.nombre || 'U').charAt(0).toUpperCase();
                        const nombreMostrar = p.apodo || p.nombre || 'Viajero';

                        return (
                            <button
                                key={p.id || idx}
                                type="button"
                                onClick={() => handleSeleccionarIntegrante(p)}
                                className={`flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-2xl transition-all cursor-pointer ${seleccionado ? 'bg-zinc-800/90 ring-1 ring-emerald-500/50' : 'hover:bg-zinc-800/40'
                                    }`}
                            >
                                <div className="relative">
                                    <div
                                        className={`w-12 h-12 rounded-full bg-zinc-800 border-2 overflow-hidden flex items-center justify-center text-xs font-black bg-cover bg-center ${ubi ? 'border-emerald-400 text-emerald-400' : 'border-zinc-700 text-zinc-400'
                                            }`}
                                        style={{
                                            backgroundImage: p.fotoPerfil ? `url("${p.fotoPerfil}")` : undefined
                                        }}
                                    >
                                        {!p.fotoPerfil && inicial}
                                    </div>
                                    {/* Puntito indicador de estado GPS */}
                                    <span
                                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900 ${ubi ? 'bg-emerald-400' : 'bg-zinc-600'
                                            }`}
                                    />
                                </div>
                                <span className="text-[11px] font-bold text-zinc-200 max-w-[60px] truncate">
                                    {nombreMostrar}
                                </span>
                                <span className="text-[9px] font-medium text-zinc-400">
                                    {ubi ? ubi.hora : 'Sin GPS'}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. MAPA INTERACTIVO CON LOS PINES DEL GRUPO */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-3 shadow-xl space-y-2">
                <div className="w-full rounded-2xl overflow-hidden border border-zinc-800 relative z-0" style={{ height: '350px' }}>
                    <MapContainer
                        center={centroMapa}
                        zoom={13}
                        scrollWheelZoom={false}
                        style={{ height: '100%', width: '100%' }} // 👈 Forzar el tamaño 100%
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap &copy; CARTO'
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        />
                        <CentrarMapa coords={centroMapa} />

                        {participantes.map((p) => {
                            const ubi = ubicaciones[p.id];
                            if (!ubi) return null;

                            return (
                                <Marker
                                    key={p.id}
                                    position={[ubi.lat, ubi.lng]}
                                    icon={crearPinAvatar(p, integranteSeleccionado === p.id)}
                                >
                                    <Popup>
                                        <div className="text-zinc-900 text-xs font-sans">
                                            <p className="font-black">{p.apodo || p.nombre}</p>
                                            <p className="text-[11px] text-zinc-600">Última señal: {ubi.hora} hs</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>
                <p className="text-[10px] text-zinc-500 text-center">
                    Toca la foto de un integrante arriba para centrar su última ubicación en el mapa.
                </p>
            </div>
            {/* 3. CONTACTOS DE EMERGENCIA PERSONALIZADOS */}
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

                {/* Lista de contactos clave editables o predefinidos */}
                <div className="space-y-2.5">
                    <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Asistencia Médica</span>
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

                    <div className="p-3.5 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Familiar / Emergencia Casa</span>
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
                {/* TARJETA DE ASISTENCIA AL VIAJERO (Credencial Principal) */}
                <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-amber-500/40 rounded-3xl p-5 space-y-4 shadow-2xl relative overflow-hidden">
                    {/* Sello decorativo de fondo */}
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                                <ShieldAlert className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                Asistencia Médica Internacional
                            </span>
                        </div>
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-extrabold">
                            Póliza Activa
                        </span>
                    </div>

                    {/* Datos principales de la credencial */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-4">
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Empresa / Aseguradora</p>
                            <p className="text-xs font-black text-white mt-0.5">Assist Card / Universal Assistance</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nro. de Póliza / Contrato</p>
                            <p className="text-xs font-black text-amber-400 mt-0.5 tracking-wider">AR-99887766-01</p>
                        </div>
                    </div>

                    {/* Botones de acción rápida */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <a
                            href="tel:+18005550199"
                            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <PhoneCall className="w-4 h-4 stroke-[2.5]" /> Llamar a Central Médica
                        </a>
                        <button
                            type="button"
                            onClick={() => alert('Próximamente: Adjuntar foto de la credencial física o PDF de la póliza.')}
                            className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            📄 Ver Póliza
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default SeguridadYMapaSection;