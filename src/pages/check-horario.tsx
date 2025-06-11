import { useState } from 'react';
import { useRouter } from 'next/router';

export default function CheckHorario() {
  const [storeId, setStoreId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storeId) {
      setError('Debes ingresar un ID de tienda');
      return;
    }
    
    setLoading(true);
    setError(null);
    setData(null);
    
    try {
      const response = await fetch(`/api/check-horario?storeId=${storeId}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido');
      }
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-4">Verificar Horario de Tienda</h1>
        
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              placeholder="ID de la tienda"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        </form>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
            {error}
          </div>
        )}
        
        {data && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Campos de horario encontrados:</h2>
              {Object.keys(data.horarioFields).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-4 py-2 text-left">Campo</th>
                        <th className="border px-4 py-2 text-left">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.horarioFields).map(([field, value]) => (
                        <tr key={field}>
                          <td className="border px-4 py-2 font-medium">{field}</td>
                          <td className="border px-4 py-2">{String(value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No se encontraron campos de horario.</p>
              )}
            </div>
            
            <div>
              <h2 className="text-xl font-bold mb-2">Valores calculados para generarColumnasTiempo:</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-4 py-2 text-left">Parámetro</th>
                      <th className="border px-4 py-2 text-left">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.calculatedValues).map(([param, value]) => (
                      <tr key={param}>
                        <td className="border px-4 py-2 font-medium">{param}</td>
                        <td className="border px-4 py-2">{String(value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold mb-2">Todos los campos de la tienda:</h2>
              <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                <pre className="text-sm">{JSON.stringify(data.allFields, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 