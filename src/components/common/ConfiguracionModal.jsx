import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, MapPin, User, Check, Compass, Users, UserPlus, RotateCcw } from 'lucide-react';
import { useViaje } from '../../context/ViajeContext';
import { subirImagenACloudinary } from '../../utils/cloudinary';
import ConfigMonedas from './ConfigMonedas';

const ConfiguracionModal = ({ isOpen, onClose, viajeState, onGuardar }) => {
    const {
        participantes,
        agregarParticipante,
        sincronizarUsuarioEnGrupo,
        reiniciarViaje
    } = useViaje();

    const defaultFormData = {
        nombreViaje: '',
        portadaViaje: '',
        monedaDestino: 'ARS', // Moneda del país donde vacacionan
        monedaOrigen: 'USD',  // Moneda de origen del usuario
        cotizacion: 1,        // 1 monedaOrigen = X monedaDestino
        usuario: {
            id: `user_${Date.now()}`,
            nombre: '',
            apellido: '',
            apodo: '',
            alias: '',
            descripcion: '',
            fotoPerfil: ''
        }
    };

    const [formData, setFormData] = useState(() => ({
        ...defaultFormData,
        ...(viajeState || {}),
        monedaDestino: viajeState?.monedaDestino || defaultFormData.monedaDestino,
        monedaOrigen: viajeState?.monedaOrigen || defaultFormData.monedaOrigen,
        cotizacion: viajeState?.cotizacion ?? defaultFormData.cotizacion,
        usuario: {
            ...defaultFormData.usuario,
            ...(viajeState?.usuario || {})
        }
    }));

    const [nuevoAmigo, setNuevoAmigo] = useState({
        nombre: '',
        apellido: '',
        apodo: '',
        alias: '',
        descripcion: '',
        fotoPerfil: ''
    });

    const [nombreNuevoViaje, setNombreNuevoViaje] = useState('');
    const [isEditandoPerfil, setIsEditandoPerfil] = useState(false);

    const fileInputPortadaRef = useRef(null);
    const fileInputPerfilRef = useRef(null);
    const fileInputAmigoRef = useRef(null);

    const [subiendoFoto, setSubiendoFoto] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                ...defaultFormData,
                ...(viajeState || {}),
                monedaDestino: viajeState?.monedaDestino || defaultFormData.monedaDestino,
                monedaOrigen: viajeState?.monedaOrigen || defaultFormData.monedaOrigen,
                cotizacion: viajeState?.cotizacion ?? defaultFormData.cotizacion,
                usuario: {
                    ...defaultFormData.usuario,
                    ...(viajeState?.usuario || {})
                }
            });
        }
    }, [isOpen, viajeState]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (['nombre', 'apellido', 'apodo', 'alias', 'descripcion'].includes(name)) {
            setFormData(prev => ({
                ...prev,
                usuario: { ...(prev?.usuario || {}), [name]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePerfilChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSubiendoFoto(true);
        try {
            const urlPerfil = await subirImagenACloudinary(file, "viajando-siempre/perfiles");
            setFormData(prev => ({
                ...prev,
                usuario: {
                    ...(prev?.usuario || {}),
                    fotoPerfil: urlPerfil
                }
            }));
        } catch (error) {
            console.error("Error al subir la foto de perfil a Cloudinary:", error);
            alert("No se pudo subir la foto de perfil. Probá de nuevo.");
        } finally {
            setSubiendoFoto(false);
            e.target.value = "";
        }
    };

    const handlePortadaChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSubiendoFoto(true);
        try {
            const urlPortada = await subirImagenACloudinary(file, "viajando-siempre/portadas");
            setFormData(prev => ({ ...prev, portadaViaje: urlPortada }));
        } catch (error) {
            console.error("Error al subir la portada a Cloudinary:", error);
            alert("No se pudo subir la imagen de portada. Probá de nuevo.");
        } finally {
            setSubiendoFoto(false);
            e.target.value = "";
        }
    };

    const handleAmigoFotoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSubiendoFoto(true);
        try {
            const urlAmigo = await subirImagenACloudinary(file, "viajando-siempre/integrantes");
            setNuevoAmigo(prev => ({ ...prev, fotoPerfil: urlAmigo }));
        } catch (error) {
            console.error("Error al subir la foto del integrante a Cloudinary:", error);
            alert("No se pudo subir la foto del integrante. Probá de nuevo.");
        } finally {
            setSubiendoFoto(false);
            e.target.value = "";
        }
    };

    const handleSumarAmigo = async (e) => {
        e.preventDefault();
        if (!nuevoAmigo.nombre.trim()) {
            alert('Por lo menos ingresa el nombre del integrante');
            return;
        }

        await agregarParticipante({
            id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            nombre: nuevoAmigo.nombre.trim(),
            apellido: (nuevoAmigo.apellido || '').trim(),
            apodo: (nuevoAmigo.apodo || '').trim(),
            alias: (nuevoAmigo.alias || '').trim(),
            descripcion: (nuevoAmigo.descripcion || '').trim(),
            fotoPerfil: nuevoAmigo.fotoPerfil || ''
        });

        setNuevoAmigo({
            nombre: '',
            apellido: '',
            apodo: '',
            alias: '',
            descripcion: '',
            fotoPerfil: ''
        });
    };

    const handleReiniciarClick = async () => {
        if (typeof reiniciarViaje !== 'function') return;
        const nombreAUsar = nombreNuevoViaje.trim() || 'Nuevo Viaje';
        await reiniciarViaje(nombreAUsar);
        setNombreNuevoViaje('');
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (nuevoAmigo?.nombre?.trim()) {
                await agregarParticipante({
                    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    nombre: nuevoAmigo.nombre.trim(),
                    apellido: (nuevoAmigo.apellido || '').trim(),
                    apodo: (nuevoAmigo.apodo || '').trim(),
                    alias: (nuevoAmigo.alias || '').trim(),
                    descripcion: (nuevoAmigo.descripcion || '').trim(),
                    fotoPerfil: nuevoAmigo.fotoPerfil || ''
                });
                setNuevoAmigo({
                    nombre: '',
                    apellido: '',
                    apodo: '',
                    alias: '',
                    descripcion: '',
                    fotoPerfil: ''
                });
            }

            const destinoFinal = formData?.monedaDestino || 'ARS';
            const origenFinal = formData?.monedaOrigen || 'USD';
            const cotizacionNum = Number(formData?.cotizacion);
            const cotizacionFinal =
                destinoFinal === origenFinal
                    ? 1
                    : Number.isFinite(cotizacionNum) && cotizacionNum > 0
                        ? cotizacionNum
                        : 1;

            const datosMoneda = {
                monedaDestino: destinoFinal,
                monedaOrigen: origenFinal,
                cotizacion: cotizacionFinal
            };

            const usuarioActual = formData?.usuario;

            if (usuarioActual?.nombre && usuarioActual.nombre.trim() !== '') {
                const usuarioIdFinal = usuarioActual.id || `local_user_${Date.now()}`;

                const usuarioConId = {
                    ...usuarioActual,
                    id: usuarioIdFinal,
                    nombre: usuarioActual.nombre.trim(),
                    apellido: (usuarioActual.apellido || '').trim(),
                    apodo: (usuarioActual.apodo || '').trim(),
                    alias: (usuarioActual.alias || '').trim(),
                    descripcion: (usuarioActual.descripcion || '').trim(),
                    fotoPerfil: usuarioActual.fotoPerfil || ''
                };

                const viajeActualizado = {
                    ...formData,
                    ...datosMoneda,
                    usuario: usuarioConId
                };

                if (typeof onGuardar === 'function') {
                    await onGuardar(viajeActualizado);
                }

                if (typeof sincronizarUsuarioEnGrupo === 'function') {
                    await sincronizarUsuarioEnGrupo(usuarioConId);
                }
            } else {
                if (typeof onGuardar === 'function') {
                    await onGuardar({
                        ...formData,
                        ...datosMoneda
                    });
                }
            }

            onClose();
        } catch (error) {
            console.error("Error crítico al guardar la configuración:", error);
            alert("Ocurrió un error al guardar los cambios. Revisa los datos e intenta nuevamente.");
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md transition-opacity">

            {/* Inputs de archivos ocultos */}
            <input type="file" ref={fileInputPortadaRef} onChange={handlePortadaChange} accept="image/*" className="hidden" />
            <input type="file" ref={fileInputPerfilRef} onChange={handlePerfilChange} accept="image/*" className="hidden" />
            <input type="file" ref={fileInputAmigoRef} onChange={handleAmigoFotoChange} accept="image/*" className="hidden" />

            <div className="w-full max-w-lg max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 mb-2 sm:mb-0">

                {/* Header Superior Fijo */}
                <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/90 border-b border-zinc-800/80 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            <Compass className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white tracking-wide">Configuración del Viaje</h2>
                            <p className="text-[11px] text-zinc-400">Personaliza tu grupo y tu identidad</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        type="button"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Contenido con Scroll Custom */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

                    {/* FORMULARIO PRINCIPAL */}
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* SECCIÓN 1: DATOS DEL VIAJE */}
                        <div className="bg-zinc-950/50 border border-zinc-800/70 rounded-2xl p-4 sm:p-5 space-y-4">
                            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                                <MapPin className="w-4 h-4 text-amber-500" />
                                <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-widest">
                                    1. Configuración del Viaje
                                </h3>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                                    Nombre del Viaje o Grupo
                                </label>
                                <input
                                    type="text"
                                    name="nombreViaje"
                                    value={formData?.nombreViaje || ''}
                                    onChange={handleChange}
                                    placeholder="Ej: Mendoza 2026..."
                                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm font-medium focus:outline-none focus:border-amber-500 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                                    Foto de Portada del Viaje
                                </label>
                                <div
                                    onClick={() => fileInputPortadaRef.current?.click()}
                                    className="relative h-36 w-full rounded-2xl overflow-hidden border border-zinc-800 cursor-pointer group bg-zinc-900 bg-cover bg-center flex items-center justify-center transition-all hover:border-amber-500/50"
                                    style={{
                                        backgroundImage: (formData?.portadaViaje && typeof formData.portadaViaje === 'string' && formData.portadaViaje.trim() !== '')
                                            ? `url("${formData.portadaViaje}")`
                                            : undefined
                                    }}
                                >
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                                        <span className="text-xs font-bold text-white flex items-center gap-2 bg-zinc-900/90 px-4 py-2 rounded-full border border-zinc-700 shadow-lg">
                                            <Camera className="w-4 h-4 text-amber-400" /> Cambiar portada
                                        </span>
                                    </div>
                                    {!formData?.portadaViaje && (
                                        <div className="flex flex-col items-center gap-2 text-zinc-500">
                                            <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 text-amber-400">
                                                <Camera className="w-5 h-5" />
                                            </div>
                                            <span className="text-xs font-semibold text-zinc-400">Toca para subir foto de portada</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <ConfigMonedas
                                monedaDestino={formData?.monedaDestino || 'ARS'}
                                monedaOrigen={formData?.monedaOrigen || 'USD'}
                                cotizacion={formData?.cotizacion ?? 1}
                                onChange={({ monedaDestino, monedaOrigen, cotizacion }) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        monedaDestino,
                                        monedaOrigen,
                                        cotizacion
                                    }))
                                }
                            />
                        </div>

                        {/* SECCIÓN 2: PERFIL DE USUARIO */}
                        <div className="bg-zinc-950/50 border border-zinc-800/70 rounded-2xl p-4 sm:p-5 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-emerald-500" />
                                    <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
                                        2. Tu Identidad en el Grupo
                                    </h3>
                                </div>

                                {!isEditandoPerfil ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditandoPerfil(true)}
                                        className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-emerald-400 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                                    >
                                        ✏️ Editar Perfil
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditandoPerfil(false)}
                                        className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>

                            {!isEditandoPerfil ? (
                                <div className="flex items-center justify-between p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl">
                                    <div className="flex items-center gap-3.5">
                                        <div
                                            className="w-12 h-12 rounded-xl bg-zinc-800 border border-emerald-500/30 overflow-hidden flex items-center justify-center text-sm font-black text-emerald-400 bg-cover bg-center shrink-0 shadow-sm"
                                            style={{
                                                backgroundImage: formData?.usuario?.fotoPerfil ? `url("${formData.usuario.fotoPerfil}")` : undefined
                                            }}
                                        >
                                            {!formData?.usuario?.fotoPerfil && <User className="w-6 h-6 text-emerald-500" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white">
                                                {formData?.usuario?.nombre ? `${formData.usuario.nombre} ${formData.usuario.apellido || ''}` : 'Sin configurar'}
                                                {formData?.usuario?.apodo ? <span className="text-emerald-400 ml-1">({formData.usuario.apodo})</span> : ''}
                                            </p>
                                            <p className="text-[11px] text-zinc-400">
                                                {formData?.usuario?.nombre ? 'Perfil activo y guardado' : 'Toca "Editar Perfil" para registrar tus datos'}
                                            </p>
                                            {(formData?.usuario?.alias || formData?.usuario?.descripcion) && (
                                                <p className="text-[11px] text-emerald-300/90 mt-0.5">
                                                    {[formData.usuario.alias, formData.usuario.descripcion].filter(Boolean).join(' · ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-4 py-1">
                                        <div
                                            onClick={() => fileInputPerfilRef.current?.click()}
                                            className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-emerald-500/50 overflow-hidden cursor-pointer relative group flex items-center justify-center shrink-0 bg-cover bg-center transition-all hover:border-emerald-400"
                                            style={{
                                                backgroundImage: formData?.usuario?.fotoPerfil ? `url("${formData.usuario.fotoPerfil}")` : undefined
                                            }}
                                        >
                                            {!formData?.usuario?.fotoPerfil && <User className="w-7 h-7 text-zinc-500" />}
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="w-4 h-4 text-emerald-400" />
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-0.5">
                                            <label className="text-xs font-bold text-zinc-200">Foto de perfil</label>
                                            <p className="text-[11px] text-zinc-400">Toca tu avatar para cambiar la foto</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nombre</label>
                                            <input
                                                type="text"
                                                name="nombre"
                                                value={formData?.usuario?.nombre || ''}
                                                onChange={handleChange}
                                                placeholder="Tu nombre"
                                                className="w-full px-3.5 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Apellido</label>
                                            <input
                                                type="text"
                                                name="apellido"
                                                value={formData?.usuario?.apellido || ''}
                                                onChange={handleChange}
                                                placeholder="Tu apellido"
                                                className="w-full px-3.5 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Apodo (Cómo te llaman)</label>
                                            <input
                                                type="text"
                                                name="apodo"
                                                value={formData?.usuario?.apodo || ''}
                                                onChange={handleChange}
                                                placeholder="Ej: Charly, Tano..."
                                                className="w-full px-3.5 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Dato de cobro</label>
                                            <input
                                                type="text"
                                                name="alias"
                                                value={formData?.usuario?.alias || ''}
                                                onChange={handleChange}
                                                placeholder="Alias, @usuario, cel, email o IBAN"
                                                className="w-full px-3.5 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descripción / Banco o Billetera</label>
                                        <input
                                            type="text"
                                            name="descripcion"
                                            value={formData?.usuario?.descripcion || ''}
                                            onChange={handleChange}
                                            placeholder="Ej: Banco Provincia, Mercado Pago, Venmo, Zelle..."
                                            className="w-full px-3.5 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setIsEditandoPerfil(false)}
                                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                                    >
                                        ✓ Guardar Perfil
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* BOTÓN GUARDAR PRINCIPAL */}
                        <div>
                            <button
                                type="submit"
                                disabled={subiendoFoto}
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-zinc-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
                            >
                                <Check className="w-4 h-4 stroke-[3]" /> Guardar Cambios y Continuar
                            </button>
                        </div>

                    </form>

                    {/* SECCIÓN 3: INTEGRANTES DEL GRUPO */}
                    <div className="bg-zinc-950/50 border border-zinc-800/70 rounded-2xl p-4 sm:p-5 space-y-4">
                        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                            <Users className="w-4 h-4 text-amber-500" />
                            <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-widest">
                                3. Integrantes del Viaje ({participantes.length})
                            </h3>
                        </div>

                        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-3.5 space-y-3">
                            <div className="flex items-center gap-3">
                                <div
                                    onClick={() => fileInputAmigoRef.current?.click()}
                                    className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden cursor-pointer relative group flex items-center justify-center shrink-0 bg-cover bg-center transition-all hover:border-amber-500"
                                    style={{
                                        backgroundImage: nuevoAmigo.fotoPerfil ? `url("${nuevoAmigo.fotoPerfil}")` : undefined
                                    }}
                                    title="Subir foto del integrante"
                                >
                                    {!nuevoAmigo.fotoPerfil && <Camera className="w-4 h-4 text-zinc-400" />}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-3 h-3 text-amber-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 flex-1">
                                    <input
                                        type="text"
                                        value={nuevoAmigo.nombre}
                                        onChange={(e) => setNuevoAmigo(prev => ({ ...prev, nombre: e.target.value }))}
                                        placeholder="Nombre *"
                                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                                    />
                                    <input
                                        type="text"
                                        value={nuevoAmigo.apellido}
                                        onChange={(e) => setNuevoAmigo(prev => ({ ...prev, apellido: e.target.value }))}
                                        placeholder="Apellido"
                                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={nuevoAmigo.apodo || ''}
                                        onChange={(e) => setNuevoAmigo(prev => ({ ...prev, apodo: e.target.value }))}
                                        placeholder="Apodo (Ej: Tano, Colo...)"
                                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                                    />

                                    <input
                                        type="text"
                                        value={nuevoAmigo.alias || ''}
                                        onChange={(e) => setNuevoAmigo(prev => ({ ...prev, alias: e.target.value }))}
                                        placeholder="Dato de cobro (@usuario, alias, cel...)"
                                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <input
                                    type="text"
                                    value={nuevoAmigo.descripcion || ''}
                                    onChange={(e) => setNuevoAmigo(prev => ({ ...prev, descripcion: e.target.value }))}
                                    placeholder="Descripción (Ej: Banco Provincia, MP, Venmo...)"
                                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                                />

                                <button
                                    type="button"
                                    onClick={handleSumarAmigo}
                                    disabled={subiendoFoto}
                                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                >
                                    <UserPlus className="w-4 h-4" /> Sumar
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                            {participantes.map((p, index) => {
                                const detallePago = [p.alias, p.descripcion].filter(Boolean).join(' · ');

                                return (
                                    <div key={p.id || index} className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                                className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center text-[11px] font-bold text-amber-400 bg-cover bg-center shrink-0"
                                                style={{
                                                    backgroundImage: p.fotoPerfil ? `url("${p.fotoPerfil}")` : undefined
                                                }}
                                            >
                                                {!p.fotoPerfil && (p.nombre ? p.nombre.charAt(0).toUpperCase() : 'U')}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-zinc-200 truncate">
                                                    {p.nombre} {p.apellido || ''} {p.apodo ? `("${p.apodo}")` : ''}
                                                </p>
                                                {detallePago && (
                                                    <p className="text-[11px] text-zinc-400 truncate">
                                                        {detallePago}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECCIÓN 4: REINICIAR / NUEVO VIAJE */}
                    <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-4 sm:p-5 space-y-3">
                        <div className="flex items-center gap-2 pb-2 border-b border-red-900/30">
                            <RotateCcw className="w-4 h-4 text-red-400" />
                            <h3 className="text-xs font-extrabold text-red-400 uppercase tracking-widest">
                                4. Reiniciar o Empezar Otro Viaje
                            </h3>
                        </div>

                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                            Borra todos los gastos e integrantes compartidos en el grupo para arrancar de cero o pasar a un próximo viaje.
                        </p>

                        <input
                            type="text"
                            value={nombreNuevoViaje}
                            onChange={(e) => setNombreNuevoViaje(e.target.value)}
                            placeholder="Nombre del próximo viaje (opcional)"
                            className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-red-500"
                        />

                        <button
                            type="button"
                            onClick={handleReiniciarClick}
                            disabled={subiendoFoto}
                            className="w-full py-3 bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 border border-red-500/40 text-red-300 font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <RotateCcw className="w-4 h-4" /> Reiniciar Viaje Compartido
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ConfiguracionModal;