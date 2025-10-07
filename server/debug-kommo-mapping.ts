import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KommoService } from './src/services/kommo.service';
import { SupabaseService } from './src/services/supabase.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function debugKommoMapping() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const kommoService = app.get(KommoService);
  const supabaseService = app.get(SupabaseService);

  try {
    console.log('🔍 Iniciando debug do mapeamento do Kommo...');
    
    // Buscar pipelines e usuários
    console.log('📋 Buscando pipelines...');
    const pipelines = await kommoService.getPipelines();
    console.log(`✅ Encontrados ${pipelines.length} pipelines`);
    
    console.log('👥 Buscando usuários...');
    const users = await kommoService.getUsers();
    console.log(`✅ Encontrados ${users.length} usuários`);
    
    // Buscar apenas os primeiros 5 leads para debug
    console.log('📊 Buscando primeiros 5 leads...');
    const leads = await kommoService.getLeadsFromPipeline(undefined, 5);
    console.log(`✅ Encontrados ${leads.length} leads para debug`);
    
    if (leads.length === 0) {
      console.log('❌ Nenhum lead encontrado');
      return;
    }
    
    // Mapear os leads
    console.log('🔄 Mapeando leads...');
    const mappedLeads = leads.map(lead => {
      console.log(`\n📝 Mapeando lead ${lead.id}:`);
      console.log(`  - Nome: ${lead.name}`);
      console.log(`  - Pipeline ID: ${lead.pipeline_id}`);
      console.log(`  - Status ID: ${lead.status_id}`);
      console.log(`  - Custom Fields:`, lead.custom_fields_values?.length || 0);
      
      const mapped = kommoService.mapLeadToSnapshot(lead, pipelines, users);
      console.log(`  - Origem mapeada: ${mapped.origin || 'N/A'}`);
      console.log(`  - Status mapeado: ${mapped.status}`);
      
      return mapped;
    });
    
    console.log(`\n✅ ${mappedLeads.length} leads mapeados com sucesso`);
    
    // Tentar inserir no Supabase
    console.log('💾 Tentando inserir no Supabase...');
    const insertedCount = await supabaseService.upsertKommoLeadsSnapshot(mappedLeads);
    console.log(`✅ ${insertedCount} leads inseridos no Supabase`);
    
    // Verificar dados na tabela
    console.log('🔍 Verificando dados na tabela...');
    const aggregatedData = await supabaseService.aggregateKommoLeadsByOrigin();
    console.log('📊 Dados agregados por origem:', aggregatedData);
    
  } catch (error) {
    console.error('❌ Erro durante o debug:', error);
  } finally {
    await app.close();
  }
}

debugKommoMapping().catch(console.error);