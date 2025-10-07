import 'dotenv/config';
import axios from 'axios';

interface KommoLead {
  id: number;
  name: string;
  price: number;
  status_id: number;
  pipeline_id: number;
  responsible_user_id: number;
  created_at: number;
  updated_at: number;
  custom_fields_values?: any[];
  _embedded?: {
    tags?: any[];
    companies?: any[];
    contacts?: any[];
  };
}

interface KommoPipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  _embedded?: {
    statuses?: Array<{
      id: number;
      name: string;
      sort: number;
      is_editable: boolean;
      pipeline_id: number;
      color: string;
    }>;
  };
}

interface KommoUser {
  id: number;
  name: string;
  email: string;
  lang: string;
  rights: any;
}

async function testKommoDirectly() {
  console.log('🚀 Teste direto da API do Kommo...\n');

  const subdomain = process.env.KOMMO_SUBDOMAIN;
  const accessToken = process.env.KOMMO_ACCESS_TOKEN;

  if (!subdomain || !accessToken) {
    console.log('❌ Configuração incompleta');
    return;
  }

  const baseURL = `https://${subdomain}.kommo.com/api/v4`;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. Informações da conta
    console.log('📋 1. Buscando informações da conta...');
    const accountResponse = await axios.get(`${baseURL}/account`, { headers });
    const account = accountResponse.data;
    
    console.log('✅ Conta encontrada:');
    console.log(`   Nome: ${account.name}`);
    console.log(`   ID: ${account.id}`);
    console.log(`   Subdomínio: ${account.subdomain}`);
    console.log(`   País: ${account.country}`);
    console.log(`   Moeda: ${account.currency}`);
    console.log('');

    // 2. Pipelines
    console.log('🔄 2. Buscando pipelines...');
    const pipelinesResponse = await axios.get(`${baseURL}/leads/pipelines`, { headers });
    const pipelines: KommoPipeline[] = Object.values(pipelinesResponse.data._embedded.pipelines);
    
    console.log(`✅ ${pipelines.length} pipeline(s) encontrado(s):`);
    pipelines.forEach(pipeline => {
      console.log(`   📊 ${pipeline.name} (ID: ${pipeline.id})`);
      if (pipeline._embedded?.statuses) {
        pipeline._embedded.statuses.forEach(status => {
          console.log(`      └─ ${status.name} (ID: ${status.id})`);
        });
      }
    });
    console.log('');

    // 3. Usuários
    console.log('👥 3. Buscando usuários...');
    const usersResponse = await axios.get(`${baseURL}/users`, { headers });
    const users: KommoUser[] = usersResponse.data._embedded.users;
    
    console.log(`✅ ${users.length} usuário(s) encontrado(s):`);
    users.forEach(user => {
      console.log(`   👤 ${user.name} (ID: ${user.id}) - ${user.email}`);
    });
    console.log('');

    // 4. Leads (limitado a 10)
    console.log('🎯 4. Buscando leads (últimos 10)...');
    const leadsResponse = await axios.get(`${baseURL}/leads?limit=10&with=contacts,companies,catalog_elements`, { headers });
    const leads: KommoLead[] = leadsResponse.data._embedded.leads;
    
    console.log(`✅ ${leads.length} lead(s) encontrado(s):`);
    
    leads.forEach((lead, index) => {
      const pipeline = pipelines.find(p => p.id === lead.pipeline_id);
      const status = pipeline?._embedded?.statuses?.find(s => s.id === lead.status_id);
      const responsible = users.find(u => u.id === lead.responsible_user_id);
      
      console.log(`\n   🎯 Lead ${index + 1}: ${lead.name}`);
      console.log(`      💰 Valor: R$ ${lead.price?.toLocaleString('pt-BR') || '0'}`);
      console.log(`      📊 Pipeline: ${pipeline?.name || 'Desconhecido'}`);
      console.log(`      📍 Etapa: ${status?.name || 'Desconhecida'}`);
      console.log(`      👤 Responsável: ${responsible?.name || 'Desconhecido'}`);
      console.log(`      📅 Criado: ${new Date(lead.created_at * 1000).toLocaleDateString('pt-BR')}`);
      console.log(`      🔄 Atualizado: ${new Date(lead.updated_at * 1000).toLocaleDateString('pt-BR')}`);
      
      // Campos customizados
      if (lead.custom_fields_values && lead.custom_fields_values.length > 0) {
        console.log(`      🏷️  Campos customizados:`);
        lead.custom_fields_values.forEach(field => {
          if (field.values && field.values.length > 0) {
            console.log(`         - Campo ${field.field_id}: ${field.values[0].value}`);
          }
        });
      }
      
      // Tags
      if (lead._embedded?.tags && lead._embedded.tags.length > 0) {
        const tagNames = lead._embedded.tags.map((tag: any) => tag.name).join(', ');
        console.log(`      🏷️  Tags: ${tagNames}`);
      }
    });

    // 5. Análise dos dados
    console.log('\n📊 5. Análise dos dados:');
    const totalValue = leads.reduce((sum, lead) => sum + (lead.price || 0), 0);
    const leadsWithValue = leads.filter(lead => lead.price > 0);
    
    console.log(`   📈 Total de leads: ${leads.length}`);
    console.log(`   💰 Valor total: R$ ${totalValue.toLocaleString('pt-BR')}`);
    console.log(`   💵 Valor médio: R$ ${leadsWithValue.length > 0 ? (totalValue / leadsWithValue.length).toLocaleString('pt-BR') : '0'}`);
    
    // Distribuição por pipeline
    const pipelineDistribution = leads.reduce((acc, lead) => {
      const pipelineName = pipelines.find(p => p.id === lead.pipeline_id)?.name || 'Desconhecido';
      acc[pipelineName] = (acc[pipelineName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n   📊 Distribuição por pipeline:');
    Object.entries(pipelineDistribution).forEach(([pipeline, count]) => {
      console.log(`      ${pipeline}: ${count} lead(s)`);
    });

    // Distribuição por responsável
    const userDistribution = leads.reduce((acc, lead) => {
      const userName = users.find(u => u.id === lead.responsible_user_id)?.name || 'Desconhecido';
      acc[userName] = (acc[userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n   👥 Distribuição por responsável:');
    Object.entries(userDistribution).forEach(([user, count]) => {
      console.log(`      ${user}: ${count} lead(s)`);
    });

    console.log('\n🎉 Teste concluído com sucesso!');
    console.log('\n💡 A integração está funcionando perfeitamente!');
    console.log('   ✅ Conexão com API estabelecida');
    console.log('   ✅ Dados de conta, pipelines e usuários obtidos');
    console.log('   ✅ Leads com informações completas');
    console.log('   ✅ Campos customizados e tags disponíveis');

  } catch (error: any) {
    console.log('❌ Erro durante o teste:');
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Erro: ${error.response.data?.title || error.response.statusText}`);
      if (error.response.data?.detail) {
        console.log(`   Detalhe: ${error.response.data.detail}`);
      }
    } else {
      console.log(`   Erro: ${error.message}`);
    }
  }
}

testKommoDirectly().catch(console.error);