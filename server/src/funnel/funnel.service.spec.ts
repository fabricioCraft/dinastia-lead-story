import { FunnelService } from './funnel.service';

describe('FunnelService.getSummary', () => {
  const mockClickUpTasks = [
    { id: 'task_1', name: 'João Paulo Arruda Dias', status: { status: 'Closers em contato' } },
    { id: 'task_2', name: 'Bruno Berner', status: { status: 'Agendados' } },
    { id: 'task_3', name: 'Lead Sem Origem', status: { status: 'Novo Lead' } },
  ];
  const expectedEnrichedLeads = [
    { id: 'task_1', name: 'João Paulo Arruda Dias', status: 'Closers em contato', origin: 'manychat' },
    { id: 'task_2', name: 'Bruno Berner', status: 'Agendados', origin: 'starter10k' },
    { id: 'task_3', name: 'Lead Sem Origem', status: 'Novo Lead', origin: null },
  ];

  it('should merge ClickUp tasks with Supabase origins', async () => {
    const clickupMock = { getTasksFromList: jest.fn().mockResolvedValue(mockClickUpTasks) } as any;
    const supabaseMock = { findOriginsByClickupIds: jest.fn().mockResolvedValue({
      task_1: 'manychat', task_2: 'starter10k'
    }) } as any;
    const service = new FunnelService(clickupMock, supabaseMock);
    process.env.CLICKUP_LIST_ID = 'dummy';
    const result = await service.getSummary();
    expect(clickupMock.getTasksFromList).toHaveBeenCalledWith('dummy');
    expect(supabaseMock.findOriginsByClickupIds).toHaveBeenCalledWith(['task_1','task_2','task_3']);
    expect(result).toEqual(expectedEnrichedLeads);
  });
});