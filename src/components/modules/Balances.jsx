import React from 'react';
import { useViaje } from '../../context/ViajeContext';
import { ArrowRight, ShieldCheck, PieChart, SendHorizonal } from 'lucide-react';

const Balances = () => {
    const { totalGastos, cuotaPorPersona, balanceParticipantes, pagosSugeridos } = useViaje();

    console.log(
        'DEBUG participantes:',
        balanceParticipantes.map((p) => `${p.nombre} | alias="${p.alias || ''}" | desc="${p.descripcion || ''}"`)
    );

    return (
        <div className="space-y-6 pb-6">

            {/* 1. TARJETA RESUMEN GENERAL */}
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/80 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                        Resumen del Grupo
                    </span>
                    <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <PieChart className="w-4 h-4" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-zinc-800/60">
                    <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold block">Gasto Total</span>
                        <span className="text-xl font-black text-zinc-100">${totalGastos.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">USD</span></span>
                    </div>
                    <div>
                        <span className="text-[10px] uppercase text-zinc-500 font-bold block">Cuota por Persona</span>
                        <span className="text-xl font-black text-amber-400">${cuotaPorPersona.toFixed(2)} <span className="text-xs text-zinc-400 font-normal">USD</span></span>
                    </div>
                </div>
            </div>

            {/* 2. SUGERENCIA DE TRANSFERENCIAS (LO MÁS IMPORTANTE) */}
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
                            <div key={index} className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-amber-500/5">
                                <div className="flex items-center gap-3 text-xs font-medium text-zinc-300">
                                    <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-white font-bold">{pago.de}</span>
                                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                                        <span>le paga</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                    <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-white font-bold">{pago.para}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-base font-black text-amber-400">${pago.monto.toFixed(2)}</span>
                                    <span className="text-[10px] text-zinc-500 block">USD</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. BALANCE DETALLADO POR INTEGRANTE (Desglose secundario) */}
            <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Detalle de lo que pagó cada uno
                </h4>

                <div className="space-y-2">
                    {balanceParticipantes.map((p, index) => {
                        const esAcreedor = p.saldo > 0.01;
                        const esDeudor = p.saldo < -0.01;
                        const aliasLimpio = (p.alias || '').trim();
                        const descLimpia = (p.descripcion || '').trim();
                        const infoCobro = [aliasLimpio, descLimpia].filter(Boolean).join(' · ');

                        const copiarAlias = () => {
                            if (!aliasLimpio || !navigator?.clipboard) return;
                            navigator.clipboard.writeText(aliasLimpio);
                        };

                        return (
                            <div
                                key={p.id || index}
                                className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3.5 flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div
                                        className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center text-xs font-bold text-amber-400 bg-cover bg-center shrink-0"
                                        style={{ backgroundImage: p.fotoPerfil ? `url("${p.fotoPerfil}")` : undefined }}
                                    >
                                        {!p.fotoPerfil && (p.nombre ? p.nombre.charAt(0).toUpperCase() : 'U')}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-zinc-100 truncate">
                                            {p.nombre} {p.apellido || ''}
                                        </p>
                                        <p className="text-[11px] text-zinc-400">
                                            Pagó: <span className="text-zinc-200 font-medium">${p.totalPagado.toLocaleString()} USD</span>
                                        </p>
                                        {infoCobro && (
                                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[11px] text-amber-300/90 font-medium truncate">
                                                    {infoCobro}
                                                </span>
                                                {aliasLimpio && (
                                                    <button
                                                        type="button"
                                                        onClick={copiarAlias}
                                                        className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer transition-colors"
                                                    >
                                                        Copiar alias
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    {esAcreedor && (
                                        <span className="inline-block px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                                            Le deben +${p.saldo.toFixed(2)}
                                        </span>
                                    )}
                                    {esDeudor && (
                                        <span className="inline-block px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold">
                                            Debe ${Math.abs(p.saldo).toFixed(2)}
                                        </span>
                                    )}
                                    {!esAcreedor && !esDeudor && (
                                        <span className="inline-block px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-400 text-[11px] font-bold">
                                            Al día ($0)
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};

export default Balances;