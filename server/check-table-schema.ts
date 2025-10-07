import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SupabaseService } from './src/services/supabase.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkTableSchema() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabaseService = app.get(SupabaseService);

  try {
    console.log('🔍 Verificando schema da tabela kommo_leads_snapshot...');
    
    const client = (supabaseService as any).client;
    if (!client) {
      console.log('❌ Cliente Supabase não inicializado');
      return;
    }
    
    // Verificar se a tabela existe
    const { data: tables, error: tablesError } = await client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'kommo_leads_snapshot');
    
    if (tablesError) {
      console.error('❌ Erro ao verificar tabelas:', tablesError);
      return;
    }
    
    if (!tables || tables.length === 0) {
      console.log('❌ Tabela kommo_leads_snapshot não existe');
      console.log('📋 Criando tabela...');
      
      // Criar a tabela
      const { error: createError } = await client.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS kommo_leads_snapshot (
            lead_id TEXT PRIMARY KEY,
            name TEXT,
            status TEXT NOT NULL,
            pipeline_id TEXT,
            pipeline_name TEXT,
            stage_id TEXT,
            stage_name TEXT,
            responsible_user_id TEXT,
            responsible_user_name TEXT,
            created_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ,
            last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            custom_fields JSONB,
            tags TEXT[],
            origin TEXT
          );
          
          CREATE INDEX IF NOT EXISTS idx_kommo_leads_origin ON kommo_leads_snapshot(origin);
          CREATE INDEX IF NOT EXISTS idx_kommo_leads_status ON kommo_leads_snapshot(status);
          CREATE INDEX IF NOT EXISTS idx_kommo_leads_pipeline ON kommo_leads_snapshot(pipeline_id);
        `
      });
      
      if (createError) {
        console.error('❌ Erro ao criar tabela:', createError);
        return;
      }
      
      console.log('✅ Tabela criada com sucesso');
    } else {
      console.log('✅ Tabela kommo_leads_snapshot existe');
      
      // Verificar colunas
      const { data: columns, error: columnsError } = await client
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', 'kommo_leads_snapshot')
        .order('ordinal_position');
      
      if (columnsError) {
        console.error('❌ Erro ao verificar colunas:', columnsError);
        return;
      }
      
      console.log('📋 Colunas da tabela:');
      columns?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await app.close();
  }
}

checkTableSchema().catch(console.error);