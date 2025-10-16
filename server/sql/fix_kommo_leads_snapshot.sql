-- Script para corrigir a estrutura da tabela kommo_leads_snapshot
-- Adiciona a coluna pipeline_id que está faltando

-- Adicionar coluna pipeline_id se não existir
ALTER TABLE public.kommo_leads_snapshot 
ADD COLUMN IF NOT EXISTS pipeline_id integer;

-- Criar índice para a coluna pipeline_id se não existir
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_pipeline_id 
ON public.kommo_leads_snapshot(pipeline_id);

-- Comentário para documentação
COMMENT ON COLUMN public.kommo_leads_snapshot.pipeline_id IS 'ID do pipeline no Kommo';