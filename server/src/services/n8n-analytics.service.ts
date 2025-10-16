import { Injectable, Logger } from '@nestjs/common';
import { N8nService } from './n8n.service';

export interface UtmOriginSummary {
  origin: string;
  count: number;
}

export interface N8nAnalyticsData {
  kpis: {
    totalLeads: number;
  };
  leadsByOrigin: UtmOriginSummary[];
}

@Injectable()
export class N8nAnalyticsService {
  private readonly logger = new Logger(N8nAnalyticsService.name);

  constructor(private readonly n8nService: N8nService) {}

  /**
   * Processa dados N8N e mapeia leads por _pxa_first_utm_campaign
   * @param days Filtro opcional por dias
   * @returns Dados agregados por campanha UTM
   */
  async getLeadsByUtmSource(days?: number): Promise<N8nAnalyticsData> {
    try {
      this.logger.log('Iniciando análise de leads por UTM campaign...');
      
      // Buscar dados diretamente do webhook N8N
      const webhookResponse = await this.n8nService.fetchWebhookData();
      
      this.logger.log('Resposta do webhook recebida:', JSON.stringify(webhookResponse, null, 2));
      
      // Verificar se é dados mock (fallback)
      if (webhookResponse && webhookResponse.fallback) {
        this.logger.log('Detectados dados mock, convertendo para formato UTM...');
        return this.convertMockDataToUtmFormat(webhookResponse);
      }
      
      if (!webhookResponse || !webhookResponse.leadsRecords) {
        this.logger.error('Nenhum dado retornado do webhook N8N');
        this.logger.error('Estrutura da resposta:', webhookResponse);
        throw new Error('Webhook N8N não retornou dados válidos');
      }

      const n8nData = webhookResponse.leadsRecords;
      this.logger.log(`Dados N8N encontrados: ${n8nData.length} registros`);

      if (!Array.isArray(n8nData)) {
        this.logger.warn('Dados do N8N não são um array, retornando dados vazios');
        return {
          kpis: { totalLeads: 0 },
          leadsByOrigin: []
        };
      }

      // Filtrar por período se especificado
      let filteredData = n8nData;
      if (days && days > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        filteredData = n8nData.filter(item => {
          if (item.created_at || item.date || item.timestamp) {
            const itemDate = new Date(item.created_at || item.date || item.timestamp);
            return itemDate >= cutoffDate;
          }
          return true; // Incluir itens sem data
        });
      }

      // Mapear leads por _pxa_first_utm_campaign
      const utmSourceCounts = new Map<string, number>();
      
      filteredData.forEach(item => {
        // Acessar utm_campaign do campo meta (estrutura real do webhook)
        const utmSource = item.meta?._pxa_first_utm_campaign || item.meta?._pxa_utm_campaign || item._pxa_first_utm_campaign;
        const normalizedSource = this.normalizeUtmSource(utmSource);
        
        utmSourceCounts.set(
          normalizedSource, 
          (utmSourceCounts.get(normalizedSource) || 0) + 1
        );
      });

      // Converter para array e ordenar
      const leadsByOrigin: UtmOriginSummary[] = Array.from(utmSourceCounts.entries())
        .map(([origin, count]) => ({ origin, count }))
        .sort((a, b) => b.count - a.count);

      const totalLeads = filteredData.length;

      this.logger.log(`Processados ${totalLeads} leads com ${leadsByOrigin.length} origens UTM únicas`);

      return {
        kpis: { totalLeads },
        leadsByOrigin
      };

    } catch (error) {
      this.logger.error('Erro ao processar dados N8N para UTM mapping:', error);
      this.logger.warn('Retornando dados vazios devido ao erro');
      return {
        kpis: { totalLeads: 0 },
        leadsByOrigin: []
      };
    }
  }

  /**
   * Retorna o valor original do UTM source sem normalização
   * @param utmSource Valor original do UTM source
   * @returns Valor original ou 'SEM ORIGEM' se vazio
   */
  private normalizeUtmSource(utmSource: string | null | undefined): string {
    if (!utmSource || typeof utmSource !== 'string' || utmSource.trim().length === 0) {
      return 'SEM ORIGEM';
    }

    // Retornar valor original sem modificações
    return utmSource.trim();
  }

  /**
   * Converte dados mock para formato UTM esperado
   * @param mockData Dados mock do fallback
   * @returns Dados no formato UTM
   */
  private convertMockDataToUtmFormat(mockData: any): N8nAnalyticsData {
    this.logger.log('Convertendo dados mock para formato UTM...');
    
    // Extrair dados das origens mock
    const origins = mockData.data?.origins || [];
    
    // Converter para formato UTM
    const leadsByOrigin: UtmOriginSummary[] = origins.map(origin => ({
      origin: origin.name,
      count: origin.leads
    }));

    const totalLeads = mockData.data?.summary?.totalLeads || 0;

    this.logger.log(`Dados mock convertidos: ${totalLeads} leads, ${leadsByOrigin.length} campanhas`);

    return {
      kpis: { totalLeads },
      leadsByOrigin
    };
  }


}