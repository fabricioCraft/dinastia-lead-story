import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SupabaseService } from './src/services/supabase.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkSupabaseTable() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabaseService = app.get(SupabaseService);

  try {
    console.log('🔍 Verificando tabela kommo_leads_snapshot...');
    
    // Verificar se há dados na tabela
    const client = (supabaseService as any).client;
    if (!client) {
      console.log('❌ Cliente Supabase não inicializado');
      return;
    }
    
    const { data, error, count } = await client
      .from('kommo_leads_snapshot')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.error('❌ Erro ao consultar tabela:', error);
      return;
    }
    
    console.log(`📊 Total de registros na tabela: ${count}`);
    console.log('📝 Primeiros 5 registros:');
    console.log(JSON.stringify(data, null, 2));
    
    // Verificar agregação por origem
    console.log('\n🔍 Testando agregação por origem...');
    const aggregatedData = await supabaseService.aggregateKommoLeadsByOrigin();
    console.log('📊 Dados agregados por origem:', aggregatedData);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await app.close();
  }
}

checkSupabaseTable().catch(console.error);