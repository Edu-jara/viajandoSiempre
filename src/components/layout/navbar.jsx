import React from 'react';
import { CreditCard, Calculator, ShieldAlert } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab }) => {
    // Las 3 solapas principales de nuestra app de viajes
    const navItems = [
        { id: 'gastos', label: 'Gastos', icon: CreditCard },
        { id: 'conversor', label: 'Conversor', icon: Calculator },
        { id: 'seguridad', label: 'Seguridad', icon: ShieldAlert },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/90 backdrop-blur-md border-t border-zinc-800/80 px-4 py-2 pb-safe shadow-lg">
            <div className="flex justify-around items-center max-w-md mx-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`relative flex flex-col items-center gap-1 py-1.5 px-5 rounded-2xl transition-all duration-200 cursor-pointer select-none ${isActive
                                    ? 'text-amber-500 font-bold scale-105 bg-amber-500/10 border border-amber-500/20 shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200 font-medium hover:bg-zinc-800/40 border border-transparent'
                                }`}
                        >
                            {/* Ícono con grosor dinámico si está activo */}
                            <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.75px]'}`} />

                            {/* Etiqueta de la solapa */}
                            <span className="text-[11px] tracking-tight">{item.label}</span>

                            {/* Pequeño punto brillante indicador superior */}
                            {isActive && (
                                <span className="absolute -top-1 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_#f59e0b]" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default Navbar;