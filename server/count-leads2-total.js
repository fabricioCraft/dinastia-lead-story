const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function countTotalLeads() {
  try {
    console.log('Contando total de registros na tabela leads2...');
    
    // Contar total de registros
    const { count, error } = await supabase
      .from('leads2')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Erro ao contar registros:', error);
      return;
    }
    
    console.log(`\n=== TOTAL DE REGISTROS NA TABELA leads2 ===`);
    console.log(`Total: ${count} registros`);
    
    // Verificar uma amostra dos dados
    const { data: sample, error: sampleError } = await supabase
      .from('leads2')
      .select('datacriacao')
      .limit(5);
    
    if (sampleError) {
      console.error('Erro ao buscar amostra:', sampleError);
      return;
    }
    
    console.log('\n=== AMOSTRA DE DATAS ===');
    sample.forEach((lead, index) => {
      console.log(`${index + 1}. ${lead.datacriacao}`);
    });
    
  } catch (err) {
    console.error('Erro na consulta:', err);
  }
}

countTotalLeads().then(() => {
  console.log('\nVerificação concluída.');
  process.exit(0);
});