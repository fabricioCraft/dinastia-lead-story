import * as dotenv from 'dotenv';
import { KommoService } from '../services/kommo.service';
import { SupabaseService } from '../services/supabase.service';
import { KommoSyncWorker } from '../services/kommo-sync.worker';

// Carregar variáveis de ambiente
dotenv.config();

/**
 * Script para executar sincronização completa do Kommo
 * Popula a tabela kommo_leads_snapshot com todos os leads
 */
async function syncKommoFull() {
  console.log('🚀 Iniciando sincronização completa do Kommo...\n');

  try {
    // Inicializar serviços
    const kommoService = new KommoService();
    const supabaseService = new SupabaseService();
    const syncWorker = new KommoSyncWorker(kommoService, supabaseService);

    // Executar sincronização completa
    console.log('📊 Executando sincronização completa...');
    const result = await syncWorker.fullSync();

    if (result.success) {
      console.log('✅ Sincronização completa realizada com sucesso!');
      console.log(`📈 ${result.message}`);
      
      // Verificar dados sincronizados
      console.log('\n🔍 Verificando dados sincronizados...');
      const origins = await supabaseService.aggregateKommoLeadsByOrigin();
      console.log(`📊 Total de origens encontradas: ${origins.length}`);
      
      if (origins.length > 0) {
        console.log('\n📋 Resumo por origem:');
        origins.forEach(origin => {
          console.log(`   ${origin.origin}: ${origin.count} leads`);
        });
      }
      
    } else {
      console.log('❌ Erro na sincronização:');
      console.log(`   ${result.message}`);
    }

  } catch (error) {
    console.error('❌ Erro durante a sincronização:', error.message);
  }

  console.log('\n✅ Script finalizado');
}

// Executar se chamado diretamente
if (require.main === module) {
  syncKommoFull().catch(console.error);
}

export { syncKommoFull };