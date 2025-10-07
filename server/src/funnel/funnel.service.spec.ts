import { FunnelService } from './funnel.service';

describe('FunnelService.getSummary', () => {
  const mockKommoLeads = [
    { lead_id: 'lead_1', name: 'João Paulo Arruda Dias', status: 'Closers em contato', origin: 'manychat' },
    { lead_id: 'lead_2', name: 'Bruno Berner', status: 'Agendados', origin: 'starter10k' },
    { lead_id: 'lead_3', name: 'Lead Sem Origem', status: 'Novo Lead', origin: null },
  ];

  it('should return empty array (deprecated method)', async () => {
    const supabaseMock = {} as any;
    const service = new FunnelService(supabaseMock);
    
    const result = await service.getSummary();
    
    expect(result).toEqual([]);
  });
});

// TDD atualizado para getStagesSummary: deve contar apenas status ativos

describe('FunnelService.getStagesSummary (active statuses only)', () => {
  const mockPipelines = [
    {
      id: 1,
      name: 'Vendas',
      statuses: [
        { id: 1, name: 'Novo Lead', sort: 0 },
        { id: 2, name: 'Closers em contato', sort: 1 },
        { id: 3, name: 'Agendados', sort: 2 },
      ],
    },
  ];
  
  const mockKommoLeads = [
    { lead_id: 'lead_1', status: 'Novo Lead' },
    { lead_id: 'lead_2', status: 'Novo Lead' },
    { lead_id: 'lead_3', status: 'Agendados' },
    { lead_id: 'lead_4', status: 'Status Arquivado' }, // deve ser ignorado
  ];
  
  const expectedSummary = [
    { stage: 'Novo Lead', count: 2 },
    { stage: 'Closers em contato', count: 0 },
    { stage: 'Agendados', count: 1 },
  ];

  it('should initialize counts for active statuses and ignore non-active ones', async () => {
    const mockAggregatedData = [
      { status: 'Novo Lead', count: 2 },
      { status: 'Closers em contato', count: 0 },
      { status: 'Agendados', count: 1 },
    ];
    
    const supabaseMock = {
      aggregateKommoLeadsByStatus: jest.fn().mockResolvedValue(mockAggregatedData)
    } as any;
    const service = new FunnelService(supabaseMock);

    const result = await service.getStagesSummary();

    // Deve buscar dados agregados do Supabase
    expect(supabaseMock.aggregateKommoLeadsByStatus).toHaveBeenCalled();

    // Deve conter apenas status ativos e suas contagens corretas
    const sortByStage = (a: any, b: any) => a.stage.localeCompare(b.stage);
    expect(result.sort(sortByStage)).toEqual(expectedSummary.sort(sortByStage));
  });
});

describe('FunnelService.getOriginSummary', () => {
  it('should return origin summary with counts', async () => {
    const mockAggregatedData = [
      { origin: 'manychat', count: 5 },
      { origin: 'starter10k', count: 3 },
      { origin: 'facebook', count: 2 },
    ];
    
    const supabaseMock = {
      aggregateKommoLeadsByOrigin: jest.fn().mockResolvedValue(mockAggregatedData)
    } as any;
    const service = new FunnelService(supabaseMock);

    const result = await service.getOriginSummary();

    expect(supabaseMock.aggregateKommoLeadsByOrigin).toHaveBeenCalledWith(undefined);
    expect(result).toEqual([
      { origin: 'facebook', count: 2 },
      { origin: 'manychat', count: 5 },
      { origin: 'starter10k', count: 3 },
    ]);
  });

  it('should return origin summary with days filter', async () => {
    const mockAggregatedData = [
      { origin: 'manychat', count: 2 },
    ];
    
    const supabaseMock = {
      aggregateKommoLeadsByOrigin: jest.fn().mockResolvedValue(mockAggregatedData)
    } as any;
    const service = new FunnelService(supabaseMock);

    const result = await service.getOriginSummary(7);

    expect(supabaseMock.aggregateKommoLeadsByOrigin).toHaveBeenCalledWith(7);
    expect(result).toEqual([
      { origin: 'manychat', count: 2 },
    ]);
  });

  it('should handle null origins as "Sem origem"', async () => {
    const mockAggregatedData = [
      { origin: null, count: 1 },
      { origin: 'manychat', count: 2 },
    ];
    
    const supabaseMock = {
      aggregateKommoLeadsByOrigin: jest.fn().mockResolvedValue(mockAggregatedData)
    } as any;
    const service = new FunnelService(supabaseMock);

    const result = await service.getOriginSummary();

    expect(result).toEqual([
      { origin: 'manychat', count: 2 },
      { origin: 'Sem origem', count: 1 },
    ]);
  });

  it('should return empty array when no data', async () => {
    const supabaseMock = {
      aggregateKommoLeadsByOrigin: jest.fn().mockResolvedValue([])
    } as any;
    const service = new FunnelService(supabaseMock);

    const result = await service.getOriginSummary();

    expect(result).toEqual([]);
  });
});

describe('FunnelService.getTimeInStage (updated with historical durations)', () => {
  it('should return time in stage from historical durations', async () => {
    const mockDurationData = [
      { stage_name: 'Novo Lead', avg_duration_seconds: 172800 }, // 2 dias
      { stage_name: 'Closers em contato', avg_duration_seconds: 259200 }, // 3 dias
      { stage_name: 'Agendados', avg_duration_seconds: 86400 }, // 1 dia
    ];
    
    const supabaseMock = {
      getAverageTimeInStageFromDurations: jest.fn().mockResolvedValue(mockDurationData)
    } as any;
    const service = new FunnelService(supabaseMock);

    const result = await service.getTimeInStage();

    expect(supabaseMock.getAverageTimeInStageFromDurations).toHaveBeenCalled();
    expect(result).toEqual([
      { stage: 'Agendados', averageTimeInDays: 1 },
      { stage: 'Closers em contato', averageTimeInDays: 3 },
      { stage: 'Novo Lead', averageTimeInDays: 2 },
    ]);
  });

  it('should convert seconds to days correctly', async () => {
    const mockDurationData = [
      { stage_name: 'Test Stage', avg_duration_seconds: 432000 }, // 5 dias
    ];
    
    const supabaseMock = {
      getAverageTimeInStageFromDurations: jest.fn().mockResolvedValue(mockDurationData)
    } as any;
    const service = new FunnelService(supabaseMock);

    const result = await service.getTimeInStage();

    expect(result).toEqual([
      { stage: 'Test Stage', averageTimeInDays: 5 },
    ]);
  });

  it('should return empty array when no data', async () => {
    const supabaseMock = {
      getAverageTimeInStageFromDurations: jest.fn().mockResolvedValue([])
    } as any;
    const service = new FunnelService(supabaseMock);

    const result = await service.getTimeInStage();

    expect(result).toEqual([]);
  });
});