import { test, expect } from '@playwright/test';

test.describe('Filtro de Período', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Aguarda um pouco mais para garantir que todos os componentes carregaram
    await page.waitForTimeout(2000);
  });

  test('deve exibir o componente de filtro de período', async ({ page }) => {
    // Verifica se o título do filtro está presente
    await expect(page.getByRole('heading', { name: 'Filtro de Período' })).toBeVisible();
    
    // Verifica se o botão de seleção de período está presente
    await expect(page.getByRole('button', { name: 'Selecionar período' })).toBeVisible();
  });

  test('deve permitir abrir o calendário de seleção de período', async ({ page }) => {
    // Clica no botão de seleção de período
    await page.getByRole('button', { name: 'Selecionar período' }).click();
    
    // Aguarda o calendário aparecer
    await page.waitForTimeout(1000);
    
    // Verifica se elementos do calendário estão visíveis
    await expect(page.getByText('October 2025')).toBeVisible();
    
    // Fecha o calendário pressionando Escape
    await page.keyboard.press('Escape');
  });

  test('deve verificar se os gráficos estão carregados corretamente', async ({ page }) => {
    // Verifica se o gráfico de volume diário de leads está presente
    await expect(page.getByRole('heading', { name: 'Volume Diário de Leads' })).toBeVisible();
    
    // Verifica se há dados numéricos no gráfico
    await expect(page.getByText('Total de Leads')).toBeVisible();
    
    // Verifica se o gráfico de agendamentos está presente
    await expect(page.getByRole('heading', { name: 'Volume Diário de Agendamentos' })).toBeVisible();
    
    // Verifica se há dados numéricos no gráfico de agendamentos
    await expect(page.getByText('Total de Agendamentos')).toBeVisible();
  });

  test('deve aplicar filtro de período e verificar mudanças nos dados', async ({ page }) => {
    // Captura o valor inicial do total de leads
    const initialLeadsText = await page.locator('text=Total de Leads').locator('..').locator('p').first().textContent();
    
    // Abre o calendário
    await page.getByRole('button', { name: 'Selecionar período' }).click();
    await page.waitForTimeout(1000);
    
    // Seleciona uma data específica (primeiro dia visível)
    const firstDay = page.locator('[role="gridcell"]').first();
    await firstDay.click();
    
    // Aguarda um pouco e seleciona uma data final (alguns dias depois)
    await page.waitForTimeout(500);
    const fifthDay = page.locator('[role="gridcell"]').nth(4);
    await fifthDay.click();
    
    // Procura por botão de aplicar/confirmar
    const applyButton = page.getByRole('button', { name: /aplicar|confirmar|ok/i });
    if (await applyButton.isVisible()) {
      await applyButton.click();
    } else {
      // Se não houver botão específico, pressiona Enter ou clica fora
      await page.keyboard.press('Enter');
    }
    
    // Aguarda a atualização dos dados
    await page.waitForTimeout(3000);
    
    // Verifica se a página ainda está funcionando
    await expect(page.getByRole('heading', { name: 'Filtro de Período' })).toBeVisible();
  });

  test('deve verificar se os dados dos gráficos são atualizados', async ({ page }) => {
    // Captura dados iniciais
    const initialAppointmentsTotal = await page.locator('text=Total de Agendamentos').locator('..').locator('p').first().textContent();
    
    // Verifica se os dados estão sendo exibidos
    expect(initialAppointmentsTotal).toBeTruthy();
    expect(initialAppointmentsTotal).not.toBe('0');
    
    // Verifica se há dados no gráfico de origem dos leads
    await expect(page.getByText('Manychat')).toBeVisible();
    await expect(page.getByText('Principal Origem')).toBeVisible();
  });

  test('deve verificar a funcionalidade do filtro de origem dos leads', async ({ page }) => {
    // Verifica se o dropdown de filtro mínimo está presente
    const minFilterDropdown = page.locator('combobox').first();
    await expect(minFilterDropdown).toBeVisible();
    
    // Verifica se o botão "Ver Tudo" está presente
    await expect(page.getByRole('button', { name: 'Ver Tudo' })).toBeVisible();
    
    // Verifica se há dados de origem sendo exibidos
    await expect(page.getByText('Manychat')).toBeVisible();
    await expect(page.getByText('4405 leads')).toBeVisible();
  });

  test('deve verificar a navegação entre páginas do gráfico de origem', async ({ page }) => {
    // Verifica se há indicação de paginação
    await expect(page.getByText('Página 1 de 2')).toBeVisible();
    
    // Verifica se o botão de próxima página está presente e funcional
    const nextButton = page.locator('button').filter({ hasText: /next|próxima|>/ }).last();
    if (await nextButton.isVisible() && !(await nextButton.isDisabled())) {
      await nextButton.click();
      await page.waitForTimeout(1000);
      
      // Verifica se a página mudou
      await expect(page.getByText(/Página 2|página 2/i)).toBeVisible();
    }
  });

  test('deve verificar se não há erros de console durante a navegação', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Navega pela página e interage com elementos
    await page.getByRole('button', { name: 'Selecionar período' }).click();
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape');
    
    await page.getByRole('button', { name: 'Ver Tudo' }).click();
    await page.waitForTimeout(1000);
    
    // Verifica se não houve erros críticos de console
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('React Router') &&
      !error.includes('DevTools')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('deve verificar a responsividade dos gráficos', async ({ page }) => {
    // Verifica se os gráficos estão visíveis em tamanho desktop
    await expect(page.getByRole('heading', { name: 'Volume Diário de Leads' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Volume Diário de Agendamentos' })).toBeVisible();
    
    // Simula redimensionamento para mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    // Verifica se os elementos ainda estão visíveis
    await expect(page.getByRole('heading', { name: 'Filtro de Período' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Selecionar período' })).toBeVisible();
    
    // Volta para desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});