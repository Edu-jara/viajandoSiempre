import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRightLeft, Plus, X, SlidersHorizontal, Check } from 'lucide-react';

const CATALOGO_MONEDAS = [
    { codigo: 'USD', nombre: 'Dólar estadounidense', bandera: '🇺🇸', simbolo: 'US$', tasaDefault: 1 },
    { codigo: 'MXN', nombre: 'Peso mexicano', bandera: '🇲🇽', simbolo: 'MX$', tasaDefault: 20 },
    { codigo: 'ARS', nombre: 'Peso argentino', bandera: '🇦🇷', simbolo: '$', tasaDefault: 1200 },
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

const Conversor = ({ monedaViaje = 'MXN', monedaOrigen = 'ARS' }) => {
    // 1. Lista de monedas activas en el tablero
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
        return Array.from(new Set([monedaViaje, 'USD', monedaOrigen].filter(Boolean)));
    });

    // 2. Tasas expresadas como: cuántas unidades equivalen a 1 USD
    const [tasas, setTasas] = useState(() => {
        const iniciales = {};
        CATALOGO_MONEDAS.forEach((m) => {
            iniciales[m.codigo] = String(m.tasaDefault);
        });
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

    // 3. Moneda y texto que el usuario está editando ahora mismo
    const [monedaActiva, setMonedaActiva] = useState(() => monedasActivas[0] || 'MXN');
    const [textoInput, setTextoInput] = useState('100');

    // UI secundaria: editar tasas y agregar moneda
    const [editandoTasas, setEditandoTasas] = useState(false);
    const [mostrandoSelector, setMostrandoSelector] = useState(false);

    // Sincronizar si cambia monedaViaje desde la configuración general
    useEffect(() => {
        if (monedaViaje && !monedasActivas.includes(monedaViaje)) {
            setMonedasActivas((prev) => [monedaViaje, ...prev]);
        }
    }, [monedaViaje]);

    // Persistir monedas elegidas y tasas offline
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

    const obtenerTasaNumerica = (codigo) => {
        if (codigo === 'USD') return 1;
        const val = parseFloat(String(tasas[codigo] ?? '').replace(',', '.'));
        return Number.isFinite(val) && val > 0 ? val : 1;
    };

    // Monto base convertido a USD para calcular todas las demás filas
    const montoEnUsd = useMemo(() => {
        const limpio = parseFloat(String(textoInput).replace(',', '.'));
        if (!Number.isFinite(limpio) || limpio < 0) return 0;
        const tasaBase = obtenerTasaNumerica(monedaActiva);
        return limpio / tasaBase;
    }, [textoInput, monedaActiva, tasas]);

    const formatearValor = (valor) => {
        if (!Number.isFinite(valor) || valor === 0) return '';
        return valor.toLocaleString('es-AR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: valor < 10 ? 2 : 0,
        });
    };

    const handleChangeFila = (codigo, nuevoTexto) => {
        // Permitir solo dígitos, punto o coma
        const sanitizado = nuevoTexto.replace(/[^0-9.,]/g, '');
        setMonedaActiva(codigo);
        setTextoInput(sanitizado);
    };

    const handleFocusFila = (codigo, valorCalculado) => {
        if (monedaActiva === codigo) return;
        setMonedaActiva(codigo);
        // Al tocar otra fila, precargar su valor numérico sin puntos de miles para editar fácil
        if (!valorCalculado || valorCalculado === 0) {
            setTextoInput('');
        } else {
            const redondeado = Number(valorCalculado.toFixed(valorCalculado < 10 ? 2 : 0));
            setTextoInput(String(redondeado));
        }
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
            setTextoInput('100');
        }
    };

    const monedasDisponiblesParaAgregar = CATALOGO_MONEDAS.filter(
        (m) => !monedasActivas.includes(m.codigo)
    );

    return (
        <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                {/* Encabezado */}
                <div className="flex items-center justify-between gap-2 mb-4">
                    <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                        Conversor de Moneda
                    </h2>

                    <button
                        type="button"
                        onClick={() => setEditandoTasas((prev) => !prev)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                            editandoTasas
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

                {/* Panel editable de cotizaciones respecto a 1 USD */}
                {editandoTasas && (
                    <div className="mb-4 p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2.5">
                        <p className="text-[11px] font-semibold text-zinc-400">
                            Cotización equivalente a <span className="text-amber-400 font-bold">1 USD</span> (se guarda offline):
                        </p>
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
                                                <span>{codigo}</span>
                                            </span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={tasas[codigo] ?? ''}
                                                onChange={(e) =>
                                                    setTasas((prev) => ({
                                                        ...prev,
                                                        [codigo]: e.target.value.replace(/[^0-9.,]/g, ''),
                                                    }))
                                                }
                                                className="w-24 text-right bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                                            />
                                        </div>
                                    );
                                })}
                        </div>
                        {monedasActivas.filter((c) => c !== 'USD').length === 0 && (
                            <p className="text-xs text-zinc-500">Agregá otra moneda para editar su cotización.</p>
                        )}
                    </div>
                )}

                {/* Filas de conversión con banderas */}
                <div className="space-y-2.5">
                    {monedasActivas.map((codigo) => {
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
                                className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all ${
                                    esActiva
                                        ? 'bg-amber-500/10 border-amber-500/40'
                                        : 'bg-zinc-950 border-zinc-800/90'
                                }`}
                            >
                                {/* Bandera y código */}
                                <div className="flex items-center gap-2.5 min-w-[92px]">
                                    <span className="text-2xl leading-none select-none">{info.bandera}</span>
                                    <div className="leading-tight">
                                        <span className="block text-xs font-black text-zinc-100">
                                            {info.codigo}
                                        </span>
                                        <span className="block text-[10px] text-zinc-400 truncate max-w-[68px]">
                                            {info.nombre.split(' ')[0]}
                                        </span>
                                    </div>
                                </div>

                                {/* Campo editable en todas las filas */}
                                <div className="relative flex-1">
                                    <span className="pointer-events-none select-none absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-zinc-500">
                                        {info.simbolo}
                                    </span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={valorMostrado}
                                        onFocus={() => handleFocusFila(codigo, valorCalculado)}
                                        onChange={(e) => handleChangeFila(codigo, e.target.value)}
                                        placeholder="0"
                                        className={`w-full pl-11 pr-3 py-2 rounded-xl text-right text-sm font-black focus:outline-none ${
                                            esActiva
                                                ? 'bg-zinc-950/90 text-amber-300 border border-amber-500/30'
                                                : 'bg-zinc-900/70 text-zinc-100 border border-transparent focus:border-amber-500/40'
                                        }`}
                                    />
                                </div>

                                {/* Botón para quitar fila */}
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
                        );
                    })}
                </div>

                {/* Botón y selector para agregar más monedas */}
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