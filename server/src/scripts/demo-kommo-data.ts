import 'dotenv/config';
import { KommoService } from '../services/kommo.service';

/**
 * Script de demonstração que simula dados do Kommo
 * Mostra como os dados seriam estruturados quando a integração estiver configurada
 */

// Dados simulados baseados na estrutura real do Kommo
const mockKommoData = {
  account: {
    id: 12345678,
    name: "Empresa Demo",
    subdomain: "empresa-demo",
    currency: "BRL",
    timezone: "America/Sao_Paulo"
  },
  
  pipelines: [
    {
      id: 1001,
      name: "Vendas Principal",
      sort: 1,
      is_main: true,
      is_unsorted_on: true,
      is_archive: false,
      account_id: 12345678,
      _embedded: {
        statuses: [
          {
            id: 10001,
            name: "Primeiro contato",
            sort: 1,
            is_editable: true,
            pipeline_id: 1001,
            color: "#99ccfd",
            type: 1,
            account_id: 12345678
          },
          {
            id: 10002,
            name: "Qualificação",
            sort: 2,
            is_editable: true,
            pipeline_id: 1001,
            color: "#fffd99",
            type: 1,
            account_id: 12345678
          },
          {
            id: 10003,
            name: "Proposta",
            sort: 3,
            is_editable: true,
            pipeline_id: 1001,
            color: "#ffcc99",
            type: 1,
            account_id: 12345678
          },
          {
            id: 142,
            name: "Fechado e ganho",
            sort: 4,
            is_editable: false,
            pipeline_id: 1001,
            color: "#ccffcc",
            type: 2,
            account_id: 12345678
          },
          {
            id: 143,
            name: "Fechado e perdido",
            sort: 5,
            is_editable: false,
            pipeline_id: 1001,
            color: "#ffcccc",
            type: 3,
            account_id: 12345678
          }
        ]
      }
    },
    {
      id: 1002,
      name: "Pós-venda",
      sort: 2,
      is_main: false,
      is_unsorted_on: false,
      is_archive: false,
      account_id: 12345678,
      _embedded: {
        statuses: [
          {
            id: 20001,
            name: "Onboarding",
            sort: 1,
            is_editable: true,
            pipeline_id: 1002,
            color: "#99ccfd",
            type: 1,
            account_id: 12345678
          },
          {
            id: 20002,
            name: "Acompanhamento",
            sort: 2,
            is_editable: true,
            pipeline_id: 1002,
            color: "#fffd99",
            type: 1,
            account_id: 12345678
          }
        ]
      }
    }
  ],

  users: [
    {
      id: 101,
      name: "João Silva",
      email: "joao@empresa.com",
      lang: "pt_BR",
      rights: {
        leads: "A",
        contacts: "A",
        companies: "A",
        tasks: "A",
        mail_access: true,
        catalog_access: true,
        status_rights: []
      }
    },
    {
      id: 102,
      name: "Maria Santos",
      email: "maria@empresa.com",
      lang: "pt_BR",
      rights: {
        leads: "A",
        contacts: "A",
        companies: "A",
        tasks: "A",
        mail_access: true,
        catalog_access: true,
        status_rights: []
      }
    }
  ],

  leads: [
    {
      id: 50001,
      name: "Lead - João da Silva",
      status_id: 10001,
      pipeline_id: 1001,
      responsible_user_id: 101,
      price: 150000, // R$ 1.500,00 (em centavos)
      created_at: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60), // 7 dias atrás
      updated_at: Math.floor(Date.now() / 1000) - (2 * 24 * 60 * 60), // 2 dias atrás
      custom_fields_values: [
        {
          field_id: 301,
          field_name: "Origem",
          field_code: "ORIGEM",
          field_type: "text",
          values: [
            {
              value: "Google Ads"
            }
          ]
        },
        {
          field_id: 302,
          field_name: "UTM Campaign",
          field_code: "UTM_CAMPAIGN",
          field_type: "text",
          values: [
            {
              value: "campanha-black-friday"
            }
          ]
        },
        {
          field_id: 303,
          field_name: "Telefone",
          field_code: "PHONE",
          field_type: "text",
          values: [
            {
              value: "(11) 99999-9999"
            }
          ]
        }
      ],
      _embedded: {
        tags: [
          {
            id: 401,
            name: "Hot Lead"
          },
          {
            id: 402,
            name: "Google Ads"
          }
        ]
      }
    },
    {
      id: 50002,
      name: "Lead - Maria Oliveira",
      status_id: 10002,
      pipeline_id: 1001,
      responsible_user_id: 102,
      price: 250000, // R$ 2.500,00
      created_at: Math.floor(Date.now() / 1000) - (5 * 24 * 60 * 60), // 5 dias atrás
      updated_at: Math.floor(Date.now() / 1000) - (1 * 24 * 60 * 60), // 1 dia atrás
      custom_fields_values: [
        {
          field_id: 301,
          field_name: "Origem",
          field_code: "ORIGEM",
          field_type: "text",
          values: [
            {
              value: "Facebook Ads"
            }
          ]
        },
        {
          field_id: 302,
          field_name: "UTM Campaign",
          field_code: "UTM_CAMPAIGN",
          field_type: "text",
          values: [
            {
              value: "campanha-natal"
            }
          ]
        }
      ],
      _embedded: {
        tags: [
          {
            id: 403,
            name: "Warm Lead"
          },
          {
            id: 404,
            name: "Facebook"
          }
        ]
      }
    },
    {
      id: 50003,
      name: "Lead - Carlos Pereira",
      status_id: 142, // Fechado e ganho
      pipeline_id: 1001,
      responsible_user_id: 101,
      price: 500000, // R$ 5.000,00
      created_at: Math.floor(Date.now() / 1000) - (15 * 24 * 60 * 60), // 15 dias atrás
      updated_at: Math.floor(Date.now() / 1000) - (3 * 24 * 60 * 60), // 3 dias atrás
      custom_fields_values: [
        {
          field_id: 301,
          field_name: "Origem",
          field_code: "ORIGEM",
          field_type: "text",
          values: [
            {
              value: "Indicação"
            }
          ]
        }
      ],
      _embedded: {
        tags: [
          {
            id: 405,
            name: "Cliente VIP"
          }
        ]
      }
    }
  ]
};

function demonstrateKommoData() {
  console.log('🎭 Demonstração de dados do Kommo (simulados)\n');
  console.log('Esta demonstração mostra como os dados apareceriam quando a integração estiver configurada.\n');

  // 1. Informações da conta
  console.log('📋 1. Informações da conta:');
  console.log(`✅ Conta: ${mockKommoData.account.name}`);
  console.log(`   ID: ${mockKommoData.account.id}`);
  console.log(`   Subdomínio: ${mockKommoData.account.subdomain}`);
  console.log(`   Moeda: ${mockKommoData.account.currency}`);
  console.log(`   Fuso horário: ${mockKommoData.account.timezone}`);

  // 2. Pipelines
  console.log(`\n🔄 2. Pipelines (${mockKommoData.pipelines.length}):`);
  mockKommoData.pipelines.forEach(pipeline => {
    console.log(`\n  📊 ${pipeline.name} (ID: ${pipeline.id})`);
    console.log(`     Principal: ${pipeline.is_main ? 'Sim' : 'Não'}`);
    console.log(`     Etapas (${pipeline._embedded?.statuses?.length || 0}):`);
    
    pipeline._embedded?.statuses?.forEach(status => {
      const statusType = status.type === 2 ? '🟢 Ganho' : status.type === 3 ? '🔴 Perdido' : '🔵 Em andamento';
      console.log(`       ${status.sort}. ${status.name} (${statusType})`);
    });
  });

  // 3. Usuários
  console.log(`\n👥 3. Usuários (${mockKommoData.users.length}):`);
  mockKommoData.users.forEach(user => {
    console.log(`  - ${user.name} (ID: ${user.id}) - ${user.email}`);
  });

  // 4. Leads
  console.log(`\n📊 4. Leads (${mockKommoData.leads.length}):`);
  mockKommoData.leads.forEach((lead, index) => {
    console.log(`\n  Lead ${index + 1}:`);
    console.log(`    ID: ${lead.id}`);
    console.log(`    Nome: ${lead.name}`);
    console.log(`    Valor: R$ ${(lead.price / 100).toFixed(2)}`);
    console.log(`    Criado: ${new Date(lead.created_at * 1000).toLocaleString('pt-BR')}`);
    console.log(`    Atualizado: ${new Date(lead.updated_at * 1000).toLocaleString('pt-BR')}`);

    // Encontrar pipeline e status
    const pipeline = mockKommoData.pipelines.find(p => p.id === lead.pipeline_id);
    const status = pipeline?._embedded?.statuses?.find(s => s.id === lead.status_id);
    const user = mockKommoData.users.find(u => u.id === lead.responsible_user_id);

    if (pipeline) {
      console.log(`    Pipeline: ${pipeline.name}`);
    }
    if (status) {
      const statusType = status.type === 2 ? '(Ganho)' : status.type === 3 ? '(Perdido)' : '(Em andamento)';
      console.log(`    Etapa: ${status.name} ${statusType}`);
    }
    if (user) {
      console.log(`    Responsável: ${user.name}`);
    }

    // Tempo na etapa atual (simulado)
    const tempoNaEtapa = Math.floor((Date.now() / 1000 - lead.updated_at) / (24 * 60 * 60));
    console.log(`    Tempo na etapa atual: ${tempoNaEtapa} dias`);

    // Origem
    const origemField = lead.custom_fields_values?.find(f => f.field_code === 'ORIGEM');
    if (origemField?.values?.[0]?.value) {
      console.log(`    Origem: ${origemField.values[0].value}`);
    }

    // UTM Campaign
    const utmField = lead.custom_fields_values?.find(f => f.field_code === 'UTM_CAMPAIGN');
    if (utmField?.values?.[0]?.value) {
      console.log(`    Campanha: ${utmField.values[0].value}`);
    }

    // Tags
    if (lead._embedded?.tags && lead._embedded.tags.length > 0) {
      console.log(`    Tags: ${lead._embedded.tags.map(tag => tag.name).join(', ')}`);
    }
  });

  // 5. Demonstrar mapeamento para snapshot
  console.log('\n🔄 5. Exemplo de mapeamento para snapshot:');
  try {
    const kommoService = new KommoService();
    const snapshot = kommoService.mapLeadToSnapshot(
      mockKommoData.leads[0] as any,
      mockKommoData.pipelines as any,
      mockKommoData.users as any
    );
    console.log('✅ Snapshot mapeado:');
    console.log(JSON.stringify(snapshot, null, 2));
  } catch (error: any) {
    console.log('⚠️  Mapeamento não disponível (configuração necessária)');
  }

  // 6. Análise dos dados
  console.log('\n📈 6. Análise dos dados:');
  
  const totalLeads = mockKommoData.leads.length;
  const leadsGanhos = mockKommoData.leads.filter(l => l.status_id === 142).length;
  const leadsPerdidos = mockKommoData.leads.filter(l => l.status_id === 143).length;
  const leadsEmAndamento = totalLeads - leadsGanhos - leadsPerdidos;
  
  const valorTotal = mockKommoData.leads.reduce((sum, lead) => sum + lead.price, 0);
  const valorGanho = mockKommoData.leads
    .filter(l => l.status_id === 142)
    .reduce((sum, lead) => sum + lead.price, 0);

  console.log(`  📊 Total de leads: ${totalLeads}`);
  console.log(`  🟢 Leads ganhos: ${leadsGanhos}`);
  console.log(`  🔴 Leads perdidos: ${leadsPerdidos}`);
  console.log(`  🔵 Leads em andamento: ${leadsEmAndamento}`);
  console.log(`  💰 Valor total: R$ ${(valorTotal / 100).toFixed(2)}`);
  console.log(`  💚 Valor ganho: R$ ${(valorGanho / 100).toFixed(2)}`);
  
  if (totalLeads > 0) {
    const taxaConversao = (leadsGanhos / totalLeads * 100).toFixed(1);
    console.log(`  📈 Taxa de conversão: ${taxaConversao}%`);
  }

  // Origens
  const origens = new Map<string, number>();
  mockKommoData.leads.forEach(lead => {
    const origemField = lead.custom_fields_values?.find(f => f.field_code === 'ORIGEM');
    const origem = origemField?.values?.[0]?.value || 'Não informado';
    origens.set(origem, (origens.get(origem) || 0) + 1);
  });

  console.log('\n  📍 Leads por origem:');
  Array.from(origens.entries()).forEach(([origem, count]) => {
    console.log(`    - ${origem}: ${count} leads`);
  });

  console.log('\n🎯 Próximos passos:');
  console.log('1. Configure as credenciais do Kommo no arquivo .env');
  console.log('2. Execute o teste real: npm run test:kommo');
  console.log('3. Configure a sincronização automática');
  console.log('4. Monitore os dados no dashboard');

  console.log('\n✨ Esta demonstração mostra o potencial da integração!');
}

// Executar se chamado diretamente
if (require.main === module) {
  demonstrateKommoData();
}

export { demonstrateKommoData, mockKommoData };