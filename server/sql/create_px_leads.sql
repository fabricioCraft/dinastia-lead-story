-- Criação da tabela px_leads para armazenar dados de leads do N8N
-- Esta tabela será populada externamente pelo N8N e lida pelo backend

CREATE TABLE IF NOT EXISTS public.px_leads (
    id SERIAL PRIMARY KEY,
    
    -- Dados básicos do lead
    lead_id VARCHAR(255),
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(255),
    
    -- Dados UTM para tracking de origem
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),
    
    -- Campos específicos do PXA
    _pxa_first_utm_source VARCHAR(255),
    _pxa_first_utm_medium VARCHAR(255),
    _pxa_first_utm_campaign VARCHAR(255),
    _pxa_first_utm_term VARCHAR(255),
    _pxa_first_utm_content VARCHAR(255),
    
    -- Status e dados de conversão
    status VARCHAR(100),
    converted BOOLEAN DEFAULT FALSE,
    revenue DECIMAL(10,2) DEFAULT 0,
    
    -- Timestamps
    post_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Dados adicionais em JSON
    meta JSONB,
    
    -- Índices para performance
    CONSTRAINT unique_lead_id UNIQUE (lead_id)
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_px_leads_post_date ON public.px_leads (post_date);
CREATE INDEX IF NOT EXISTS idx_px_leads_utm_campaign ON public.px_leads (utm_campaign);
CREATE INDEX IF NOT EXISTS idx_px_leads_pxa_first_utm_campaign ON public.px_leads (_pxa_first_utm_campaign);
CREATE INDEX IF NOT EXISTS idx_px_leads_status ON public.px_leads (status);
CREATE INDEX IF NOT EXISTS idx_px_leads_converted ON public.px_leads (converted);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_px_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_px_leads_updated_at
    BEFORE UPDATE ON public.px_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_px_leads_updated_at();

-- Comentários para documentação
COMMENT ON TABLE public.px_leads IS 'Tabela para armazenar dados de leads processados pelo N8N';
COMMENT ON COLUMN public.px_leads.post_date IS 'Data de criação do lead (usado para filtragem por período)';
COMMENT ON COLUMN public.px_leads.utm_campaign IS 'Campanha UTM atual do lead';
COMMENT ON COLUMN public.px_leads._pxa_first_utm_campaign IS 'Primeira campanha UTM do lead (PXA tracking)';
COMMENT ON COLUMN public.px_leads.meta IS 'Dados adicionais em formato JSON';