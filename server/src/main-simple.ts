import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class SimpleAppModule {}

async function bootstrap() {
  try {
    console.log('🚀 Iniciando aplicação NestJS simplificada...');
    
    const app = await NestFactory.create(SimpleAppModule);
    
    console.log('✅ Aplicação criada com sucesso');
    
    app.enableCors();
    console.log('✅ CORS habilitado');
    
    app.setGlobalPrefix('api');
    console.log('✅ Prefixo global definido');
    
    const port = process.env.PORT || 3001;
    console.log(`🔧 Tentando iniciar na porta ${port}...`);
    
    await app.listen(port);
    console.log(`🎉 Servidor NestJS iniciado com sucesso na porta ${port}`);
    console.log(`🌐 Acesse: http://localhost:${port}/api`);
    
  } catch (error) {
    console.error('❌ ERRO FATAL DURANTE O BOOTSTRAP:');
    console.error('Tipo do erro:', typeof error);
    console.error('Nome do erro:', error?.constructor?.name);
    console.error('Mensagem:', error?.message);
    console.error('Stack trace:', error?.stack);
    console.error('Erro completo:', error);
    process.exit(1);
  }
}

bootstrap();