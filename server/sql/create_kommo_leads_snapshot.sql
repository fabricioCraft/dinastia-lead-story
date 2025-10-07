-- Tabela para armazenar snapshot dos leads do Kommo CRM
-- Esta tabela substitui a clickup_tasks_snapshot para a nova integração

CREATE TABLE IF NOT EXISTS kommo_leads_snapshot (
  id BIGSERIAL PRIMARY KEY,
  lead_id VARCHAR(255) NOT NULL,
  name VARCHAR(500),
  status VARCHAR(255) NOT NULL,
  pipeline_id VARCHAR(255),
  pipeline_name VARCHAR(255),
  stage_id VARCHAR(255),
  stage_name VARCHAR(255),
  responsible_user_id VARCHAR(255),
  responsible_user_name VARCHAR(255),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  custom_fields JSONB,
  tags TEXT[],
  origin VARCHAR(255),
  created_at_snapshot TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_lead_id ON kommo_leads_snapshot(lead_id);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_status ON kommo_leads_snapshot(status);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_pipeline_id ON kommo_leads_snapshot(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_last_updated_at ON kommo_leads_snapshot(last_updated_at);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_created_at_snapshot ON kommo_leads_snapshot(created_at_snapshot);
CREATE INDEX IF NOT EXISTS idx_kommo_leads_snapshot_origin ON kommo_leads_snapshot(origin);

-- Comentários para documentação
COMMENT ON TABLE kommo_leads_snapshot IS 'Snapshot dos leads do Kommo CRM para análise de funil e performance';
COMMENT ON COLUMN kommo_leads_snapshot.lead_id IS 'ID único do lead no Kommo CRM';
COMMENT ON COLUMN kommo_leads_snapshot.status IS 'Status atual do lead no pipeline';
COMMENT ON COLUMN kommo_leads_snapshot.pipeline_id IS 'ID do pipeline no Kommo';
COMMENT ON COLUMN kommo_leads_snapshot.stage_id IS 'ID do estágio atual no pipeline';
COMMENT ON COLUMN kommo_leads_snapshot.last_updated_at IS 'Última atualização do lead no Kommo';
COMMENT ON COLUMN kommo_leads_snapshot.created_at_snapshot IS 'Timestamp de quando este snapshot foi criado';
COMMENT ON COLUMN kommo_leads_snapshot.origin IS 'Origem do lead (ex: manychat, facebook, google, etc)';