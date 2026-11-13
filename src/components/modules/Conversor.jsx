import React, { useState } from 'react';
import { ArrowRightLeft, DollarSign, RefreshCw } from 'lucide-react';

const Conversor = () => {
    const [monto, setMonto] = useState('100');
    const tasaDeCambio = 1600; // Ejemplo: 1 USD = 1600 en moneda local

    return (
        <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl">
                <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2 mb-4">
                    <ArrowRightLeft className="w-4 h-4 text-amber-500" /> Conversor de Moneda
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-zinc-400 mb-1">Monto en USD</label>
                        <div className="relative">
                            <span className="absolute left-3.5 top-2.5 text-zinc-400">$</span>
                            <input
                                type="number"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
                        <span className="text-xs text-amber-400 block font-medium mb-1">Equivalente Estimado</span>
                        <span className="text-2xl font-black text-amber-400">
                            $ {(Number(monto || 0) * tasaDeCambio).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Conversor;