const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createLeadStageHistoryTable() {
  try {
    console.log('🚀 Verificando se tabela lead_stage_history existe...');
    
    // Tentar fazer um select para verificar se a tabela existe
    const testData = {
      lead_id: 999999,
      stage_name: 'test',
      entered_at: new Date().toISOString(),
      exited_at: null,
      duration_seconds: null,
      pipeline_id: 1
    };
    
    const { data, error } = await client
      .from('lead_stage_history')
      .insert([testData])
      .select();
    
    if (error) {
      console.log('❌ Tabela não existe, precisa ser criada manualmente no Supabase Dashboard');
      console.log('Erro:', error.message);
      
      console.log('\n📋 SQL para criar a tabela no Supabase Dashboard:');
      console.log('='.repeat(80));
      console.log(`
-- Criar tabela lead_stage_history
CREATE TABLE IF NOT EXISTS public.lead_stage_history (
    id BIGSERIAL PRIMARY KEY,
    lead_id BIGINT NOT NULL,
    stage_name TEXT NOT NULL,
    entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exited_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    pipeline_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead_id ON public.lead_stage_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_stage_name ON public.lead_stage_history(stage_name);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_entered_at ON public.lead_stage_history(entered_at);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_pipeline_id ON public.lead_stage_history(pipeline_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lead_stage_history_updated_at 
    BEFORE UPDATE ON public.lead_stage_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para calcular duration_seconds automaticamente
CREATE OR REPLACE FUNCTION calculate_duration_seconds()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.exited_at IS NOT NULL AND NEW.entered_at IS NOT NULL THEN
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.exited_at - NEW.entered_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_lead_stage_duration 
    BEFORE INSERT OR UPDATE ON public.lead_stage_history 
    FOR EACH ROW EXECUTE FUNCTION calculate_duration_seconds();

-- Função para calcular tempo médio por etapa
CREATE OR REPLACE FUNCTION get_average_time_per_stage()
RETURNS TABLE(stage_name TEXT, avg_duration_seconds NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.stage_name,
        AVG(h.duration_seconds) as avg_duration_seconds
    FROM public.lead_stage_history h
    WHERE h.duration_seconds IS NOT NULL
    GROUP BY h.stage_name
    ORDER BY h.stage_name;
END;
$$ language 'plpgsql';

-- Função para obter histórico completo de um lead
CREATE OR REPLACE FUNCTION get_lead_stage_history(p_lead_id BIGINT)
RETURNS TABLE(
    id BIGINT,
    stage_name TEXT,
    entered_at TIMESTAMPTZ,
    exited_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    pipeline_id INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.stage_name,
        h.entered_at,
        h.exited_at,
        h.duration_seconds,
        h.pipeline_id
    FROM public.lead_stage_history h
    WHERE h.lead_id = p_lead_id
    ORDER BY h.entered_at ASC;
END;
$$ language 'plpgsql';
      `);
      console.log('='.repeat(80));
      console.log('\n📝 Instruções:');
      console.log('1. Acesse o Supabase Dashboard');
      console.log('2. Vá para SQL Editor');
      console.log('3. Cole o SQL acima');
      console.log('4. Execute o script');
      console.log('5. Execute este script novamente para verificar');
      
    } else {
      console.log('✅ Tabela já existe!');
      console.log('Dados inseridos:', data);
      
      // Deletar o registro de teste
      await client
        .from('lead_stage_history')
        .delete()
        .eq('lead_id', 999999);
        
      console.log('🧹 Registro de teste removido');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar
createLeadStageHistoryTable();