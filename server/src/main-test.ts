import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    console.log('🚀 Iniciando o bootstrap da aplicação NestJS...');
    console.log('📋 Variáveis de ambiente carregadas:');
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
    console.log(`   - PORT: ${process.env.PORT || 'não definido (usando 3001)'}`);
    console.log(`   - SUPABASE_URL: ${process.env.SUPABASE_URL ? 'definido' : 'não definido'}`);
    console.log(`   - SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'definido' : 'não definido'}`);
    
    console.log('🔧 Criando instância da aplicação NestJS...');
    const app = await NestFactory.create(AppModule);
    
    console.log('📝 Configurando logger da aplicação...');
    app.useLogger(console);
    
    console.log('🌐 Habilitando CORS...');
    // Enable CORS so the frontend (different origin) can access the backend API
    app.enableCors({ origin: true });
    
    console.log('🔗 Configurando prefixo global da API...');
    // Set global prefix for all routes
    app.setGlobalPrefix('api');
    
    const port = process.env.PORT ? Number(process.env.PORT) : 3001;
    console.log(`🎯 Tentando iniciar servidor na porta ${port}...`);
    
    await app.listen(port);
    console.log(`✅ Servidor NestJS iniciado com sucesso e escutando na porta ${port}`);
    console.log(`🌍 Acesse: http://localhost:${port}/api`);

  } catch (error) {
    console.error('❌ ERRO FATAL DURANTE O BOOTSTRAP:');
    console.error('📍 Tipo do erro:', error.constructor.name);
    console.error('💬 Mensagem:', error.message);
    console.error('📚 Stack trace completo:');
    console.error(error.stack);
    
    if (error.code) {
      console.error('🔢 Código do erro:', error.code);
    }
    
    console.error('🔍 Informações adicionais do erro:', error);
    
    console.error('💀 Encerrando processo com código de erro...');
    process.exit(1); // Encerra o processo com um código de erro
  }
}

bootstrap();