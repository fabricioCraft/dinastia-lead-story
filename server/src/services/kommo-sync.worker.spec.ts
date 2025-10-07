import { KommoSyncWorker } from './kommo-sync.worker';
import { KommoService } from './kommo.service';
import { SupabaseService } from './supabase.service';

describe('KommoSyncWorker', () => {
  let worker: KommoSyncWorker;
  let kommoService: any;
  let supabaseService: any;

  beforeEach(() => {
    kommoService = {
      getLeads: jest.fn(),
      getLeadsFromPipeline: jest.fn(),
      getRecentlyUpdatedLeads: jest.fn(),
      getPipelines: jest.fn(),
      getUsers: jest.fn(),
      mapLeadToSnapshot: jest.fn(),
      getLeadEvents: jest.fn(),
      calculateStageDurations: jest.fn(),
    };

    supabaseService = {
      upsertKommoLeadsSnapshot: jest.fn(),
      upsertLeadStageDurations: jest.fn(),
    };

    worker = new KommoSyncWorker(kommoService, supabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncNow', () => {
    it('should sync leads successfully', async () => {
      const mockLeads = [
        { id: 1, name: 'Lead 1', status_id: 123 },
        { id: 2, name: 'Lead 2', status_id: 456 },
      ];

      const mockPipelines = [
        {
          id: 1,
          _embedded: {
            statuses: [
              { id: 123, name: 'New Lead' },
              { id: 456, name: 'Qualified' },
            ],
          },
        },
      ];

      const mockUsers = [
        { id: 101, name: 'User 1' },
        { id: 102, name: 'User 2' },
      ];

      const mockSnapshots = [
        {
          lead_id: '1',
          name: 'Lead 1',
          status: 'New Lead',
          pipeline_id: 1,
          stage_id: 123,
          responsible_user_id: 101,
          created_at: new Date(),
          updated_at: new Date(),
          last_updated_at: new Date(),
          custom_fields: [],
          tags: [],
          origin: null,
          created_at_snapshot: new Date(),
        },
        {
          lead_id: '2',
          name: 'Lead 2',
          status: 'Qualified',
          pipeline_id: 1,
          stage_id: 456,
          responsible_user_id: 102,
          created_at: new Date(),
          updated_at: new Date(),
          last_updated_at: new Date(),
          custom_fields: [],
          tags: [],
          origin: null,
          created_at_snapshot: new Date(),
        },
      ];

      kommoService.getRecentlyUpdatedLeads = jest.fn().mockResolvedValue(mockLeads);
      kommoService.getPipelines.mockResolvedValue(mockPipelines);
      kommoService.getUsers.mockResolvedValue(mockUsers);
      kommoService.getLeadEvents.mockResolvedValue([]);
      kommoService.calculateStageDurations.mockResolvedValue([]);
      kommoService.mapLeadToSnapshot
        .mockReturnValueOnce(mockSnapshots[0])
        .mockReturnValueOnce(mockSnapshots[1]);
      supabaseService.upsertKommoLeadsSnapshot.mockResolvedValue(2);
      supabaseService.upsertLeadStageDurations.mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await worker.syncNow();

      expect(result.success).toBe(true);
      expect(result.leadsProcessed).toBe(2);
      expect(kommoService.getRecentlyUpdatedLeads).toHaveBeenCalled();
      expect(kommoService.getPipelines).toHaveBeenCalled();
      expect(kommoService.getUsers).toHaveBeenCalled();
      expect(kommoService.mapLeadToSnapshot).toHaveBeenCalledTimes(2);
      expect(supabaseService.upsertKommoLeadsSnapshot).toHaveBeenCalledWith(mockSnapshots);

      consoleSpy.mockRestore();
    });

    it('should handle empty leads gracefully', async () => {
      kommoService.getRecentlyUpdatedLeads = jest.fn().mockResolvedValue([]);
      kommoService.getPipelines.mockResolvedValue([]);
      kommoService.getUsers.mockResolvedValue([]);
      kommoService.getLeadEvents.mockResolvedValue([]);
      kommoService.calculateStageDurations.mockResolvedValue([]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await worker.syncNow();

      expect(result.success).toBe(true);
      expect(result.leadsProcessed).toBe(0);
      expect(supabaseService.upsertKommoLeadsSnapshot).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('API Error');
      kommoService.getRecentlyUpdatedLeads = jest.fn().mockRejectedValue(error);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await worker.syncNow();

      expect(result.success).toBe(false);
      expect(result.message).toContain('API Error');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should prevent concurrent syncs', async () => {
       // Simular que já está rodando
       (worker as any).isRunning = true;

       const result = await worker.syncNow();

       expect(result.success).toBe(false);
       expect(result.message).toBe('Sync already in progress');
     });
   });

   describe('fullSync', () => {
     it('should perform full sync successfully', async () => {
       const mockLeads = [
         { id: 1, name: 'Lead 1', status_id: 123 },
         { id: 2, name: 'Lead 2', status_id: 456 },
         { id: 3, name: 'Lead 3', status_id: 123 },
       ];

       const mockPipelines = [
         {
           id: 1,
           _embedded: {
             statuses: [
               { id: 123, name: 'New Lead' },
               { id: 456, name: 'Qualified' },
             ],
           },
         },
       ];

       const mockUsers = [
         { id: 101, name: 'User 1' },
         { id: 102, name: 'User 2' },
       ];

       kommoService.getLeadsFromPipeline.mockResolvedValue(mockLeads);
       kommoService.getPipelines.mockResolvedValue(mockPipelines);
       kommoService.getUsers.mockResolvedValue(mockUsers);
       kommoService.getLeadEvents.mockResolvedValue([]);
       kommoService.calculateStageDurations.mockResolvedValue([]);
       kommoService.mapLeadToSnapshot.mockImplementation((lead) => ({
         lead_id: lead.id.toString(),
         name: lead.name,
         status: lead.status_id === 123 ? 'New Lead' : 'Qualified',
         pipeline_id: 1,
         stage_id: lead.status_id,
         responsible_user_id: 101,
         created_at: new Date(),
         updated_at: new Date(),
         last_updated_at: new Date(),
         custom_fields: [],
         tags: [],
         origin: null,
         created_at_snapshot: new Date(),
       }));
       supabaseService.upsertKommoLeadsSnapshot.mockResolvedValue(3);
       supabaseService.upsertLeadStageDurations.mockResolvedValue(undefined);

       const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

       const result = await worker.fullSync();

       expect(result.success).toBe(true);
       expect(result.leadsProcessed).toBe(3);
       expect(kommoService.getLeadsFromPipeline).toHaveBeenCalledTimes(1);
       expect(kommoService.getPipelines).toHaveBeenCalledTimes(1);
       expect(kommoService.getUsers).toHaveBeenCalledTimes(1);
       expect(supabaseService.upsertKommoLeadsSnapshot).toHaveBeenCalledTimes(1);

       consoleSpy.mockRestore();
     });

     it('should handle errors during full sync', async () => {
       const error = new Error('Full sync error');
       kommoService.getLeadsFromPipeline.mockRejectedValue(error);

       const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

       const result = await worker.fullSync();

       expect(result.success).toBe(false);
       expect(result.message).toContain('Full sync error');
       expect(consoleErrorSpy).toHaveBeenCalled();

       consoleErrorSpy.mockRestore();
      });
  });
});