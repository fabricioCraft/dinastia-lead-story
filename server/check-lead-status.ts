import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { SupabaseService } from './src/services/supabase.service';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkLeadStatus() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabaseService = app.get(SupabaseService);

  try {
    console.log('🔍 Verificando status dos leads na tabela kommo_leads_snapshot...');
    
    // Consultar todos os status únicos e suas contagens
    const client = (supabaseService as any).client;
    if (!client) {
      console.error('❌ Cliente Supabase não inicializado');
      return;
    }

    const { data, error } = await client
      .from('kommo_leads_snapshot')
      .select('status')
      .not('status', 'is', null);

    if (error) {
      console.error('❌ Erro ao consultar status:', error.message);
      return;
    }

    // Agregar status manualmente
    const statusCounts = new Map<string, number>();
    for (const row of data || []) {
      const status = row.status;
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }

    // Ordenar por contagem (maior para menor)
    const sortedStatus = Array.from(statusCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    console.log('\n📊 Status dos leads (ordenados por quantidade):');
    console.log('='.repeat(50));
    
    let totalLeads = 0;
    sortedStatus.forEach(([status, count]) => {
      totalLeads += count;
      console.log(`${status.padEnd(30)} | ${count.toString().padStart(6)} leads`);
    });

    console.log('='.repeat(50));
    console.log(`Total de leads: ${totalLeads}`);

    console.log('\n🎯 Análise dos status:');
    console.log('Status que podem indicar leads ATIVOS (em andamento):');
    sortedStatus.forEach(([status, count]) => {
      const statusLower = status.toLowerCase();
      const isActive = !statusLower.includes('perdido') && 
                      !statusLower.includes('cancelado') && 
                      !statusLower.includes('recusado') && 
                      !statusLower.includes('rejeitado') &&
                      !statusLower.includes('descartado') &&
                      !statusLower.includes('arquivado') &&
                      !statusLower.includes('finalizado') &&
                      !statusLower.includes('concluído');
      
      if (isActive) {
        console.log(`✅ ${status} (${count} leads) - ATIVO`);
      } else {
        console.log(`❌ ${status} (${count} leads) - INATIVO`);
      }
    });

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await app.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkLeadStatus();
}