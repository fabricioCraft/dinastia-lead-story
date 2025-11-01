console.log('🔧 CORREÇÃO DOS ERROS DO BANCO DE DADOS');
console.log('=' .repeat(80));
console.log('');
console.log('❌ PROBLEMAS IDENTIFICADOS:');
console.log('1. Tabela "dashboard_data_snapshots" não existe');
console.log('2. Função "get_average_time_per_stage" não existe');
console.log('');
console.log('📋 INSTRUÇÕES PARA CORREÇÃO:');
console.log('1. Acesse o Supabase Dashboard');
console.log('2. Vá para SQL Editor');
console.log('3. Execute os SQLs abaixo na ordem:');
console.log('');

console.log('🗃️  SQL 1: CRIAR TABELA dashboard_data_snapshots');
console.log('-'.repeat(60));
console.log(`
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

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_type ON public.dashboard_data_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_execution_time ON public.dashboard_data_snapshots(execution_time);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_webhook ON public.dashboard_data_snapshots(is_from_webhook);

-- Comentários para documentação
COMMENT ON TABLE public.dashboard_data_snapshots IS 'Armazena snapshots de dados do dashboard para cache e histórico';
COMMENT ON COLUMN public.dashboard_data_snapshots.snapshot_type IS 'Tipo do snapshot (ex: n8n_data)';
COMMENT ON COLUMN public.dashboard_data_snapshots.data IS 'Dados do snapshot em formato JSON';
COMMENT ON COLUMN public.dashboard_data_snapshots.execution_time IS 'Timestamp de quando o snapshot foi executado';
COMMENT ON COLUMN public.dashboard_data_snapshots.is_from_webhook IS 'Indica se o snapshot veio de um webhook';
`);

console.log('');
console.log('⚙️  SQL 2: CRIAR FUNÇÃO get_average_time_per_stage');
console.log('-'.repeat(60));
console.log(`
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

-- Comentário para documentação
COMMENT ON FUNCTION get_average_time_per_stage() IS 'Calcula o tempo médio por etapa baseado no histórico de leads';
`);

console.log('');
console.log('✅ APÓS EXECUTAR OS SQLs:');
console.log('1. Execute este comando para testar: npm run test:database-fix');
console.log('2. Ou reinicie o servidor para verificar se os erros sumiram');
console.log('');
console.log('🔍 VERIFICAÇÃO:');
console.log('- Os logs do servidor não devem mais mostrar erros sobre tabelas/funções inexistentes');
console.log('- O endpoint /api/dashboard/n8n/dinastia-data deve funcionar normalmente');
console.log('- O endpoint /api/funnel/time-in-stage deve funcionar normalmente');
console.log('');
console.log('=' .repeat(80));