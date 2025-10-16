const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkLeads2Structure() {
  try {
    console.log('Verificando estrutura da tabela leads2...');
    
    // Buscar uma amostra de dados para ver as colunas disponíveis
    const { data, error } = await supabase
      .from('leads2')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Erro:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('\n=== COLUNAS DISPONÍVEIS NA TABELA leads2 ===');
      const columns = Object.keys(data[0]);
      columns.forEach((col, index) => {
        console.log(`${index + 1}. ${col}`);
      });
      
      console.log('\n=== AMOSTRA DE DADOS ===');
      console.log(JSON.stringify(data[0], null, 2));
      
      // Verificar especificamente as colunas necessárias
      console.log('\n=== VERIFICAÇÃO DE COLUNAS NECESSÁRIAS ===');
      const requiredColumns = ['email', 'data_do_agendamento'];
      requiredColumns.forEach(col => {
        if (columns.includes(col)) {
          console.log(`✅ Coluna '${col}' encontrada`);
        } else {
          console.log(`❌ Coluna '${col}' NÃO encontrada`);
        }
      });
      
      // Verificar outras colunas relacionadas a agendamento
      console.log('\n=== VERIFICAÇÃO DE OUTRAS COLUNAS DE AGENDAMENTO ===');
      const appointmentColumns = ['agendamento', 'reuniao', 'data_agendamento', 'link_reuniao'];
      appointmentColumns.forEach(col => {
        if (columns.includes(col)) {
          console.log(`✅ Coluna '${col}' encontrada`);
        } else {
          console.log(`❌ Coluna '${col}' NÃO encontrada`);
        }
      });
      
    } else {
      console.log('Tabela vazia ou não encontrada');
    }
  } catch (err) {
    console.error('Erro na consulta:', err);
  }
}

checkLeads2Structure().then(() => {
  console.log('\nVerificação concluída.');
  process.exit(0);
});