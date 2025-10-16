import { Controller, Post, Get, Logger } from '@nestjs/common';
import { LeadMigrationService } from '../services/lead-migration.service';
import { LeadStageHistoryService } from '../services/lead-stage-history.service';

@Controller('lead-migration')
export class LeadMigrationController {
  private readonly logger = new Logger(LeadMigrationController.name);

  constructor(
    private readonly leadMigrationService: LeadMigrationService,
    private readonly leadStageHistoryService: LeadStageHistoryService,
  ) {}

  /**
   * Executa a migração inicial de todos os leads existentes do Kommo
   * para o sistema de histórico de estágios
   */
  @Post('initialize-history')
  async initializeLeadHistory() {
    this.logger.log('🚀 Iniciando migração de histórico de leads...');
    
    try {
      const result = await this.leadMigrationService.migrateExistingLeads();
      
      this.logger.log('✅ Migração concluída com sucesso');
      return {
        success: true,
        message: 'Migração de histórico de leads concluída com sucesso',
        data: result
      };
    } catch (error) {
      this.logger.error('❌ Erro durante a migração:', error);
      return {
        success: false,
        message: 'Erro durante a migração de histórico de leads',
        error: error.message
      };
    }
  }

  /**
   * Obtém estatísticas do histórico de estágios
   */
  @Get('history-stats')
  async getHistoryStats() {
    try {
      const stats = await this.leadStageHistoryService.getHistoryStats();
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      this.logger.error('❌ Erro ao obter estatísticas:', error);
      return {
        success: false,
        message: 'Erro ao obter estatísticas do histórico',
        error: error.message
      };
    }
  }

  /**
   * Obtém o tempo médio por estágio
   */
  @Get('average-time-per-stage')
  async getAverageTimePerStage() {
    try {
      const averageTimes = await this.leadStageHistoryService.getAverageTimePerStage();
      
      return {
        success: true,
        data: averageTimes
      };
    } catch (error) {
      this.logger.error('❌ Erro ao calcular tempo médio por estágio:', error);
      return {
        success: false,
        message: 'Erro ao calcular tempo médio por estágio',
        error: error.message
      };
    }
  }

  /**
   * Obtém o histórico completo de um lead específico
   */
  @Get('lead-history/:leadId')
  async getLeadHistory(leadId: string) {
    try {
      const history = await this.leadStageHistoryService.getLeadHistory(parseInt(leadId));
      
      return {
        success: true,
        data: history
      };
    } catch (error) {
      this.logger.error(`❌ Erro ao obter histórico do lead ${leadId}:`, error);
      return {
        success: false,
        message: `Erro ao obter histórico do lead ${leadId}`,
        error: error.message
      };
    }
  }
}