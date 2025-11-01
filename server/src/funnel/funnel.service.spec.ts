import { FunnelService, TimeInStageItem } from './funnel.service';
import { SupabaseService } from '../services/supabase.service';
import { LeadStageHistoryService, StageAverageTime } from '../services/lead-stage-history.service';

describe('FunnelService', () => {
  let service: FunnelService;
  let mockSupabaseService: jest.Mocked<SupabaseService>;
  let mockLeadStageHistoryService: jest.Mocked<LeadStageHistoryService>;

  beforeEach(() => {
    mockSupabaseService = {
      getAverageTimeInStageFromHistory: jest.fn(),
      getAverageTimeInStageFromTimestamps: jest.fn(),
      getSchedulingRate: jest.fn(),
    } as any;

    mockLeadStageHistoryService = {
      getAverageTimePerStage: jest.fn(),
      addStageEntry: jest.fn(),
      finalizePreviousStage: jest.fn(),
      getLeadHistory: jest.fn(),
      hasHistory: jest.fn(),
      getLeadsInStage: jest.fn(),
      getHistoryStats: jest.fn(),
    } as any;
    
    service = new FunnelService(mockSupabaseService, mockLeadStageHistoryService);
  });

  it('should return time in stage data from historical lead_stage_durations table', async () => {
    // Mock dos dados históricos retornados pelo LeadStageHistoryService
    const mockHistoricalData: StageAverageTime[] = [
      { stage_name: "Novos Leads", avg_duration_seconds: 103680, total_leads: 100 }, // 1.2 dias
      { stage_name: "Tentado Conexão", avg_duration_seconds: 241920, total_leads: 80 }, // 2.8 dias
      { stage_name: "Conectado/Qualificação", avg_duration_seconds: 129600, total_leads: 60 }, // 1.5 dias
      { stage_name: "Oportunidade", avg_duration_seconds: 276480, total_leads: 40 }, // 3.2 dias
      { stage_name: "Negociação", avg_duration_seconds: 69120, total_leads: 20 }, // 0.8 dias
    ];
    
    mockLeadStageHistoryService.getAverageTimePerStage.mockResolvedValue(mockHistoricalData);
    
    const result = await service.getTimeInStage();
    
    expect(mockLeadStageHistoryService.getAverageTimePerStage).toHaveBeenCalledTimes(1);
    expect(mockSupabaseService.getAverageTimeInStageFromTimestamps).not.toHaveBeenCalled();
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({
      stage: "Novos Leads",
      averageTimeInDays: 1.2,
      averageTimeInSeconds: 103680
    });
    expect(result[1]).toEqual({
      stage: "Tentado Conexão",
      averageTimeInDays: 2.8,
      averageTimeInSeconds: 241920
    });
    expect(result[2]).toEqual({
      stage: "Conectado/Qualificação", 
      averageTimeInDays: 1.5,
      averageTimeInSeconds: 129600
    });
    expect(result[3]).toEqual({
      stage: "Oportunidade",
      averageTimeInDays: 3.2,
      averageTimeInSeconds: 276480
    });
    expect(result[4]).toEqual({
      stage: "Negociação",
      averageTimeInDays: 0.8,
      averageTimeInSeconds: 69120
    });
  });

  it('should handle empty data gracefully', async () => {
    const mockHistoryData: StageAverageTime[] = [];
    const mockTimestampData = [];
    
    mockLeadStageHistoryService.getAverageTimePerStage.mockResolvedValue(mockHistoryData);
    mockSupabaseService.getAverageTimeInStageFromTimestamps.mockResolvedValue(mockTimestampData);
    
    const result = await service.getTimeInStage();
    
    expect(mockLeadStageHistoryService.getAverageTimePerStage).toHaveBeenCalledTimes(1);
    expect(mockSupabaseService.getAverageTimeInStageFromTimestamps).toHaveBeenCalledTimes(1);
    expect(result).toEqual([]);
  });

  it('should handle database errors gracefully', async () => {
    const errorMessage = 'Database connection failed';
    mockLeadStageHistoryService.getAverageTimePerStage.mockRejectedValue(new Error(errorMessage));
    
    await expect(service.getTimeInStage()).rejects.toThrow(errorMessage);
    expect(mockLeadStageHistoryService.getAverageTimePerStage).toHaveBeenCalledTimes(1);
  });

  // Teste relacionado ao kommo_leads_snapshot removido - não utilizamos mais essa integração

    it('deve calcular durações precisas usando EXTRACT(EPOCH FROM ...)', async () => {
      const mockHistoryData: StageAverageTime[] = [];
      const mockTimestampData = [
        { stage_name: 'Novos Leads', avg_duration_seconds: 172800 }, // 2 dias
        { stage_name: 'Tentado Conexão', avg_duration_seconds: 86400 }, // 1 dia
        { stage_name: 'Conectado/Qualificação', avg_duration_seconds: 259200 }, // 3 dias
      ];

      mockLeadStageHistoryService.getAverageTimePerStage.mockResolvedValue(mockHistoryData);
      mockSupabaseService.getAverageTimeInStageFromTimestamps.mockResolvedValue(mockTimestampData);

      const result = await service.getTimeInStage();

      // Verifica se os valores são precisos em segundos
      expect(result[0].averageTimeInSeconds).toBe(172800); // 2 dias = 172800 segundos
      expect(result[1].averageTimeInSeconds).toBe(86400);  // 1 dia = 86400 segundos
      expect(result[2].averageTimeInSeconds).toBe(259200); // 3 dias = 259200 segundos
      
      // Verifica se os valores em dias estão corretos
      expect(result[0].averageTimeInDays).toBe(2.0);
      expect(result[1].averageTimeInDays).toBe(1.0);
      expect(result[2].averageTimeInDays).toBe(3.0);
    });

    it('deve lidar com durações zero corretamente', async () => {
      const mockHistoryData: StageAverageTime[] = [];
      const mockTimestampData = [
        { stage_name: 'Novos Leads', avg_duration_seconds: 0 },
        { stage_name: 'Tentado Conexão', avg_duration_seconds: 86400 },
      ];

      mockLeadStageHistoryService.getAverageTimePerStage.mockResolvedValue(mockHistoryData);
      mockSupabaseService.getAverageTimeInStageFromTimestamps.mockResolvedValue(mockTimestampData);

      const result = await service.getTimeInStage();

      expect(result[0].averageTimeInSeconds).toBe(0);
      expect(result[0].averageTimeInDays).toBe(0);
    });

    it('deve validar que as colunas de timestamp corretas são usadas', async () => {
      const mockHistoryData: StageAverageTime[] = [];
      const mockTimestampData = [
        { stage_name: 'Novos Leads', avg_duration_seconds: 172800 },
        { stage_name: 'Tentado Conexão', avg_duration_seconds: 86400 },
        { stage_name: 'Conectado/Qualificação', avg_duration_seconds: 259200 },
        { stage_name: 'Closers em Contato', avg_duration_seconds: 345600 },
        { stage_name: 'Negociação', avg_duration_seconds: 432000 },
      ];

      mockLeadStageHistoryService.getAverageTimePerStage.mockResolvedValue(mockHistoryData);
      mockSupabaseService.getAverageTimeInStageFromTimestamps.mockResolvedValue(mockTimestampData);

      const result = await service.getTimeInStage();

      expect(mockSupabaseService.getAverageTimeInStageFromTimestamps).toHaveBeenCalled();
      expect(result).toHaveLength(5);
      expect(result.map(r => r.stage)).toEqual([
        'Novos Leads',
        'Tentado Conexão', 
        'Conectado/Qualificação',
        'Oportunidade',
        'Negociação'
      ]);
    });

  it('deve priorizar dados do histórico quando disponíveis', async () => {
      const mockHistoryData: StageAverageTime[] = [
        { stage_name: 'Novos Leads', avg_duration_seconds: 100000, total_leads: 50 },
        { stage_name: 'Tentado Conexão', avg_duration_seconds: 200000, total_leads: 30 },
      ];

      const expectedResult: TimeInStageItem[] = [
        { stage: 'Novos Leads', averageTimeInDays: 1.2, averageTimeInSeconds: 100000 },
        { stage: 'Tentado Conexão', averageTimeInDays: 2.3, averageTimeInSeconds: 200000 },
      ];

      mockLeadStageHistoryService.getAverageTimePerStage.mockResolvedValue(mockHistoryData);

      const result = await service.getTimeInStage();

      expect(mockLeadStageHistoryService.getAverageTimePerStage).toHaveBeenCalled();
      expect(mockSupabaseService.getAverageTimeInStageFromTimestamps).not.toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

  describe('getTimeInStage - Timestamp-based calculation (TDD)', () => {
    it('should use timestamp-based calculation when history service returns empty data', async () => {
      // Arrange: Mock history service to return empty data (fallback scenario)
      mockLeadStageHistoryService.getAverageTimePerStage.mockResolvedValue([]);
      
      // Mock timestamp-based data
      const mockTimestampData = [
        { stage_name: "Leads Novos", avg_duration_seconds: 86400 }, // 1 dia
        { stage_name: "Closers em Contato", avg_duration_seconds: 172800 }, // 2 dias
        { stage_name: "Agendados", avg_duration_seconds: 259200 }, // 3 dias
        { stage_name: "Call Realizada", avg_duration_seconds: 345600 }, // 4 dias
        { stage_name: "Vendas", avg_duration_seconds: 432000 }, // 5 dias
      ];
      
      mockSupabaseService.getAverageTimeInStageFromTimestamps.mockResolvedValue(mockTimestampData);
      
      // Act
      const result = await service.getTimeInStage();
      
      // Assert
      expect(mockLeadStageHistoryService.getAverageTimePerStage).toHaveBeenCalledTimes(1);
      expect(mockSupabaseService.getAverageTimeInStageFromTimestamps).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({
        stage: "Leads Novos",
        averageTimeInDays: 1.0,
        averageTimeInSeconds: 86400
      });
      expect(result[1]).toEqual({
        stage: "Closers em Contato",
        averageTimeInDays: 2.0,
        averageTimeInSeconds: 172800
      });
    });

    it('should correctly calculate average durations using SQL EXTRACT(EPOCH FROM ...) function', async () => {
      // Arrange: Mock history service to return empty data (force timestamp fallback)
      mockLeadStageHistoryService.getAverageTimePerStage.mockResolvedValue([]);
      
      // Mock realistic timestamp-based calculations
      const mockTimestampData = [
        { stage_name: "Leads Novos", avg_duration_seconds: 129600 }, // 1.5 dias
        { stage_name: "Closers em Contato", avg_duration_seconds: 216000 }, // 2.5 dias
        { stage_name: "Agendados", avg_duration_seconds: 302400 }, // 3.5 dias
        { stage_name: "Call Realizada", avg_duration_seconds: 388800 }, // 4.5 dias
        { stage_name: "Vendas", avg_duration_seconds: 475200 }, // 5.5 dias
      ];
      
      mockSupabaseService.getAverageTimeInStageFromTimestamps.mockResolvedValue(mockTimestampData);
      
      // Act
      const result = await service.getTimeInStage();
      
      // Assert: Verify SQL function was called and data transformation is correct
      expect(mockSupabaseService.getAverageTimeInStageFromTimestamps).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(5);
      
      // Verify precise calculations (rounded to 1 decimal place)
      expect(result[0]).toEqual({
        stage: "Leads Novos",
        averageTimeInDays: 1.5,
        averageTimeInSeconds: 129600
      });
      expect(result[1]).toEqual({
        stage: "Closers em Contato", 
        averageTimeInDays: 2.5,
        averageTimeInSeconds: 216000
      });
      expect(result[2]).toEqual({
        stage: "Agendados",
        averageTimeInDays: 3.5,
        averageTimeInSeconds: 302400
      });
    });

    it('should handle edge cases with zero durations from timestamp calculations', async () => {
      // Arrange: Mock history service to return empty data
      mockLeadStageHistoryService.getAverageTimePerStage.mockResolvedValue([]);
      
      // Mock edge case where some stages have zero duration
      const mockTimestampData = [
        { stage_name: "Leads Novos", avg_duration_seconds: 0 }, // Transição instantânea
        { stage_name: "Closers em Contato", avg_duration_seconds: 3600 }, // 1 hora
        { stage_name: "Agendados", avg_duration_seconds: 1800 }, // 30 minutos
      ];
      
      mockSupabaseService.getAverageTimeInStageFromTimestamps.mockResolvedValue(mockTimestampData);
      
      // Act
      const result = await service.getTimeInStage();
      
      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        stage: "Leads Novos",
        averageTimeInDays: 0.0,
        averageTimeInSeconds: 0
      });
      expect(result[1]).toEqual({
        stage: "Closers em Contato",
        averageTimeInDays: 0.0, // 3600/86400 = 0.04 -> rounded to 0.0
        averageTimeInSeconds: 3600
      });
    });

    // Teste relacionado ao kommo_leads_snapshot removido - não utilizamos mais essa integração

    it('should prioritize history service over timestamp fallback when history data exists', async () => {
      // Arrange: Mock history service to return data (should NOT use timestamp fallback)
      const mockHistoryData: StageAverageTime[] = [
        { stage_name: "Leads Novos", avg_duration_seconds: 100000, total_leads: 50 }
      ];
      mockLeadStageHistoryService.getAverageTimePerStage.mockResolvedValue(mockHistoryData);
      
      // Mock timestamp data (should NOT be called)
      mockSupabaseService.getAverageTimeInStageFromTimestamps.mockResolvedValue([]);
      
      // Act
      const result = await service.getTimeInStage();
      
      // Assert: Verify history service is used and timestamp service is NOT called
      expect(mockLeadStageHistoryService.getAverageTimePerStage).toHaveBeenCalledTimes(1);
      expect(mockSupabaseService.getAverageTimeInStageFromTimestamps).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].stage).toBe("Leads Novos");
    });
  });

  describe('getSchedulingRate', () => {
    it('should calculate scheduling rate correctly when leads exist', async () => {
      // Mock dos dados retornados pelo Supabase
      const mockSchedulingData = [
        { scheduling_rate: 0.42 } // 42% de taxa de agendamento
      ];
      
      mockSupabaseService.getSchedulingRate.mockResolvedValue(mockSchedulingData);
      
      const result = await service.getSchedulingRate();
      
      expect(mockSupabaseService.getSchedulingRate).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ schedulingRate: 0.42 });
    });

    it('should return 0 when no leads exist', async () => {
      // Mock para cenário sem leads
      const mockSchedulingData = [
        { scheduling_rate: null }
      ];
      
      mockSupabaseService.getSchedulingRate.mockResolvedValue(mockSchedulingData);
      
      const result = await service.getSchedulingRate();
      
      expect(mockSupabaseService.getSchedulingRate).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ schedulingRate: 0 });
    });

    it('should handle empty result gracefully', async () => {
      // Mock para resultado vazio
      mockSupabaseService.getSchedulingRate.mockResolvedValue([]);
      
      const result = await service.getSchedulingRate();
      
      expect(mockSupabaseService.getSchedulingRate).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ schedulingRate: 0 });
    });

    it('should handle database errors gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockSupabaseService.getSchedulingRate.mockRejectedValue(new Error(errorMessage));
      
      await expect(service.getSchedulingRate()).rejects.toThrow(errorMessage);
      expect(mockSupabaseService.getSchedulingRate).toHaveBeenCalledTimes(1);
    });
  });
});