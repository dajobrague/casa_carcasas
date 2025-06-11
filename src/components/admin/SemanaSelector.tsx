'use client';

import { useState, useEffect } from 'react';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Search, FilterX } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Semana {
  id: string;
  name: string;
  year: string;
  month: string;
  startDate: string;
}

interface SemanaSelectorProps {
  onSemanaSelected: (semanaId: string, semanaNombre: string) => void;
  selectedSemanaId?: string;
}

export default function SemanaSelector({ onSemanaSelected, selectedSemanaId }: SemanaSelectorProps) {
  // Estados para la carga y filtrado de semanas
  const [semanas, setSemanas] = useState<Semana[]>([]);
  const [filteredSemanas, setFilteredSemanas] = useState<Semana[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  
  // Años y meses disponibles para filtros
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Obtener semanas al cargar el componente
  useEffect(() => {
    const fetchSemanas = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Obtener todas las semanas disponibles (sin filtro)
        const response = await fetch('/api/airtable?action=obtenerSemanasLaborales');
        
        if (!response.ok) {
          throw new Error('Error al cargar semanas laborales');
        }
        
        const data = await response.json();
        
        if (!data.records || !Array.isArray(data.records)) {
          throw new Error('Formato de respuesta incorrecto');
        }
        
        console.log('Datos de semanas recibidos:', data.records.length);
        
        if (data.records.length === 0) {
          setError('No se encontraron semanas laborales');
          setLoading(false);
          return;
        }
        
        // Log para verificar la estructura de los datos
        console.log('Estructura de la primera semana:', 
          Object.keys(data.records[0].fields).join(', '));
        
        // Transformar datos para el selector
        const semanasData = data.records.map((record: any) => {
          // Extraer el año de la semana si está disponible
          const yearMatch = record.fields.Name ? record.fields.Name.match(/\b(20\d{2})\b/) : null;
          const year = yearMatch ? yearMatch[1] : '';
          
          // Extraer mes - buscamos en diferentes campos posibles
          let month = '';
          
          if (record.fields.Mes) {
            // Si hay un campo Mes, usarlo directamente
            month = record.fields.Mes;
          } else if (record.fields.Name) {
            // Intentar extraer mes del nombre (ej: "Semana 1 Enero 2023")
            const monthMatch = record.fields.Name.match(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i);
            if (monthMatch) {
              month = monthMatch[1].toLowerCase();
            }
          }
          
          return {
            id: record.id,
            name: record.fields.Name || '',
            year: year,
            month: month,
            startDate: record.fields['Fecha de Inicio'] || ''
          };
        });
        
        // Filtrar semanas para mostrar solo presentes y futuras
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizar a inicio del día
        
        // Calcular el inicio de la semana actual (lunes)
        const startOfCurrentWeek = new Date(today);
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajustar cuando es domingo
        startOfCurrentWeek.setDate(diff);
        startOfCurrentWeek.setHours(0, 0, 0, 0);

        // Restar una semana más para permitir mostrar la semana anterior a la actual
        const oneWeekAgo = new Date(startOfCurrentWeek);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        console.log(`Fecha actual: ${today.toISOString().split('T')[0]}, Inicio de semana actual: ${startOfCurrentWeek.toISOString().split('T')[0]}, Una semana antes: ${oneWeekAgo.toISOString().split('T')[0]}`);
        
        const currentAndFutureWeeks = semanasData.filter((semana: Semana) => {
          // Si no hay fecha de inicio, incluirla para que el admin pueda decidir
          if (!semana.startDate) return true;
          
          // Convertir string de fecha a objeto Date
          const weekStartDate = new Date(semana.startDate);
          
          // Incluir semanas que comienzan hasta una semana antes del inicio de la semana actual
          return weekStartDate >= oneWeekAgo;
        });
        
        console.log(`Semanas totales: ${semanasData.length}, Semanas presentes/futuras: ${currentAndFutureWeeks.length}`);
        
        // Ordenar semanas por nombre (que suele contener año y número de semana)
        const sortedSemanas = currentAndFutureWeeks.sort((a: Semana, b: Semana) => {
          // Ordenar por año descendente primero
          if (a.year !== b.year) {
            return b.year.localeCompare(a.year);
          }
          
          // Luego ordenar por el número de semana si está presente
          const numA = a.name.match(/\d+/);
          const numB = b.name.match(/\d+/);
          
          if (numA && numB) {
            return parseInt(numB[0]) - parseInt(numA[0]);
          }
          
          // Si no, ordenar por nombre
          return b.name.localeCompare(a.name);
        });
        
        setSemanas(sortedSemanas);
        setFilteredSemanas(sortedSemanas);
        
        // Extraer años y meses disponibles para filtros
        const years = [...new Set(sortedSemanas
          .map((s: Semana) => s.year)
          .filter((y: string) => y.length > 0)
        )].sort((a, b) => parseInt(b) - parseInt(a));
        
        setAvailableYears(years);
        
        const months = [...new Set(sortedSemanas
          .map((s: Semana) => s.month)
          .filter((m: string) => m.length > 0)
        )];
        
        const sortedMonths = sortMonths(months);
        setAvailableMonths(sortedMonths);
        
      } catch (err) {
        setError((err as Error).message);
        console.error('Error al obtener semanas:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSemanas();
  }, []);
  
  // Función auxiliar para ordenar los meses en español
  const sortMonths = (months: string[]): string[] => {
    const monthOrder: Record<string, number> = {
      'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4,
      'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
      'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
    };
    
    return months.sort((a, b) => {
      const orderA = monthOrder[a.toLowerCase()] || 0;
      const orderB = monthOrder[b.toLowerCase()] || 0;
      return orderA - orderB;
    });
  };

  // Aplicar filtros cuando cambian
  useEffect(() => {
    let result = semanas;
    
    // Filtrar por año si hay uno seleccionado
    if (yearFilter) {
      result = result.filter(semana => semana.year === yearFilter);
    }
    
    // Filtrar por mes si hay uno seleccionado
    if (monthFilter) {
      result = result.filter(semana => semana.month.toLowerCase() === monthFilter.toLowerCase());
    }
    
    // Filtrar por término de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(semana => 
        semana.name.toLowerCase().includes(term)
      );
    }
    
    setFilteredSemanas(result);
  }, [searchTerm, yearFilter, monthFilter, semanas]);

  // Manejar la selección de semana
  const handleSemanaChange = (value: string) => {
    // Buscar el nombre de la semana seleccionada
    const semana = semanas.find(s => s.id === value);
    if (semana) {
      onSemanaSelected(value, semana.name);
    }
  };
  
  // Limpiar todos los filtros
  const clearFilters = () => {
    setSearchTerm('');
    setYearFilter('');
    setMonthFilter('');
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="semana-select" className="text-lg font-medium">Seleccionar Semana</Label>
              
              {/* Botón para limpiar filtros (visible solo si hay filtros aplicados) */}
              {(searchTerm || yearFilter || monthFilter) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearFilters}
                  className="flex items-center gap-1"
                >
                  <FilterX className="h-4 w-4" /> 
                  <span>Limpiar filtros</span>
                </Button>
              )}
            </div>
            
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Búsqueda por texto */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Buscar semana..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filtro por año */}
              <Select
                value={yearFilter}
                onChange={setYearFilter}
                placeholder="Filtrar por año"
                options={[
                  { value: "", label: "Todos los años" },
                  ...availableYears.map(year => ({ value: year, label: year }))
                ]}
              />
              
              {/* Filtro por mes */}
              <Select
                value={monthFilter}
                onChange={setMonthFilter}
                placeholder="Filtrar por mes"
                options={[
                  { value: "", label: "Todos los meses" },
                  ...availableMonths.map(month => ({ 
                    value: month, 
                    label: month.charAt(0).toUpperCase() + month.slice(1) 
                  }))
                ]}
              />
            </div>
            
            {/* Selector de semana */}
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : error ? (
              <div className="text-red-500 text-sm p-2 border border-red-200 rounded-md bg-red-50">
                {error}
              </div>
            ) : filteredSemanas.length === 0 ? (
              <div className="text-amber-600 text-sm p-2 border border-amber-200 rounded-md bg-amber-50">
                No hay semanas disponibles en el presente o futuro. Por favor, contacta al administrador para crear nuevas semanas.
              </div>
            ) : (
              <Select 
                value={selectedSemanaId} 
                onChange={handleSemanaChange}
                placeholder="Selecciona una semana"
                options={
                  filteredSemanas.length > 0 
                    ? filteredSemanas.map(semana => ({
                        value: semana.id,
                        label: `${semana.name}${semana.startDate ? ` (${semana.startDate})` : ''}`
                      }))
                    : [{ value: "", label: "No se encontraron semanas", disabled: true }]
                }
              />
            )}
            
            <p className="text-sm text-gray-500 mt-2">
              Selecciona la semana para la que deseas importar los datos de tiendas.
              Todos los registros del CSV se asociarán a esta semana.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 