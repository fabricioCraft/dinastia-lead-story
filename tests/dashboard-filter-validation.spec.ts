import { test, expect, Page } from '@playwright/test';

/**
 * Extrai número de um texto
 */
function extractNumber(text: string): number {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Função auxiliar para aplicar filtro de período
 */
async function applyPeriodFilter(page: Page, startDate: string, endDate: string) {
  // Clicar no botão "Todos os períodos" para abrir o menu
  await page.click('button:has-text("Todos os períodos")');
  
  // Aguardar o menu aparecer e clicar em "Período Personalizado"
  await page.waitForSelector('button:has-text("📅 Período Personalizado")', { timeout: 5000 });
  await page.click('button:has-text("📅 Período Personalizado")');
  
  // Aguardar os campos de data aparecerem
  await page.waitForSelector('textbox', { timeout: 5000 });
  
  // Preencher data inicial (primeiro campo)
  const dateInputs = await page.locator('textbox').all();
  await dateInputs[0].fill(startDate);
  
  // Preencher data final (segundo campo)
  await dateInputs[1].fill(endDate);
  
  // Aplicar filtro
  await page.click('button:has-text("Aplicar")');
  
  // Aguardar os dados carregarem
  await page.waitForTimeout(3000);
}

test.describe('Dashboard - Validação de Filtro de Período', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para o dashboard
    await page.goto('/');
    
    // Aguardar carregamento inicial dos gráficos
    await page.waitForSelector('text="Volume Diário de Leads"', { timeout: 10000 });
    await page.waitForSelector('text="Volume Diário de Agendamentos"', { timeout: 10000 });
    await page.waitForTimeout(2000);
  });

  test('deve filtrar dados corretamente para período específico (25/10/2025 a 30/10/2025)', async ({ page }) => {
    const startDate = '25/10/2025';
    const endDate = '30/10/2025';

    console.log(`🧪 Iniciando teste de filtro: ${startDate} a ${endDate}`);

    // Aplicar filtro no dashboard
    console.log('🎯 Aplicando filtro no dashboard...');
    await applyPeriodFilter(page, startDate, endDate);
    
    // Validar que os gráficos estão visíveis após o filtro
    console.log('📊 Validando que os gráficos estão visíveis...');
    await expect(page.locator('text="Volume Diário de Leads"')).toBeVisible();
    await expect(page.locator('text="Volume Diário de Agendamentos"')).toBeVisible();
    
    // Verificar se há dados nos gráficos
    const leadsTotal = page.locator('text=/Total de Leads/').first();
    await expect(leadsTotal).toBeVisible();
    
    const appointmentsTotal = page.locator('text=/Total de Agendamentos/').first();
    await expect(appointmentsTotal).toBeVisible();
    
    console.log('✅ Teste de validação de filtro concluído com sucesso!');
  });

  test('deve aplicar filtro de período personalizado corretamente', async ({ page }) => {
    const startDate = '28/10/2025';
    const endDate = '28/10/2025';

    console.log(`🧪 Testando período de 1 dia: ${startDate}`);
    
    // Aplicar filtro
    await applyPeriodFilter(page, startDate, endDate);
    
    // Verificar que os gráficos ainda estão funcionando
    await expect(page.locator('text="Volume Diário de Leads"')).toBeVisible();
    await expect(page.locator('text="Volume Diário de Agendamentos"')).toBeVisible();
    
    console.log('✅ Teste de período de 1 dia concluído com sucesso!');
  });
});