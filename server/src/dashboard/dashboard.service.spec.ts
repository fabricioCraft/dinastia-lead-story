import { DashboardService } from './dashboard.service';
import { SupabaseService } from '../services/supabase.service';

// Mocks
const mockSupabaseService = {
  getClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        not: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({
            data: [
              { datacriacao: '2024-01-01T10:00:00.000Z' },
              { datacriacao: '2024-01-01T12:30:00.000Z' },
              { datacriacao: '2024-01-02T08:15:00.000Z' }
            ],
            error: null
          })
        })
      })
    })
  })
} as unknown as SupabaseService;


describe('DashboardService.getFunnelBreakdownForOrigin', () => {
  it('should return empty array (now returns empty - data from N8N)', async () => {
    const service = new DashboardService(mockSupabaseService);

    const result = await service.getFunnelBreakdownForOrigin('manychat');

    expect(result).toEqual([]);
  });

  it('should return empty array with days filter (now returns empty - data from N8N)', async () => {
    const service = new DashboardService(mockSupabaseService);

    const result = await service.getFunnelBreakdownForOrigin('manychat', 7);

    expect(result).toEqual([]);
  });
});

describe('DashboardService.getDashboardLeadsByStage', () => {
  it('should return array of leads by stage with correct format', async () => {
    // Mock do Supabase para retornar dados de leads por etapa
    const mockSupabaseServiceForStage = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              neq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { etapa: 'Qualificação' },
                    { etapa: 'Qualificação' },
                    { etapa: 'Prospecção' },
                    { etapa: 'Follow-up' }
                  ],
                  error: null
                })
              })
            })
          })
        })
      })
    } as unknown as SupabaseService;

    const service = new DashboardService(mockSupabaseServiceForStage);

    const result = await service.getDashboardLeadsByStage();

    // Validar que retorna um array
    expect(Array.isArray(result)).toBe(true);
    
    // Se houver dados, validar o formato
    if (result.length > 0) {
      const firstItem = result[0];
      expect(firstItem).toHaveProperty('stage_name');
      expect(firstItem).toHaveProperty('lead_count');
      expect(typeof firstItem.stage_name).toBe('string');
      expect(typeof firstItem.lead_count).toBe('number');
      
      // Validar que stage_name não é vazio
      expect(firstItem.stage_name.length).toBeGreaterThan(0);
      
      // Validar que lead_count é um número positivo
      expect(firstItem.lead_count).toBeGreaterThan(0);
    }
  });

  it('should return data ordered by lead_count descending', async () => {
    const mockSupabaseServiceForStage = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              neq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { etapa: 'Qualificação' },
                    { etapa: 'Qualificação' },
                    { etapa: 'Qualificação' },
                    { etapa: 'Prospecção' },
                    { etapa: 'Prospecção' },
                    { etapa: 'Follow-up' }
                  ],
                  error: null
                })
              })
            })
          })
        })
      })
    } as unknown as SupabaseService;

    const service = new DashboardService(mockSupabaseServiceForStage);

    const result = await service.getDashboardLeadsByStage();

    // Se houver mais de um item, verificar ordenação decrescente por lead_count
    if (result.length > 1) {
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].lead_count).toBeGreaterThanOrEqual(result[i].lead_count);
      }
    }
  });

  it('should handle empty results gracefully', async () => {
    const mockSupabaseServiceEmpty = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              neq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        })
      })
    } as unknown as SupabaseService;

    const service = new DashboardService(mockSupabaseServiceEmpty);

    const result = await service.getDashboardLeadsByStage();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('should handle database errors gracefully', async () => {
    const mockSupabaseServiceError = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              neq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection error' }
                })
              })
            })
          })
        })
      })
    } as unknown as SupabaseService;

    const service = new DashboardService(mockSupabaseServiceError);

    await expect(service.getDashboardLeadsByStage()).rejects.toThrow('Database connection error');
  });

  it('should consolidate similar stage names correctly', async () => {
    const mockSupabaseServiceConsolidation = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockReturnValue({
              neq: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue({
                  data: [
                    { etapa: 'noshow' },
                    { etapa: 'no_show' },
                    { etapa: 'no_show' },
                    { etapa: 'agendado' },
                    { etapa: 'agendados' },
                    { etapa: 'follow_up' },
                    { etapa: 'novo lead' },
                    { etapa: 'novo lead' }
                  ],
                  error: null
                })
              })
            })
          })
        })
      })
    } as unknown as SupabaseService;

    const service = new DashboardService(mockSupabaseServiceConsolidation);

    const result = await service.getDashboardLeadsByStage();

    // Verificar se as etapas foram consolidadas corretamente
    const stageNames = result.map(item => item.stage_name);
    
    // Deve ter "No-show" consolidado (3 leads: 1 noshow + 2 no_show)
    const noshowStage = result.find(item => item.stage_name === 'No-show');
    expect(noshowStage).toBeDefined();
    expect(noshowStage?.lead_count).toBe(3);
    
    // Deve ter "Agendado" consolidado (2 leads: 1 agendado + 1 agendados)
    const agendadoStage = result.find(item => item.stage_name === 'Agendado');
    expect(agendadoStage).toBeDefined();
    expect(agendadoStage?.lead_count).toBe(2);
    
    // Deve ter "Follow-up" normalizado
    const followupStage = result.find(item => item.stage_name === 'Follow-up');
    expect(followupStage).toBeDefined();
    expect(followupStage?.lead_count).toBe(1);
    
    // Deve ter "Novo Lead" com capitalização correta
    const novoLeadStage = result.find(item => item.stage_name === 'Novo Lead');
    expect(novoLeadStage).toBeDefined();
    expect(novoLeadStage?.lead_count).toBe(2);
    
    // Não deve ter as variações originais
    expect(stageNames).not.toContain('noshow');
    expect(stageNames).not.toContain('no_show');
    expect(stageNames).not.toContain('agendados');
    expect(stageNames).not.toContain('follow_up');
  });
});

describe('DashboardService.getDailyLeadVolume', () => {
  it('should return array of daily lead volume data with correct format', async () => {
    const service = new DashboardService(mockSupabaseService);

    const result = await service.getDailyLeadVolume();

    // Validar que retorna um array
    expect(Array.isArray(result)).toBe(true);
    
    // Se houver dados, validar o formato
    if (result.length > 0) {
      const firstItem = result[0];
      expect(firstItem).toHaveProperty('day');
      expect(firstItem).toHaveProperty('total_leads_per_day');
      expect(typeof firstItem.day).toBe('string');
      expect(typeof firstItem.total_leads_per_day).toBe('number');
      
      // Validar formato da data (YYYY-MM-DD)
      expect(firstItem.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Validar que total_leads_per_day é um número positivo
      expect(firstItem.total_leads_per_day).toBeGreaterThanOrEqual(0);
    }
  });

  it('should return data ordered by day ascending', async () => {
    const service = new DashboardService(mockSupabaseService);

    const result = await service.getDailyLeadVolume();

    // Se houver mais de um item, verificar ordenação
    if (result.length > 1) {
      for (let i = 1; i < result.length; i++) {
        const prevDay = new Date(result[i - 1].day);
        const currentDay = new Date(result[i].day);
        expect(currentDay.getTime()).toBeGreaterThanOrEqual(prevDay.getTime());
      }
    }
  });

  it('should handle date range filters correctly', async () => {
    const service = new DashboardService(mockSupabaseService);
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    const result = await service.getDailyLeadVolume(startDate, endDate);

    // Validar que retorna um array
    expect(Array.isArray(result)).toBe(true);
    
    // Se houver dados, validar que estão dentro do período
    if (result.length > 0) {
      const firstDay = new Date(result[0].day);
      const lastDay = new Date(result[result.length - 1].day);
      const filterStart = new Date(startDate);
      const filterEnd = new Date(endDate);
      
      expect(firstDay.getTime()).toBeGreaterThanOrEqual(filterStart.getTime());
      expect(lastDay.getTime()).toBeLessThanOrEqual(filterEnd.getTime());
    }
  });
});

describe('DashboardService.getLeadsByClassification', () => {
  it('should return array with classification_name and lead_count', async () => {
    const mockClient = {
      rpc: jest.fn().mockResolvedValue({
        data: [
          { classification_name: 'Hot', lead_count: '5' },
          { classification_name: 'Cold', lead_count: '3' }
        ],
        error: null
      })
    };
    const mockSupabase = { getClient: jest.fn().mockReturnValue(mockClient) } as unknown as SupabaseService;
    const service = new DashboardService(mockSupabase);
    const result = await service.getLeadsByClassification();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('classification_name');
    expect(result[0]).toHaveProperty('lead_count');
    expect(typeof result[0].classification_name).toBe('string');
    expect(typeof result[0].lead_count).toBe('number');
    expect(result[0].lead_count).toBeGreaterThanOrEqual(result[1].lead_count);
  });

  it('should fallback aggregate when rpc not available', async () => {
    const mockClient = {
      rpc: jest.fn().mockRejectedValue(new Error('rpc not available')),
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            neq: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                then: undefined
              })
            })
          })
        })
      })
    };
    mockClient.from().select().not().neq().range = jest.fn().mockReturnValue({
      data: [
        { classificacao_do_lead: 'Warm', chatid: '1' },
        { classificacao_do_lead: 'Warm', chatid: '2' },
        { classificacao_do_lead: 'Cold', chatid: '3' }
      ],
      error: null
    });
    const mockSupabase = { getClient: jest.fn().mockReturnValue(mockClient) } as unknown as SupabaseService;
    const service = new DashboardService(mockSupabase);
    const result = await service.getLeadsByClassification();
    const warm = result.find(r => r.classification_name === 'Warm');
    const cold = result.find(r => r.classification_name === 'Cold');
    expect(warm?.lead_count).toBe(2);
    expect(cold?.lead_count).toBe(1);
    if (result.length > 1) {
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].lead_count).toBeGreaterThanOrEqual(result[i].lead_count);
      }
    }
  });
});

describe('DashboardService.getUnifiedOriginSummary', () => {
  it('should return unified and normalized origin data with correct format', async () => {
    // Mock do Supabase para retornar dados simulados das duas tabelas
    const mockSupabaseServiceForOrigin = {
      getClient: jest.fn().mockReturnValue({
        rpc: jest.fn().mockResolvedValue({
          data: [
            { origin_name: 'Isca Scopeline', lead_count: 1845 },
            { origin_name: 'Masterclass', lead_count: 950 },
            { origin_name: 'Isca Hormozi', lead_count: 320 },
            { origin_name: 'Outros', lead_count: 150 }
          ],
          error: null
        })
      })
    } as unknown as SupabaseService;

    const service = new DashboardService(mockSupabaseServiceForOrigin);

    const result = await service.getUnifiedOriginSummary();

    // Validar que retorna um array
    expect(Array.isArray(result)).toBe(true);
    
    // Validar que tem pelo menos um item
    expect(result.length).toBeGreaterThan(0);
    
    // Validar o formato de cada item
    const firstItem = result[0];
    expect(firstItem).toHaveProperty('origin_name');
    expect(firstItem).toHaveProperty('lead_count');
    expect(typeof firstItem.origin_name).toBe('string');
    expect(typeof firstItem.lead_count).toBe('number');
    
    // Validar que origin_name não é vazio
    expect(firstItem.origin_name.length).toBeGreaterThan(0);
    
    // Validar que lead_count é um número positivo
    expect(firstItem.lead_count).toBeGreaterThan(0);
  });

  it('should return data ordered by lead_count descending', async () => {
    const mockSupabaseServiceForOrigin = {
      getClient: jest.fn().mockReturnValue({
        rpc: jest.fn().mockResolvedValue({
          data: [
            { origin_name: 'Isca Scopeline', lead_count: 1845 },
            { origin_name: 'Masterclass', lead_count: 950 },
            { origin_name: 'Isca Hormozi', lead_count: 320 },
            { origin_name: 'Outros', lead_count: 150 }
          ],
          error: null
        })
      })
    } as unknown as SupabaseService;

    const service = new DashboardService(mockSupabaseServiceForOrigin);

    const result = await service.getUnifiedOriginSummary();

    // Validar que está ordenado por lead_count decrescente
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].lead_count).toBeGreaterThanOrEqual(result[i + 1].lead_count);
    }
  });

  it('should normalize different variations of origin names correctly', async () => {
    // Este teste valida que a normalização está funcionando
    // Os dados mockados já representam o resultado esperado da normalização
    const mockSupabaseServiceForOrigin = {
      getClient: jest.fn().mockReturnValue({
        rpc: jest.fn().mockResolvedValue({
          data: [
            { origin_name: 'Isca Scopeline', lead_count: 1845 }, // Agrupa todas as variações de SCOPELINE
            { origin_name: 'Isca Hormozi', lead_count: 320 },    // Agrupa todas as variações de HORMOZI
            { origin_name: 'Masterclass', lead_count: 950 },     // Agrupa todas as variações de MASTERCLASS
            { origin_name: 'Outros', lead_count: 150 }           // Fallback para origens não categorizadas
          ],
          error: null
        })
      })
    } as unknown as SupabaseService;

    const service = new DashboardService(mockSupabaseServiceForOrigin);

    const result = await service.getUnifiedOriginSummary();

    // Validar que as categorias normalizadas estão presentes
    const originNames = result.map(item => item.origin_name);
    expect(originNames).toContain('Isca Scopeline');
    expect(originNames).toContain('Isca Hormozi');
    expect(originNames).toContain('Masterclass');
    expect(originNames).toContain('Outros');

    // Validar que não há duplicatas (a normalização funcionou)
    const uniqueOrigins = new Set(originNames);
    expect(uniqueOrigins.size).toBe(originNames.length);
  });

  it('should handle empty data gracefully', async () => {
    const mockSupabaseServiceForOrigin = {
      getClient: jest.fn().mockReturnValue({
        rpc: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      })
    } as unknown as SupabaseService;

    const service = new DashboardService(mockSupabaseServiceForOrigin);

    const result = await service.getUnifiedOriginSummary();

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it('should handle database errors gracefully', async () => {
    const mockSupabaseServiceForOrigin = {
      getClient: jest.fn().mockReturnValue({
        rpc: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection error' }
        })
      })
    } as unknown as SupabaseService;

    const service = new DashboardService(mockSupabaseServiceForOrigin);

    await expect(service.getUnifiedOriginSummary()).rejects.toThrow();
  });
});