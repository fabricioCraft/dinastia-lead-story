import { Injectable, Logger } from '@nestjs/common';
import { KommoService } from './kommo.service';
import { SupabaseService } from './supabase.service';
import { LeadStageHistoryService } from './lead-stage-history.service';

export interface MigrationResult {
  success: boolean;
  totalLeads: number;
  migratedLeads: number;
  skippedLeads: number;
  errors: string[];
}

@Injectable()
export class LeadMigrationService {
  private readonly logger = new Logger(LeadMigrationService.name);

  constructor(
    private readonly kommoService: KommoService,
    private readonly supabaseService: SupabaseService,
    private readonly leadStageHistoryService: LeadStageHistoryService
  ) {}

  /**
   * Migra todos os leads existentes do Kommo para o sistema de histórico
   * Este método resolve o problema de leads existentes sem histórico
   */
  async migrateExistingLeads(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      totalLeads: 0,
      migratedLeads: 0,
      skippedLeads: 0,
      errors: []
    };

    try {
      this.logger.log('🚀 Iniciando migração de leads existentes...');

      // 1. Buscar todos os leads do Kommo
      this.logger.log('📋 Buscando todos os leads do Kommo...');
      const allLeads = await this.kommoService.getLeadsFromPipeline();
      result.totalLeads = allLeads.length;

      this.logger.log(`✅ Encontrados ${allLeads.length} leads no Kommo`);

      if (allLeads.length === 0) {
        result.success = true;
        return result;
      }

      // 2. Processar cada lead
      for (const lead of allLeads) {
        try {
          const leadId = lead.lead_id || lead.id;
          const currentStage = lead.status_name;
          const pipelineId = lead.pipeline_id;

          if (!leadId || !currentStage) {
            this.logger.warn(`⚠️ Lead com dados incompletos: ID=${leadId}, Stage=${currentStage}`);
            result.skippedLeads++;
            continue;
          }

          // Verificar se já tem histórico
          const hasHistory = await this.leadStageHistoryService.hasHistory(leadId);
          if (hasHistory) {
            this.logger.debug(`Lead ${leadId} já possui histórico, pulando...`);
            result.skippedLeads++;
            continue;
          }

          // Tentar obter histórico detalhado do Kommo (se disponível)
          const estimatedEnteredAt = await this.estimateStageEntryTime(leadId, currentStage);

          // Inicializar histórico para o lead
          const success = await this.leadStageHistoryService.initializeHistoryForExistingLead(
            leadId,
            currentStage,
            pipelineId,
            estimatedEnteredAt
          );

          if (success) {
            result.migratedLeads++;
            this.logger.debug(`✅ Lead ${leadId} migrado com sucesso`);
          } else {
            result.errors.push(`Falha ao migrar lead ${leadId}`);
          }

        } catch (error) {
          const errorMsg = `Erro ao processar lead: ${error.message}`;
          result.errors.push(errorMsg);
          this.logger.error(errorMsg, error);
        }
      }

      result.success = result.errors.length === 0 || result.migratedLeads > 0;

      this.logger.log(`🎯 Migração concluída:`);
      this.logger.log(`   Total de leads: ${result.totalLeads}`);
      this.logger.log(`   Migrados: ${result.migratedLeads}`);
      this.logger.log(`   Pulados: ${result.skippedLeads}`);
      this.logger.log(`   Erros: ${result.errors.length}`);

      return result;

    } catch (error) {
      this.logger.error('Erro durante migração de leads:', error);
      result.errors.push(`Erro geral: ${error.message}`);
      return result;
    }
  }

  /**
   * Tenta estimar quando um lead entrou na etapa atual
   * Usa dados do Kommo quando disponíveis, senão usa heurísticas
   */
  private async estimateStageEntryTime(leadId: number, currentStage: string): Promise<Date> {
    try {
      // Tentar buscar eventos do lead no Kommo
      const events = await this.kommoService.getAllLeadEvents(leadId);
      
      if (events && events.length > 0) {
        // Procurar por eventos de mudança de status
        const statusChangeEvents = events.filter(event => 
          event.type === 'lead_status_changed' || 
          (event.value_after && event.value_after.status_id)
        );

        if (statusChangeEvents.length > 0) {
          // Usar o evento mais recente de mudança para a etapa atual
          const latestEvent = statusChangeEvents[statusChangeEvents.length - 1];
          return new Date(latestEvent.created_at * 1000);
        }
      }

      // Se não conseguir dados específicos, usar heurísticas baseadas na etapa
      return this.estimateByStageHeuristics(currentStage);

    } catch (error) {
      this.logger.debug(`Não foi possível obter histórico detalhado para lead ${leadId}, usando estimativa`);
      return this.estimateByStageHeuristics(currentStage);
    }
  }

  /**
   * Estima tempo de entrada baseado em heurísticas por etapa
   */
  private estimateByStageHeuristics(stageName: string): Date {
    const now = new Date();
    
    // Heurísticas baseadas no tipo de etapa
    switch (stageName.toLowerCase()) {
      case 'leads novos':
        // Leads novos: entre 1-7 dias atrás
        return new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      case 'closers em contato':
        // Closers em contato: entre 3-14 dias atrás
        return new Date(now.getTime() - (3 + Math.random() * 11) * 24 * 60 * 60 * 1000);
      
      case 'agendados':
        // Agendados: entre 1-5 dias atrás
        return new Date(now.getTime() - (1 + Math.random() * 4) * 24 * 60 * 60 * 1000);
      
      case 'call realizada':
        // Call realizada: entre 1-3 dias atrás
        return new Date(now.getTime() - (1 + Math.random() * 2) * 24 * 60 * 60 * 1000);
      
      case 'vendas':
      case 'ganho':
        // Vendas/Ganho: entre 1-2 dias atrás
        return new Date(now.getTime() - (1 + Math.random()) * 24 * 60 * 60 * 1000);
      
      default:
        // Outras etapas: entre 1-10 dias atrás
        return new Date(now.getTime() - (1 + Math.random() * 9) * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Migra um lead específico (útil para testes)
   */
  async migrateSingleLead(leadId: number): Promise<boolean> {
    try {
      this.logger.log(`🔄 Migrando lead específico: ${leadId}`);

      // Buscar dados do lead no Kommo
      const leadData = await this.kommoService.getLeadById(leadId);
      if (!leadData) {
        this.logger.error(`Lead ${leadId} não encontrado no Kommo`);
        return false;
      }

      // Verificar se já tem histórico
      const hasHistory = await this.leadStageHistoryService.hasHistory(leadId);
      if (hasHistory) {
        this.logger.log(`Lead ${leadId} já possui histórico`);
        return true;
      }

      // Estimar tempo de entrada
      const estimatedEnteredAt = await this.estimateStageEntryTime(leadId, leadData.current_status_name);

      // Inicializar histórico
      const success = await this.leadStageHistoryService.initializeHistoryForExistingLead(
        leadId,
        leadData.current_status_name,
        leadData.pipeline_id,
        estimatedEnteredAt
      );

      if (success) {
        this.logger.log(`✅ Lead ${leadId} migrado com sucesso`);
      } else {
        this.logger.error(`❌ Falha ao migrar lead ${leadId}`);
      }

      return success;

    } catch (error) {
      this.logger.error(`Erro ao migrar lead ${leadId}:`, error);
      return false;
    }
  }

  /**
   * Verifica quantos leads ainda precisam ser migrados
   */
  async checkMigrationStatus(): Promise<{
    totalLeadsInKommo: number;
    leadsWithHistory: number;
    leadsPendingMigration: number;
  }> {
    try {
      // Buscar todos os leads do Kommo
      const allLeads = await this.kommoService.getLeadsFromPipeline();
      const totalLeadsInKommo = allLeads.length;

      // Contar leads com histórico
      let leadsWithHistory = 0;
      for (const lead of allLeads) {
        const leadId = lead.lead_id || lead.id;
        if (leadId && await this.leadStageHistoryService.hasHistory(leadId)) {
          leadsWithHistory++;
        }
      }

      const leadsPendingMigration = totalLeadsInKommo - leadsWithHistory;

      this.logger.log(`📊 Status da migração:`);
      this.logger.log(`   Total no Kommo: ${totalLeadsInKommo}`);
      this.logger.log(`   Com histórico: ${leadsWithHistory}`);
      this.logger.log(`   Pendentes: ${leadsPendingMigration}`);

      return {
        totalLeadsInKommo,
        leadsWithHistory,
        leadsPendingMigration
      };

    } catch (error) {
      this.logger.error('Erro ao verificar status da migração:', error);
      return {
        totalLeadsInKommo: 0,
        leadsWithHistory: 0,
        leadsPendingMigration: 0
      };
    }
  }
}