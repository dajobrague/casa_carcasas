  // Manejar la selección de un mes
  const handleSelectMonth = (mesSeleccionado: string, añoSeleccionado: string) => {
    // Capitalizar la primera letra del mes seleccionado
    const mesCapitalizado = mesSeleccionado.charAt(0).toUpperCase() + mesSeleccionado.slice(1).toLowerCase();
    setSelectedMonth(mesCapitalizado);
    setSelectedYear(añoSeleccionado);
    setView('month');
  }; 