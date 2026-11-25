import React from 'react';
import { Compass, Wifi, MapPin, Settings } from 'lucide-react';

const Header = ({
    nombreViaje = "Mi Viaje",
    portadaViaje = "",
    isOnline = true,
    onAbrirConfiguracion
}) => {
    return (
        <header
            className="w-full px-4 pb-2"
            style={{
                paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)'
            }}
        >
            <div 
                className="relative w-full h-[180px] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-4 bg-zinc-900 transition-all duration-300"
                style={{ 
                    backgroundImage: portadaViaje ? `url("${portadaViaje}")` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                {/* Velo oscuro para contraste */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />

                {/* Fila Superior */}
                <div className="relative z-20 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/70 backdrop-blur-md border border-amber-500/30 shadow-lg">
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px] uppercase tracking-widest text-amber-300 font-black">
                            VIAJANDO SIEMPRE
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Botón de Configuración / Ajustes */}
                        <button
                            type="button"
                            onClick={onAbrirConfiguracion}
                            className="relative z-30 p-2.5 rounded-full bg-zinc-950/80 backdrop-blur-md border border-zinc-700/60 text-zinc-200 hover:bg-zinc-800 transition-all shadow-md active:scale-95 flex items-center justify-center touch-manipulation"
                            title="Configurar viaje y perfil"
                            aria-label="Configurar viaje y perfil"
                        >
                            <Settings className="w-5 h-5 text-zinc-200" />
                        </button>

                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-300 bg-zinc-950/70 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-emerald-500/30 shadow-md">
                            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isOnline ? 'Online' : 'Offline'}</span>
                        </div>
                    </div>
                </div>

                {/* Fila Inferior con el nombre dinámico del viaje */}
                <div className="relative z-20 flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                        <h1 className="text-base font-black text-white tracking-tight leading-tight drop-shadow-lg truncate">
                            {nombreViaje}
                        </h1>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;