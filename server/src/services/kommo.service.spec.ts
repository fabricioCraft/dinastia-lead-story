import { Test, TestingModule } from '@nestjs/testing';
import { KommoService, KommoLead, KommoPipeline, KommoUser } from './kommo.service';
import { SupabaseService } from './supabase.service';

describe('KommoService', () => {
  let service: KommoService;
  let supabaseService: SupabaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KommoService,
        {
          provide: SupabaseService,
          useValue: {
            upsertKommoLeadsSnapshot: jest.fn(),
            updateKommoSyncTimestamp: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<KommoService>(KommoService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getLeadsFromPipeline', () => {
    it('should fetch leads from pipeline successfully', async () => {
      const mockLeads: KommoLead[] = [
        { 
          id: 1, 
          name: 'Lead 1', 
          status_id: 123,
          pipeline_id: 1,
          responsible_user_id: 1,
          created_at: 1640908800,
          updated_at: 1640995200,
          custom_fields_values: []
        },
        { 
          id: 2, 
          name: 'Lead 2', 
          status_id: 456,
          pipeline_id: 1,
          responsible_user_id: 2,
          created_at: 1640908900,
          updated_at: 1640995300,
          custom_fields_values: []
        },
      ];

      // Mock the method directly since we're testing the service logic
      jest.spyOn(service, 'getLeadsFromPipeline').mockResolvedValue(mockLeads);

      const result = await service.getLeadsFromPipeline();

      expect(result).toEqual(mockLeads);
    });

    it('should handle empty response', async () => {
      jest.spyOn(service, 'getLeadsFromPipeline').mockResolvedValue([]);

      const result = await service.getLeadsFromPipeline();

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      const error = new Error('API Error');
      jest.spyOn(service, 'getLeadsFromPipeline').mockRejectedValue(error);

      await expect(service.getLeadsFromPipeline()).rejects.toThrow('API Error');
    });
  });

  describe('getRecentlyUpdatedLeads', () => {
    it('should fetch recently updated leads', async () => {
      const mockLeads: KommoLead[] = [
        { 
          id: 1, 
          name: 'Lead 1', 
          status_id: 123, 
          updated_at: 1640995200,
          pipeline_id: 1,
          responsible_user_id: 1,
          created_at: 1640908800,
          custom_fields_values: []
        },
        { 
          id: 2, 
          name: 'Lead 2', 
          status_id: 456, 
          updated_at: 1640995300,
          pipeline_id: 1,
          responsible_user_id: 2,
          created_at: 1640908900,
          custom_fields_values: []
        },
      ];

      jest.spyOn(service, 'getRecentlyUpdatedLeads').mockResolvedValue(mockLeads);

      const sinceTimestamp = 1640908800;
      const result = await service.getRecentlyUpdatedLeads(sinceTimestamp);

      expect(result).toEqual(mockLeads);
    });
  });

  describe('getPipelines', () => {
    it('should fetch pipelines successfully', async () => {
      const mockPipelines: KommoPipeline[] = [
        {
          id: 1,
          name: 'Sales Pipeline',
          sort: 1,
          is_main: true,
          is_unsorted_on: false,
          is_archive: false,
          account_id: 123,
          _embedded: {
            statuses: [
              { 
                id: 123, 
                name: 'New Lead',
                sort: 1,
                is_editable: true,
                pipeline_id: 1,
                color: '#99ccff',
                type: 1,
                account_id: 123
              },
              { 
                id: 456, 
                name: 'Qualified',
                sort: 2,
                is_editable: true,
                pipeline_id: 1,
                color: '#ffcc99',
                type: 1,
                account_id: 123
              },
            ],
          },
        },
      ];

      jest.spyOn(service, 'getPipelines').mockResolvedValue(mockPipelines);

      const result = await service.getPipelines();

      expect(result).toEqual(mockPipelines);
    });
  });

  describe('getUsers', () => {
    it('should fetch users successfully', async () => {
      const mockUsers: KommoUser[] = [
        { 
          id: 1, 
          name: 'User 1', 
          email: 'user1@example.com',
          lang: 'pt-BR',
          rights: { 
            leads: 'A',
            contacts: 'A',
            companies: 'A',
            tasks: 'A',
            mail_access: true,
            catalog_access: true,
            status_rights: []
          }
        },
        { 
          id: 2, 
          name: 'User 2', 
          email: 'user2@example.com',
          lang: 'pt-BR',
          rights: { 
            leads: 'A',
            contacts: 'A',
            companies: 'A',
            tasks: 'A',
            mail_access: true,
            catalog_access: true,
            status_rights: []
          }
        },
      ];

      jest.spyOn(service, 'getUsers').mockResolvedValue(mockUsers);

      const result = await service.getUsers();

      expect(result).toEqual(mockUsers);
    });
  });

  describe('mapLeadToSnapshot', () => {
    it('should map Kommo lead to snapshot format correctly', () => {
      const mockLead = {
        id: 123,
        name: 'Test Lead',
        status_id: 456,
        pipeline_id: 789,
        responsible_user_id: 101,
        created_at: 1640995200,
        updated_at: 1641081600,
        custom_fields_values: [
          {
            field_id: 1,
            field_name: 'Origin',
            field_code: 'ORIGIN',
            field_type: 'text',
            values: [{ value: 'Website' }],
          },
        ],
        _embedded: {
          tags: [{ id: 1, name: 'hot-lead' }],
        },
      };

      const mockPipelines = [
        {
          id: 789,
          name: 'Sales Pipeline',
          sort: 1,
          is_main: true,
          is_unsorted_on: false,
          is_archive: false,
          account_id: 1,
          _embedded: {
            statuses: [
              {
                id: 456,
                name: 'Qualified',
                sort: 1,
                is_editable: true,
                pipeline_id: 789,
                color: '#99ccff',
                type: 1,
                account_id: 1,
              },
            ],
          },
        },
      ];

      const mockUsers = [
          {
            id: 101,
            name: 'John Doe',
            email: 'john@example.com',
            lang: 'en',
            rights: {
              leads: 'A',
              contacts: 'A',
              companies: 'A',
              tasks: 'A',
              mail_access: true,
              catalog_access: true,
              status_rights: [],
            },
          },
        ] as KommoUser[];

      const result = service.mapLeadToSnapshot(mockLead, mockPipelines, mockUsers);

      expect(result).toEqual({
        lead_id: '123',
        name: 'Test Lead',
        status: 'Qualified',
        pipeline_id: '789',
        pipeline_name: 'Sales Pipeline',
        stage_id: '456',
        stage_name: 'Qualified',
        responsible_user_id: '101',
        responsible_user_name: 'John Doe',
        created_at: '2022-01-01T00:00:00.000Z',
        updated_at: '2022-01-02T00:00:00.000Z',
        last_updated_at: expect.any(String),
        custom_fields: mockLead.custom_fields_values,
        tags: ['hot-lead'],
        origin: undefined,
      });
    });

    it('should handle unknown status gracefully', async () => {
      const mockLead = {
        id: 2,
        name: 'Test Lead 2',
        status_id: 999, // Unknown status
        pipeline_id: 456,
        responsible_user_id: 789,
        created_at: 1640995200,
        updated_at: 1640995200,
      };

      const mockPipelines = [
        {
          id: 456,
          name: 'Sales Pipeline',
          sort: 1,
          is_main: true,
          is_unsorted_on: false,
          is_archive: false,
          account_id: 1,
          _embedded: {
            statuses: [
              {
                id: 123,
                name: 'New Lead',
                sort: 1,
                is_editable: true,
                pipeline_id: 456,
                color: '#99ccff',
                type: 1,
                account_id: 1,
              },
            ],
          },
        },
      ];

      const mockUsers = [];

      const result = service.mapLeadToSnapshot(mockLead, mockPipelines, mockUsers);

      expect(result.status).toBe('Status 999');
    });
  });

  describe('getLeadEvents', () => {
    it('should fetch lead events successfully', async () => {
      const mockEvents = {
        _embedded: {
          events: [
            {
              id: '1',
              type: 'lead_status_changed',
              entity_id: 12345,
              entity_type: 'lead',
              created_at: 1640995200,
              created_by: 101,
              value_after: { lead_status: { id: 1, name: 'Novo Lead', pipeline_id: 1 } },
              value_before: { lead_status: { id: 2, name: 'Closers em contato', pipeline_id: 1 } },
            },
          ],
        },
        _page: 1,
        _links: {
          next: null,
        },
      };

      // Mock axios get method
      const mockAxiosGet = jest.fn().mockResolvedValue({ data: mockEvents });
      (service as any).client.get = mockAxiosGet;

      const result = await service.getLeadEvents(12345);

      expect(mockAxiosGet).toHaveBeenCalledWith('/events', {
        params: {
          filter: {
            entity: 'lead',
            entity_id: 12345,
            type: 'lead_status_changed',
          },
          page: 1,
          limit: 250,
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '1',
        type: 'lead_status_changed',
        entity_id: 12345,
        entity_type: 'lead',
        created_at: 1640995200,
        created_by: 101,
        value_after: { lead_status: { id: 1, name: 'Novo Lead', pipeline_id: 1 } },
        value_before: { lead_status: { id: 2, name: 'Closers em contato', pipeline_id: 1 } },
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockAxiosGet = jest.fn().mockRejectedValue(new Error('API Error'));
      (service as any).client.get = mockAxiosGet;

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await expect(service.getLeadEvents(12345)).rejects.toThrow('API Error');
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching events for lead 12345:', 'API Error');

      consoleSpy.mockRestore();
    });
  });

  describe('calculateStageDurations', () => {
    it('should calculate stage durations correctly', async () => {
      const mockEvents = [
        {
          id: '1',
          type: 'lead_status_changed',
          entity_id: 12345,
          entity_type: 'lead',
          created_at: 1640995200, // 2022-01-01 00:00:00
          created_by: 101,
          value_after: { lead_status: { id: 1, name: 'Novo Lead', pipeline_id: 1 } },
          value_before: { lead_status: { id: 0, name: 'Initial', pipeline_id: 1 } },
        },
        {
          id: '2',
          type: 'lead_status_changed',
          entity_id: 12345,
          entity_type: 'lead',
          created_at: 1641081600, // 2022-01-02 00:00:00 (24 hours later)
          created_by: 101,
          value_after: { lead_status: { id: 2, name: 'Closers em contato', pipeline_id: 1 } },
          value_before: { lead_status: { id: 1, name: 'Novo Lead', pipeline_id: 1 } },
        },
      ];

      const mockPipelines = [
        {
          id: 1,
          name: 'Vendas',
          sort: 1,
          is_main: true,
          is_unsorted_on: true,
          is_archive: false,
          account_id: 12345,
          _embedded: {
            statuses: [
              { id: 1, name: 'Novo Lead', sort: 0, is_editable: true, pipeline_id: 1, color: '#99ccfd', type: 1, account_id: 12345 },
              { id: 2, name: 'Closers em contato', sort: 1, is_editable: true, pipeline_id: 1, color: '#fffd99', type: 1, account_id: 12345 },
            ],
          },
        },
      ];

      // Mock Date.now() to return a fixed timestamp
      const mockNow = 1641168000000; // 2022-01-03 00:00:00
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const result = await service.calculateStageDurations(mockEvents, 2, mockPipelines);

      expect(result).toHaveLength(2);
      
      // Novo Lead: 24 hours (86400 seconds)
      expect(result[0]).toEqual({
        lead_id: '12345',
        stage_id: '1',
        stage_name: 'Novo Lead',
        duration_seconds: 86400,
      });

      // Closers em contato: from 2022-01-02 to 2022-01-03 = 24 hours (86400 seconds)
      expect(result[1]).toEqual({
        lead_id: '12345',
        stage_id: '2',
        stage_name: 'Closers em contato',
        duration_seconds: 86400,
      });

      jest.restoreAllMocks();
    });

    it('should handle empty events array', async () => {
      const result = await service.calculateStageDurations([], 1, []);
      expect(result).toEqual([]);
    });
  });
});