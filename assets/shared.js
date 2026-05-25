// Mock Data for G-Finance
window.mockTransactions = [
  { id: 1, date: '2026-05-24', description: 'Supermercado Pão de Açúcar', category: 'Alimentação', value: -450.20, type: 'expense' },
  { id: 2, date: '2026-05-23', description: 'Salário Mensal - Antigravity', category: 'Trabalho', value: 12500.00, type: 'income' },
  { id: 3, date: '2026-05-22', description: 'Assinatura Netflix', category: 'Entretenimento', value: -55.90, type: 'expense' },
  { id: 4, date: '2026-05-21', description: 'Venda de Criptoativos', category: 'Investimentos', value: 1200.00, type: 'income' },
  { id: 5, date: '2026-05-20', description: 'Academia Bluefit', category: 'Saúde', value: -129.90, type: 'expense' },
  { id: 6, date: '2026-05-19', description: 'Restaurante Mani', category: 'Lazer', value: -320.00, type: 'expense' },
  { id: 7, date: '2026-05-18', description: 'Dividendos Petrobras', category: 'Investimentos', value: 450.00, type: 'income' },
];

window.mockHistory = [
  { month: 'Dez', income: 11000, expense: 9500 },
  { month: 'Jan', income: 12500, expense: 8000 },
  { month: 'Fev', income: 10000, expense: 11000 },
  { month: 'Mar', income: 14000, expense: 7500 },
  { month: 'Abr', income: 12500, expense: 9000 },
  { month: 'Mai', income: 13200, expense: 8800 },
];

// Tailwind Config
window.tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          bg: 'oklch(98% 0.004 240)',
          surface: 'oklch(100% 0 0)',
          fg: 'oklch(20% 0.02 240)',
          muted: 'oklch(50% 0.018 240)',
          border: 'oklch(90% 0.006 240)',
          accent: 'oklch(56% 0.12 170)',
          success: 'oklch(65% 0.18 150)',
          danger: 'oklch(60% 0.2 25)',
        },
      },
      borderRadius: {
        'card': '18px',
        'button': '12px',
      }
    }
  }
};
