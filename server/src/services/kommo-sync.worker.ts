import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KommoService } from './kommo.service';
import { SupabaseService } from './supabase.service';
import { LeadStageHistoryService } from './lead-stage-history.service';

@Injectable()
export class KommoSyncWorker {
  private readonly logger = new Logger(KommoSyncWorker.name);
  private debugLogs: string[] = [];

  // Mapeamento de status para colunas de timestamp (nomes corretos da tabela Supabase)
  private readonly statusToTimestampMap = new Map<string, string | null>([
    ['Leads Novos', 'ts_novos_leads'],
    ['Novo Lead', 'ts_novos_leads'],
    ['Tentado Conexão', 'ts_tentado_conexao'],
    ['Tentado conexão', 'ts_tentado_conexao'], // variação com minúscula
    ['Tentado conex??o', 'ts_tentado_conexao'], // variação com caracteres especiais
    ['Conectado/Qualificação', 'ts_conectado_qualificacao'],
    ['NoShow', 'ts_noshow'],
    ['Reunião', 'ts_reuniao'],
    ['Oportunidade', 'ts_oportunidade'],
    ['Negociação', 'ts_negociacao'],
    ['Perdido', null], // Status final, não precisa de timestamp
    ['Ganho', null], // Status final, não precisa de timestamp
    ['Venda Realizada', null], // Status final, não precisa de timestamp
  ]);

  constructor(
    private readonly kommoService: KommoService,
    private readonly supabaseService: SupabaseService,
    private readonly leadStageHistoryService: LeadStageHistoryService,
  ) {}

  /**
   * Executa a sincronização duas vezes ao dia: às 7h e 14h (horário de Brasília)
   * Equivalente a 10:00 e 17:00 UTC
   * ESTRATÉGIA UNIFICADA: rastreia transições de status e calcula durações
   */
  @Cron('0 0 10,17 * * *', {
    name: 'kommo-sync',
    timeZone: 'UTC',
  })
  async handleCron(): Promise<void> {
    // Limpar logs de debug anteriores
    this.debugLogs = [];
    this.logger.log('🚀 INICIANDO SINCRONIZAÇÃO CONTÍNUA - ESTRATÉGIA UNIFICADA...');

    try {
      // PASSO 1: Buscar dados atuais do Kommo (já com enriquecimento de status)
      this.logger.log('📋 PASSO 1: Buscando dados atuais do Kommo...');
      const currentLeadsFromKommo = await this.kommoService.getLeadsFromPipeline();
      
      if (currentLeadsFromKommo.length === 0) {
        this.logger.warn('⚠️ Nenhum lead encontrado no pipeline');
        return;
      }

      this.logger.log(`✅ Encontrados ${currentLeadsFromKommo.length} leads no Kommo`);

      // PASSO 2: Buscar dados antigos do nosso snapshot
      this.logger.log('📊 PASSO 2: Buscando snapshot atual do Supabase...');
      const existingSnapshot = await this.supabaseService.getAllKommoLeadsSnapshot();
      
      // Criar mapa para acesso rápido: leadId -> dados do snapshot
      const snapshotMap = new Map();
      existingSnapshot.forEach(lead => {
        snapshotMap.set(lead.lead_id, lead);
      });

      this.logger.log(`✅ Snapshot carregado: ${existingSnapshot.length} leads existentes`);

      // PASSO 3: Processamento de leads - detectar transições e calcular durações
      this.logger.log('⚙️ PASSO 3: Processando transições de status e calculando durações...');
      const leadsToUpsert: any[] = [];
      const durationsToUpsert: Array<{ lead_id: number; stage_name: string; duration_seconds: number }> = [];
      let newLeadsCount = 0;
      let statusChangesCount = 0;
      let unchangedCount = 0;

      for (const currentLead of currentLeadsFromKommo) {
        const leadId = currentLead.lead_id || currentLead.id;
        
        // Os dados já vêm transformados do getLeadsFromPipeline com status_name
        const currentStatusFromKommo = currentLead.status_name;
        
        // Verificação crítica: se status_name não existir, logue aviso mas continue
        if (!currentStatusFromKommo) {
          this.logger.warn(`⚠️ Lead ${leadId}: status_name não encontrado nos dados. Pulando...`);
          continue;
        }

        // Debug: verificar se o status está mapeado
        const timestampColumn = this.statusToTimestampMap.get(currentStatusFromKommo);
        const debugMsg = `🔍 Lead ${leadId}: status="${currentStatusFromKommo}", mapeado="${timestampColumn || 'SEM TIMESTAMP'}"`;
        this.logger.debug(debugMsg);
        this.debugLogs.push(debugMsg);
        
        // Nota: timestampColumn pode ser null para status finais como "Perdido"
        // Isso é normal e não deve impedir o processamento

        const existingLead = snapshotMap.get(leadId);

        // Debug: verificar se o lead existe no snapshot
        this.logger.debug(`🔍 Lead ${leadId}: verificando existência no snapshot...`);
        this.logger.debug(`🔍 Lead ${leadId}: existingLead = ${existingLead ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
        this.logger.debug(`🔍 Lead ${leadId}: snapshotMap.size = ${snapshotMap.size}`);
        this.logger.debug(`🔍 Lead ${leadId}: leadId type = ${typeof leadId}, value = ${leadId}`);
        
        if (existingLead) {
          this.logger.debug(`🔍 Lead ${leadId}: dados existentes = ${JSON.stringify(existingLead)}`);
        }

        if (!existingLead) {
          // LEAD NOVO: não existe no snapshot
          this.logger.debug(`🆕 Lead ${leadId}: novo lead detectado com status "${currentStatusFromKommo}"`);

          const newLeadRecord = {
            lead_id: leadId,
            current_status_name: currentStatusFromKommo,
            updated_at: new Date().toISOString(),
          };

          // Definir timestamp para o status atual APENAS se houver coluna mapeada
          if (timestampColumn) {
            newLeadRecord[timestampColumn] = new Date().toISOString();
            this.logger.debug(`📝 Lead ${leadId}: novo lead, definindo timestamp inicial para "${currentStatusFromKommo}" em ${timestampColumn}`);
          } else {
            this.logger.debug(`📝 Lead ${leadId}: novo lead com status "${currentStatusFromKommo}" (sem timestamp)`);
          }

          // Registrar no histórico de estágios
          try {
            await this.leadStageHistoryService.addStageEntry({
              lead_id: leadId,
              stage_name: currentStatusFromKommo,
              entered_at: new Date(),
              pipeline_id: currentLead.pipeline_id
            });
            this.logger.debug(`📚 Lead ${leadId}: entrada inicial registrada no histórico`);
          } catch (error) {
            this.logger.error(`❌ Erro ao registrar histórico para lead ${leadId}:`, error);
          }

          leadsToUpsert.push(newLeadRecord);
          newLeadsCount++;

        } else {
          // LEAD EXISTENTE: verificar se houve mudança de status
          const previousStatusFromDb = existingLead.current_status_name || existingLead.status_name;

          if (currentStatusFromKommo !== previousStatusFromDb) {
            // TRANSIÇÃO DETECTADA - ESTRATÉGIA UNIFICADA
            this.logger.debug(`🔄 Lead ${leadId}: transição "${previousStatusFromDb}" → "${currentStatusFromKommo}"`);

            // PASSO 3.1: CALCULAR DURAÇÃO DA ETAPA ANTERIOR
            const now = new Date();
            const previousTimestampColumn = this.statusToTimestampMap.get(previousStatusFromDb);
            
            if (previousTimestampColumn && existingLead[previousTimestampColumn]) {
              const enteredPreviousStageAt = new Date(existingLead[previousTimestampColumn]);
              const durationInPreviousStage = Math.floor((now.getTime() - enteredPreviousStageAt.getTime()) / 1000);
              
              if (durationInPreviousStage > 0) {
                durationsToUpsert.push({
                  lead_id: leadId,
                  stage_name: previousStatusFromDb,
                  duration_seconds: durationInPreviousStage
                });
                
                this.logger.debug(`⏱️ Lead ${leadId}: duração em "${previousStatusFromDb}": ${durationInPreviousStage}s`);
              }
            } else {
              this.logger.debug(`⚠️ Lead ${leadId}: não foi possível calcular duração para "${previousStatusFromDb}" (timestamp não encontrado)`);
            }

            // PASSO 3.2: ATUALIZAR SNAPSHOT COM NOVO STATUS
            const updatedLeadRecord = {
              ...existingLead,
              current_status_name: currentStatusFromKommo,
              updated_at: now.toISOString(),
            };

            // PASSO 3.3: DEFINIR TIMESTAMP PARA NOVA ETAPA
            if (timestampColumn) {
              if (!existingLead[timestampColumn]) {
                updatedLeadRecord[timestampColumn] = now.toISOString();
                this.logger.debug(`📝 Lead ${leadId}: registrando timestamp para nova etapa "${currentStatusFromKommo}" em ${timestampColumn}`);
              } else {
                this.logger.debug(`⏭️ Lead ${leadId}: timestamp para "${currentStatusFromKommo}" já existe, preservando valor anterior`);
              }
            } else {
              this.logger.debug(`📝 Lead ${leadId}: transição para "${currentStatusFromKommo}" (sem timestamp)`);
            }

            // Registrar mudança de estágio no histórico
            try {
              await this.leadStageHistoryService.recordStageChange(
                leadId,
                previousStatusFromDb,
                currentStatusFromKommo,
                currentLead.pipeline_id
              );
              this.logger.debug(`📚 Lead ${leadId}: mudança de estágio registrada no histórico`);
            } catch (error) {
              this.logger.error(`❌ Erro ao registrar mudança de estágio para lead ${leadId}:`, error);
            }

            leadsToUpsert.push(updatedLeadRecord);
            statusChangesCount++;

          } else {
            // SEM MUDANÇA: apenas atualizar updated_at, preservando todos os timestamps
            const updatedLeadRecord = {
              ...existingLead,
              updated_at: new Date().toISOString(),
            };

            leadsToUpsert.push(updatedLeadRecord);
            unchangedCount++;
          }
        }
      }

      this.logger.log(`✅ PASSO 3 CONCLUÍDO:`);
      this.logger.log(`   📈 Leads novos: ${newLeadsCount}`);
      this.logger.log(`   🔄 Transições detectadas: ${statusChangesCount}`);
      this.logger.log(`   ⏸️ Sem mudanças: ${unchangedCount}`);
      this.logger.log(`   ⏱️ Durações calculadas: ${durationsToUpsert.length}`);

      // PASSO 4: Upsert em massa - Snapshot de leads
      if (leadsToUpsert.length > 0) {
        this.logger.log(`💾 PASSO 4A: Fazendo upsert em massa de ${leadsToUpsert.length} leads...`);
        this.logger.log(`🔍 DEBUG: Primeiro lead para upsert:`, JSON.stringify(leadsToUpsert[0], null, 2));
        this.debugLogs.push(`🚀 CHAMANDO upsertKommoLeadsSnapshot com ${leadsToUpsert.length} leads`);
        
        const upsertResult = await this.supabaseService.upsertKommoLeadsSnapshot(leadsToUpsert);
        this.debugLogs.push(`✅ RESULTADO upsert snapshot: ${JSON.stringify(upsertResult)}`);
        this.logger.log(`✅ Snapshot atualizado com sucesso!`);
      } else {
        this.logger.log('⚠️ Nenhum lead para atualizar no snapshot');
      }

      // PASSO 5: Upsert em massa - Durações de estágios
      if (durationsToUpsert.length > 0) {
        this.logger.log(`💾 PASSO 4B: Fazendo upsert em massa de ${durationsToUpsert.length} durações...`);
        await this.upsertLeadStageDurations(durationsToUpsert);
        this.logger.log(`✅ Durações atualizadas com sucesso!`);
      } else {
        this.logger.log('⚠️ Nenhuma duração para atualizar');
      }

      this.logger.log(`🎉 SINCRONIZAÇÃO CONTÍNUA CONCLUÍDA COM SUCESSO!`);
      this.logger.log(`   📊 Total processado: ${leadsToUpsert.length} leads`);
      this.logger.log(`   🆕 Novos: ${newLeadsCount} | 🔄 Transições: ${statusChangesCount} | ⏸️ Inalterados: ${unchangedCount}`);
      this.logger.log(`   ⏱️ Durações registradas: ${durationsToUpsert.length}`);

    } catch (error) {
      this.logger.error('💥 Erro durante a sincronização:', error);
      throw error;
    }
  }

  /**
   * Executa sincronização manual (útil para testes)
   */
  async syncNow(): Promise<void> {
    this.logger.log('🔧 Executando sincronização manual com nova arquitetura...');
    await this.handleCron();
  }

  /**
   * Método para obter logs de debug da última sincronização
   */
  getDebugLogs(): string[] {
    return [...this.debugLogs];
  }

  /**
   * Método auxiliar para fazer upsert em massa na tabela lead_stage_durations
   * Reutiliza a lógica do KommoService para consistência
   */
  private async upsertLeadStageDurations(durations: Array<{ lead_id: number; stage_name: string; duration_seconds: number }>): Promise<void> {
    try {
      const chunkSize = 500; // Processar em chunks para evitar timeouts
      
      for (let i = 0; i < durations.length; i += chunkSize) {
        const chunk = durations.slice(i, i + chunkSize);
        
        this.logger.log(`💾 Salvando chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(durations.length/chunkSize)} (${chunk.length} registros)...`);
        
        const client = this.supabaseService.getClient();
        if (!client) {
          throw new Error('Cliente Supabase não inicializado');
        }

        const { error } = await client
          .from('lead_stage_durations')
          .upsert(chunk, { 
            onConflict: 'lead_id,stage_name',
            ignoreDuplicates: false 
          });

        if (error) {
          throw new Error(`Erro no upsert de durações: ${error.message}`);
        }

        // Pequeno delay entre chunks
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      this.logger.log(`✅ Todas as ${durations.length} durações foram salvas com sucesso`);

    } catch (error) {
      this.logger.error('❌ Erro ao salvar durações no banco:', error);
      throw error;
    }
  }
}