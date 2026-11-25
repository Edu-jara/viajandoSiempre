import React, { useState } from 'react';
import { useViaje } from '../../context/ViajeContext';
import { ArrowRight, ShieldCheck, PieChart, SendHorizonal, Check, Copy, Share2 } from 'lucide-react';

const SIMBOLOS = {
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

const sim = (codigo) => SIMBOLOS[codigo] || '$';

const fmtDestino = (valor) => {
    const num = Number(valor || 0);
    return num.toLocaleString('es-AR', {
        minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
        maximumFractionDigits: 2
    });
};

const fmtOrigen = (valor) => {
    const num = Number(valor || 0);
    return num.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const Balances = () => {
    const {
        totalGastos,
        cuotaPorPersona,
        balanceParticipantes,
        pagosSugeridos,
        viajeState
    } = useViaje();

    const [aliasCopiado, setAliasCopiado] = useState(null); // { key, alias, etiquetaToast? }

    const monedaDestino = viajeState?.monedaDestino || 'ARS';
    const monedaOrigen = viajeState?.monedaOrigen || 'USD';
    const cotizacionRaw = Number(viajeState?.cotizacion);
    const cotizacion = Number.isFinite(cotizacionRaw) && cotizacionRaw > 0 ? cotizacionRaw : 1;
    const hayConversion = monedaDestino !== monedaOrigen && cotizacion > 0;

    const convertirAOrigen = (montoEnDestino) => {
        if (!hayConversion) return Number(montoEnDestino || 0);
        return Number(montoEnDestino || 0) / cotizacion;
    };

    const generarMensajeWhatsApp = () => {
        const nombreViaje = (viajeState?.nombreViaje || 'Viaje').trim();
        const sDest = sim(monedaDestino);
        const sOrig = sim(monedaOrigen);

        const totalDestStr = `${sDest}${fmtDestino(totalGastos)} ${monedaDestino}`;
        const totalOrigStr = hayConversion
            ? ` (≈ ${sOrig}${fmtOrigen(convertirAOrigen(totalGastos))} ${monedaOrigen})`
            : '';

        const cuotaDestStr = `${sDest}${fmtDestino(cuotaPorPersona)} ${monedaDestino}`;
        const cuotaOrigStr = hayConversion
            ? ` (≈ ${sOrig}${fmtOrigen(convertirAOrigen(cuotaPorPersona))} ${monedaOrigen})`
            : '';

        const lineasParticipantes = balanceParticipantes.map((p) => {
            const nombreBase = `${p.nombre || ''} ${p.apellido || ''}`.trim() || 'Integrante';
            const apodoStr = p.apodo ? ` (${p.apodo.trim()})` : '';
            const pagoStr = `${sDest}${fmtDestino(p.totalPagado)} ${monedaDestino}`;

            let estadoStr = `Al día (${sDest}0)`;
            if (p.saldo > 0.01) {
                estadoStr = `Le deben +${sDest}${fmtDestino(p.saldo)} ${monedaDestino}`;
            } else if (p.saldo < -0.01) {
                estadoStr = `Debe ${sDest}${fmtDestino(Math.abs(p.saldo))} ${monedaDestino}`;
            }

            return `• *${nombreBase}${apodoStr}*: pagó ${pagoStr} — ${estadoStr}`;
        });

        const lineasTransferencias =
            pagosSugeridos.length === 0
                ? ['• ¡Cuentas saldadas!']
                : pagosSugeridos.map((pago) => {
                      const montoStr = `${sDest}${fmtDestino(pago.monto)} ${monedaDestino}`;
                      const aliasStr = pago.alias?.trim() ? ` · Cobro: ${pago.alias.trim()}` : '';
                      return `• ${pago.de} ➡️ ${pago.para}: *${montoStr}*${aliasStr}`;
                  });

        return [
            `✈️ *Resumen - ${nombreViaje}*`,
            hayConversion ? `💱 Cotización: 1 ${monedaOrigen} = ${fmtDestino(cotizacion)} ${monedaDestino}` : null,
            '',
            `💰 *Gasto total:* ${totalDestStr}${totalOrigStr}`,
            `⚖️ *Cuota por persona:* ${cuotaDestStr}${cuotaOrigStr}`,
            '',
            `👥 *Participantes (${balanceParticipantes.length}):*`,
            ...(lineasParticipantes.length > 0 ? lineasParticipantes : ['• Sin participantes registrados']),
            '',
            `💸 *Transferencias sugeridas:*`,
            ...lineasTransferencias
        ]
            .filter((linea) => linea !== null)
            .join('\n');
    };

    const compartirPorWhatsApp = () => {
        const mensaje = generarMensajeWhatsApp();
        if (!mensaje) return;
        const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const copiarTextoAlias = async (textoAlias, itemKey, etiquetaToast = null) => {
        const limpio = (textoAlias || '').trim();
        if (!limpio) return;

        const confirmarCopiado = () => {
            setAliasCopiado({ key: itemKey, alias: limpio, etiquetaToast });
            if (navigator?.vibrate) {
                navigator.vibrate(30);
            }
            setTimeout(() => {
                setAliasCopiado((prev) => (prev?.key === itemKey ? null : prev));
            }, 2200);
        };

        try {
            if (navigator?.clipboard?.writeText && window.isSecureContext) {
                await navigator.clipboard.writeText(limpio);
                confirmarCopiado();
                return;
            }
        } catch {
            // Fallback si Safari/WebView bloquea Clipboard API
        }

        try {
            const textArea = document.createElement('textarea');
            textArea.value = limpio;
            textArea.setAttribute('readonly', '');
            textArea.style.position = 'fixed';
            textArea.style.top = '-9999px';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, limpio.length);
            const ok = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (ok) confirmarCopiado();
        } catch (err) {
            console.error('Error al copiar dato de cobro:', err);
        }
    };

    const resumenCopiado = aliasCopiado?.key === 'resumen_whatsapp';

    return (
        <div className="space-y-6 pb-6">

            {/* 1. TARJETA RESUMEN GENERAL */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                        Resumen del Grupo
                    </span>

                    <div className="flex items-center gap-2">
                        {hayConversion && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800/90 text-amber-300">
                                1 {monedaOrigen} = {fmtDestino(cotizacion)} {monedaDestino}
                            </span>
                        )}
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <PieChart className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-zinc-800/60">
                    <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold block">Gasto Total</span>
                        <span className="text-lg font-black text-zinc-100 block">
                            {sim(monedaDestino)}{fmtDestino(totalGastos)}{' '}
                            <span className="text-xs text-zinc-400 font-normal">{monedaDestino}</span>
                        </span>
                        {hayConversion && (
                            <span className="text-[11px] text-amber-300/90 font-semibold block mt-0.5">
                                ≈ {sim(monedaOrigen)}{fmtOrigen(convertirAOrigen(totalGastos))} {monedaOrigen}
                            </span>
                        )}
                    </div>
                    <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold block">Cuota por Persona</span>
                        <span className="text-lg font-black text-amber-400 block">
                            {sim(monedaDestino)}{fmtDestino(cuotaPorPersona)}{' '}
                            <span className="text-xs text-zinc-400 font-normal">{monedaDestino}</span>
                        </span>
                        {hayConversion && (
                            <span className="text-[11px] text-emerald-300/90 font-semibold block mt-0.5">
                                ≈ {sim(monedaOrigen)}{fmtOrigen(convertirAOrigen(cuotaPorPersona))} {monedaOrigen}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. SUGERENCIA DE TRANSFERENCIAS */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <SendHorizonal className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        ¿Quién le transfiere a quién?
                    </h4>
                </div>

                {pagosSugeridos.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                        <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-zinc-300">¡Cuentas perfectamente saldadas!</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">Nadie le debe dinero a nadie en este momento.</p>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {pagosSugeridos.map((pago, index) => (
                            <div
                                key={index}
                                className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg shadow-amber-500/5"
                            >
                                <div className="flex items-center gap-2 text-xs font-medium text-zinc-300 flex-wrap min-w-0">
                                    <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-white font-bold capitalize">{pago.de}</span>
                                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                                        <span>le paga</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                    <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-white font-bold capitalize">{pago.para}</span>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="text-base font-black text-amber-400 block">
                                        {sim(monedaDestino)}{fmtDestino(pago.monto)}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 block font-semibold">{monedaDestino}</span>
                                    {hayConversion && (
                                        <span className="text-[11px] text-emerald-300/90 font-semibold block mt-0.5">
                                            ≈ {sim(monedaOrigen)}{fmtOrigen(convertirAOrigen(pago.monto))} {monedaOrigen}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. DETALLE POR INTEGRANTE + DATOS PARA MANDARLE PLATA */}
            <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Integrantes y datos de cobro
                </h4>

                <div className="space-y-2.5">
                    {balanceParticipantes.map((p, index) => {
                        const esAcreedor = p.saldo > 0.01;
                        const esDeudor = p.saldo < -0.01;
                        const aliasLimpio = (p.alias || '').trim();
                        const descLimpia = (p.descripcion || '').trim();
                        const itemKey = `part_${p.id || index}`;
                        const estaCopiado = aliasCopiado?.key === itemKey;
                        const nombreCompleto = `${p.nombre || ''} ${p.apellido || ''}`.trim();
                        const apodoLimpio = (p.apodo || '').trim();

                        const tieneFilaInferior = Boolean(aliasLimpio || descLimpia);

                        return (
                            <div
                                key={p.id || index}
                                className="bg-zinc-900/50 border border-zinc-800/70 rounded-2xl p-3.5 space-y-2.5"
                            >
                                {/* Fila superior: Avatar + Nombre completo + Apodo con aire */}
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center text-sm font-black text-amber-400 bg-cover bg-center shrink-0"
                                        style={{ backgroundImage: p.fotoPerfil ? `url("${p.fotoPerfil}")` : undefined }}
                                    >
                                        {!p.fotoPerfil && (p.nombre ? p.nombre.charAt(0).toUpperCase() : 'U')}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-white uppercase leading-snug break-words">
                                            {nombreCompleto}
                                            {apodoLimpio ? (
                                                <span className="text-xs font-extrabold text-amber-300 ml-1.5">
                                                    ({apodoLimpio})
                                                </span>
                                            ) : null}
                                        </p>
                                    </div>
                                </div>

                                {/* Fila media: Pagó (limpio) a la izquierda + Saldo (con conversión) a la derecha */}
                                <div className="flex items-start justify-between gap-2 pt-0.5">
                                    <p className="text-xs text-zinc-400 pt-1">
                                        Pagó:{' '}
                                        <span className="text-zinc-200 font-semibold">
                                            {sim(monedaDestino)}{fmtDestino(p.totalPagado)} {monedaDestino}
                                        </span>
                                    </p>

                                    <div className="text-right shrink-0">
                                        {esAcreedor && (
                                            <>
                                                <span className="inline-block px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                                                    Le deben +{sim(monedaDestino)}{fmtDestino(p.saldo)} {monedaDestino}
                                                </span>
                                                {hayConversion && (
                                                    <span className="block text-[11px] text-emerald-300/90 font-semibold mt-0.5">
                                                        ≈ +{sim(monedaOrigen)}{fmtOrigen(convertirAOrigen(p.saldo))} {monedaOrigen}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        {esDeudor && (
                                            <>
                                                <span className="inline-block px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                                                    Debe {sim(monedaDestino)}{fmtDestino(Math.abs(p.saldo))} {monedaDestino}
                                                </span>
                                                {hayConversion && (
                                                    <span className="block text-[11px] text-rose-300/90 font-semibold mt-0.5">
                                                        ≈ {sim(monedaOrigen)}{fmtOrigen(convertirAOrigen(Math.abs(p.saldo)))} {monedaOrigen}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        {!esAcreedor && !esDeudor && (
                                            <span className="inline-block px-2.5 py-1 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-bold">
                                                Al día ({sim(monedaDestino)}0)
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Fila inferior: Datos de cobro y botón Copiar */}
                                {tieneFilaInferior && (
                                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex-wrap">
                                        <div className="min-w-0 flex items-center gap-1.5 flex-wrap text-xs">
                                            {aliasLimpio && (
                                                <span className="font-mono text-amber-300 font-medium break-all">
                                                    {aliasLimpio}
                                                </span>
                                            )}
                                            {aliasLimpio && descLimpia && (
                                                <span className="text-zinc-600">·</span>
                                            )}
                                            {descLimpia && (
                                                <span className="text-zinc-400 capitalize">
                                                    {descLimpia}
                                                </span>
                                            )}
                                        </div>

                                        {aliasLimpio && (
                                            <button
                                                type="button"
                                                onClick={() => copiarTextoAlias(aliasLimpio, itemKey)}
                                                className={`shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-lg cursor-pointer transition-colors touch-manipulation inline-flex items-center gap-1 ${estaCopiado
                                                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                                                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                                                    }`}
                                            >
                                                {estaCopiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                {estaCopiado ? 'Copiado' : 'Copiar'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 4. BLOQUE FINAL PARA COPIAR O ENVIAR POR WHATSAPP */}
            <div className="bg-zinc-900/70 border border-zinc-800/90 rounded-2xl p-4 space-y-3">
                <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                        Compartir resumen de los gastos
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                        Copiá el texto o abrilo en WhatsApp para mandarlo al grupo.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    <button
                        type="button"
                        onClick={() => copiarTextoAlias(generarMensajeWhatsApp(), 'resumen_whatsapp', 'Resumen copiado')}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation ${resumenCopiado
                                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                                : 'bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-100'
                            }`}
                    >
                        {resumenCopiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{resumenCopiado ? 'Copiado' : 'Copiar resumen'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={compartirPorWhatsApp}
                        className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer touch-manipulation"
                    >
                        <Share2 className="w-4 h-4" />
                        <span>Enviar por WhatsApp</span>
                    </button>
                </div>
            </div>

            {/* TOAST FLOTANTE DE CONFIRMACIÓN PARA MÓVIL */}
            {aliasCopiado && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[99999] px-4 py-2.5 rounded-2xl bg-emerald-500 text-zinc-950 font-black text-xs shadow-2xl shadow-emerald-500/30 flex items-center gap-2 max-w-[90vw]">
                    <Check className="w-4 h-4 stroke-[3] shrink-0" />
                    <span className="truncate">
                        {aliasCopiado.etiquetaToast || `Copiado: ${aliasCopiado.alias}`}
                    </span>
                </div>
            )}

        </div>
    );
};

export default Balances;