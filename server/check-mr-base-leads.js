const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkTableStructure() {
  try {
    console.log('Verificando estrutura da tabela MR_base_leads...');
    
    // Buscar uma amostra de dados para ver as colunas disponíveis
    const { data, error } = await supabase
      .from('MR_base_leads')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Erro:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('\n=== COLUNAS DISPONÍVEIS NA TABELA MR_base_leads ===');
      const columns = Object.keys(data[0]);
      columns.forEach((col, index) => {
        console.log(`${index + 1}. ${col}`);
      });
      
      console.log('\n=== AMOSTRA DE DADOS ===');
      console.log(JSON.stringify(data[0], null, 2));
      
      // Verificar especificamente as colunas de agendamento
      console.log('\n=== VERIFICAÇÃO DE COLUNAS DE AGENDAMENTO ===');
      const appointmentColumns = ['link_reuniao', 'data_do_agendamento', 'agendamento', 'reuniao'];
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

checkTableStructure().then(() => {
  console.log('\nVerificação concluída.');
  process.exit(0);
});