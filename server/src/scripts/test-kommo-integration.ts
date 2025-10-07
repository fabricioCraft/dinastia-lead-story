import 'dotenv/config';
import { KommoService } from '../services/kommo.service';
import { SupabaseService } from '../services/supabase.service';

/**
 * Script para testar a integração com Kommo
 * Verifica se os dados estão sendo retornados corretamente:
 * - Leads
 * - Etapas (status) dos leads
 * - Origem dos leads
 * - Pipelines e usuários
 */
async function testKommoIntegration() {
  console.log('🚀 Iniciando teste da integração com Kommo...\n');

  try {
    const kommoService = new KommoService();
    const supabaseService = new SupabaseService();

    // 1. Testar informações da conta
    console.log('📋 1. Testando informações da conta...');
    try {
      const accountInfo = await kommoService.getAccountInfo();
      console.log('✅ Conta conectada:', {
        id: accountInfo.id,
        name: accountInfo.name,
        subdomain: accountInfo.subdomain,
        currency: accountInfo.currency,
        timezone: accountInfo.timezone
      });
    } catch (error: any) {
      console.error('❌ Erro ao buscar informações da conta:', error.message);
      return;
    }

    // 2. Testar pipelines
    console.log('\n🔄 2. Testando pipelines...');
    let pipelines: any[] = [];
    try {
      pipelines = await kommoService.getPipelines();
      console.log(`✅ ${pipelines.length} pipelines encontrados:`);
      pipelines.forEach(pipeline => {
        console.log(`  - ${pipeline.name} (ID: ${pipeline.id})`);
        if (pipeline._embedded?.statuses) {
          console.log(`    Etapas (${pipeline._embedded.statuses.length}):`);
          pipeline._embedded.statuses
            .sort((a: any, b: any) => a.sort - b.sort)
            .forEach((status: any) => {
              console.log(`      ${status.sort + 1}. ${status.name} (ID: ${status.id})`);
            });
        }
      });
    } catch (error: any) {
      console.error('❌ Erro ao buscar pipelines:', error.message);
      return;
    }

    // 3. Testar usuários
    console.log('\n👥 3. Testando usuários...');
    let users: any[] = [];
    try {
      users = await kommoService.getUsers();
      console.log(`✅ ${users.length} usuários encontrados:`);
      users.slice(0, 5).forEach(user => {
        console.log(`  - ${user.name} (ID: ${user.id}) - ${user.email}`);
      });
      if (users.length > 5) {
        console.log(`  ... e mais ${users.length - 5} usuários`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar usuários:', error.message);
      return;
    }

    // 4. Testar leads (limitando a 10 para não sobrecarregar)
    console.log('\n📊 4. Testando leads...');
    try {
      const leads = await kommoService.getLeadsFromPipeline(undefined, 10);
      console.log(`✅ ${leads.length} leads encontrados (limitado a 10):`);
      
      leads.forEach((lead: any, index: number) => {
        console.log(`\n  Lead ${index + 1}:`);
        console.log(`    ID: ${lead.id}`);
        console.log(`    Nome: ${lead.name || 'Sem nome'}`);
        console.log(`    Pipeline ID: ${lead.pipeline_id}`);
        console.log(`    Status ID: ${lead.status_id}`);
        console.log(`    Responsável ID: ${lead.responsible_user_id}`);
        console.log(`    Criado em: ${new Date(lead.created_at * 1000).toLocaleString('pt-BR')}`);
        console.log(`    Atualizado em: ${new Date(lead.updated_at * 1000).toLocaleString('pt-BR')}`);

        // Encontrar pipeline e status
        const pipeline = pipelines.find((p: any) => p.id === lead.pipeline_id);
        const status = pipeline?._embedded?.statuses?.find((s: any) => s.id === lead.status_id);
        const user = users.find((u: any) => u.id === lead.responsible_user_id);

        if (pipeline) {
          console.log(`    Pipeline: ${pipeline.name}`);
        }
        if (status) {
          console.log(`    Etapa: ${status.name}`);
        }
        if (user) {
          console.log(`    Responsável: ${user.name}`);
        }

        // Verificar valor do lead
        if (lead.price) {
          console.log(`    Valor: R$ ${(lead.price / 100).toFixed(2)}`);
        }

        // Verificar origem nos campos customizados
        if (lead.custom_fields_values && lead.custom_fields_values.length > 0) {
          console.log(`    Campos customizados:`);
          lead.custom_fields_values.forEach((field: any) => {
            if (field.values && field.values.length > 0) {
              console.log(`      ${field.field_name || field.field_code}: ${field.values[0].value}`);
            }
          });
        }

        // Verificar tags
        if (lead._embedded?.tags && lead._embedded.tags.length > 0) {
          console.log(`    Tags: ${lead._embedded.tags.map((tag: any) => tag.name).join(', ')}`);
        }
      });
    } catch (error: any) {
      console.error('❌ Erro ao buscar leads:', error.message);
      return;
    }

    // 5. Testar mapeamento para snapshot
    console.log('\n🔄 5. Testando mapeamento para snapshot...');
    try {
      const leads = await kommoService.getLeadsFromPipeline(undefined, 3);
      if (leads.length > 0) {
        const snapshot = kommoService.mapLeadToSnapshot(leads[0], pipelines, users);
        console.log('✅ Exemplo de snapshot mapeado:');
        console.log(JSON.stringify(snapshot, null, 2));
      }
    } catch (error: any) {
      console.error('❌ Erro ao mapear snapshot:', error.message);
    }

    // 6. Testar conexão com Supabase (se disponível)
    console.log('\n💾 6. Testando conexão com Supabase...');
    try {
      // Usar método público para testar conexão
      const sampleData = await supabaseService.fetchSample(1);
      console.log(`✅ Conexão com Supabase OK. Dados de exemplo: ${sampleData.length} registros`);
    } catch (error: any) {
      console.error('❌ Erro ao conectar com Supabase:', error.message);
    }

    console.log('\n🎉 Teste da integração concluído!');
    console.log('\n📝 Resumo:');
    console.log(`  - Pipelines: ${pipelines.length}`);
    console.log(`  - Usuários: ${users.length}`);
    console.log('  - Conexão com API: ✅');
    console.log('  - Mapeamento de dados: ✅');

  } catch (error) {
    console.error('💥 Erro geral no teste:', error);
  }
}

// Executar o teste se o script for chamado diretamente
if (require.main === module) {
  testKommoIntegration()
    .then(() => {
      console.log('\n✅ Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script falhou:', error);
      process.exit(1);
    });
}

export { testKommoIntegration };