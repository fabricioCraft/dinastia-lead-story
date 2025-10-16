-- Função para unificar e normalizar dados de origem de leads
-- Esta função combina dados das tabelas leads2.origem e MR_base_leads.utm_campaign
-- e aplica regras de normalização para agrupar variações similares

CREATE OR REPLACE FUNCTION get_unified_origin_summary()
RETURNS TABLE (
    origin_name TEXT,
    lead_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- 3. Agrupa pelo nome normalizado e conta os leads
        normalized_origin AS origin_name, 
        COUNT(*) AS lead_count 
    FROM ( 
        -- 2. Aplica as regras de normalização para cada linha
        SELECT 
            CASE 
                -- Regras de normalização usando ILIKE para ser case-insensitive
                WHEN all_origins.raw_origin ILIKE '%ISCA SCOPELINE%' THEN 'Isca Scopeline'
                WHEN all_origins.raw_origin ILIKE '%ISCA HORMOZI%' THEN 'Isca Hormozi' 
                WHEN all_origins.raw_origin ILIKE '%MASTERCLASS%' THEN 'Masterclass'
                WHEN all_origins.raw_origin ILIKE '%WEBINAR%' THEN 'Webinar'
                WHEN all_origins.raw_origin ILIKE '%FACEBOOK%' OR all_origins.raw_origin ILIKE '%FB%' THEN 'Facebook'
                WHEN all_origins.raw_origin ILIKE '%INSTAGRAM%' OR all_origins.raw_origin ILIKE '%IG%' THEN 'Instagram'
                WHEN all_origins.raw_origin ILIKE '%YOUTUBE%' OR all_origins.raw_origin ILIKE '%YT%' THEN 'YouTube'
                WHEN all_origins.raw_origin ILIKE '%GOOGLE%' THEN 'Google'
                WHEN all_origins.raw_origin ILIKE '%TIKTOK%' THEN 'TikTok'
                WHEN all_origins.raw_origin ILIKE '%LINKEDIN%' THEN 'LinkedIn'
                WHEN all_origins.raw_origin ILIKE '%EMAIL%' OR all_origins.raw_origin ILIKE '%NEWSLETTER%' THEN 'Email Marketing'
                WHEN all_origins.raw_origin ILIKE '%WHATSAPP%' OR all_origins.raw_origin ILIKE '%WPP%' THEN 'WhatsApp'
                WHEN all_origins.raw_origin ILIKE '%INDICACAO%' OR all_origins.raw_origin ILIKE '%REFERRAL%' THEN 'Indicação'
                WHEN all_origins.raw_origin ILIKE '%ORGANICO%' OR all_origins.raw_origin ILIKE '%ORGANIC%' THEN 'Orgânico'
                WHEN all_origins.raw_origin ILIKE '%PAID%' OR all_origins.raw_origin ILIKE '%PAGO%' THEN 'Tráfego Pago'
                
                -- Regra de fallback para origens que não se encaixam nas regras acima
                ELSE 'Outros' 
            END AS normalized_origin 
        FROM ( 
            -- 1. Unifica as duas colunas de origem em uma única lista
            SELECT origem AS raw_origin 
            FROM public.leads2 
            WHERE origem IS NOT NULL AND origem <> '' 
            
            UNION ALL 
            
            SELECT utm_campaign AS raw_origin 
            FROM public."MR_base_leads" 
            WHERE utm_campaign IS NOT NULL AND utm_campaign <> '' 
        ) AS all_origins 
    ) AS normalized_data 
    GROUP BY 
        normalized_origin 
    ORDER BY 
        lead_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Comentário sobre como executar esta função no Supabase:
-- 1. Acesse o painel do Supabase
-- 2. Vá para SQL Editor
-- 3. Execute este script para criar a função
-- 4. A função estará disponível para ser chamada via RPC no código