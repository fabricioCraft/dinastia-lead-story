-- Tabela para persistir dados do dashboard obtidos via cron job
-- Esta tabela armazena snapshots dos dados que são atualizados duas vezes ao dia

CREATE TABLE IF NOT EXISTS public.dashboard_data_snapshots (
    id BIGSERIAL PRIMARY KEY,
    snapshot_type VARCHAR(50) NOT NULL, -- 'n8n_data', 'utm_origin_summary', 'funnel_data', etc.
    data JSONB NOT NULL, -- Dados em formato JSON
    execution_time TIMESTAMP WITH TIME ZONE NOT NULL, -- Horário da execução do cron job
    is_from_webhook BOOLEAN DEFAULT false, -- Se os dados vieram do webhook real ou são mock
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para evitar duplicatas do mesmo tipo no mesmo horário
    UNIQUE(snapshot_type, execution_time)
);

-- Índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_type ON public.dashboard_data_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_execution_time ON public.dashboard_data_snapshots(execution_time);
CREATE INDEX IF NOT EXISTS idx_dashboard_snapshots_type_time ON public.dashboard_data_snapshots(snapshot_type, execution_time DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_dashboard_snapshots_updated_at 
    BEFORE UPDATE ON public.dashboard_data_snapshots 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Função para limpar snapshots antigos (manter apenas os últimos 30 dias)
CREATE OR REPLACE FUNCTION cleanup_old_dashboard_snapshots()
RETURNS void AS $$
BEGIN
    DELETE FROM public.dashboard_data_snapshots 
    WHERE execution_time < NOW() - INTERVAL '30 days';
END;
$$ language 'plpgsql';

-- Comentários para documentação
COMMENT ON TABLE public.dashboard_data_snapshots IS 'Armazena snapshots dos dados do dashboard obtidos via cron job duas vezes ao dia';
COMMENT ON COLUMN public.dashboard_data_snapshots.snapshot_type IS 'Tipo do snapshot: n8n_data, utm_origin_summary, funnel_data, etc.';
COMMENT ON COLUMN public.dashboard_data_snapshots.data IS 'Dados em formato JSON obtidos do webhook ou serviços';
COMMENT ON COLUMN public.dashboard_data_snapshots.execution_time IS 'Horário exato da execução do cron job que gerou este snapshot';
COMMENT ON COLUMN public.dashboard_data_snapshots.is_from_webhook IS 'Indica se os dados vieram do webhook real (true) ou são dados mock (false)';