import { Controller, Post, Get, Logger, Param } from '@nestjs/common';
import { KommoService } from '../services/kommo.service';
import { KommoSyncWorker } from '../services/kommo-sync.worker';
import { SupabaseService } from '../services/supabase.service';

@Controller('kommo')
export class KommoController {
  private readonly logger = new Logger(KommoController.name);

  constructor(
    private readonly kommoService: KommoService,
    private readonly kommoSyncWorker: KommoSyncWorker,
    private readonly supabaseService: SupabaseService
  ) {}

  /**
   * Endpoint para testar a conexão com a API do Kommo
   */
  @Get('test-connection')
  async testConnection() {
    try {
      this.logger.log('Testing Kommo API connection...');
      const result = await this.kommoService.testFetchLeads();
      
      this.logger.log(`Connection test result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      return result;
      
    } catch (error) {
      this.logger.error('Error testing Kommo connection:', error);
      return {
        success: false,
        error: error.message,
        details: 'Failed to connect to Kommo API'
      };
    }
  }

  /**
   * Endpoint para sincronização manual dos leads do Kommo
   */
  @Post('sync-manual')
  async syncManual() {
    try {
      this.logger.log('Manual Kommo synchronization requested');
      await this.kommoSyncWorker.syncNow();
      
      return {
        success: true,
        message: 'Kommo leads synchronized successfully'
      };
      
    } catch (error) {
      this.logger.error('Error during manual sync:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Endpoint para calcular durações dos leads por estágio
   */
  @Post('sync-stage-durations')
  async syncStageDurations() {
    try {
      this.logger.log('Calculating lead stage durations...');
      const result = await this.kommoService.calculateLeadStageDurations();
      
      return {
        success: true,
        message: 'Lead stage durations calculated successfully',
        data: result
      };
      
    } catch (error) {
      this.logger.error('Error calculating stage durations:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * PARTE 2: Endpoint para Carga Histórica (Backfill)
   * Processa todos os leads existentes e calcula durações históricas
   */
  @Post('backfill-historical-durations')
  async backfillHistoricalDurations() {
    // Executar em background para evitar timeout
    setImmediate(async () => {
      try {
        const result = await this.kommoService.backfillHistoricalDurations();
        console.log('🎉 Backfill concluído:', result);
      } catch (error) {
        console.error('❌ Erro no backfill:', error);
      }
    });
    
    return {
      message: 'Processo de backfill histórico iniciado em segundo plano...',
      status: 'started',
      info: 'Acompanhe o progresso nos logs do servidor'
    };
  }



  /**
   * Endpoint para debug detalhado de um lead específico
   * Compara dados em tempo real do Kommo com o snapshot armazenado
   */
  @Get('debug-lead/:leadId')
  async debugLead(@Param('leadId') leadId: string) {
    try {
      const leadIdNumber = parseInt(leadId);
      
      if (isNaN(leadIdNumber)) {
        return {
          success: false,
          error: 'Lead ID deve ser um número válido'
        };
      }

      this.logger.log(`Debugging lead ${leadIdNumber}...`);

      // Buscar dados em tempo real do Kommo
      const kommoData = await this.kommoService.getLeadById(leadIdNumber);
      
      // Buscar dados do snapshot
      const snapshotData = await this.supabaseService.getKommoLeadSnapshotById(leadIdNumber);

      return {
        success: true,
        lead_id: leadIdNumber,
        kommo_data: kommoData,
        snapshot_data: snapshotData,
        comparison: {
          exists_in_kommo: kommoData !== null,
          exists_in_snapshot: snapshotData !== null,
          status_match: kommoData && snapshotData ? 
            kommoData.current_status_name === snapshotData.current_status_name : null,
          last_updated_kommo: kommoData?.updated_at || null,
          last_updated_snapshot: snapshotData?.updated_at || null
        }
      };
      
    } catch (error) {
      this.logger.error(`Error debugging lead ${leadId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Endpoint para obter logs de debug da última sincronização
   */
  @Get('debug-logs')
  async getDebugLogs() {
    try {
      const logs = this.kommoSyncWorker.getDebugLogs();
      return {
        success: true,
        count: logs.length,
        logs: logs
      };
    } catch (error) {
      this.logger.error('Error getting debug logs:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}