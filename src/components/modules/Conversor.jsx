import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    ArrowRightLeft,
    ArrowUp,
    Plus,
    X,
    SlidersHorizontal,
    Check,
    RotateCcw,
    RefreshCw,
    Eraser,
} from 'lucide-react';

const CATALOGO_MONEDAS = [
    { codigo: 'USD', nombre: 'Dólar estadounidense', bandera: '🇺🇸', simbolo: 'US$', tasaDefault: 1 },
    { codigo: 'MXN', nombre: 'Peso mexicano', bandera: '🇲🇽', simbolo: 'MX$', tasaDefault: 20 },
    { codigo: 'ARS', nombre: 'Peso argentino', bandera: '🇦🇷', simbolo: '$', tasaDefault: 1600 },
    { codigo: 'BRL', nombre: 'Real brasileño', bandera: '🇧🇷', simbolo: 'R$', tasaDefault: 5.8 },
    { codigo: 'EUR', nombre: 'Euro', bandera: '🇪🇺', simbolo: '€', tasaDefault: 0.92 },
    { codigo: 'CLP', nombre: 'Peso chileno', bandera: '🇨🇱', simbolo: 'CLP$', tasaDefault: 980 },
    { codigo: 'UYU', nombre: 'Peso uruguayo', bandera: '🇺🇾', simbolo: '$U', tasaDefault: 42 },
    { codigo: 'COP', nombre: 'Peso colombiano', bandera: '🇨🇴', simbolo: 'COL$', tasaDefault: 4300 },
    { codigo: 'PEN', nombre: 'Sol peruano', bandera: '🇵🇪', simbolo: 'S/', tasaDefault: 3.75 },
    { codigo: 'GBP', nombre: 'Libra esterlina', bandera: '🇬🇧', simbolo: '£', tasaDefault: 0.79 },
];

const STORAGE_MONEDAS_KEY = 'viajando_conversor_monedas_v1';
const STORAGE_TASAS_KEY = 'viajando_conversor_tasas_v1';
const STORAGE_FECHA_TASAS_KEY = 'viajando_conversor_tasas_fecha_v1';

const construirBaseViaje = (monedaDestino, monedaOrigen) =>
    Array.from(new Set([monedaDestino, 'USD', monedaOrigen].filter(Boolean)));

const construirTasasIniciales = () => {
    const iniciales = {};
    CATALOGO_MONEDAS.forEach((m) => {
        iniciales[m.codigo] = String(m.tasaDefault);
    });
    return iniciales;
};

const parsearMonto = (texto) => {
    const limpio = String(texto ?? '').trim().replace(/\s+/g, '');
    if (!limpio) return NaN;

    if (limpio.includes('.') && limpio.includes(',')) {
        return parseFloat(limpio.replace(/\./g, '').replace(',', '.'));
    }

    if (limpio.includes(',')) {
        return parseFloat(limpio.replace(',', '.'));
    }

    if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
        return parseFloat(limpio.replace(/\./g, ''));
    }

    return parseFloat(limpio);
};

const formatearEntradaEnVivo = (texto) => {
    let limpio = String(texto ?? '').replace(/[^0-9,]/g, '');
    if (!limpio) return '';

    limpio = limpio.replace(/,(\d{3})(?!\d)/g, '$1');

    const partes = limpio.split(',');
    const parteEnteraRaw = partes[0].replace(/^0+(?=\d)/, '');
    const tieneComa = partes.length > 1;
    const parteDecimalRaw = tieneComa ? partes.slice(1).join('').slice(0, 2) : '';

    const enteroFormateado = parteEnteraRaw
        ? Number(parteEnteraRaw).toLocaleString('es-AR')
        : tieneComa
            ? '0'
            : '';

    if (tieneComa) {
        return `${enteroFormateado},${parteDecimalRaw}`;
    }

    return enteroFormateado;
};

const Conversor = ({
    monedaDestino = 'ARS',
    monedaOrigen = 'USD',
    cotizacionViaje = 1,
}) => {
    const [monedasActivas, setMonedasActivas] = useState(() => {
        try {
            const guardadas = localStorage.getItem(STORAGE_MONEDAS_KEY);
            if (guardadas) {
                const parsed = JSON.parse(guardadas);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch {
            // Ignorar errores de storage
        }
        return construirBaseViaje(monedaDestino, monedaOrigen);
    });

    const [tasas, setTasas] = useState(() => {
        const iniciales = construirTasasIniciales();
        try {
            const guardadas = localStorage.getItem(STORAGE_TASAS_KEY);
            if (guardadas) {
                return { ...iniciales, ...JSON.parse(guardadas) };
            }
        } catch {
            // Ignorar errores de storage
        }
        return iniciales;
    });

    const [ultimaActualizacion, setUltimaActualizacion] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_FECHA_TASAS_KEY) || '';
        } catch {
            return '';
        }
    });

    const [estadoSync, setEstadoSync] = useState('');
    const [actualizandoOnline, setActualizandoOnline] = useState(false);

    const [monedaActiva, setMonedaActiva] = useState(() => monedasActivas[0] || monedaDestino || 'ARS');
    const [textoInput, setTextoInput] = useState('100');
    const [editandoTasas, setEditandoTasas] = useState(false);
    const [mostrandoSelector, setMostrandoSelector] = useState(false);

    const inputActivoRef = useRef(null);
    const primerRenderRef = useRef(true);

    // Actualiza la lista base sin pisar la monedaActiva elegida por el usuario
    useEffect(() => {
        if (primerRenderRef.current) {
            primerRenderRef.current = false;
            return;
        }
        const baseNueva = construirBaseViaje(monedaDestino, monedaOrigen);
        setMonedasActivas((prev) => {
            const extras = prev.filter((c) => !baseNueva.includes(c));
            const siguiente = [...baseNueva, ...extras];
            setMonedaActiva((actual) => (siguiente.includes(actual) ? actual : siguiente[0] || 'ARS'));
            return siguiente;
        });
    }, [monedaDestino, monedaOrigen]);

    useEffect(() => {
        const cotNum = Number(cotizacionViaje);
        if (
            monedaDestino &&
            monedaDestino !== 'USD' &&
            Number.isFinite(cotNum) &&
            cotNum > 0 &&
            cotNum !== 1
        ) {
            setTasas((prev) => ({
                ...prev,
                [monedaDestino]: String(cotNum),
            }));
        }
    }, [monedaDestino, cotizacionViaje]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_MONEDAS_KEY, JSON.stringify(monedasActivas));
        } catch {
            // Ignorar
        }
    }, [monedasActivas]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_TASAS_KEY, JSON.stringify(tasas));
        } catch {
            // Ignorar
        }
    }, [tasas]);

    const handleActualizarOnline = async () => {
        if (!navigator.onLine) {
            setEstadoSync(
                ultimaActualizacion
                    ? `Sin conexión: usando valores del ${ultimaActualizacion}.`
                    : 'Sin conexión: usando últimos valores guardados.'
            );
            return;
        }

        setActualizandoOnline(true);
        setEstadoSync('');

        try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            if (!res.ok) throw new Error('Error de red');
            const data = await res.json();
            const rates = data?.rates;
            if (!rates) throw new Error('Sin tasas');

            setTasas((prev) => {
                const siguientes = { ...prev };
                Object.keys(siguientes).forEach((codigo) => {
                    if (codigo !== 'USD' && typeof rates[codigo] === 'number' && rates[codigo] > 0) {
                        siguientes[codigo] = String(Number(rates[codigo].toFixed(4)));
                    }
                });
                return siguientes;
            });

            const ahora = new Date().toLocaleString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
            setUltimaActualizacion(ahora);
            setEstadoSync(`Cotizaciones actualizadas (${ahora}).`);

            try {
                localStorage.setItem(STORAGE_FECHA_TASAS_KEY, ahora);
            } catch {
                // Ignorar
            }
        } catch {
            setEstadoSync(
                ultimaActualizacion
                    ? `No se pudo conectar: usando valores del ${ultimaActualizacion}.`
                    : 'No se pudo conectar: usando últimos valores guardados.'
            );
        } finally {
            setActualizandoOnline(false);
        }
    };

    const handleRestablecerTasas = () => {
        const limpias = construirTasasIniciales();
        setTasas(limpias);
        setUltimaActualizacion('');
        setEstadoSync('Tasas restablecidas a valores iniciales.');
        try {
            localStorage.removeItem(STORAGE_TASAS_KEY);
            localStorage.removeItem(STORAGE_FECHA_TASAS_KEY);
        } catch {
            // Ignorar
        }
    };

    const handleLimpiarMonto = () => {
        setTextoInput('');
        inputActivoRef.current?.focus();
    };

    const obtenerTasaNumerica = (codigo) => {
        if (codigo === 'USD') return 1;
        const val = parsearMonto(tasas[codigo] ?? '');
        return Number.isFinite(val) && val > 0 ? val : 1;
    };

    const montoEnUsd = useMemo(() => {
        const limpio = parsearMonto(textoInput);
        if (!Number.isFinite(limpio) || limpio < 0) return 0;
        return limpio / obtenerTasaNumerica(monedaActiva);
    }, [textoInput, monedaActiva, tasas]);

    const formatearValor = (valor) => {
        if (!Number.isFinite(valor) || valor === 0) return '';
        return valor.toLocaleString('es-AR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: valor < 10 ? 2 : 0,
        });
    };

    const obtenerTextoReferenciaFila = (codigo) => {
        const tasaFila = obtenerTasaNumerica(codigo);
        if (codigo === monedaActiva) {
            return codigo === 'USD'
                ? 'Base activa (1 USD)'
                : `Base activa (1 USD = ${tasaFila.toLocaleString('es-AR')} ${codigo})`;
        }

        const tasaActiva = obtenerTasaNumerica(monedaActiva);
        if (!tasaFila || !tasaActiva) return '';

        const valorEnActiva = (1 / tasaFila) * tasaActiva;
        const formato = valorEnActiva.toLocaleString('es-AR', {
            minimumFractionDigits: valorEnActiva < 1 ? 4 : 2,
            maximumFractionDigits: valorEnActiva < 1 ? 4 : 2,
        });

        return `1 ${codigo} = ${formato} ${monedaActiva}`;
    };

    const handleChangeFila = (codigo, nuevoTexto) => {
        const formateado = formatearEntradaEnVivo(nuevoTexto);
        setMonedaActiva(codigo);
        setTextoInput(formateado);
    };

    const handleFocusFila = (codigo, valorCalculado) => {
        if (monedaActiva === codigo) return;
        setMonedaActiva(codigo);
        if (!valorCalculado || valorCalculado === 0) {
            setTextoInput('');
        } else {
            const redondeado = Number(valorCalculado.toFixed(valorCalculado < 10 ? 2 : 0));
            setTextoInput(String(redondeado));
        }
    };

    const handleMoverArriba = (codigo) => {
        setMonedasActivas((prev) => {
            const idx = prev.indexOf(codigo);
            if (idx <= 0) return prev;
            const copia = [...prev];
            copia.splice(idx, 1);
            return [codigo, ...copia];
        });
    };

    const handleAgregarMoneda = (codigo) => {
        if (!monedasActivas.includes(codigo)) {
            setMonedasActivas((prev) => [...prev, codigo]);
        }
        setMostrandoSelector(false);
    };

    const handleQuitarMoneda = (codigo) => {
        if (monedasActivas.length <= 1) return;
        const restantes = monedasActivas.filter((c) => c !== codigo);
        setMonedasActivas(restantes);
        if (monedaActiva === codigo) {
            setMonedaActiva(restantes[0]);
            setTextoInput('');
        }
    };

    const monedasDisponiblesParaAgregar = CATALOGO_MONEDAS.filter(
        (m) => !monedasActivas.includes(m.codigo)
    );

    return (
        <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                <div className="flex items-center justify-between gap-2 mb-4">
                    <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                        Conversor de Moneda
                    </h2>

                    <div className="flex items-center gap-1.5">
                        {textoInput.length > 0 && (
                            <button
                                type="button"
                                onClick={handleLimpiarMonto}
                                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
                                title="Borrar monto cargado"
                            >
                                <Eraser className="w-3.5 h-3.5 text-amber-400" />
                                Borrar
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setEditandoTasas((prev) => !prev)}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${editandoTasas
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                                }`}
                        >
                            {editandoTasas ? (
                                <>
                                    <Check className="w-3.5 h-3.5" />
                                    Listo
                                </>
                            ) : (
                                <>
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                                    Tasas
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {editandoTasas && (
                    <div className="mb-4 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold text-zinc-400">
                                ¿Cuánto vale <span className="text-amber-400 font-bold">1 USD</span>?
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleActualizarOnline}
                                    disabled={actualizandoOnline}
                                    className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 disabled:opacity-50 transition-colors"
                                >
                                    <RefreshCw className={`w-3 h-3 ${actualizandoOnline ? 'animate-spin' : ''}`} />
                                    {actualizandoOnline ? 'Buscando...' : 'Actualizar online'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleRestablecerTasas}
                                    className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-amber-300"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Restablecer
                                </button>
                            </div>
                        </div>

                        {(estadoSync || ultimaActualizacion) && (
                            <p className="text-[11px] text-zinc-400">
                                {estadoSync || `Última actualización online: ${ultimaActualizacion}`}
                            </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {monedasActivas
                                .filter((codigo) => codigo !== 'USD')
                                .map((codigo) => {
                                    const info = CATALOGO_MONEDAS.find((m) => m.codigo === codigo);
                                    return (
                                        <div
                                            key={codigo}
                                            className="flex items-center justify-between gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-2"
                                        >
                                            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                                                <span>{info?.bandera}</span>
                                                <span>1 USD = {codigo}</span>
                                            </span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={tasas[codigo] ?? ''}
                                                onChange={(e) => {
                                                    setEstadoSync('Cotización editada manualmente (guardada offline).');
                                                    setTasas((prev) => ({
                                                        ...prev,
                                                        [codigo]: e.target.value.replace(/[^0-9.,]/g, ''),
                                                    }));
                                                }}
                                                className="w-24 text-right bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                                            />
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

                <div className="space-y-2.5">
                    {monedasActivas.map((codigo, index) => {
                        const info = CATALOGO_MONEDAS.find((m) => m.codigo === codigo) || {
                            codigo,
                            nombre: codigo,
                            bandera: '🏳️',
                            simbolo: '$',
                        };
                        const esActiva = monedaActiva === codigo;
                        const valorCalculado = montoEnUsd * obtenerTasaNumerica(codigo);
                        const valorMostrado = esActiva ? textoInput : formatearValor(valorCalculado);

                        return (
                            <div
                                key={codigo}
                                className={`flex flex-col gap-2 p-3 rounded-2xl border transition-all ${esActiva
                                    ? 'bg-amber-500/10 border-amber-500/40'
                                    : 'bg-zinc-950 border-zinc-800/90'
                                    }`}
                            >
                                {/* Fila 1: moneda, input y botones */}
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 min-w-[92px] shrink-0">
                                        <span className="text-2xl leading-none select-none">{info.bandera}</span>
                                        <div className="leading-tight min-w-0">
                                            <span className="block text-xs font-black text-zinc-100">
                                                {info.codigo}
                                            </span>
                                            <span className="block text-[10px] text-zinc-400 truncate max-w-[64px]">
                                                {info.nombre.split(' ')[0]}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="relative flex-1 min-w-0">
                                        <span className="pointer-events-none select-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-500">
                                            {info.simbolo}
                                        </span>
                                        <input
                                            ref={esActiva ? inputActivoRef : null}
                                            type="text"
                                            inputMode="decimal"
                                            value={valorMostrado}
                                            onFocus={() => handleFocusFila(codigo, valorCalculado)}
                                            onChange={(e) => handleChangeFila(codigo, e.target.value)}
                                            placeholder="0"
                                            className={`w-full pl-11 pr-3 py-2 rounded-xl text-right text-sm font-black focus:outline-none ${esActiva
                                                ? 'bg-zinc-950/90 text-amber-300 border border-amber-500/30'
                                                : 'bg-zinc-900/70 text-zinc-100 border border-transparent focus:border-amber-500/40'
                                                }`}
                                        />
                                    </div>

                                    <div className="flex items-center gap-0.5 shrink-0">
                                        {index > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => handleMoverArriba(codigo)}
                                                className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-300 hover:bg-zinc-800/80 transition-colors"
                                                title={`Subir ${info.codigo} al primer lugar`}
                                                aria-label={`Subir ${info.codigo} al primer lugar`}
                                            >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        {monedasActivas.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleQuitarMoneda(codigo)}
                                                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 transition-colors"
                                                title={`Quitar ${info.codigo}`}
                                                aria-label={`Quitar ${info.codigo}`}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Fila 2: referencia estirada abajo */}
                                <div className="pt-1.5 border-t border-zinc-800/60 flex items-center justify-between gap-2 text-[11px]">
                                    <span className="text-zinc-500 font-medium shrink-0">Referencia</span>
                                    <span className="text-amber-300/90 font-semibold text-right truncate">
                                        {obtenerTextoReferenciaFila(codigo)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {monedasDisponiblesParaAgregar.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-zinc-800/80">
                        {!mostrandoSelector ? (
                            <button
                                type="button"
                                onClick={() => setMostrandoSelector(true)}
                                className="w-full py-2.5 px-4 rounded-2xl bg-zinc-950 border border-dashed border-zinc-700 hover:border-amber-500/50 text-xs font-bold text-zinc-300 hover:text-amber-300 flex items-center justify-center gap-1.5 transition-colors"
                            >
                                <Plus className="w-4 h-4 text-amber-400" />
                                Agregar otra moneda
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-zinc-400">
                                        Elegí una moneda para sumar:
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setMostrandoSelector(false)}
                                        className="text-[11px] text-zinc-400 hover:text-zinc-200"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {monedasDisponiblesParaAgregar.map((m) => (
                                        <button
                                            key={m.codigo}
                                            type="button"
                                            onClick={() => handleAgregarMoneda(m.codigo)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-500/50 text-xs font-bold text-zinc-200 transition-colors"
                                        >
                                            <span>{m.bandera}</span>
                                            <span>{m.codigo}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Conversor;