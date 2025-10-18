import { Controller, Get, Logger } from '@nestjs/common';
import { N8nService } from '../services/n8n.service';
import { DashboardPersistenceService } from '../services/dashboard-persistence.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly n8nService: N8nService,
    private readonly dashboardService: DashboardPersistenceService,
  ) {}

  /**
   * Endpoint de health check básico da aplicação
   */
  @Get()
  async getHealth(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    environment: string;
    version: string;
  }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  /**
   * Health check detalhado incluindo serviços externos
   */
  @Get('detailed')
  async getDetailedHealth() {
    try {
      const [n8nHealth, dbHealth] = await Promise.allSettled([
        this.n8nService.healthCheck(),
        this.dashboardService.checkTableHealth(),
      ]);

      const result = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        services: {
          n8n: {
            status: n8nHealth.status === 'fulfilled' && n8nHealth.value ? 'ok' : 'error',
            details: n8nHealth.status === 'rejected' ? n8nHealth.reason?.message : null,
          },
          database: {
            status: dbHealth.status === 'fulfilled' && dbHealth.value.healthy ? 'ok' : 'error',
            details: dbHealth.status === 'fulfilled' ? dbHealth.value.error : dbHealth.reason?.message,
          },
        },
      };

      // Se algum serviço estiver com problema, marcar status geral como degraded
      const hasErrors = Object.values(result.services).some(service => service.status === 'error');
      if (hasErrors) {
        result.status = 'degraded';
      }

      return result;
    } catch (error) {
      this.logger.error('Erro durante health check detalhado:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        error: error.message,
      };
    }
  }

  /**
   * Health check simples para load balancers
   */
  @Get('ping')
  async ping(): Promise<{ message: string; timestamp: string }> {
    return {
      message: 'pong',
      timestamp: new Date().toISOString(),
    };
  }
}