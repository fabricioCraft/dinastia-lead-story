// Usando fetch nativo do Node.js 18+

async function debugAppointments() {
  try {
    console.log('=== INVESTIGAÇÃO DOS AGENDAMENTOS ===\n');
    
    // 1. Buscar dados do scheduling-summary
    console.log('1. Buscando dados do scheduling-summary...');
    const summaryResponse = await fetch('http://localhost:3001/api/dashboard/scheduling-summary');
    const summaryData = await summaryResponse.json();
    console.log('Scheduling Summary:', summaryData);
    console.log(`Total de agendamentos (summary): ${summaryData.totalAppointments}\n`);
    
    // 2. Buscar dados do daily-appointments
    console.log('2. Buscando dados do daily-appointments...');
    const dailyResponse = await fetch('http://localhost:3001/api/dashboard/daily-appointments');
    const dailyData = await dailyResponse.json();
    console.log('Daily Appointments:', dailyData);
    
    // 3. Calcular total do gráfico
    const totalFromChart = dailyData.reduce((sum, item) => sum + item.appointments_per_day, 0);
    console.log(`Total de agendamentos (gráfico): ${totalFromChart}\n`);
    
    // 4. Mostrar diferença
    const difference = summaryData.totalAppointments - totalFromChart;
    console.log(`=== ANÁLISE ===`);
    console.log(`Diferença: ${difference} agendamentos`);
    console.log(`Percentual da diferença: ${((difference / summaryData.totalAppointments) * 100).toFixed(2)}%`);
    
    if (difference > 0) {
      console.log(`\nPossíveis causas:`);
      console.log(`- Datas inválidas sendo filtradas no processamento do gráfico`);
      console.log(`- Problemas de formatação de data`);
      console.log(`- Limite de registros na query do daily-appointments`);
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

debugAppointments();