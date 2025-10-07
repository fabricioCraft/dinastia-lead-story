import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { KommoService, KommoPipeline, KommoUser } from './kommo.service';
import { SupabaseService } from './supabase.service';

@Injectable()
export class KommoSyncWorker {
  private isRunning = false;
  private lastSyncTimestamp: number = 0;
  private pipelines: KommoPipeline[] = [];
  private users: KommoUser[] = [];

  constructor(
    private readonly kommoService: KommoService,
    private readonly supabaseService: SupabaseService,
  ) {
    // Inicializar timestamp da última sincronização (24 horas atrás)
    this.lastSyncTimestamp = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
  }

  // Sincronização a cada 5 minutos
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    if (this.isRunning) {
      console.log('Kommo sync already running, skipping...');
      return;
    }

    console.log('Starting Kommo sync worker...');
    this.isRunning = true;

    try {
      await this.syncKommoLeads();
    } catch (error: any) {
      console.error('Kommo sync worker error:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  // Sincronização manual (pode ser chamada via endpoint)
  async syncNow(): Promise<{ success: boolean; message: string; leadsProcessed?: number }> {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Sync already in progress',
      };
    }

    this.isRunning = true;

    try {
      const result = await this.syncKommoLeads();
      return {
        success: true,
        message: `Sync completed successfully. Processed ${result.leadsProcessed} leads.`,
        leadsProcessed: result.leadsProcessed,
      };
    } catch (error: any) {
      console.error('Manual Kommo sync error:', error.message);
      return {
        success: false,
        message: `Sync failed: ${error.message}`,
      };
    } finally {
      this.isRunning = false;
    }
  }

  private async syncKommoLeads(): Promise<{ leadsProcessed: number }> {
    const startTime = Date.now();
    console.log('Kommo sync started at:', new Date().toISOString());

    try {
      // 1. Buscar metadados (pipelines e usuários) se não estiverem em cache
      await this.loadMetadata();

      // 2. Buscar leads atualizados desde a última sincronização
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const leads = await this.kommoService.getRecentlyUpdatedLeads(this.lastSyncTimestamp);

      console.log(`Found ${leads.length} updated leads since ${new Date(this.lastSyncTimestamp * 1000).toISOString()}`);

      if (leads.length === 0) {
        console.log('No leads to sync');
        return { leadsProcessed: 0 };
      }

      // 3. Mapear leads para formato do snapshot
      const mappedLeads = leads.map(lead => 
        this.kommoService.mapLeadToSnapshot(lead, this.pipelines, this.users)
      );

      // 4. Processar eventos e calcular durações históricas para cada lead
      console.log('🔍 Processando eventos e calculando durações históricas...');
      const allStageDurations: Array<{
        lead_id: string;
        stage_id: string;
        stage_name: string;
        duration_seconds: number;
      }> = [];

      for (const lead of leads) {
        try {
          console.log(`📊 Buscando eventos para lead ${lead.id}...`);
          
          // Buscar eventos do lead
          const events = await this.kommoService.getLeadEvents(lead.id);
          
          if (events && events.length > 0) {
            // Calcular durações históricas
            const stageDurations = this.kommoService.calculateStageDurations(
              events,
              lead.status_id,
              this.pipelines
            );
            
            allStageDurations.push(...stageDurations);
            console.log(`✅ ${stageDurations.length} durações calculadas para lead ${lead.id}`);
          }
          
          // Delay para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`❌ Erro ao processar eventos do lead ${lead.id}:`, error);
          // Continua com o próximo lead em caso de erro
        }
      }

      // 5. Fazer upsert dos snapshots no Supabase
      const upsertedCount = await this.supabaseService.upsertKommoLeadsSnapshot(mappedLeads);

      // 6. Fazer upsert das durações de etapas no Supabase
      let durationsUpserted = 0;
      if (allStageDurations.length > 0) {
        console.log(`💾 Salvando ${allStageDurations.length} durações de etapas...`);
        durationsUpserted = await this.supabaseService.upsertLeadStageDurations(allStageDurations);
      }

      // 7. Atualizar timestamp da última sincronização
      this.lastSyncTimestamp = currentTimestamp;

      const duration = Date.now() - startTime;
      console.log(`Kommo sync completed in ${duration}ms. Processed ${upsertedCount}/${leads.length} leads and ${durationsUpserted} stage durations.`);

      return { leadsProcessed: upsertedCount };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`Kommo sync failed after ${duration}ms:`, error.message);
      throw error;
    }
  }

  private async loadMetadata(): Promise<void> {
    try {
      // Recarregar metadados a cada hora ou se estiverem vazios
      const shouldReload = this.pipelines.length === 0 || 
                          this.users.length === 0 || 
                          Date.now() % (60 * 60 * 1000) < 5 * 60 * 1000; // A cada hora

      if (shouldReload) {
        console.log('Loading Kommo metadata (pipelines and users)...');
        
        const [pipelines, users] = await Promise.all([
          this.kommoService.getPipelines(),
          this.kommoService.getUsers(),
        ]);

        this.pipelines = pipelines;
        this.users = users;

        console.log(`Loaded ${pipelines.length} pipelines and ${users.length} users from Kommo`);
      }
    } catch (error: any) {
      console.error('Error loading Kommo metadata:', error.message);
      // Não falhar a sincronização por causa dos metadados
      // Os leads serão processados com informações limitadas
    }
  }

  // Sincronização completa (todos os leads) - usar com cuidado
  async fullSync(): Promise<{ success: boolean; message: string; leadsProcessed?: number }> {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Sync already in progress',
      };
    }

    this.isRunning = true;

    try {
      console.log('Starting FULL Kommo sync...');
      const startTime = Date.now();

      // Carregar metadados
      await this.loadMetadata();

      // Buscar TODOS os leads (sem filtro de data)
      const leads = await this.kommoService.getLeadsFromPipeline();

      console.log(`Found ${leads.length} total leads in Kommo`);

      if (leads.length === 0) {
        return {
          success: true,
          message: 'No leads found in Kommo',
          leadsProcessed: 0,
        };
      }

      // Mapear leads
      const mappedLeads = leads.map(lead => 
        this.kommoService.mapLeadToSnapshot(lead, this.pipelines, this.users)
      );

      // Fazer upsert no Supabase
      const upsertedCount = await this.supabaseService.upsertKommoLeadsSnapshot(mappedLeads);

      // Atualizar timestamp
      this.lastSyncTimestamp = Math.floor(Date.now() / 1000);

      const duration = Date.now() - startTime;
      console.log(`Full Kommo sync completed in ${duration}ms. Processed ${upsertedCount}/${leads.length} leads.`);

      return {
        success: true,
        message: `Full sync completed successfully. Processed ${upsertedCount} leads in ${Math.round(duration/1000)}s.`,
        leadsProcessed: upsertedCount,
      };

    } catch (error: any) {
      console.error('Full Kommo sync error:', error.message);
      return {
        success: false,
        message: `Full sync failed: ${error.message}`,
      };
    } finally {
      this.isRunning = false;
    }
  }

  // Status da sincronização
  getStatus(): {
    isRunning: boolean;
    lastSyncTimestamp: number;
    lastSyncDate: string;
    pipelinesLoaded: number;
    usersLoaded: number;
  } {
    return {
      isRunning: this.isRunning,
      lastSyncTimestamp: this.lastSyncTimestamp,
      lastSyncDate: new Date(this.lastSyncTimestamp * 1000).toISOString(),
      pipelinesLoaded: this.pipelines.length,
      usersLoaded: this.users.length,
    };
  }
}