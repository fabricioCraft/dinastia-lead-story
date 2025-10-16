const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function createTable() {
  console.log('🔧 Criando tabela dashboard_data_snapshots...');
  
  const sql = `
    CREATE TABLE IF NOT EXISTS public.dashboard_data_snapshots (
        id BIGSERIAL PRIMARY KEY,
        snapshot_type VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        execution_time TIMESTAMP WITH TIME ZONE NOT NULL,
        is_from_webhook BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(snapshot_type, execution_time)
    );
    
    CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_type ON public.dashboard_data_snapshots(snapshot_type);
    CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_execution_time ON public.dashboard_data_snapshots(execution_time);
    CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_type_time ON public.dashboard_data_snapshots(snapshot_type, execution_time DESC);
  `;

  try {
    // Tentar criar a tabela usando RPC
    const { data, error } = await supabase.rpc('exec', { sql });
    
    if (error) {
      console.error('❌ Erro ao criar tabela:', error);
      
      // Tentar método alternativo - inserir um registro de teste para forçar a criação
      console.log('🔄 Tentando método alternativo...');
      const { data: testData, error: testError } = await supabase
        .from('dashboard_data_snapshots')
        .select('*')
        .limit(1);
        
      if (testError) {
        console.error('❌ Tabela não existe e não foi possível criar:', testError.message);
      } else {
        console.log('✅ Tabela já existe!');
      }
    } else {
      console.log('✅ Tabela criada com sucesso!');
    }
  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

createTable().then(() => {
  console.log('🏁 Processo concluído');
  process.exit(0);
});