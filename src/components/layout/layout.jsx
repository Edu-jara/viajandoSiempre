import React from 'react';
import Header from './Header';
import Navbar from './navbar';

const Layout = ({ activeTab, setActiveTab, viajeState, onAbrirConfig,children }) => {
    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans items-center">
            <div className="w-full max-w-md min-h-screen flex flex-col relative bg-zinc-950 shadow-2xl">

                {/* Le pasamos las propiedades del viaje al Header */}
                <Header
                    nombreViaje={viajeState.nombreViaje}
                    portadaViaje={viajeState.portadaViaje}
                    onAbrirConfiguracion={onAbrirConfig}
                />

                <main className="flex-1 p-4 pb-28">
                    {children}
                </main>

                <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
        </div>
    );
};

export default Layout;