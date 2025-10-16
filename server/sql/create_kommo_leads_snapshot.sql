-- Criação da tabela kommo_leads_snapshot para armazenar snapshot dos leads do Kommo
CREATE TABLE IF NOT EXISTS public.kommo_leads_snapshot (
  lead_id integer NOT NULL,
  status_name text NOT NULL,
  pipeline_id integer NOT NULL,
  updated_at timestamp with time zone DEFAULT NOW(),
  CONSTRAINT kommo_leads_snapshot_pkey PRIMARY KEY (lead_id)
);

-- Índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_status_name ON public.kommo_leads_snapshot(status_name);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_pipeline_id ON public.kommo_leads_snapshot(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_updated_at ON public.kommo_leads_snapshot(updated_at);

-- Função para calcular tempo médio na etapa atual
CREATE OR REPLACE FUNCTION calculate_avg_time_in_stage()
RETURNS TABLE(status_name text, avg_duration interval)
LANGUAGE sql
AS $$
  SELECT 
    kls.status_name,
    AVG(NOW() - kls.updated_at) as avg_duration
  FROM kommo_leads_snapshot kls
  GROUP BY kls.status_name
  ORDER BY kls.status_name;
$$;

-- Comentários para documentação
COMMENT ON TABLE public.kommo_leads_snapshot IS 'Snapshot dos leads do Kommo CRM para consultas rápidas';
COMMENT ON COLUMN public.kommo_leads_snapshot.lead_id IS 'ID único do lead no Kommo';
COMMENT ON COLUMN public.kommo_leads_snapshot.status_name IS 'Nome do status/etapa atual do lead';
COMMENT ON COLUMN public.kommo_leads_snapshot.pipeline_id IS 'ID do pipeline no Kommo';
COMMENT ON COLUMN public.kommo_leads_snapshot.updated_at IS 'Timestamp da última atualização do lead';