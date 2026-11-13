import React, { useState } from 'react';
import { PlusCircle, DollarSign, Receipt, UserCheck, Scale } from 'lucide-react';
import { useViaje } from '../../context/ViajeContext';

const GastosYBalancesSection = () => {
    const { gastosList, agregarGasto, participantes, viajeState } = useViaje();

    const [descripcion, setDescripcion] = useState('');
    const [monto, setMonto] = useState('');
    const [pagadoPor, setPagadoPor] = useState(() => viajeState?.usuario?.nombre || '');

    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 5;

    // Guardar nuevo gasto
    const handleAgregarGasto = (e) => {
        e.preventDefault();
        if (!descripcion.trim() || !monto || Number(monto) <= 0) {
            alert('Ingresa una descripción y un monto válido.');
            return;
        }

        const pagadorFinal = pagadoPor || participantes[0]?.nombre || 'Usuario';

        agregarGasto({
            id: Date.now(),
            descripcion: descripcion.trim(),
            monto: Number(monto),
            pagadoPor: pagadorFinal,
            fecha: new Date().toLocaleDateString('es-AR')
        });

        setDescripcion('');
        setMonto('');
        setPaginaActual(1);
    };

    // Helper para cruzar datos del pagador
    const obtenerDatosPagador = (nombrePagador) => {
        if (!nombrePagador) return { nombreMostrado: 'Sin asignar', foto: '', inicial: '?' };

        const termino = nombrePagador.trim().toLowerCase();
        const encontrado = participantes.find(p => {
            const nombre = (p.nombre || '').trim().toLowerCase();
            const apodo = (p.apodo || '').trim().toLowerCase();
            const completo = `${p.nombre || ''} ${p.apellido || ''}`.trim().toLowerCase();
            return nombre === termino || apodo === termino || completo === termino;
        });

        if (encontrado) {
            const nombreMostrado = encontrado.apodo
                ? `${encontrado.apodo} (${encontrado.nombre})`
                : `${encontrado.nombre} ${encontrado.apellido || ''}`.trim();

            return {
                nombreMostrado,
                foto: encontrado.fotoPerfil || '',
                inicial: (encontrado.apodo || encontrado.nombre || 'U').charAt(0).toUpperCase()
            };
        }

        return {
            nombreMostrado: nombrePagador,
            foto: '',
            inicial: nombrePagador.charAt(0).toUpperCase()
        };
    };

    // Cálculo rápido de totales generales
    const totalGastado = gastosList.reduce((acc, g) => acc + Number(g.monto || 0), 0);
    const totalPorPersona = participantes.length > 0 ? totalGastado / participantes.length : 0;

    // Paginación
    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;
    const gastosPaginaActual = gastosList.slice(indicePrimerElemento, indiceUltimoElemento);
    const totalPaginas = Math.ceil(gastosList.length / elementosPorPagina);

    return (
        <div className="space-y-6">
            {/* BARRA DE INTEGRANTES (Avatares en la parte superior) */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-2 overflow-x-auto py-1 px-1">
                    {participantes.map((p, idx) => {
                        const inicial = (p.apodo || p.nombre || 'U').charAt(0).toUpperCase();
                        const nombreMostrar = p.apodo || p.nombre || 'Integrante';

                        return (
                            <div key={p.id || idx} className="flex flex-col items-center gap-1 shrink-0" title={nombreMostrar}>
                                <div
                                    className="w-11 h-11 rounded-full bg-zinc-800 border-2 border-emerald-500/40 overflow-hidden flex items-center justify-center text-xs font-black text-emerald-400 bg-cover bg-center shadow-sm"
                                    style={{
                                        backgroundImage: p.fotoPerfil ? `url("${p.fotoPerfil}")` : undefined
                                    }}
                                >
                                    {!p.fotoPerfil && inicial}
                                </div>
                                <span className="text-[10px] font-semibold text-zinc-300 max-w-[50px] truncate text-center">
                                    {nombreMostrar}
                                </span>
                            </div>
                        );
                    })}

                    {participantes.length === 0 && (
                        <p className="text-xs text-zinc-500 italic px-2">Aún no hay participantes en el grupo. ¡Suma amigos en la configuración!</p>
                    )}
                </div>

                {/* Contador total */}
                <div className="shrink-0 pl-3 border-l border-zinc-800 text-right">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Grupo</span>
                    <span className="text-xs font-black text-emerald-400">{participantes.length} pers.</span>
                </div>
            </div>

            {/* 1. SECCIÓN DE RESUMEN Y BALANCE RÁPIDO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Gasto Total del Grupo (Mostaza / Amber) */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">Gasto Total del Grupo</p>
                        <h4 className="text-lg font-black text-amber-400 mt-1">${totalGastado.toLocaleString('es-AR')}</h4>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <DollarSign className="w-5 h-5" />
                    </div>
                </div>

                {/* Promedio por Persona (Verde Esmeralda) */}
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                    <div>
                        <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">Promedio por Persona</p>
                        <h4 className="text-lg font-black text-emerald-400 mt-1">${totalPorPersona.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</h4>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Scale className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* 2. FORMULARIO DE REGISTRO DE GASTOS (En Verde) */}
            <form
                onSubmit={handleAgregarGasto}
                className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl"
            >
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/80">
                    <Receipt className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
                        Registrar Nuevo Gasto
                    </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            ¿Qué se pagó?
                        </label>
                        <input
                            type="text"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Ej: Cena, Nafta, Hotel..."
                            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            Monto ($)
                        </label>
                        <div className="relative">
                            <DollarSign className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                placeholder="0.00"
                                className="w-full pl-8 pr-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                    <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-emerald-400" /> ¿Quién pagó?
                        </label>
                        <select
                            value={pagadoPor}
                            onChange={(e) => setPagadoPor(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                            {participantes.map((p, idx) => {
                                const etiqueta = p.apodo
                                    ? `${p.apodo} (${p.nombre})`
                                    : `${p.nombre} ${p.apellido || ''}`.trim();
                                return (
                                    <option key={p.id || idx} value={p.nombre}>
                                        {etiqueta}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                        <PlusCircle className="w-4 h-4 stroke-[2.5]" /> Agregar Gasto
                    </button>
                </div>
            </form>

            {/* 3. LISTA DE GASTOS PAGINADA (Detalles en Verde Esmeralda) */}
            <div className="space-y-3">
                <div className="flex justify-between items-center text-[11px] text-zinc-400 px-1">
                    <span>Mostrando {gastosPaginaActual.length} de {gastosList.length} registros</span>
                    <span>Página {paginaActual} de {totalPaginas || 1}</span>
                </div>

                <div className="space-y-2.5">
                    {gastosPaginaActual.map((gasto) => {
                        const pagador = obtenerDatosPagador(gasto.pagadoPor);

                        return (
                            <div
                                key={gasto.id}
                                className="p-3.5 bg-zinc-900/90 border border-zinc-800/90 hover:border-emerald-500/40 rounded-2xl flex justify-between items-center gap-3 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Mini-avatar con borde esmeralda sutil */}
                                    <div
                                        className="w-9 h-9 rounded-full bg-zinc-800 border border-emerald-500/30 flex items-center justify-center text-xs font-black text-emerald-400 bg-cover bg-center shrink-0 shadow-sm"
                                        style={{
                                            backgroundImage: pagador.foto ? `url("${pagador.foto}")` : undefined
                                        }}
                                    >
                                        {!pagador.foto && pagador.inicial}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-white truncate">
                                            {gasto.descripcion}
                                        </p>
                                        <p className="text-[11px] text-zinc-400 truncate">
                                            Pagó <span className="text-zinc-200 font-semibold">{pagador.nombreMostrado}</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Monto en verde esmeralda */}
                                <span className="text-sm font-black text-emerald-400 shrink-0">
                                    +${Number(gasto.monto).toLocaleString('es-AR')}
                                </span>
                            </div>
                        );
                    })}

                    {gastosList.length === 0 && (
                        <p className="text-center text-xs text-zinc-500 py-6 bg-zinc-900/40 rounded-2xl border border-zinc-800/60">
                            No hay registros todavía. ¡Carga el primero arriba!
                        </p>
                    )}
                </div>

                {/* Controles de Paginación con estilo esmeralda */}
                {totalPaginas > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                            disabled={paginaActual === 1}
                            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        >
                            Anterior
                        </button>

                        <span className="text-xs text-emerald-400 font-bold px-2">
                            {paginaActual} / {totalPaginas}
                        </span>

                        <button
                            type="button"
                            onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                            disabled={paginaActual === totalPaginas}
                            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
};

export default GastosYBalancesSection;