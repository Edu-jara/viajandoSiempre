import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Creamos el contexto
const ViajeContext = createContext();

// 2. Creamos el Proveedor (Provider) que envuelve la app
export const ViajeProvider = ({ children }) => {
    // Inicializamos el estado del viaje
    const [viajeState, setViajeState] = useState(() => {
        const saved = localStorage.getItem('viaje_state');
        return saved ? JSON.parse(saved) : {
            nombreViaje: 'México 2027',
            portadaViaje: '',
            usuario: {
                nombre: 'Eduardo',
                apellido: 'Pérez',
                apodo: 'Charly',
                fotoPerfil: ''
            }
        };
    });

    // Inicializamos la lista de gastos
    const [gastosList, setGastosList] = useState(() => {
        const saved = localStorage.getItem('viaje_gastos');
        return saved ? JSON.parse(saved) : [
            { id: 1, descripcion: 'Cena de bienvenida', monto: 120, pagadoPor: 'Eduardo' }
        ];
    });

    // Inicializamos la lista de participantes con localStorage
    const [participantesList, setParticipantesList] = useState(() => {
        const saved = localStorage.getItem('viaje_participantes');
        return saved ? JSON.parse(saved) : [
            { id: 1, nombre: 'Eduardo', apellido: 'Pérez', apodo: 'Charly', fotoPerfil: '' }
        ];
    });

    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Persistencia automática en localStorage
    useEffect(() => {
        localStorage.setItem('viaje_state', JSON.stringify(viajeState));
    }, [viajeState]);

    useEffect(() => {
        localStorage.setItem('viaje_gastos', JSON.stringify(gastosList));
    }, [gastosList]);

    useEffect(() => {
        localStorage.setItem('viaje_participantes', JSON.stringify(participantesList));
    }, [participantesList]);

    // Acciones de negocio (Handlers)
    const guardarConfiguracion = (nuevosDatos) => {
        setViajeState(nuevosDatos);
    };

    const agregarGasto = (nuevoGasto) => {
        setGastosList(prev => [nuevoGasto, ...prev]);
    };

    const agregarParticipante = (nuevoParticipante) => {
        setParticipantesList(prev => [...prev, nuevoParticipante]);
    };

    // Calculo del total de gastos
    const totalGastos = gastosList.reduce((acc, item) => acc + Number(item.monto), 0);

    // ==========================================
    // CÁLCULOS FINANCIEROS Y DEUDAS (Nivel Senior)
    // ==========================================
    
    // ==========================================
    // CÁLCULOS FINANCIEROS Y DEUDAS (Blindado)
    // ==========================================
    
    // 1. Cuota exacta que le corresponde a cada integrante
    const cuotaPorPersona = participantesList.length > 0 ? totalGastos / participantesList.length : 0;

    // 2. Balance detallado de cada participante (con búsqueda flexible)
    const balanceParticipantes = participantesList.map(p => {
        const nombreCompleto = `${p.nombre || ''} ${p.apellido || ''}`.trim().toLowerCase();
        const soloNombre = (p.nombre || '').trim().toLowerCase();
        const apodo = (p.apodo || '').trim().toLowerCase();
        
        // Sumamos lo que pagó comparando de forma flexible (por nombre, apellido, apodo o nombre completo)
        const totalPagado = gastosList
            .filter(gasto => {
                const pagadorGasto = (gasto.pagadoPor || '').trim().toLowerCase();
                if (!pagadorGasto) return false;
                
                return (
                    pagadorGasto === nombreCompleto ||
                    pagadorGasto === soloNombre ||
                    pagadorGasto === apodo ||
                    pagadorGasto.includes(soloNombre)
                );
            })
            .reduce((sum, gasto) => sum + Number(gasto.monto || 0), 0);

        // Saldo: si es positivo le deben, si es negativo debe poner
        const saldo = totalPagado - cuotaPorPersona;

        return {
            ...p,
            totalPagado,
            saldo
        };
    });

    // 3. Algoritmo para sugerir transferencias directas (Quién le paga a quién)
    const calcularTransferencias = () => {
        let deudores = balanceParticipantes.filter(p => p.saldo < -0.01).map(p => ({ ...p, saldoRestante: Math.abs(p.saldo) }));
        let acreedores = balanceParticipantes.filter(p => p.saldo > 0.01).map(p => ({ ...p, saldoRestante: p.saldo }));
        
        let transferencias = [];
        let d = 0;
        let a = 0;

        while (d < deudores.length && a < acreedores.length) {
            let deudor = deudores[d];
            let acreedor = acreedores[a];

            let montoAPagar = Math.min(deudor.saldoRestante, acreedor.saldoRestante);

            if (montoAPagar > 0) {
                transferencias.push({
                    de: deudor.nombre || deudor.apodo,
                    para: acreedor.nombre || acreedor.apodo,
                    monto: Number(montoAPagar.toFixed(2))
                });
            }

            deudor.saldoRestante -= montoAPagar;
            acreedor.saldoRestante -= montoAPagar;

            if (deudor.saldoRestante < 0.01) d++;
            if (acreedor.saldoRestante < 0.01) a++;
        }

        return transferencias;
    };

    const pagosSugeridos = calcularTransferencias();

   const sincronizarUsuarioEnGrupo = (datosUsuario) => {
        if (!datosUsuario || !datosUsuario.nombre?.trim()) return;

        setParticipantesList((prevParticipantes) => {
            // Blindaje: Si por algo prevParticipantes no es un array, lo inicializamos seguro
            const listaSegura = Array.isArray(prevParticipantes) ? prevParticipantes : [];

            // 1. Buscamos si el usuario ya existe en el grupo por su ID único
            const existe = listaSegura.some(p => p.id === datosUsuario.id);

            if (existe) {
                // UPDATE: Si existe, actualizamos el objeto
                return listaSegura.map(p => 
                    p.id === datosUsuario.id 
                        ? { ...p, ...datosUsuario } 
                        : p
                );
            } else {
                // INSERT: Si no existe, lo agregamos al final
                return [...listaSegura, datosUsuario];
            }
        });
    };

    return (
        <ViajeContext.Provider value={{
            viajeState,
            gastosList,
            participantes: participantesList,
            totalGastos,
            cuotaPorPersona,
            balanceParticipantes,
            pagosSugeridos,
            isConfigOpen,
            setIsConfigOpen,
            guardarConfiguracion,
            agregarGasto,
            agregarParticipante,
            sincronizarUsuarioEnGrupo,
        }}>
            {children}
        </ViajeContext.Provider>
    );
};

// 3. Custom Hook para consumir el contexto de forma limpia
export const useViaje = () => {
    const context = useContext(ViajeContext);
    if (!context) {
        throw new Error('useViaje debe ser usado dentro de un ViajeProvider');
    }
    return context;
};