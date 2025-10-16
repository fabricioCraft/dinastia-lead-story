import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { KommoService } from './kommo.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly kommoService: KommoService,
    private readonly schedulerRegistry: SchedulerRegistry
  ) {}

  // Executa a sincronização a cada 4 horas
  // Temporariamente desabilitado para debug
  /*
  @Cron(CronExpression.EVERY_4_HOURS)
  async handleStageDurationSync() {
    this.logger.log('Starting scheduled sync of lead stage durations...');
    
    try {
      await this.kommoService.calculateLeadStageDurations();
      this.logger.log('Scheduled sync completed successfully');
    } catch (error) {
      this.logger.error('Error during scheduled sync:', error);
    }
  }
  */

  // Executa uma sincronização inicial na inicialização (após 30 segundos)
  // Temporariamente desabilitado para evitar problemas na inicialização
  /*
  @Cron('30 * * * * *', {
    name: 'initial-sync',
  })
  async handleInitialSync() {
    this.logger.log('Running initial sync of lead stage durations...');
    
    try {
      await this.kommoService.calculateLeadStageDurations();
      this.logger.log('Initial sync completed successfully');
      
      // Desabilita este job após a primeira execução
      try {
        const job = this.schedulerRegistry.getCronJob('initial-sync');
        job.stop();
        this.logger.log('Initial sync job disabled');
      } catch (error) {
        this.logger.warn('Could not disable initial sync job:', error.message);
      }
    } catch (error) {
      this.logger.error('Error during initial sync:', error);
    }
  }
  */

  // Método para sincronização manual
  async manualSync(): Promise<void> {
    this.logger.log('Manual sync requested');
    await this.kommoService.calculateLeadStageDurations();
    this.logger.log('Manual sync completed');
  }
}