import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function recreateTableViaAPI() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Variáveis de ambiente SUPABASE_URL ou SUPABASE_ANON_KEY não encontradas');
    return;
  }

  console.log('🗃️ Recriando tabela kommo_leads_snapshot via API REST...');
  
  try {
    // SQL para dropar e recriar a tabela
    const sql = `
-- Primeiro, remova a tabela existente
DROP TABLE IF EXISTS kommo_leads_snapshot CASCADE;

-- Depois, crie a nova tabela
CREATE TABLE kommo_leads_snapshot (
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
CREATE INDEX idx_kommo_leads_snapshot_lead_id ON kommo_leads_snapshot(lead_id);
CREATE INDEX idx_kommo_leads_snapshot_status ON kommo_leads_snapshot(status);
CREATE INDEX idx_kommo_leads_snapshot_pipeline_id ON kommo_leads_snapshot(pipeline_id);
CREATE INDEX idx_kommo_leads_snapshot_last_updated_at ON kommo_leads_snapshot(last_updated_at);
CREATE INDEX idx_kommo_leads_snapshot_created_at_snapshot ON kommo_leads_snapshot(created_at_snapshot);
CREATE INDEX idx_kommo_leads_snapshot_origin ON kommo_leads_snapshot(origin);
    `.trim();

    console.log('📋 Executando SQL via API REST...');
    
    // Tentar usar a API REST do Supabase para executar SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      console.log('❌ Erro na API REST:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Detalhes do erro:', errorText);
      
      console.log('\n📋 Como a API REST não funcionou, você precisa executar manualmente:');
      console.log('🔗 Acesse: https://supabase.com/dashboard');
      console.log('1. Faça login na sua conta');
      console.log('2. Selecione seu projeto');
      console.log('3. Vá para SQL Editor');
      console.log('4. Execute o seguinte SQL:');
      console.log('='.repeat(60));
      console.log(sql);
      console.log('='.repeat(60));
      console.log('5. Depois execute: npx ts-node sync-kommo-full.ts');
      
    } else {
      const result = await response.json();
      console.log('✅ SQL executado com sucesso!');
      console.log('📊 Resultado:', result);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    console.log('\n📋 Execute manualmente no Supabase Dashboard:');
    console.log('🔗 https://supabase.com/dashboard');
    console.log('SQL Editor > Execute o SQL fornecido anteriormente');
  }
}

recreateTableViaAPI().catch(console.error);