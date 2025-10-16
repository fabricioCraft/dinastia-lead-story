import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class N8nService {
  private readonly logger = new Logger(N8nService.name);
  private readonly webhookUrl: string;
  private readonly authKey: string;
  private readonly fallbackWebhookUrl: string;

  constructor(private configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL') || '';
    this.authKey = this.configService.get<string>('N8N_AUTHORIZATION_KEY') || '';
    this.fallbackWebhookUrl = 'https://n8n.dinastia.uk/webhook/b124142-affa124142-mnkjwqyr612874f';
  }

  /**
   * Busca dados diretamente do webhook N8N via GET com sistema de fallback
   */
  async fetchWebhookData(): Promise<any> {
    // Primeiro, tenta o webhook principal
    try {
      this.logger.log(`Buscando dados do webhook N8N principal: ${this.webhookUrl}`);
      
      const headers: any = {
        'Accept': 'application/json'
      };

      if (this.authKey) {
        headers['Authorization'] = this.authKey;
      }

      const response = await axios.get(this.webhookUrl, {
        timeout: 30000, // 30 segundos
        headers
      });

      this.logger.log('Dados do webhook N8N principal obtidos com sucesso');
      return response.data;
    } catch (primaryError) {
      this.logger.warn(`Webhook principal falhou: ${primaryError.message}. Tentando fallback...`);
      
      // Tenta o webhook de fallback
      try {
        this.logger.log(`Buscando dados do webhook N8N fallback: ${this.fallbackWebhookUrl}`);
        
        const headers: any = {
          'Accept': 'application/json'
        };

        if (this.authKey) {
          headers['Authorization'] = this.authKey; // Sem Bearer para o webhook antigo
        }

        const response = await axios.get(this.fallbackWebhookUrl, {
          timeout: 30000,
          headers
        });

        this.logger.log('Dados do webhook N8N fallback obtidos com sucesso');
        return response.data;
      } catch (fallbackError) {
        this.logger.error(`Ambos os webhooks falharam. Principal: ${primaryError.message}, Fallback: ${fallbackError.message}`);
        
        // Retorna dados mock para desenvolvimento
        this.logger.warn('Retornando dados mock para manter a aplicação funcionando');
        return this.getMockData();
      }
    }
  }

  /**
   * Retorna dados mock para desenvolvimento quando os webhooks estão indisponíveis
   */
  public getMockData(): any {
    return {
      fallback: true,
      message: 'Dados mock - webhooks N8N indisponíveis',
      timestamp: new Date().toISOString(),
      data: {
        summary: {
          totalLeads: 19328,
          convertedLeads: 5798,
          conversionRate: 30.0,
          totalRevenue: 14496000.00
        },
        origins: [
          { name: 'YT-TVFA|OFIR-PER25|VENDA|FASE01|PQ', leads: 7731, converted: 2319, revenue: 5798400.00 },
          { name: 'FB-LEAD|DINASTIA-2025|CONV|TESTE|A', leads: 5799, converted: 1740, revenue: 4349200.00 },
          { name: 'IG-STORY|AGENDAMENTO|PROMO|JAN25|B', leads: 3865, converted: 1160, revenue: 2898000.00 },
          { name: 'GOOGLE-SEARCH|DINASTIA|BRAND|2025|C', leads: 1933, converted: 579, revenue: 1450400.00 }
        ],
        timeline: [
          { date: '2025-01-01', leads: 3220, converted: 966 },
          { date: '2025-01-02', leads: 3865, converted: 1160 },
          { date: '2025-01-03', leads: 3607, converted: 1082 },
          { date: '2025-01-04', leads: 4510, converted: 1353 },
          { date: '2025-01-05', leads: 4126, converted: 1237 }
        ]
      }
    };
  }



  /**
   * Verifica se pelo menos um webhook está acessível
   * @returns Promise<boolean> indicando se algum webhook está funcionando
   */
  async healthCheck(): Promise<boolean> {
    // Testa o webhook principal
    try {
      const headers: any = {
        'Accept': 'application/json'
      };

      if (this.authKey) {
        headers['Authorization'] = this.authKey;
      }

      const response = await axios.get(this.webhookUrl, {
        timeout: 10000, // 10 segundos para health check
        validateStatus: (status) => status < 500,
        headers
      });
      
      if (response.status < 400) {
        return true;
      }
    } catch (error) {
      this.logger.warn('Health check do webhook principal falhou:', error.message);
    }

    // Testa o webhook de fallback
    try {
      const headers: any = {
        'Accept': 'application/json'
      };

      if (this.authKey) {
        headers['Authorization'] = this.authKey; // Sem Bearer para o webhook antigo
      }

      const response = await axios.get(this.fallbackWebhookUrl, {
        timeout: 10000,
        validateStatus: (status) => status < 500,
        headers
      });
      
      return response.status < 400;
    } catch (error) {
      this.logger.warn('Health check do webhook fallback falhou:', error.message);
      return false;
    }
  }
}