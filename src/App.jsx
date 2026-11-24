import React, { useState, useEffect } from 'react';
import './index.css';
import { ViajeProvider, useViaje } from './context/ViajeContext';
import Layout from './components/layout/layout';
import Gastos from './components/modules/Gastos';
import Conversor from './components/modules/Conversor';
import Seguridad from './components/modules/Seguridad';
import ConfiguracionModal from './components/common/ConfiguracionModal';
import FinanzasContainer from './components/modules/FinanzasContainer';

// 1. Componente interno de la interfaz (Ya puede usar useViaje libremente)
const DashboardContent = () => {
  const [activeTab, setActiveTab] = useState('gastos');
  
  // Extraemos del contexto global lo que necesitamos
  const { viajeState, isConfigOpen, setIsConfigOpen, guardarConfiguracion } = useViaje();

  const onboardingCheckedRef = React.useRef(false);

  useEffect(() => {
    if (!onboardingCheckedRef.current && !viajeState?.usuario?.nombre) {
      onboardingCheckedRef.current = true;
      setIsConfigOpen(true);
    }
  }, [viajeState?.usuario?.nombre, setIsConfigOpen]);

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        viajeState={viajeState}
        onAbrirConfig={() => {
          console.log("🚀 ¡El botón del Header fue presionado! Abriendo modal...");
          setIsConfigOpen(true);
        }}
      >
        {activeTab === 'gastos' && <FinanzasContainer />}
        {activeTab === 'conversor' && <Conversor />}
        {activeTab === 'seguridad' && <Seguridad />}
      </Layout>

      <ConfiguracionModal 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        viajeState={viajeState}
        onGuardar={guardarConfiguracion}
      />
    </>
  );
};

// 2. Componente Principal que envuelve toda la app con el Provider
function App() {
  return (
    <ViajeProvider>
      <DashboardContent />
    </ViajeProvider>
  );
}

export default App;