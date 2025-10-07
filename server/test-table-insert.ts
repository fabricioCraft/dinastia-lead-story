import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SupabaseService } from './src/services/supabase.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function testTableInsert() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabaseService = app.get(SupabaseService);

  try {
    console.log('🧪 Testando inserção na tabela kommo_leads_snapshot...');
    
    const client = (supabaseService as any).client;
    if (!client) {
      console.log('❌ Cliente Supabase não inicializado');
      return;
    }
    
    // Teste 1: Verificar se a tabela existe tentando fazer um select
    console.log('📋 Verificando se a tabela existe...');
    const { data: existingData, error: selectError } = await client
      .from('kommo_leads_snapshot')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.log('❌ Tabela não existe ou erro:', selectError.message);
      
      // Tentar criar a tabela usando SQL direto
      console.log('📋 Tentando criar a tabela...');
      const { error: createError } = await client
        .from('kommo_leads_snapshot')
        .insert([{
          lead_id: 'test_123',
          status: 'test_status',
          last_updated_at: new Date().toISOString()
        }]);
      
      if (createError) {
        console.log('❌ Erro ao inserir teste:', createError.message);
        console.log('Detalhes do erro:', createError);
      } else {
        console.log('✅ Inserção de teste bem-sucedida');
        
        // Limpar o registro de teste
        await client
          .from('kommo_leads_snapshot')
          .delete()
          .eq('lead_id', 'test_123');
      }
    } else {
      console.log('✅ Tabela existe e é acessível');
      console.log(`📊 Registros existentes: ${existingData?.length || 0}`);
    }
    
    // Teste 2: Tentar inserir um registro completo como o que seria gerado pelo mapeamento
    console.log('\n🧪 Testando inserção de registro completo...');
    const testRecord = {
      lead_id: 'test_full_123',
      name: 'Test Lead',
      status: 'New',
      pipeline_id: '1',
      pipeline_name: 'Sales Pipeline',
      stage_id: '1',
      stage_name: 'New Lead',
      responsible_user_id: '1',
      responsible_user_name: 'Test User',
      last_updated_at: new Date().toISOString(),
      origin: 'Website'
    };
    
    const { error: insertError } = await client
      .from('kommo_leads_snapshot')
      .insert([testRecord]);
    
    if (insertError) {
      console.log('❌ Erro ao inserir registro completo:', insertError.message);
      console.log('Detalhes:', insertError);
    } else {
      console.log('✅ Inserção de registro completo bem-sucedida');
      
      // Testar agregação
      console.log('📊 Testando agregação por origem...');
      const aggregatedData = await supabaseService.aggregateKommoLeadsByOrigin();
      console.log('Dados agregados:', aggregatedData);
      
      // Limpar o registro de teste
      await client
        .from('kommo_leads_snapshot')
        .delete()
        .eq('lead_id', 'test_full_123');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await app.close();
  }
}

testTableInsert().catch(console.error);