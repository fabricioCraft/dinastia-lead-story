import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

console.log('🔍 Debug das variáveis de ambiente:');
console.log('');

console.log('KOMMO_SUBDOMAIN:', process.env.KOMMO_SUBDOMAIN);
console.log('KOMMO_CLIENT_ID:', process.env.KOMMO_CLIENT_ID);
console.log('KOMMO_ACCESS_TOKEN:', process.env.KOMMO_ACCESS_TOKEN ? 'Configurado' : 'Não configurado');

console.log('');
console.log('URL que seria construída:', `https://${process.env.KOMMO_SUBDOMAIN}.kommo.com/api/v4`);