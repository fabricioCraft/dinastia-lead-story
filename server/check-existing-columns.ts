import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SupabaseService } from './src/services/supabase.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkExistingColumns() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabaseService = app.get(SupabaseService);

  try {
    console.log('🔍 Verificando colunas existentes na tabela kommo_leads_snapshot...');
    
    const client = (supabaseService as any).client;
    if (!client) {
      console.log('❌ Cliente Supabase não inicializado');
      return;
    }
    
    // Tentar inserir um registro mínimo para descobrir quais colunas existem
    console.log('📋 Testando inserção com campos mínimos...');
    
    // Teste 1: Apenas lead_id
    let { error } = await client
      .from('kommo_leads_snapshot')
      .insert([{ lead_id: 'test_minimal' }]);
    
    if (error) {
      console.log('❌ Erro com lead_id apenas:', error.message);
    } else {
      console.log('✅ lead_id aceito');
      await client.from('kommo_leads_snapshot').delete().eq('lead_id', 'test_minimal');
    }
    
    // Teste 2: Campos básicos
    ({ error } = await client
      .from('kommo_leads_snapshot')
      .insert([{ 
        lead_id: 'test_basic',
        name: 'Test',
        status: 'New'
      }]));
    
    if (error) {
      console.log('❌ Erro com campos básicos:', error.message);
    } else {
      console.log('✅ Campos básicos aceitos');
      await client.from('kommo_leads_snapshot').delete().eq('lead_id', 'test_basic');
    }
    
    // Teste 3: Tentar descobrir o schema fazendo um select com erro proposital
    console.log('\n📋 Tentando descobrir schema...');
    const { data, error: selectError } = await client
      .from('kommo_leads_snapshot')
      .select('*')
      .limit(0);
    
    if (selectError) {
      console.log('❌ Erro no select:', selectError.message);
    } else {
      console.log('✅ Select funcionou, mas sem dados para ver colunas');
    }
    
    // Teste 4: Tentar inserir com diferentes combinações de campos
    const testFields = [
      'lead_id',
      'name', 
      'status',
      'pipeline_id',
      'stage_id',
      'origin',
      'created_at',
      'updated_at',
      'last_updated_at'
    ];
    
    console.log('\n🧪 Testando campos individuais...');
    for (const field of testFields) {
      const testData = { lead_id: `test_${field}` };
      if (field !== 'lead_id') {
        (testData as any)[field] = field.includes('_at') ? new Date().toISOString() : 'test_value';
      }
      
      const { error: fieldError } = await client
        .from('kommo_leads_snapshot')
        .insert([testData]);
      
      if (fieldError) {
        console.log(`❌ ${field}: ${fieldError.message}`);
      } else {
        console.log(`✅ ${field}: aceito`);
        await client.from('kommo_leads_snapshot').delete().eq('lead_id', `test_${field}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await app.close();
  }
}

checkExistingColumns().catch(console.error);