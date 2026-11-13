import React, { useState } from 'react';
import { Receipt, PieChart } from 'lucide-react';
import Gastos from './Gastos'; // Tu componente existente de formulario e historial
import Balances from './Balances'; // El nuevo componente que acabamos de armar

const FinanzasContainer = () => {
    // Estado para controlar qué pestaña está activa ('gastos' o 'balances')
    const [tabActiva, setTabActiva] = useState('gastos');

    return (
        <div className="space-y-6">
            
            {/* Barra de Pestañas (Tabs Selector) */}
            <div className="flex bg-zinc-950 p-1.5 border border-zinc-800/80 rounded-2xl">
                <button
                    onClick={() => setTabActiva('gastos')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        tabActiva === 'gastos'
                            ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20'
                            : 'text-zinc-400 hover:text-white'
                    }`}
                >
                    <Receipt className="w-4 h-4" /> Gastos y Registro
                </button>

                <button
                    onClick={() => setTabActiva('balances')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        tabActiva === 'balances'
                            ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                            : 'text-zinc-400 hover:text-white'
                    }`}
                >
                    <PieChart className="w-4 h-4" /> Balances y Deudas
                </button>
            </div>

            {/* Renderizado Condicional según la pestaña seleccionada */}
            <div className="transition-all">
                {tabActiva === 'gastos' ? <Gastos /> : <Balances />}
            </div>

        </div>
    );
};

export default FinanzasContainer;