// src/data/index.ts - ARCHIVO DE ÍNDICE PARA IMPORTACIONES CENTRALIZADAS

// 🔄 Exportar tipos
export * from './types';

// 🗄️ Exportar mock database
export { mockDatabase } from './mockDatabase';

// ⚙️ Exportar configuración
export { HYBRID_CONFIG } from './hybridConfig';

// 🔄 Exportar providers con manejo de errores
export { MockProvider, getPageDataFromSegments as getMockPageData } from './mockProvider';

// 🎯 Exportar provider híbrido (con fallback)
let HybridProvider: any;
let getPageDataFromSegments: any;

try {
  const hybridModule = await import('./hybridProvider');
  HybridProvider = hybridModule.HybridProvider;
  getPageDataFromSegments = hybridModule.getPageDataFromSegments;
} catch (error) {
  console.warn('⚠️ HybridProvider no disponible, usando MockProvider como fallback');
  const mockModule = await import('./mockProvider');
  getPageDataFromSegments = mockModule.getPageDataFromSegments;
}

export { HybridProvider, getPageDataFromSegments };

// 🧪 Exportar test provider si está disponible
let TestProvider: any;
try {
  const testModule = await import('./testProvider');
  TestProvider = testModule.TestProvider;
} catch (error) {
  // Test provider es opcional
}

export { TestProvider };

// 🚀 Función principal de conveniencia
export async function getPageData(segments: string[]) {
  try {
    if (getPageDataFromSegments) {
      return await getPageDataFromSegments(segments);
    } else {
      throw new Error('No hay provider disponible');
    }
  } catch (error) {
    console.error('Error en getPageData:', error);
    // Fallback final
    const { mockDatabase } = await import('./mockDatabase');
    return {
      type: 'property-list',
      listings: mockDatabase.getAllProperties().slice(0, 5),
      total: mockDatabase.getAllProperties().length,
      meta: {
        title: 'Propiedades | CLIC Inmobiliaria',
        description: 'Encuentra las mejores propiedades en República Dominicana'
      }
    };
  }
}