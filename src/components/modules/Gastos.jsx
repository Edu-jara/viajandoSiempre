import React, { useState, useMemo, useEffect } from 'react';
import {
    PlusCircle,
    DollarSign,
    Receipt,
    UserCheck,
    Scale,
    Trash2,
    Check,
    X,
    RotateCcw,
    ChevronDown,
    ChevronUp,
    History
} from 'lucide-react';
import { useViaje } from '../../context/ViajeContext';

const SIMBOLOS_MONEDA = {
    ARS: '$',
    USD: 'US$',
    EUR: '€',
    BRL: 'R$',
    CLP: 'CLP$',
    UYU: '$U',
    MXN: 'MX$',
    PEN: 'S/',
    COP: 'COL$',
    GBP: '£'
};

// Convierte "40.000", "40,000", "40.000,50" o "40,000.50" en número real sin perder ceros
const parsearMonto = (valor) => {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
    if (!valor) return 0;

    let limpio = String(valor).trim().replace(/\s+/g, '').replace(/[^\d.,-]/g, '');
    if (!limpio) return 0;

    const tienePunto = limpio.includes('.');
    const tieneComa = limpio.includes(',');

    if (tienePunto && tieneComa) {
        if (limpio.lastIndexOf(',') > limpio.lastIndexOf('.')) {
            limpio = limpio.replace(/\./g, '').replace(',', '.');
        } else {
            limpio = limpio.replace(/,/g, '');
        }
    } else if (tienePunto) {
        const partes = limpio.split('.');
        const esMiles = partes.length > 2 || (partes.length === 2 && partes[1].length === 3 && partes[0].length >= 1);
        if (esMiles) limpio = limpio.replace(/\./g, '');
    } else if (tieneComa) {
        const partes = limpio.split(',');
        const esMiles = partes.length > 2 || (partes.length === 2 && partes[1].length === 3 && partes[0].length >= 1);
        if (esMiles) limpio = limpio.replace(/,/g, '');
        else limpio = limpio.replace(',', '.');
    }

    const numero = Number(limpio);
    return Number.isFinite(numero) ? numero : 0;
};

const obtenerSimbolo = (codigo) => SIMBOLOS_MONEDA[codigo] || '$';

const formatearNumero = (valor, decimales = 2) => {
    const num = Number(valor || 0);
    return num.toLocaleString('es-AR', {
        minimumFractionDigits: Number.isInteger(num) ? 0 : Math.min(decimales, 2),
        maximumFractionDigits: decimales
    });
};

const GastosYBalancesSection = () => {
    const {
        gastosList,
        gastosEliminados = [],
        agregarGasto,
        eliminarGasto,
        restaurarGasto,
        participantes,
        viajeState
    } = useViaje();

    const monedaDestino = viajeState?.monedaDestino || 'ARS';
    const monedaOrigen = viajeState?.monedaOrigen || 'USD';
    const cotizacionRaw = Number(viajeState?.cotizacion);
    const cotizacion = Number.isFinite(cotizacionRaw) && cotizacionRaw > 0 ? cotizacionRaw : 1;
    const hayConversion = monedaDestino !== monedaOrigen && cotizacion > 0;

    const simboloDestino = obtenerSimbolo(monedaDestino);
    const simboloOrigen = obtenerSimbolo(monedaOrigen);

    const [descripcion, setDescripcion] = useState('');
    const [montoTexto, setMontoTexto] = useState('');
    const [pagadoPor, setPagadoPor] = useState(() => viajeState?.usuario?.nombre || '');

    const [confirmandoClave, setConfirmandoClave] = useState(null);
    const [eliminandoClave, setEliminandoClave] = useState(null);
    const [restaurandoId, setRestaurandoId] = useState(null);
    const [verEliminados, setVerEliminados] = useState(false);

    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 5;

    const montoNumerico = useMemo(() => parsearMonto(montoTexto), [montoTexto]);

    // Totales generales en moneda de destino y su equivalente en origen
    const totalGastado = gastosList.reduce((acc, g) => acc + Number(g.monto || 0), 0);
    const totalPorPersona = participantes.length > 0 ? totalGastado / participantes.length : 0;

    // Paginación
    const totalPaginas = Math.ceil(gastosList.length / elementosPorPagina);
    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;
    const gastosPaginaActual = gastosList.slice(indicePrimerElemento, indiceUltimoElemento);

    useEffect(() => {
        if (totalPaginas > 0 && paginaActual > totalPaginas) {
            setPaginaActual(totalPaginas);
        } else if (totalPaginas === 0 && paginaActual !== 1) {
            setPaginaActual(1);
        }
    }, [totalPaginas, paginaActual]);

    // Guardar nuevo gasto en la moneda del país de destino
    const handleAgregarGasto = (e) => {
        e.preventDefault();
        if (!descripcion.trim() || montoNumerico <= 0) {
            alert('Ingresá una descripción y un monto válido.');
            return;
        }

        const pagadorFinal = pagadoPor || participantes[0]?.nombre || 'Usuario';

        agregarGasto({
            id: `gasto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            descripcion: descripcion.trim(),
            monto: Number(montoNumerico.toFixed(2)),
            moneda: monedaDestino,
            pagadoPor: pagadorFinal,
            fecha: new Date().toLocaleDateString('es-AR')
        });

        setDescripcion('');
        setMontoTexto('');
        setConfirmandoClave(null);
        setPaginaActual(1);
    };

    const handleConfirmarEliminar = async (gasto, claveUnica, indiceGlobal) => {
        if (!eliminarGasto || eliminandoClave) return;
        try {
            setEliminandoClave(claveUnica);
            await eliminarGasto(gasto?.id, gasto, indiceGlobal);
            setConfirmandoClave(null);
            setVerEliminados(true);
        } catch (error) {
            console.error('Error al eliminar gasto:', error);
            alert('No se pudo eliminar el gasto. Revisá la conexión.');
        } finally {
            setEliminandoClave(null);
        }
    };

    const handleRestaurarGasto = async (itemEliminado, keyFallback) => {
        if (!restaurarGasto || restaurandoId) return;
        const idActual = itemEliminado?.eliminadoId || keyFallback;
        try {
            setRestaurandoId(idActual);
            await restaurarGasto(itemEliminado);
            setPaginaActual(1);
        } catch (error) {
            console.error('Error al restaurar gasto:', error);
            alert('No se pudo restaurar el gasto. Revisá la conexión.');
        } finally {
            setRestaurandoId(null);
        }
    };

    // Helper para cruzar datos del pagador
    const obtenerDatosPagador = (nombrePagador) => {
        if (!nombrePagador) return { nombreMostrado: 'Sin asignar', foto: '', inicial: '?' };

        const termino = nombrePagador.trim().toLowerCase();
        const encontrado = participantes.find((p) => {
            const nombre = (p.nombre || '').trim().toLowerCase();
            const apodo = (p.apodo || '').trim().toLowerCase();
            const completo = `${p.nombre || ''} ${p.apellido || ''}`.trim().toLowerCase();
            return nombre === termino || apodo === termino || completo === termino;
        });

        if (encontrado) {
            const nombreMostrado = encontrado.apodo
                ? `${encontrado.apodo} (${encontrado.nombre})`
                : `${encontrado.nombre} ${encontrado.apellido || ''}`.trim();

            return {
                nombreMostrado,
                foto: encontrado.fotoPerfil || '',
                inicial: (encontrado.apodo || encontrado.nombre || 'U').charAt(0).toUpperCase()
            };
        }

        return {
            nombreMostrado: nombrePagador,
            foto: '',
            inicial: nombrePagador.charAt(0).toUpperCase()
        };
    };
    useEffect(() => {
        const nombreUsuario = (viajeState?.usuario?.nombre || '').trim();
        if (!pagadoPor) {
            if (nombreUsuario) {
                setPagadoPor(nombreUsuario);
            } else if (participantes.length > 0 && participantes[0]?.nombre) {
                setPagadoPor(participantes[0].nombre);
            }
        }
    }, [viajeState?.usuario?.nombre, participantes, pagadoPor]);

    return (
        <div className="space-y-6">
            {/* BARRA DE INTEGRANTES */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2 overflow-x-auto py-1 px-1">
                    {participantes.map((p, idx) => {
                        const inicial = (p.apodo || p.nombre || 'U').charAt(0).toUpperCase();
                        const nombreMostrar = p.apodo || p.nombre || 'Integrante';

                        return (
                            <div key={p.id || idx} className="flex flex-col items-center gap-1 shrink-0" title={nombreMostrar}>
                                <div
                                    className="w-11 h-11 rounded-full bg-zinc-800 border-2 border-emerald-500/40 overflow-hidden flex items-center justify-center text-xs font-black text-emerald-400 bg-cover bg-center shadow-sm"
                                    style={{
                                        backgroundImage: p.fotoPerfil ? `url("${p.fotoPerfil}")` : undefined
                                    }}
                                >
                                    {!p.fotoPerfil && inicial}
                                </div>
                                <span className="text-[10px] font-semibold text-zinc-300 max-w-[50px] truncate text-center">
                                    {nombreMostrar}
                                </span>
                            </div>
                        );
                    })}

                    {participantes.length === 0 && (
                        <p className="text-xs text-zinc-500 italic px-2">
                            Aún no hay participantes en el grupo. ¡Sumá amigos en la configuración!
                        </p>
                    )}
                </div>

                <div className="shrink-0 pl-3 border-l border-zinc-800 text-right">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Grupo</span>
                    <span className="text-xs font-black text-emerald-400">{participantes.length} pers.</span>
                </div>
            </div>

            {/* 1. RESUMEN Y BALANCE RÁPIDO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                            Gasto Total del Grupo
                        </p>
                        <h4 className="text-lg font-black text-amber-400 mt-1">
                            {simboloDestino}{formatearNumero(totalGastado)}{' '}
                            <span className="text-xs font-semibold text-zinc-400">{monedaDestino}</span>
                        </h4>
                        {hayConversion && (
                            <p className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                                ≈ {simboloOrigen}{formatearNumero(totalGastado / cotizacion)} {monedaOrigen}
                            </p>
                        )}
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <DollarSign className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                            Promedio por Persona
                        </p>
                        <h4 className="text-lg font-black text-emerald-400 mt-1">
                            {simboloDestino}{formatearNumero(totalPorPersona)}{' '}
                            <span className="text-xs font-semibold text-zinc-400">{monedaDestino}</span>
                        </h4>
                        {hayConversion && (
                            <p className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                                ≈ {simboloOrigen}{formatearNumero(totalPorPersona / cotizacion)} {monedaOrigen}
                            </p>
                        )}
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Scale className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* 2. FORMULARIO DE REGISTRO DE GASTOS */}
            <form
                onSubmit={handleAgregarGasto}
                className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl"
            >
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
                            Registrar Nuevo Gasto
                        </h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-amber-300">
                        Moneda: {monedaDestino}
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            ¿Qué se pagó?
                        </label>
                        <input
                            type="text"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Ej: Cena, Nafta, Hotel..."
                            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            Monto ({monedaDestino})
                        </label>
                        <div className="relative">
                            <span className="pointer-events-none select-none text-xs font-bold text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2">
                                {simboloDestino}
                            </span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={montoTexto}
                                onChange={(e) => setMontoTexto(e.target.value)}
                                placeholder="Ej: 40.000"
                                className="w-full pl-12 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-emerald-400" /> ¿Quién pagó?
                        </label>
                        <select
                            value={pagadoPor}
                            onChange={(e) => setPagadoPor(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                            {participantes.map((p, idx) => {
                                const etiqueta = p.apodo
                                    ? `${p.apodo} (${p.nombre})`
                                    : `${p.nombre} ${p.apellido || ''}`.trim();
                                return (
                                    <option key={p.id || idx} value={p.nombre}>
                                        {etiqueta}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                        <PlusCircle className="w-4 h-4 stroke-[2.5]" /> Agregar Gasto
                    </button>
                </div>
            </form>

            {/* 3. LISTA DE GASTOS PAGINADA */}
            <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px] text-zinc-400 px-1">
                    <span>Mostrando {gastosPaginaActual.length} de {gastosList.length} registros</span>
                    <span>Página {paginaActual} de {totalPaginas || 1}</span>
                </div>

                <div className="space-y-2.5">
                    {gastosPaginaActual.map((gasto, idxEnPagina) => {
                        const indiceGlobal = indicePrimerElemento + idxEnPagina;
                        const claveUnica = gasto.id ?? `gasto_idx_${indiceGlobal}`;
                        const pagador = obtenerDatosPagador(gasto.pagadoPor);
                        const pidiendoConfirmacion = confirmandoClave === claveUnica;
                        const estaEliminando = eliminandoClave === claveUnica;

                        return (
                            <div
                                key={claveUnica}
                                className="p-3.5 bg-zinc-900/90 border border-zinc-800/90 hover:border-emerald-500/40 rounded-2xl flex justify-between items-center gap-3 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-9 h-9 rounded-full bg-zinc-800 border border-emerald-500/30 flex items-center justify-center text-xs font-black text-emerald-400 bg-cover bg-center shrink-0 shadow-sm"
                                        style={{
                                            backgroundImage: pagador.foto ? `url("${pagador.foto}")` : undefined
                                        }}
                                    >
                                        {!pagador.foto && pagador.inicial}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">
                                            {gasto.descripcion}
                                        </p>
                                        <p className="text-[11px] text-zinc-400 truncate">
                                            Pagó <span className="text-zinc-200 font-semibold">{pagador.nombreMostrado}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                    <div className="text-right">
                                        <span className="text-sm font-black text-emerald-400 block">
                                            +{simboloDestino}{formatearNumero(gasto.monto)}
                                        </span>
                                        <span className="text-[10px] text-zinc-500 font-semibold">{monedaDestino}</span>
                                    </div>

                                    {!pidiendoConfirmacion ? (
                                        <button
                                            type="button"
                                            disabled={Boolean(eliminandoClave)}
                                            onClick={() => setConfirmandoClave(claveUnica)}
                                            title="Eliminar gasto"
                                            className="p-2 rounded-xl bg-zinc-800/90 hover:bg-rose-500/20 hover:text-rose-300 text-zinc-400 transition-colors cursor-pointer disabled:opacity-40 touch-manipulation"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                disabled={estaEliminando}
                                                onClick={() => handleConfirmarEliminar(gasto, claveUnica, indiceGlobal)}
                                                title="Confirmar eliminación"
                                                className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 touch-manipulation"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>{estaEliminando ? 'Borrando...' : 'Borrar'}</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={estaEliminando}
                                                onClick={() => setConfirmandoClave(null)}
                                                title="Cancelar"
                                                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer disabled:opacity-40 touch-manipulation"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {gastosList.length === 0 && (
                        <p className="text-center text-xs text-zinc-500 py-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/60">
                            No hay registros todavía. ¡Cargá el primero arriba!
                        </p>
                    )}
                </div>

                {/* Controles de Paginación */}
                {totalPaginas > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                            disabled={paginaActual === 1}
                            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        >
                            Anterior
                        </button>

                        <span className="text-xs text-emerald-400 font-bold px-2">
                            {paginaActual} / {totalPaginas}
                        </span>

                        <button
                            type="button"
                            onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                            disabled={paginaActual === totalPaginas}
                            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>

            {/* 4. HISTORIAL DE ÚLTIMOS GASTOS ELIMINADOS (COMPONENTE INTERNO DESPLEGABLE) */}
            {gastosEliminados.length > 0 && (
                <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setVerEliminados((prev) => !prev)}
                        className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-zinc-800/40 transition-colors cursor-pointer touch-manipulation"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <History className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-xs font-bold text-zinc-200 truncate">
                                Últimos gastos eliminados ({gastosEliminados.length})
                            </span>
                        </div>
                        {verEliminados ? (
                            <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                        )}
                    </button>

                    {verEliminados && (
                        <div className="px-4 pb-3.5 pt-1 space-y-2 border-t border-zinc-800/70">
                            <p className="text-[11px] text-zinc-500">
                                Registro compartido de los últimos {gastosEliminados.length} borrados. Si alguno fue por error, podés restaurarlo.
                            </p>

                            {gastosEliminados.map((item, idx) => {
                                const itemKey = item.eliminadoId || `del_${idx}`;
                                const estaRestaurando = restaurandoId === itemKey;
                                const pagadorOriginal = obtenerDatosPagador(item.pagadoPor);

                                return (
                                    <div
                                        key={itemKey}
                                        className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between gap-2.5"
                                    >
                                        <div className="min-w-0 space-y-0.5">
                                            <p className="text-xs text-zinc-200 leading-snug">
                                                Se borró <span className="font-bold text-amber-300">"{item.descripcion}"</span> por{' '}
                                                <span className="font-bold text-rose-300">
                                                    {simboloDestino}{formatearNumero(item.monto)} {monedaDestino}
                                                </span>
                                            </p>
                                            <p className="text-[10px] text-zinc-500 truncate">
                                                Pagó {pagadorOriginal.nombreMostrado}
                                                {item.eliminadoPor ? ` · Eliminado por ${item.eliminadoPor}` : ''}
                                                {item.eliminadoEl ? ` (${item.eliminadoEl})` : ''}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={Boolean(restaurandoId)}
                                            onClick={() => handleRestaurarGasto(item, itemKey)}
                                            title="Restaurar este gasto"
                                            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 touch-manipulation"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            <span>{estaRestaurando ? 'Restaurando...' : 'Restaurar'}</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GastosYBalancesSection;