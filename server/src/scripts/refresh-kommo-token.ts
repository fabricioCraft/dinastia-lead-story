import 'dotenv/config';
import axios from 'axios';

async function refreshKommoToken() {
  console.log('🔄 Tentando renovar token do Kommo...\n');

  const clientId = process.env.KOMMO_CLIENT_ID;
  const clientSecret = process.env.KOMMO_CLIENT_SECRET;
  const subdomain = process.env.KOMMO_SUBDOMAIN;
  const currentAccessToken = process.env.KOMMO_ACCESS_TOKEN;

  console.log('📋 Configuração atual:');
  console.log(`   Client ID: ${clientId}`);
  console.log(`   Subdomain: ${subdomain}`);
  console.log(`   Access Token: ${currentAccessToken ? 'Configurado' : 'Não configurado'}`);
  console.log('');

  if (!clientId || !clientSecret || !subdomain) {
    console.log('❌ Credenciais básicas não configuradas');
    return;
  }

  // Primeiro, vamos tentar fazer uma requisição simples para ver se o token atual funciona
  try {
    console.log('🧪 Testando token atual...');
    const response = await axios.get(`https://${subdomain}.kommo.com/api/v4/account`, {
      headers: {
        'Authorization': `Bearer ${currentAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Token atual está funcionando!');
    console.log('📊 Informações da conta:');
    console.log(`   Nome: ${response.data.name}`);
    console.log(`   ID: ${response.data.id}`);
    console.log(`   Subdomínio: ${response.data.subdomain}`);
    console.log('');
    
    return response.data;
  } catch (error: any) {
    console.log('❌ Token atual não está funcionando');
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Erro: ${error.response.data?.title || error.response.statusText}`);
      
      if (error.response.status === 401) {
        console.log('');
        console.log('🔑 Token expirado. Para renovar, você precisa:');
        console.log('');
        console.log('1. 🌐 Acessar: https://www.kommo.com/oauth/authorize');
        console.log(`   ?client_id=${clientId}`);
        console.log('   &response_type=code');
        console.log('   &redirect_uri=https://example.com/callback');
        console.log('   &scope=crm');
        console.log('');
        console.log('2. 📋 Autorizar a aplicação e copiar o código da URL');
        console.log('3. 🔄 Trocar o código por um novo token');
        console.log('');
        console.log('📚 Documentação: https://www.amocrm.ru/developers/content/oauth/step-by-step');
      }
    } else {
      console.log(`   Erro de rede: ${error.message}`);
    }
  }

  console.log('');
  console.log('💡 Dicas para resolver:');
  console.log('');
  console.log('1. 🔧 Verifique se a integração está ativa no Kommo');
  console.log('2. 🔑 Gere um novo access token no painel do Kommo');
  console.log('3. 📝 Atualize o .env com o novo token');
  console.log('4. 🔄 Execute este script novamente');
}

refreshKommoToken().catch(console.error);