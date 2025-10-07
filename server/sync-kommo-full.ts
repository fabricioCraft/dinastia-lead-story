import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { KommoSyncWorker } from './src/services/kommo-sync.worker';
import { SupabaseService } from './src/services/supabase.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function syncKommoFull() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const kommoSyncWorker = app.get(KommoSyncWorker);
  const supabaseService = app.get(SupabaseService);

  try {
    console.log('🚀 Iniciando sincronização completa do Kommo...');
    const startTime = Date.now();
    
    await kommoSyncWorker.fullSync();
    
    const endTime = Date.now();
    console.log(`✅ Sincronização completa em ${endTime - startTime}ms`);
    
    // Verificar dados agregados
    console.log('📊 Verificando dados agregados por origem...');
    const aggregatedData = await supabaseService.aggregateKommoLeadsByOrigin();
    console.log('Dados por origem:', aggregatedData);
    
  } catch (error) {
    console.error('❌ Erro durante a sincronização:', error);
  } finally {
    await app.close();
  }
}

syncKommoFull().catch(console.error);