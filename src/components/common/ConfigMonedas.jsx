import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowLeftRight, Globe, Wallet } from 'lucide-react';

const MONEDAS = [
    { codigo: 'ARS', nombre: 'Peso Argentino', simbolo: '$' },
    { codigo: 'USD', nombre: 'Dólar Estadounidense', simbolo: 'US$' },
    { codigo: 'EUR', nombre: 'Euro', simbolo: '€' },
    { codigo: 'BRL', nombre: 'Real Brasileño', simbolo: 'R$' },
    { codigo: 'UYU', nombre: 'Peso Uruguayo', simbolo: '$U' },
    { codigo: 'CLP', nombre: 'Peso Chileno', simbolo: 'CLP$' },
    { codigo: 'MXN', nombre: 'Peso Mexicano', simbolo: 'MX$' },
    { codigo: 'PEN', nombre: 'Sol Peruano', simbolo: 'S/' },
    { codigo: 'COP', nombre: 'Peso Colombiano', simbolo: 'COL$' },
    { codigo: 'GBP', nombre: 'Libra Esterlina', simbolo: '£' }
];

// Reutiliza el mismo parseador para que "1.250,50" o "1,250.50" no falle
export const parsearCotizacion = (valor) => {
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 1;
    if (!valor) return 1;

    let limpio = String(valor).trim().replace(/\s+/g, '').replace(/[^\d.,]/g, '');
    if (!limpio) return 1;

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
        if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3 && partes[0].length >= 1)) {
            limpio = limpio.replace(/\./g, '');
        }
    } else if (tieneComa) {
        const partes = limpio.split(',');
        if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3 && partes[0].length >= 1)) {
            limpio = limpio.replace(/,/g, '');
        } else {
            limpio = limpio.replace(',', '.');
        }
    }

    const num = Number(limpio);
    return Number.isFinite(num) && num > 0 ? num : 1;
};

/**
 * Props esperadas desde tu modal de configuración:
 * - monedaDestino: string (ej. 'ARS')
 * - monedaOrigen: string (ej. 'USD')
 * - cotizacion: number | string (cuánto vale 1 monedaOrigen en monedaDestino)
 * - onChange: (nuevosValores: { monedaDestino, monedaOrigen, cotizacion }) => void
 */
const ConfigMonedas = ({
    monedaDestino = 'ARS',
    monedaOrigen = 'USD',
    cotizacion = 1,
    onChange
}) => {
    const [cotizacionInput, setCotizacionInput] = useState(String(cotizacion || 1));
    const [cargando, setCargando] = useState(false);
    const [estadoApi, setEstadoApi] = useState(''); // 'ok' | 'cache' | 'error' | ''

    useEffect(() => {
        setCotizacionInput(String(cotizacion || 1));
    }, [cotizacion]);

    const buscarCotizacionApi = useCallback(
        async (origen, destino, forzarRed = false) => {
            if (origen === destino) {
                setCotizacionInput('1');
                setEstadoApi('');
                onChange?.({ monedaDestino: destino, monedaOrigen: origen, cotizacion: 1 });
                return;
            }

            const cacheKey = `fx_base_${origen}`;
            const ahora = Date.now();
            const seisHoras = 6 * 60 * 60 * 1000;

            if (!forzarRed) {
                try {
                    const cachedRaw = localStorage.getItem(cacheKey);
                    if (cachedRaw) {
                        const cached = JSON.parse(cachedRaw);
                        const tasaCache = cached?.rates?.[destino];
                        if (tasaCache && ahora - cached.timestamp < seisHoras) {
                            const valorRedondeado = Number(Number(tasaCache).toFixed(4));
                            setCotizacionInput(String(valorRedondeado));
                            setEstadoApi('cache');
                            onChange?.({
                                monedaDestino: destino,
                                monedaOrigen: origen,
                                cotizacion: valorRedondeado
                            });
                            return;
                        }
                    }
                } catch {
                    // Ignora errores de lectura de caché
                }
            }

            setCargando(true);
            setEstadoApi('');

            try {
                const res = await fetch(`https://open.er-api.com/v6/latest/${origen}`);
                if (!res.ok) throw new Error('Error de red');
                const data = await res.json();
                const tasa = data?.rates?.[destino];

                if (!tasa) throw new Error('Par no disponible');

                try {
                    localStorage.setItem(
                        cacheKey,
                        JSON.stringify({ timestamp: ahora, rates: data.rates })
                    );
                } catch {
                    // Ignora errores de cuota en localStorage
                }

                const valorRedondeado = Number(Number(tasa).toFixed(4));
                setCotizacionInput(String(valorRedondeado));
                setEstadoApi('ok');
                onChange?.({
                    monedaDestino: destino,
                    monedaOrigen: origen,
                    cotizacion: valorRedondeado
                });
            } catch {
                // Si no hay conexión, intenta usar cualquier tasa guardada aunque sea vieja
                try {
                    const cachedRaw = localStorage.getItem(cacheKey);
                    const cached = cachedRaw ? JSON.parse(cachedRaw) : null;
                    if (cached?.rates?.[destino]) {
                        const valorFallback = Number(Number(cached.rates[destino]).toFixed(4));
                        setCotizacionInput(String(valorFallback));
                        setEstadoApi('cache');
                        onChange?.({
                            monedaDestino: destino,
                            monedaOrigen: origen,
                            cotizacion: valorFallback
                        });
                        return;
                    }
                } catch {
                    // Sin caché disponible
                }
                setEstadoApi('error');
            } finally {
                setCargando(false);
            }
        },
        [onChange]
    );

    const handleCambioDestino = (nuevoDestino) => {
        onChange?.({
            monedaDestino: nuevoDestino,
            monedaOrigen,
            cotizacion: nuevoDestino === monedaOrigen ? 1 : parsearCotizacion(cotizacionInput)
        });
        buscarCotizacionApi(monedaOrigen, nuevoDestino, false);
    };

    const handleCambioOrigen = (nuevoOrigen) => {
        onChange?.({
            monedaDestino,
            monedaOrigen: nuevoOrigen,
            cotizacion: nuevoOrigen === monedaDestino ? 1 : parsearCotizacion(cotizacionInput)
        });
        buscarCotizacionApi(nuevoOrigen, monedaDestino, false);
    };

    const handleCambioCotizacionManual = (texto) => {
        setCotizacionInput(texto);
        setEstadoApi('');
        const numero = parsearCotizacion(texto);
        onChange?.({
            monedaDestino,
            monedaOrigen,
            cotizacion: numero
        });
    };

    const monedasIguales = monedaDestino === monedaOrigen;

    return (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-extrabold text-zinc-200 uppercase tracking-wider">
                        Monedas y Cotización del Viaje
                    </h4>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-amber-300">
                    {monedaDestino} ↔ {monedaOrigen}
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Moneda del país donde vacacionan */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <Globe className="w-3 h-3 text-emerald-400" />
                        Moneda del destino (cargas)
                    </label>
                    <select
                        value={monedaDestino}
                        onChange={(e) => handleCambioDestino(e.target.value)}
                        className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                        {MONEDAS.map((m) => (
                            <option key={m.codigo} value={m.codigo}>
                                {m.codigo} · {m.nombre} ({m.simbolo})
                            </option>
                        ))}
                    </select>
                </div>

                {/* 2. Moneda de origen del usuario */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-amber-400" />
                        Moneda de origen (resumen)
                    </label>
                    <select
                        value={monedaOrigen}
                        onChange={(e) => handleCambioOrigen(e.target.value)}
                        className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                        {MONEDAS.map((m) => (
                            <option key={m.codigo} value={m.codigo}>
                                {m.codigo} · {m.nombre} ({m.simbolo})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 3. Cotización actual + botón de API + edición manual */}
            {!monedasIguales ? (
                <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-zinc-200 font-semibold">
                            <span className="text-zinc-400">1 {monedaOrigen} =</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={cotizacionInput}
                                onChange={(e) => handleCambioCotizacionManual(e.target.value)}
                                className="w-28 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-amber-300 font-black text-xs text-right focus:outline-none focus:border-amber-400"
                            />
                            <span className="text-zinc-400">{monedaDestino}</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => buscarCotizacionApi(monedaOrigen, monedaDestino, true)}
                            disabled={cargando}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
                            {cargando ? 'Consultando...' : 'Traer cotización actual'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>Podés editar el valor a mano si cambiaste plata o usaste otro tipo de cambio.</span>
                        {estadoApi === 'ok' && (
                            <span className="text-emerald-400 font-bold">Actualizada</span>
                        )}
                        {estadoApi === 'cache' && (
                            <span className="text-amber-400/90 font-semibold">Caché</span>
                        )}
                        {estadoApi === 'error' && (
                            <span className="text-rose-400 font-semibold">Sin red · editá manual</span>
                        )}
                    </div>
                </div>
            ) : (
                <p className="text-[11px] text-zinc-400">
                    Ambas monedas son <strong className="text-zinc-200">{monedaDestino}</strong>: no hace falta conversión.
                </p>
            )}
        </div>
    );
};

export default ConfigMonedas;