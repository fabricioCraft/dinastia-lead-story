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

  // Todos os testes do Kommo foram removidos
  // Os dados agora vêm do N8N
  it('should initialize service correctly', () => {
    expect(service).toBeDefined();
  });
});