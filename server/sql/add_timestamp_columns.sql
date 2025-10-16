-- Script para adicionar colunas de timestamp para rastreamento de transições de status
-- Cada coluna representa quando o lead entrou em determinado status

-- Adicionar colunas de timestamp para cada etapa do funil
ALTER TABLE public.kommo_leads_snapshot 
ADD COLUMN IF NOT EXISTS ts_leads_novos timestamp with time zone,
ADD COLUMN IF NOT EXISTS ts_closers_em_contato timestamp with time zone,
ADD COLUMN IF NOT EXISTS ts_agendados timestamp with time zone,
ADD COLUMN IF NOT EXISTS ts_call_realizada timestamp with time zone,
ADD COLUMN IF NOT EXISTS ts_vendas timestamp with time zone;

-- Adicionar coluna para armazenar o status atual (renomeando a coluna existente para clareza)
ALTER TABLE public.kommo_leads_snapshot 
ADD COLUMN IF NOT EXISTS current_status_name text;

-- Migrar dados existentes da coluna status_name para current_status_name
UPDATE public.kommo_leads_snapshot 
SET current_status_name = status_name 
WHERE current_status_name IS NULL;

-- Criar índices para as novas colunas de timestamp para melhor performance
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_ts_leads_novos ON public.kommo_leads_snapshot(ts_leads_novos);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_ts_closers_em_contato ON public.kommo_leads_snapshot(ts_closers_em_contato);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_ts_agendados ON public.kommo_leads_snapshot(ts_agendados);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_ts_call_realizada ON public.kommo_leads_snapshot(ts_call_realizada);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_ts_vendas ON public.kommo_leads_snapshot(ts_vendas);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_current_status_name ON public.kommo_leads_snapshot(current_status_name);

-- Comentários para documentação das novas colunas
COMMENT ON COLUMN public.kommo_leads_snapshot.ts_leads_novos IS 'Timestamp quando o lead entrou no status "Leads Novos"';
COMMENT ON COLUMN public.kommo_leads_snapshot.ts_closers_em_contato IS 'Timestamp quando o lead entrou no status "Closers em Contato"';
COMMENT ON COLUMN public.kommo_leads_snapshot.ts_agendados IS 'Timestamp quando o lead entrou no status "Agendados"';
COMMENT ON COLUMN public.kommo_leads_snapshot.ts_call_realizada IS 'Timestamp quando o lead entrou no status "Call Realizada"';
COMMENT ON COLUMN public.kommo_leads_snapshot.ts_vendas IS 'Timestamp quando o lead entrou no status "Vendas"';
COMMENT ON COLUMN public.kommo_leads_snapshot.current_status_name IS 'Status atual do lead';

-- Função auxiliar para mapear nome do status para coluna de timestamp
CREATE OR REPLACE FUNCTION get_timestamp_column_name(status_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  CASE status_name
    WHEN 'Leads Novos' THEN RETURN 'ts_leads_novos';
    WHEN 'Closers em Contato' THEN RETURN 'ts_closers_em_contato';
    WHEN 'Agendados' THEN RETURN 'ts_agendados';
    WHEN 'Call Realizada' THEN RETURN 'ts_call_realizada';
    WHEN 'Vendas' THEN RETURN 'ts_vendas';
    ELSE RETURN NULL;
  END CASE;
END;
$$;