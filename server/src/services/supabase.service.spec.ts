import { SupabaseService } from './supabase.service';

// Mock do Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
};

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation
    mockSupabaseClient.from.mockReset();
    service = new SupabaseService();
    // Inject mock client
    (service as any).client = mockSupabaseClient;
  });

  describe('aggregateKommoLeadsByOrigin', () => {
    it('should aggregate leads by origin without days filter', async () => {
      const mockData = [
        { origin: 'manychat', count: 5 },
        { origin: 'starter10k', count: 3 },
        { origin: 'facebook', count: 2 },
      ];

      // Create comprehensive mock chain
      const mockNot = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockSelect = jest.fn().mockReturnValue({ not: mockNot });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabaseClient.from = mockFrom;

      const result = await service.aggregateKommoLeadsByOrigin();

      expect(mockFrom).toHaveBeenCalledWith('kommo_leads_snapshot');
      expect(mockSelect).toHaveBeenCalledWith('origin, count(*)');
      expect(mockNot).toHaveBeenCalledWith('origin', 'is', null);
      expect(result).toEqual([
        { origin: 'manychat', count: 5 },
        { origin: 'starter10k', count: 3 },
        { origin: 'facebook', count: 2 },
      ]);
    });

    it('should aggregate leads by origin with days filter', async () => {
      const mockData = [
        { origin: 'manychat', count: 2 },
      ];

      // Create comprehensive mock chain with gte
      const mockGte = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockNot = jest.fn().mockReturnValue({ gte: mockGte });
      const mockSelect = jest.fn().mockReturnValue({ not: mockNot });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabaseClient.from = mockFrom;

      const result = await service.aggregateKommoLeadsByOrigin(7);

      expect(mockFrom).toHaveBeenCalledWith('kommo_leads_snapshot');
      expect(mockSelect).toHaveBeenCalledWith('origin, count(*)');
      expect(mockNot).toHaveBeenCalledWith('origin', 'is', null);
      expect(mockGte).toHaveBeenCalledWith('last_updated_at', expect.any(String));
      expect(result).toEqual([
        { origin: 'manychat', count: 2 },
      ]);
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create comprehensive mock chain with error
      const mockNot = jest.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } });
      const mockSelect = jest.fn().mockReturnValue({ not: mockNot });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

      mockSupabaseClient.from = mockFrom;

      const result = await service.aggregateKommoLeadsByOrigin();

      expect(consoleSpy).toHaveBeenCalledWith('Supabase aggregateKommoLeadsByOrigin error:', 'Database error');
      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should return empty array when client is null', async () => {
      (service as any).client = null;
      const result = await service.aggregateKommoLeadsByOrigin();
      expect(result).toEqual([]);
    });
  });

  describe('upsertLeadStageDurations', () => {
    it('should upsert lead stage durations successfully', async () => {
      const mockDurations = [
        { lead_id: 'lead_1', stage_id: 'stage_1', stage_name: 'Novo Lead', duration_seconds: 86400 },
        { lead_id: 'lead_1', stage_id: 'stage_2', stage_name: 'Closers em contato', duration_seconds: 172800 },
      ];

      // Create mocks for delete operations (one for each duration)
      const createDeleteMock = () => {
        const mockEqSecond = jest.fn().mockResolvedValue({ error: null });
        const mockEqFirst = jest.fn().mockReturnValue({ eq: mockEqSecond });
        const mockDelete = jest.fn().mockReturnValue({ eq: mockEqFirst });
        return { delete: mockDelete };
      };

      // Create mock for insert operation
      const mockInsert = jest.fn().mockResolvedValue({ error: null });
      const insertMock = { insert: mockInsert };

      // Configure mockSupabaseClient.from to return appropriate mocks
      mockSupabaseClient.from
        .mockReturnValueOnce(createDeleteMock()) // first delete
        .mockReturnValueOnce(createDeleteMock()) // second delete
        .mockReturnValueOnce(insertMock); // insert

      const result = await service.upsertLeadStageDurations(mockDurations);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('lead_stage_durations');
      expect(mockInsert).toHaveBeenCalledWith(mockDurations);
      expect(result).toBe(2);
    });

    it('should handle errors during upsert', async () => {
      const mockDurations = [
        { lead_id: 'lead_1', stage_id: 'stage_1', stage_name: 'Novo Lead', duration_seconds: 86400 },
      ];

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create mock for delete operation (successful)
      const createDeleteMock = () => {
        const mockEqSecond = jest.fn().mockResolvedValue({ error: null });
        const mockEqFirst = jest.fn().mockReturnValue({ eq: mockEqSecond });
        const mockDelete = jest.fn().mockReturnValue({ eq: mockEqFirst });
        return { delete: mockDelete };
      };

      // Create mock for insert operation (with error)
      const mockInsert = jest.fn().mockResolvedValue({ error: { message: 'Insert error' } });
      const insertMock = { insert: mockInsert };

      // Configure mockSupabaseClient.from to return appropriate mocks
      mockSupabaseClient.from
        .mockReturnValueOnce(createDeleteMock()) // delete operation
        .mockReturnValueOnce(insertMock); // insert operation

      const result = await service.upsertLeadStageDurations(mockDurations);

      expect(consoleSpy).toHaveBeenCalledWith('Supabase upsertLeadStageDurations insert error:', 'Insert error');
      expect(result).toBe(0);

      consoleSpy.mockRestore();
    });

    it('should return 0 when no durations provided', async () => {
      const result = await service.upsertLeadStageDurations([]);
      expect(result).toBe(0);
    });

    it('should return 0 when client is null', async () => {
      (service as any).client = null;
      const mockDurations = [
        { lead_id: 'lead_1', stage_id: 'stage_1', stage_name: 'Novo Lead', duration_seconds: 86400 },
      ];
      const result = await service.upsertLeadStageDurations(mockDurations);
      expect(result).toBe(0);
    });
  });

  describe('getAverageTimeInStageFromDurations', () => {
    it('should get average time in stage from durations', async () => {
      const mockData = [
        { stage_name: 'Novo Lead', duration_seconds: 86400 },
        { stage_name: 'Novo Lead', duration_seconds: 172800 },
        { stage_name: 'Closers em contato', duration_seconds: 259200 },
      ];

      // Create a more complete mock chain
      const mockNotSecond = jest.fn().mockResolvedValue({ data: mockData, error: null });
      const mockNotFirst = jest.fn().mockReturnValue({ not: mockNotSecond });
      const mockSelect = jest.fn().mockReturnValue({ not: mockNotFirst });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      
      mockSupabaseClient.from = mockFrom;

      const result = await service.getAverageTimeInStageFromDurations();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('lead_stage_durations');
      expect(result).toEqual([
        { stage_name: 'Novo Lead', avg_duration_seconds: 129600 },
        { stage_name: 'Closers em contato', avg_duration_seconds: 259200 },
      ]);
    });

    it('should handle errors gracefully', async () => {
      // Create a more complete mock chain with error
      const mockNotSecond = jest.fn().mockResolvedValue({ data: null, error: { message: 'Query error' } });
      const mockNotFirst = jest.fn().mockReturnValue({ not: mockNotSecond });
      const mockSelect = jest.fn().mockReturnValue({ not: mockNotFirst });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      
      mockSupabaseClient.from = mockFrom;

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await service.getAverageTimeInStageFromDurations();

      expect(consoleSpy).toHaveBeenCalledWith('Supabase getAverageTimeInStageFromDurations error:', 'Query error');
      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should return empty array when no data', async () => {
      // Create a more complete mock chain with empty data
      const mockNotSecond = jest.fn().mockResolvedValue({ data: [], error: null });
      const mockNotFirst = jest.fn().mockReturnValue({ not: mockNotSecond });
      const mockSelect = jest.fn().mockReturnValue({ not: mockNotFirst });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      
      mockSupabaseClient.from = mockFrom;

      const result = await service.getAverageTimeInStageFromDurations();

      expect(result).toEqual([]);
    });

    it('should return empty array when client is null', async () => {
      (service as any).client = null;
      const result = await service.getAverageTimeInStageFromDurations();
      expect(result).toEqual([]);
    });
  });
});