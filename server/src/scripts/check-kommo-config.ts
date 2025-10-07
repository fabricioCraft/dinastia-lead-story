import 'dotenv/config';

/**
 * Script para verificar a configuração do Kommo
 * Mostra quais variáveis de ambiente precisam ser configuradas
 */

function checkKommoConfig() {
  console.log('🔍 Verificando configuração do Kommo...\n');

  const requiredVars = [
    'KOMMO_CLIENT_ID',
    'KOMMO_CLIENT_SECRET', 
    'KOMMO_REDIRECT_URI',
    'KOMMO_SUBDOMAIN',
    'KOMMO_ACCESS_TOKEN',
    'KOMMO_REFRESH_TOKEN'
  ];

  const missingVars: string[] = [];
  const exampleVars: string[] = [];

  console.log('📋 Status das variáveis de ambiente:\n');

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    
    if (!value) {
      console.log(`❌ ${varName}: Não definida`);
      missingVars.push(varName);
    } else if (value.includes('your_') || value.includes('your-domain')) {
      console.log(`⚠️  ${varName}: Valor de exemplo (${value})`);
      exampleVars.push(varName);
    } else {
      console.log(`✅ ${varName}: Configurada`);
    }
  });

  console.log('\n📝 Instruções para configuração:\n');

  if (missingVars.length > 0 || exampleVars.length > 0) {
    console.log('Para configurar a integração com Kommo, você precisa:');
    console.log('');
    console.log('1. 🏢 Acessar sua conta Kommo (ex: https://seusubdominio.amocrm.ru)');
    console.log('2. 🔧 Ir em Configurações > Integrações > API');
    console.log('3. 📱 Criar uma nova integração/aplicação');
    console.log('4. 📋 Copiar as credenciais geradas');
    console.log('5. 🔑 Configurar as variáveis no arquivo .env:');
    console.log('');

    if (missingVars.includes('KOMMO_SUBDOMAIN') || exampleVars.includes('KOMMO_SUBDOMAIN')) {
      console.log('   KOMMO_SUBDOMAIN=seusubdominio');
      console.log('   (ex: se sua URL é https://empresa.amocrm.ru, use "empresa")');
      console.log('');
    }

    if (missingVars.includes('KOMMO_CLIENT_ID') || exampleVars.includes('KOMMO_CLIENT_ID')) {
      console.log('   KOMMO_CLIENT_ID=seu_client_id_aqui');
      console.log('   (obtido na página de integrações do Kommo)');
      console.log('');
    }

    if (missingVars.includes('KOMMO_CLIENT_SECRET') || exampleVars.includes('KOMMO_CLIENT_SECRET')) {
      console.log('   KOMMO_CLIENT_SECRET=seu_client_secret_aqui');
      console.log('   (obtido na página de integrações do Kommo)');
      console.log('');
    }

    if (missingVars.includes('KOMMO_REDIRECT_URI') || exampleVars.includes('KOMMO_REDIRECT_URI')) {
      console.log('   KOMMO_REDIRECT_URI=https://seudominio.com/oauth/callback');
      console.log('   (URL de callback configurada na integração)');
      console.log('');
    }

    if (missingVars.includes('KOMMO_ACCESS_TOKEN') || exampleVars.includes('KOMMO_ACCESS_TOKEN')) {
      console.log('   KOMMO_ACCESS_TOKEN=seu_access_token_aqui');
      console.log('   (obtido através do fluxo OAuth2)');
      console.log('');
    }

    if (missingVars.includes('KOMMO_REFRESH_TOKEN') || exampleVars.includes('KOMMO_REFRESH_TOKEN')) {
      console.log('   KOMMO_REFRESH_TOKEN=seu_refresh_token_aqui');
      console.log('   (obtido junto com o access token)');
      console.log('');
    }

    console.log('6. 🔄 Reiniciar o servidor após configurar as variáveis');
    console.log('');
    console.log('📚 Documentação oficial: https://www.amocrm.ru/developers/content/oauth/step-by-step');
    console.log('');

    if (exampleVars.length > 0) {
      console.log('⚠️  Variáveis com valores de exemplo detectadas:');
      exampleVars.forEach(varName => {
        console.log(`   - ${varName}`);
      });
      console.log('');
    }

    if (missingVars.length > 0) {
      console.log('❌ Variáveis não definidas:');
      missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
      });
      console.log('');
    }

    console.log('🚨 A integração não funcionará até que todas as variáveis sejam configuradas corretamente.');
  } else {
    console.log('✅ Todas as variáveis estão configuradas!');
    console.log('');
    console.log('🧪 Agora você pode executar o teste de integração:');
    console.log('   npm run test:kommo');
    console.log('');
    console.log('🔄 Ou executar a sincronização:');
    console.log('   npm run sync:kommo');
  }

  console.log('\n' + '='.repeat(60));
  
  // Verificar também Supabase
  console.log('\n🗄️  Verificando configuração do Supabase...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  
  if (!supabaseUrl) {
    console.log('❌ SUPABASE_URL: Não definida');
  } else {
    console.log(`✅ SUPABASE_URL: ${supabaseUrl}`);
  }
  
  if (!supabaseKey) {
    console.log('❌ SUPABASE_ANON_KEY/SUPABASE_KEY: Não definida');
  } else {
    console.log('✅ SUPABASE_ANON_KEY: Configurada');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  checkKommoConfig();
}

export { checkKommoConfig };