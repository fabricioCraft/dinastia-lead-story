import { test, expect, Page } from '@playwright/test';

/**
 * Função auxiliar para aplicar filtro de período personalizado
 */
async function applyCustomDateFilter(page: Page, startDate: string, endDate: string) {
  console.log(`🎯 Aplicando filtro personalizado: ${startDate} a ${endDate}`);
  
  // Clicar no botão de filtro de período (pode ser "Todos os períodos" ou outro)
  await page.click('button:has(text("Todos os períodos")), button:has(text("período")), button:has(text("Período"))');
  
  // Aguardar o menu aparecer e clicar em "Período Personalizado"
  await page.waitForSelector('button:has-text("📅 Período Personalizado")', { timeout: 5000 });
  await page.click('button:has-text("📅 Período Personalizado")');
  
  // Aguardar os campos de data aparecerem
  await page.waitForSelector('input[type="date"]', { timeout: 5000 });
  
  // Preencher data inicial (primeiro campo)
  const dateInputs = await page.locator('input[type="date"]').all();
  await dateInputs[0].fill(startDate);
  
  // Preencher data final (segundo campo)
  await dateInputs[1].fill(endDate);
  
  // Aplicar filtro
  await page.click('button:has-text("Aplicar")');
  
  // Aguardar os dados carregarem
  await page.waitForTimeout(3000);
  
  console.log('✅ Filtro aplicado com sucesso');
}

/**
 * Função para extrair datas dos gráficos
 */
async function extractDatesFromChart(page: Page, chartSelector: string): Promise<string[]> {
  const dates: string[] = [];
  
  try {
    // Aguardar o gráfico carregar
    await page.waitForSelector(chartSelector, { timeout: 10000 });
    
    // Buscar por elementos que contenham datas (formato dd/MM)
    const dateElements = await page.locator(`${chartSelector} text, ${chartSelector} tspan`).all();
    
    for (const element of dateElements) {
      const text = await element.textContent();
      if (text && /\d{2}\/\d{2}/.test(text)) {
        dates.push(text.trim());
      }
    }
  } catch (error) {
    console.log(`⚠️ Erro ao extrair datas do gráfico ${chartSelector}:`, error);
  }
  
  return dates;
}

/**
 * Função para verificar se uma data está dentro do range
 */
function isDateInRange(dateStr: string, startDate: string, endDate: string): boolean {
  // Converter formato dd/MM para yyyy-MM-dd para comparação
  const [day, month] = dateStr.split('/');
  const year = '2025'; // Assumindo ano 2025 baseado no teste
  const fullDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  
  return fullDate >= startDate && fullDate <= endDate;
}

test.describe('Validação de Filtro de Data nos Gráficos', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar para o dashboard
    await page.goto('http://localhost:8080');
    
    // Aguardar carregamento inicial dos gráficos
    await page.waitForSelector('text="Volume Diário de Leads"', { timeout: 15000 });
    await page.waitForSelector('text="Volume Diário de Agendamentos"', { timeout: 15000 });
    await page.waitForTimeout(3000);
    
    console.log('📊 Dashboard carregado com sucesso');
  });

  test('deve filtrar dados corretamente para período 01/10/2025 a 31/10/2025', async ({ page }) => {
    const startDate = '2025-10-01';
    const endDate = '2025-10-31';
    const startDateDisplay = '01/10/2025';
    const endDateDisplay = '31/10/2025';

    console.log(`🧪 Iniciando teste de filtro: ${startDateDisplay} a ${endDateDisplay}`);

    // Aplicar filtro no dashboard
    await applyCustomDateFilter(page, startDate, endDate);
    
    // Aguardar os gráficos atualizarem
    await page.waitForTimeout(5000);
    
    // Verificar se o filtro foi aplicado corretamente no botão
    const filterButton = page.locator('button:has(text("01/10/2025 - 31/10/2025"))');
    await expect(filterButton).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Filtro aplicado e visível no botão');
    
    // Extrair datas do gráfico de Volume Diário de Leads
    console.log('📈 Verificando datas no gráfico de Volume Diário de Leads...');
    const leadChartDates = await extractDatesFromChart(page, '[data-testid="lead-volume-chart"], svg, canvas');
    
    // Extrair datas do gráfico de Volume Diário de Agendamentos
    console.log('📈 Verificando datas no gráfico de Volume Diário de Agendamentos...');
    const appointmentChartDates = await extractDatesFromChart(page, '[data-testid="appointment-volume-chart"], svg, canvas');
    
    // Combinar todas as datas encontradas
    const allDates = [...leadChartDates, ...appointmentChartDates];
    
    console.log(`📅 Datas encontradas nos gráficos: ${allDates.join(', ')}`);
    
    // Verificar se todas as datas estão dentro do range
    let datesOutOfRange: string[] = [];
    
    for (const dateStr of allDates) {
      if (!isDateInRange(dateStr, startDate, endDate)) {
        datesOutOfRange.push(dateStr);
      }
    }
    
    // Verificar se há dados sendo exibidos
    const leadsTotal = await page.locator('text=/Total de Leads/').first().textContent();
    const appointmentsTotal = await page.locator('text=/Total de Agendamentos/').first().textContent();
    
    console.log(`📊 Total de Leads: ${leadsTotal}`);
    console.log(`📊 Total de Agendamentos: ${appointmentsTotal}`);
    
    // Assertions
    if (datesOutOfRange.length > 0) {
      console.error(`❌ Datas fora do range encontradas: ${datesOutOfRange.join(', ')}`);
      throw new Error(`Filtro não aplicado corretamente. Datas fora do range: ${datesOutOfRange.join(', ')}`);
    }
    
    // Verificar se os gráficos ainda estão visíveis e com dados
    await expect(page.locator('text="Volume Diário de Leads"')).toBeVisible();
    await expect(page.locator('text="Volume Diário de Agendamentos"')).toBeVisible();
    
    console.log('✅ Teste de filtro de data concluído com sucesso!');
    console.log(`✅ Todas as ${allDates.length} datas encontradas estão dentro do range especificado`);
  });

  test('deve filtrar dados para período específico de 15/10/2025 a 20/10/2025', async ({ page }) => {
    const startDate = '2025-10-15';
    const endDate = '2025-10-20';
    const startDateDisplay = '15/10/2025';
    const endDateDisplay = '20/10/2025';

    console.log(`🧪 Testando período específico: ${startDateDisplay} a ${endDateDisplay}`);
    
    // Aplicar filtro
    await applyCustomDateFilter(page, startDate, endDate);
    
    // Aguardar os gráficos atualizarem
    await page.waitForTimeout(5000);
    
    // Verificar se o filtro foi aplicado
    const filterButton = page.locator('button:has(text("15/10/2025 - 20/10/2025"))');
    await expect(filterButton).toBeVisible({ timeout: 10000 });
    
    // Verificar que os gráficos ainda estão funcionando
    await expect(page.locator('text="Volume Diário de Leads"')).toBeVisible();
    await expect(page.locator('text="Volume Diário de Agendamentos"')).toBeVisible();
    
    console.log('✅ Teste de período específico concluído com sucesso!');
  });

  test('deve filtrar dados para um único dia 25/10/2025', async ({ page }) => {
    const startDate = '2025-10-25';
    const endDate = '2025-10-25';
    const dateDisplay = '25/10/2025';

    console.log(`🧪 Testando filtro para um único dia: ${dateDisplay}`);
    
    // Aplicar filtro
    await applyCustomDateFilter(page, startDate, endDate);
    
    // Aguardar os gráficos atualizarem
    await page.waitForTimeout(5000);
    
    // Verificar se o filtro foi aplicado
    const filterButton = page.locator('button:has(text("25/10/2025 - 25/10/2025"))');
    await expect(filterButton).toBeVisible({ timeout: 10000 });
    
    // Verificar que os gráficos ainda estão funcionando
    await expect(page.locator('text="Volume Diário de Leads"')).toBeVisible();
    await expect(page.locator('text="Volume Diário de Agendamentos"')).toBeVisible();
    
    console.log('✅ Teste de filtro para um único dia concluído com sucesso!');
  });
});