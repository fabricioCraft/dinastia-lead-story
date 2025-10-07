import { DashboardService } from './dashboard.service';

describe('DashboardService.getFunnelBreakdownForOrigin', () => {
  const mockKommoLeadIds = ['lead_1', 'lead_2', 'lead_3'];

  const mockKommoLeads = [
    { lead_id: 'lead_1', status: 'Agendados', origin: 'manychat' },
    { lead_id: 'lead_2', status: 'Vendas', origin: 'manychat' },
    { lead_id: 'lead_3', status: 'Agendados', origin: 'manychat' },
    // Lead fora da origem
    { lead_id: 'lead_4', status: 'Novo Lead', origin: 'other' },
  ];

  it('should return aggregated breakdown for origin without zero-count statuses', async () => {
    const supabaseMock = {
      findKommoIdsByOrigin: jest.fn().mockResolvedValue(mockKommoLeadIds),
      aggregateOriginsForKommoIds: jest.fn().mockResolvedValue([
        { status: 'Agendados', count: 2 },
        { status: 'Vendas', count: 1 },
      ]),
    } as any;

    const service = new DashboardService(supabaseMock);

    const result = await service.getFunnelBreakdownForOrigin('manychat');

    expect(supabaseMock.findKommoIdsByOrigin).toHaveBeenCalledWith('manychat');
    expect(supabaseMock.aggregateOriginsForKommoIds).toHaveBeenCalledWith(mockKommoLeadIds);

    // O resultado esperado no teste para 'manychat'
    const expectedBreakdown = [
      { status: 'Agendados', count: 2 },
      { status: 'Vendas', count: 1 },
    ];

    // Comparação ignorando ordem
    expect(result.sort((a, b) => a.status.localeCompare(b.status))).toEqual(
      expectedBreakdown.sort((a, b) => a.status.localeCompare(b.status))
    );

    // Garantir que não inclua status com contagem zero, nem leads fora da origem
    expect(result.find((x) => x.status === 'Novo Lead')).toBeUndefined();
  });

  it('should filter by days when specified', async () => {
    const supabaseMock = {
      findKommoIdsByOrigin: jest.fn().mockResolvedValue(mockKommoLeadIds),
      getRecentKommoLeadIds: jest.fn().mockResolvedValue(['lead_1', 'lead_2']),
      aggregateOriginsForKommoIds: jest.fn().mockResolvedValue([
        { status: 'Agendados', count: 1 },
        { status: 'Vendas', count: 1 },
      ]),
    } as any;

    const service = new DashboardService(supabaseMock);

    const result = await service.getFunnelBreakdownForOrigin('manychat', 7);

    expect(supabaseMock.findKommoIdsByOrigin).toHaveBeenCalledWith('manychat');
    expect(supabaseMock.getRecentKommoLeadIds).toHaveBeenCalledWith(7);
    expect(supabaseMock.aggregateOriginsForKommoIds).toHaveBeenCalledWith(['lead_1', 'lead_2']);

    expect(result).toEqual([
      { status: 'Agendados', count: 1 },
      { status: 'Vendas', count: 1 },
    ]);
  });
});