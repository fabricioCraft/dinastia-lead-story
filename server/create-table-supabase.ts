import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SupabaseService } from './src/services/supabase.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function createTableInSupabase() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabaseService = app.get(SupabaseService);

  try {
    console.log('🗃️ Recriando tabela kommo_leads_snapshot no Supabase...');
    
    const client = (supabaseService as any).client;
    if (!client) {
      console.log('❌ Cliente Supabase não inicializado');
      return;
    }
    
    // Como não podemos executar DDL diretamente, vamos usar uma abordagem alternativa
    // Primeiro, vamos verificar se conseguimos inserir dados com o schema correto
    console.log('🧪 Testando inserção com schema correto...');
    
    const testData = {
      lead_id: '12345',
      name: 'Test Lead',
      status: 'New',
      pipeline_id: '1',
      pipeline_name: 'Sales Pipeline',
      stage_id: '1',
      stage_name: 'New Lead',
      responsible_user_id: '1',
      responsible_user_name: 'Test User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString(),
      custom_fields: {},
      tags: ['test'],
      origin: 'test',
      created_at_snapshot: new Date().toISOString()
    };
    
    const { data, error } = await client
      .from('kommo_leads_snapshot')
      .insert([testData])
      .select();
    
    if (error) {
      console.log('❌ Erro na inserção:', error.message);
      console.log('📋 A tabela precisa ser recriada manualmente no Supabase Dashboard.');
      console.log('🔗 Acesse: https://supabase.com/dashboard/project/[seu-projeto]/editor');
      console.log('');
      console.log('1. Vá para SQL Editor');
      console.log('2. Execute o seguinte SQL:');
      console.log('='.repeat(60));
      console.log('-- Primeiro, remova a tabela existente');
      console.log('DROP TABLE IF EXISTS kommo_leads_snapshot CASCADE;');
      console.log('');
      console.log('-- Depois, crie a nova tabela');
      console.log(`CREATE TABLE kommo_leads_snapshot (
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
CREATE INDEX idx_kommo_leads_snapshot_origin ON kommo_leads_snapshot(origin);`);
      console.log('='.repeat(60));
      console.log('');
      console.log('3. Execute o SQL e aguarde a confirmação');
      console.log('4. Depois execute novamente o sync: npx ts-node sync-kommo-full.ts');
      
    } else {
      console.log('✅ Inserção bem-sucedida! A tabela já tem o schema correto.');
      console.log('📊 Dados inseridos:', data);
      
      // Limpar o teste
      await client
        .from('kommo_leads_snapshot')
        .delete()
        .eq('lead_id', '12345');
      
      console.log('🧹 Dados de teste removidos.');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await app.close();
  }
}

createTableInSupabase().catch(console.error);