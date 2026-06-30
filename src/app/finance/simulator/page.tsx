/**
 * src/app/finance/simulator/page.tsx
 *
 * Módulo de Simulação de Saldo e Planejamento de Compras (G-Finance).
 * Permite projetar o saldo consolidado ao adicionar compras planejadas (à vista ou parceladas),
 * deduzindo recorrências, faturas de cartão de crédito e contas a pagar do mês corrente e futuros.
 * Exibe o timeline mensal agrupado visualmente por semestres civis do ano.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Wallet, 
  Repeat, 
  CreditCard, 
  Info,
  AlertTriangle,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

interface SimulatedItem {
  id: string;
  name: string;
  amount: number;
  installments: number; // 1 for single payment
  startMonth: string; // YYYY-MM
}

interface MonthlyData {
  monthKey: string; // YYYY-MM
  label: string; // "Julho 2026"
  balances: number;
  incomes: number;
  subscriptions: number;
  oneOffBills: number;
  invoices: number;
}

export default function Simulator() {
  const [loading, setLoading] = useState(true);
  const [currentDate] = useState(() => new Date());
  
  // Real DB state data
  const [dbBalancesTotal, setDbBalancesTotal] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);
  const [creditCards, setCreditCards] = useState<any[]>([]);
  const [cardTransactions, setCardTransactions] = useState<any[]>([]);

  // Simulation parameters (Default selected month is current month)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  // Simulated items
  const [simulatedItems, setSimulatedItems] = useState<SimulatedItem[]>([]);

  // Manual starting balance overrides for each YYYY-MM month
  const [manualBalances, setManualBalances] = useState<Record<string, number>>({});

  // Form input states
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemInstallments, setNewItemInstallments] = useState(1);
  const [importUrl, setImportUrl] = useState('');
  const [scraping, setScraping] = useState(false);

  // Load simulated items and manual balances from localStorage on mount
  useEffect(() => {
    try {
      const storedItems = localStorage.getItem('gfinance_simulated_items');
      if (storedItems) {
        setSimulatedItems(JSON.parse(storedItems));
      }
      const storedBalances = localStorage.getItem('gfinance_simulator_manual_balances');
      if (storedBalances) {
        setManualBalances(JSON.parse(storedBalances));
      }
    } catch (e) {
      console.error('[Simulator] Failed to load simulated items/balances:', e);
    }
  }, []);

  // Save to localStorage when items list changes
  const saveItemsToStorage = (items: SimulatedItem[]) => {
    try {
      localStorage.setItem('gfinance_simulated_items', JSON.stringify(items));
    } catch (e) {
      console.error('[Simulator] Failed to save simulated items:', e);
    }
  };

  const handleUpdateManualBalance = (monthKey: string, value: number | undefined) => {
    const updated = { ...manualBalances };
    if (value === undefined || isNaN(value)) {
      delete updated[monthKey];
    } else {
      updated[monthKey] = value;
    }
    setManualBalances(updated);
    try {
      localStorage.setItem('gfinance_simulator_manual_balances', JSON.stringify(updated));
    } catch (e) {
      console.error('[Simulator] Failed to save manual balances:', e);
    }
  };

  // Fetch DB assets
  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Balances (Consolidated actual balance)
        const { data: balancesData } = await supabase
          .from('balances')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'total');
        
        const balTotal = (balancesData || []).reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
        setDbBalancesTotal(balTotal);

        // 2. Fetch Reminders (Incomes, recurring subscriptions and one-off bills)
        const { data: remsData } = await supabase
          .from('reminders')
          .select('*')
          .eq('user_id', user.id);
        setReminders(remsData || []);

        // 3. Fetch Credit Cards
        const { data: cardsData } = await supabase
          .from('credit_cards')
          .select('*')
          .eq('user_id', user.id);
        setCreditCards(cardsData || []);

        // 4. Fetch Credit Card transactions
        const { data: txsData } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .not('card_id', 'is', null);
        setCardTransactions(txsData || []);

      } catch (err) {
        console.error('[Simulator] Error fetching database finance data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  // Helper to generate the list of next 6 months for projection starting from current month
  const projectionMonths = useMemo(() => {
    const monthsList: { key: string; label: string; monthIndex: number; year: number }[] = [];
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    for (let i = 0; i < 6; i++) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      monthsList.push({
        key,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        monthIndex: date.getMonth(),
        year: year
      });
      date.setMonth(date.getMonth() + 1);
    }
    return monthsList;
  }, [currentDate]);

  // Aggregate monthly base costs from Database data for each projection month
  const baseMonthlyProjections = useMemo(() => {
    const projectionsMap: Record<string, MonthlyData> = {};

    projectionMonths.forEach(({ key, label, monthIndex, year }) => {
      const isCurrentMonth = monthIndex === currentDate.getMonth() && year === currentDate.getFullYear();
      const currentDay = currentDate.getDate();

      // 1. Filter incomes (reminders with positive amounts due in this specific month)
      // If recurring, matches target month if target is equal to or after original due date month
      // If current month, only sum reminders whose due date is today or in the future
      const monthlyIncomes = reminders
        .filter(r => {
          const rDate = new Date(r.due_date);
          const rMonth = rDate.getMonth();
          const rYear = rDate.getFullYear();

          const matchesMonth = r.is_recurring
            ? ((year > rYear) || (year === rYear && monthIndex >= rMonth))
            : (rMonth === monthIndex && rYear === year);

          if (!matchesMonth || Number(r.amount) <= 0) return false;
          
          if (isCurrentMonth) {
            const rDay = rDate.getDate();
            return rDay >= currentDay;
          }
          return true;
        })
        .reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

      // 2. Filter recurring subscriptions (negative reminders, is_recurring = true, due in this month)
      const monthlySubs = reminders
        .filter(r => {
          const rDate = new Date(r.due_date);
          const rMonth = rDate.getMonth();
          const rYear = rDate.getFullYear();

          const matchesMonth = r.is_recurring
            ? ((year > rYear) || (year === rYear && monthIndex >= rMonth))
            : (rMonth === monthIndex && rYear === year);

          if (!matchesMonth || Number(r.amount) >= 0 || !r.is_recurring) return false;
          
          if (isCurrentMonth) {
            const rDay = rDate.getDate();
            return rDay >= currentDay;
          }
          return true;
        })
        .reduce((acc, r) => acc + Math.abs(Number(r.amount) || 0), 0);

      // 3. Filter one-off unpaid bills (negative reminders, is_recurring = false, due in this month)
      const monthlyBills = reminders
        .filter(r => {
          const rDate = new Date(r.due_date);
          const rMonth = rDate.getMonth();
          const rYear = rDate.getFullYear();

          const matchesMonth = rMonth === monthIndex && rYear === year;

          if (!matchesMonth || Number(r.amount) >= 0 || r.is_recurring || r.paid) return false;
          
          if (isCurrentMonth) {
            const rDay = rDate.getDate();
            return rDay >= currentDay;
          }
          return true;
        })
        .reduce((acc, r) => acc + Math.abs(Number(r.amount) || 0), 0);

      // 4. Calculate Card Invoices for this month
      // Assign transactions and recurring card reminders to their billing cycles
      let monthlyInvoices = 0;
      creditCards.forEach(card => {
        const closingDay = card.closing_day || 25;

        // Sum card transactions that closes in the cycle corresponding to this month's invoice payment
        const cardTxsSum = cardTransactions
          .filter(t => {
            const tDate = new Date(t.date);
            const tDay = tDate.getDate();
            const tMonth = tDate.getMonth();
            const tYear = tDate.getFullYear();

            let billingMonth = tMonth;
            let billingYear = tYear;
            if (tDay > closingDay) {
              const nextBillingDate = new Date(tYear, tMonth + 1, 1);
              billingMonth = nextBillingDate.getMonth();
              billingYear = nextBillingDate.getFullYear();
            }

            return t.card_id === card.id && billingMonth === monthIndex && billingYear === year;
          })
          .reduce((acc, t) => acc + Math.abs(Number(t.amount) || 0), 0);

        // Sum card reminders (installments or bills set to go through card)
        const cardRemsSum = reminders
          .filter(r => {
            if (r.card_id !== card.id || Number(r.amount) >= 0 || r.paid) return false;

            const rDate = new Date(r.due_date);
            const rMonth = rDate.getMonth();
            const rYear = rDate.getFullYear();
            const rDay = rDate.getDate();

            if (r.is_recurring) {
              const isActive = (year > rYear) || (year === rYear && monthIndex >= rMonth);
              if (!isActive) return false;

              let billingMonth = monthIndex;
              let billingYear = year;
              if (rDay > closingDay) {
                const nextBillingDate = new Date(year, monthIndex + 1, 1);
                billingMonth = nextBillingDate.getMonth();
                billingYear = nextBillingDate.getFullYear();
              }
              return billingMonth === monthIndex && billingYear === year;
            } else {
              const matchesMonth = rMonth === monthIndex && rYear === year;
              if (!matchesMonth) return false;

              let billingMonth = rMonth;
              let billingYear = rYear;
              if (rDay > closingDay) {
                const nextBillingDate = new Date(rYear, rMonth + 1, 1);
                billingMonth = nextBillingDate.getMonth();
                billingYear = nextBillingDate.getFullYear();
              }
              return billingMonth === monthIndex && billingYear === year;
            }
          })
          .reduce((acc, r) => acc + Math.abs(Number(r.amount) || 0), 0);

        monthlyInvoices += (cardTxsSum + cardRemsSum);
      });

      projectionsMap[key] = {
        monthKey: key,
        label,
        balances: dbBalancesTotal,
        incomes: monthlyIncomes,
        subscriptions: monthlySubs,
        oneOffBills: monthlyBills,
        invoices: monthlyInvoices
      };
    });

    return projectionsMap;
  }, [projectionMonths, reminders, creditCards, cardTransactions, dbBalancesTotal, currentDate]);

  // Calculate the simulation results over the 6 months timeline
  const simulatedTimeline = useMemo(() => {
    const timelineList: {
      monthKey: string;
      label: string;
      startingBalance: number;
      incomes: number;
      subscriptions: number;
      oneOffBills: number;
      invoices: number;
      simulatedSpent: number;
      simulatedItemsList: SimulatedItem[];
      endingBalance: number;
    }[] = [];

    // The default starting point is the DB consolidated balance
    let lastStartingBalance = dbBalancesTotal;

    projectionMonths.forEach(({ key, label }) => {
      const base = baseMonthlyProjections[key] || {
        incomes: 0,
        subscriptions: 0,
        oneOffBills: 0,
        invoices: 0
      };

      // Determine starting balance: manual override or carry over the previous month's starting balance
      const startingBalance = manualBalances[key] !== undefined 
        ? manualBalances[key] 
        : lastStartingBalance;

      // Calculate simulated items active in this specific month
      const activeSimulated = simulatedItems.filter(item => {
        const itemMonthStart = new Date(item.startMonth + '-01');
        const currentMonthTarget = new Date(key + '-01');
        
        // Find index difference to see if installment fits
        const diffMonths = (currentMonthTarget.getFullYear() - itemMonthStart.getFullYear()) * 12 + (currentMonthTarget.getMonth() - itemMonthStart.getMonth());
        
        return diffMonths >= 0 && diffMonths < item.installments;
      });

      const simulatedSpent = activeSimulated.reduce((acc, item) => {
        const valuePerInstallment = item.amount / item.installments;
        return acc + valuePerInstallment;
      }, 0);

      // predict ending balance for this month
      const totalOutflows = base.subscriptions + base.oneOffBills + base.invoices + simulatedSpent;
      const endingBalance = startingBalance + base.incomes - totalOutflows;

      timelineList.push({
        monthKey: key,
        label,
        startingBalance,
        incomes: base.incomes,
        subscriptions: base.subscriptions,
        oneOffBills: base.oneOffBills,
        invoices: base.invoices,
        simulatedSpent,
        simulatedItemsList: activeSimulated,
        endingBalance
      });

      // Keep this month's starting balance as the default/carry-forward for the next month
      lastStartingBalance = startingBalance;
    });

    return timelineList;
  }, [projectionMonths, baseMonthlyProjections, simulatedItems, dbBalancesTotal, manualBalances]);

  // Group the 6 projected months by semester for grouped rendering in the timeline
  const groupedTimeline = useMemo(() => {
    const semestersMap: Record<string, {
      key: string;
      label: string;
      months: typeof simulatedTimeline;
    }> = {};

    simulatedTimeline.forEach(month => {
      const [yearStr, monthStr] = month.monthKey.split('-');
      const year = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);
      
      const semesterIndex = monthNum <= 6 ? 1 : 2;
      const semKey = `${year}-S${semesterIndex}`;
      const semLabel = `${semesterIndex}º Semestre ${year}`;

      if (!semestersMap[semKey]) {
        semestersMap[semKey] = {
          key: semKey,
          label: semLabel,
          months: []
        };
      }
      semestersMap[semKey].months.push(month);
    });

    return Object.values(semestersMap).sort((a, b) => a.key.localeCompare(b.key));
  }, [simulatedTimeline]);

  // Get data for currently selected month
  const activeMonthData = useMemo(() => {
    return simulatedTimeline.find(t => t.monthKey === selectedMonth) || {
      monthKey: selectedMonth,
      label: '',
      startingBalance: dbBalancesTotal,
      incomes: 0,
      subscriptions: 0,
      oneOffBills: 0,
      invoices: 0,
      simulatedSpent: 0,
      simulatedItemsList: [],
      endingBalance: dbBalancesTotal
    };
  }, [simulatedTimeline, selectedMonth, dbBalancesTotal]);

  // Detailed breakdown lists for tooltips corresponding to active selected month
  const activeMonthDetails = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const isCurrentMonth = monthIndex === currentDate.getMonth() && year === currentDate.getFullYear();
    const currentDay = currentDate.getDate();

    // 1. Incomes list
    const incomesList = reminders
      .filter(r => {
        const rDate = new Date(r.due_date);
        const rMonth = rDate.getMonth();
        const rYear = rDate.getFullYear();

        const matchesMonth = r.is_recurring
          ? ((year > rYear) || (year === rYear && monthIndex >= rMonth))
          : (rMonth === monthIndex && rYear === year);

        if (!matchesMonth || Number(r.amount) <= 0) return false;
        if (isCurrentMonth) {
          const rDay = rDate.getDate();
          return rDay >= currentDay;
        }
        return true;
      })
      .map(r => ({
        title: r.title,
        amount: Number(r.amount) || 0
      }));

    // 2. Subscriptions / Recorrências list
    const subscriptionsList = reminders
      .filter(r => {
        const rDate = new Date(r.due_date);
        const rMonth = rDate.getMonth();
        const rYear = rDate.getFullYear();

        const matchesMonth = r.is_recurring
          ? ((year > rYear) || (year === rYear && monthIndex >= rMonth))
          : (rMonth === monthIndex && rYear === year);

        if (!matchesMonth || Number(r.amount) >= 0 || !r.is_recurring) return false;
        if (isCurrentMonth) {
          const rDay = rDate.getDate();
          return rDay >= currentDay;
        }
        return true;
      })
      .map(r => ({
        title: r.title,
        amount: Math.abs(Number(r.amount) || 0)
      }));

    // 3. Contas a Pagar list
    const oneOffBillsList = reminders
      .filter(r => {
        const rDate = new Date(r.due_date);
        const rMonth = rDate.getMonth();
        const rYear = rDate.getFullYear();

        const matchesMonth = rMonth === monthIndex && rYear === year;

        if (!matchesMonth || Number(r.amount) >= 0 || r.is_recurring || r.paid) return false;
        if (isCurrentMonth) {
          const rDay = rDate.getDate();
          return rDay >= currentDay;
        }
        return true;
      })
      .map(r => ({
        title: r.title,
        amount: Math.abs(Number(r.amount) || 0)
      }));

    // 4. Faturas de Cartões list
    const invoicesList: { card_name: string; amount: number }[] = [];
    creditCards.forEach(card => {
      const closingDay = card.closing_day || 25;
      
      const cardTxsSum = cardTransactions
        .filter(t => {
          const tDate = new Date(t.date);
          const tDay = tDate.getDate();
          const tMonth = tDate.getMonth();
          const tYear = tDate.getFullYear();

          let billingMonth = tMonth;
          let billingYear = tYear;
          if (tDay > closingDay) {
            const nextBillingDate = new Date(tYear, tMonth + 1, 1);
            billingMonth = nextBillingDate.getMonth();
            billingYear = nextBillingDate.getFullYear();
          }

          return t.card_id === card.id && billingMonth === monthIndex && billingYear === year;
        })
        .reduce((acc, t) => acc + Math.abs(Number(t.amount) || 0), 0);

      const cardRemsSum = reminders
        .filter(r => {
          if (r.card_id !== card.id || Number(r.amount) >= 0 || r.paid) return false;

          const rDate = new Date(r.due_date);
          const rMonth = rDate.getMonth();
          const rYear = rDate.getFullYear();
          const rDay = rDate.getDate();

          if (r.is_recurring) {
            const isActive = (year > rYear) || (year === rYear && monthIndex >= rMonth);
            if (!isActive) return false;

            let billingMonth = monthIndex;
            let billingYear = year;
            if (rDay > closingDay) {
              const nextBillingDate = new Date(year, monthIndex + 1, 1);
              billingMonth = nextBillingDate.getMonth();
              billingYear = nextBillingDate.getFullYear();
            }
            return billingMonth === monthIndex && billingYear === year;
          } else {
            const matchesMonth = rMonth === monthIndex && rYear === year;
            if (!matchesMonth) return false;

            let billingMonth = rMonth;
            let billingYear = rYear;
            if (rDay > closingDay) {
              const nextBillingDate = new Date(rYear, rMonth + 1, 1);
              billingMonth = nextBillingDate.getMonth();
              billingYear = nextBillingDate.getFullYear();
            }
            return billingMonth === monthIndex && billingYear === year;
          }
        })
        .reduce((acc, r) => acc + Math.abs(Number(r.amount) || 0), 0);

      const cardAmount = cardTxsSum + cardRemsSum;
      
      if (cardAmount > 0) {
        invoicesList.push({
          card_name: card.card_name || `Cartão final ${card.last_four || 'XXXX'}`,
          amount: cardAmount
        });
      }
    });

    // 5. Compras Simuladas list
    const simulatedList = simulatedItems
      .filter(item => {
        const itemMonthStart = new Date(item.startMonth + '-01');
        const currentMonthTarget = new Date(selectedMonth + '-01');
        const diffMonths = (currentMonthTarget.getFullYear() - itemMonthStart.getFullYear()) * 12 + (currentMonthTarget.getMonth() - itemMonthStart.getMonth());
        return diffMonths >= 0 && diffMonths < item.installments;
      })
      .map(item => {
        const valuePerInstallment = item.amount / item.installments;
        const isParcel = item.installments > 1;
        
        const itemMonthStart = new Date(item.startMonth + '-01');
        const currentMonthTarget = new Date(selectedMonth + '-01');
        const currentInstallmentNumber = ((currentMonthTarget.getFullYear() - itemMonthStart.getFullYear()) * 12 + (currentMonthTarget.getMonth() - itemMonthStart.getMonth())) + 1;
        
        return {
          title: item.name + (isParcel ? ` (Parc. ${currentInstallmentNumber}/${item.installments})` : ''),
          amount: valuePerInstallment
        };
      });

    return {
      incomesList,
      subscriptionsList,
      oneOffBillsList,
      invoicesList,
      simulatedList
    };
  }, [selectedMonth, reminders, creditCards, cardTransactions, simulatedItems, currentDate]);

  // Form handlers
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemAmount) return;

    const parsedAmount = parseFloat(newItemAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const item: SimulatedItem = {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      amount: parsedAmount,
      installments: newItemInstallments,
      startMonth: selectedMonth
    };

    const updated = [...simulatedItems, item];
    setSimulatedItems(updated);
    saveItemsToStorage(updated);

    // Clear inputs
    setNewItemName('');
    setNewItemAmount('');
    setNewItemInstallments(1);
  };

  const handleRemoveItem = (id: string) => {
    const updated = simulatedItems.filter(item => item.id !== id);
    setSimulatedItems(updated);
    saveItemsToStorage(updated);
  };

  const clearAllSimulations = () => {
    if (confirm('Tem certeza de que deseja limpar todas as compras planejadas?')) {
      setSimulatedItems([]);
      saveItemsToStorage([]);
    }
  };

  const handleScrapeProduct = async () => {
    if (!importUrl.trim()) return;
    try {
      setScraping(true);
      const res = await fetch(`/api/finance/simulator/scrape?url=${encodeURIComponent(importUrl.trim())}`);
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao extrair dados do produto.');
      }

      if (data.name) {
        setNewItemName(data.name);
      }
      if (data.price !== undefined && data.price !== null) {
        setNewItemAmount(String(data.price));
      }
      
      setImportUrl('');
    } catch (err: any) {
      alert(err.message || 'Erro ao tentar ler o link. Certifique-se de que a URL está correta.');
    } finally {
      setScraping(false);
    }
  };

  // Determine active view panel calculations based on selectedMonth
  const displayPanelData = useMemo(() => {
    const totalOutflows = activeMonthData.subscriptions + activeMonthData.oneOffBills + activeMonthData.invoices + activeMonthData.simulatedSpent;
    const depletionPercent = activeMonthData.startingBalance > 0
      ? Math.min(Math.round((totalOutflows / (activeMonthData.startingBalance + activeMonthData.incomes)) * 100), 100)
      : 0;

    return {
      label: activeMonthData.label,
      startingBalance: activeMonthData.startingBalance,
      incomes: activeMonthData.incomes,
      subscriptions: activeMonthData.subscriptions,
      oneOffBills: activeMonthData.oneOffBills,
      invoices: activeMonthData.invoices,
      simulatedSpent: activeMonthData.simulatedSpent,
      endingBalance: activeMonthData.endingBalance,
      depletionPercent,
      details: activeMonthDetails
    };
  }, [activeMonthData, activeMonthDetails]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative h-full">
      <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative z-0">
        <div className="max-w-6xl mx-auto space-y-8 animate-in">
          
          {/* Top Month Selector and Quick Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-lg font-black tracking-tight uppercase flex items-center gap-2 text-slate-800 dark:text-white">
                <Sliders className="w-5 h-5 text-emerald-500" />
                Simulador de Saldo e Previsão
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simule compras futuras e projete seu saldo disponível nos próximos meses.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Mês da Simulação
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2.5 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 rounded-xl font-bold text-xs text-slate-700 dark:text-white focus:outline-none cursor-pointer"
              >
                {simulatedTimeline.map(m => (
                  <option key={m.monthKey} value={m.monthKey}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Form and Planned List */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Simulator Form Card */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-8 rounded-[32px] border border-white/50 dark:border-white/5 shadow-sm">
                  <h4 className="font-black text-sm mb-6 uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Simular Nova Compra
                  </h4>
                  
                  <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Importar de Link do Produto (Amazon, Shopee, Mercado Livre, etc.)</label>
                      <div className="flex gap-3">
                        <input 
                          type="url" 
                          placeholder="Cole a URL do produto aqui..."
                          value={importUrl}
                          onChange={(e) => setImportUrl(e.target.value)}
                          className="flex-1 px-4 py-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-xs text-slate-700 dark:text-white placeholder:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={handleScrapeProduct}
                          disabled={scraping || !importUrl.trim()}
                          className="px-6 py-3 bg-slate-900 text-white dark:bg-slate-950 dark:hover:bg-slate-900 hover:bg-slate-800 border border-slate-800 dark:border-white/5 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
                        >
                          {scraping ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Extraindo...
                            </>
                          ) : (
                            'Extrair Dados'
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Item / Compra</label>
                      <input 
                        type="text" 
                        placeholder="Ex: iPhone 15, Notebook"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-xs text-slate-700 dark:text-white placeholder:text-slate-400"
                        required
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Valor Total</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="0,00"
                          value={newItemAmount}
                          onChange={(e) => setNewItemAmount(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-xs text-slate-700 dark:text-white placeholder:text-slate-400"
                          required
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Forma de Pagamento</label>
                      <select
                        value={newItemInstallments}
                        onChange={(e) => setNewItemInstallments(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-xs text-slate-700 dark:text-white cursor-pointer"
                      >
                        <option value={1}>À Vista</option>
                        <option value={2}>2x (Sem Juros)</option>
                        <option value={3}>3x (Sem Juros)</option>
                        <option value={6}>6x (Sem Juros)</option>
                        <option value={10}>10x (Sem Juros)</option>
                        <option value={12}>12x (Sem Juros)</option>
                        <option value={24}>24x</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3 flex justify-end pt-2">
                      <button 
                        type="submit"
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Compra
                      </button>
                    </div>
                  </form>
                </div>

                {/* Simulated Items List Card */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-8 rounded-[32px] border border-white/50 dark:border-white/5 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-black text-sm uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-500" />
                      Compras Planejadas Ativas
                    </h4>
                    {simulatedItems.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllSimulations}
                        className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:underline transition-all cursor-pointer"
                      >
                        Limpar Tudo
                      </button>
                    )}
                  </div>

                  {displayPanelData.details.simulatedList.length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-3">
                      <ShoppingBag className="w-8 h-8 opacity-40 text-slate-400" />
                      <p className="text-xs font-semibold">Nenhuma compra planejada atinge {displayPanelData.label}.</p>
                      <p className="text-[10px] text-slate-500">Adicione compras usando o formulário acima para ver o impacto.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {simulatedItems.map(item => {
                        const isInstallment = item.installments > 1;
                        const installmentVal = item.amount / item.installments;
                        
                        // Check if item is active in the currently selected month
                        const itemMonthStart = new Date(item.startMonth + '-01');
                        const currentMonthTarget = new Date(selectedMonth + '-01');
                        const diffMonths = (currentMonthTarget.getFullYear() - itemMonthStart.getFullYear()) * 12 + (currentMonthTarget.getMonth() - itemMonthStart.getMonth());
                        const isActiveInView = diffMonths >= 0 && diffMonths < item.installments;
                        
                        let detailText = '';
                        if (isActiveInView) {
                          const currentInstallmentNumber = diffMonths + 1;
                          detailText = isInstallment 
                            ? `Parcelado em ${item.installments}x (Parc. ${currentInstallmentNumber} de ${item.installments} neste mês)` 
                            : 'Compra à Vista';
                        }

                        if (!isActiveInView) return null;

                        return (
                          <div 
                            key={item.id}
                            className="p-4 rounded-xl bg-slate-500/5 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 flex justify-between items-center gap-4 animate-in fade-in"
                          >
                            <div className="min-w-0 flex-1">
                              <h5 className="text-xs font-bold text-slate-800 dark:text-white truncate">{item.name}</h5>
                              <p className="text-[9px] text-slate-400 mt-0.5">
                                {detailText} &bull; Início em {new Date(item.startMonth + '-02').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <span className="text-xs font-black text-slate-800 dark:text-white">
                                  {isInstallment 
                                    ? `${installmentVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} /mês`
                                    : item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                                {isInstallment && (
                                  <p className="text-[8px] text-slate-400 mt-0.5">Total: {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Excluir item simulado"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Simulated Visual Timeline Card grouped by semesters */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-8 rounded-[32px] border border-white/50 dark:border-white/5 shadow-sm space-y-6">
                  <h4 className="font-black text-sm uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Projeção e Fluxo de Caixa Futuro
                  </h4>
                  
                  <div className="space-y-8">
                    {groupedTimeline.map((s) => (
                      <div key={s.key} className="space-y-4">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block border-b border-slate-100 dark:border-white/5 pb-2">
                          {s.label}
                        </span>
                        
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                          {s.months.map((t) => {
                            const isNegative = t.endingBalance < 0;
                            const isActive = t.monthKey === selectedMonth;
                            
                            // Parse key to display Month abbreviation / Short year: ex JUN / 26
                            const formattedLabelMonth = new Date(t.monthKey + '-02').toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
                            const formattedLabelYear = new Date(t.monthKey + '-02').toLocaleDateString('pt-BR', { year: '2-digit' });

                            return (
                              <button
                                key={t.monthKey}
                                type="button"
                                onClick={() => setSelectedMonth(t.monthKey)}
                                className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 cursor-pointer h-32 ${
                                  isActive
                                    ? 'bg-emerald-500/10 border-emerald-500/30 ring-2 ring-emerald-500/20 shadow-md'
                                    : 'bg-slate-500/5 hover:bg-slate-500/10 border-slate-100 dark:border-white/5'
                                }`}
                              >
                                <div>
                                  <span className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider block truncate">
                                    {formattedLabelMonth}
                                  </span>
                                  <span className="text-[8px] font-black text-slate-400 block">
                                    / {formattedLabelYear}
                                  </span>
                                </div>

                                <div className="mt-4">
                                  <span className="text-[9px] text-slate-400 block">Saldo Final</span>
                                  <span className={`text-xs font-black tracking-tight block ${
                                    isNegative ? 'text-rose-500' : 'text-slate-800 dark:text-white'
                                  }`}>
                                    {t.endingBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Simulation Math Panel */}
              <div className="lg:col-span-1 space-y-8">
                
                {/* Consolidated Prediction Card */}
                <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-[32px] border border-white/5 text-white shadow-xl space-y-6 relative overflow-hidden">
                  <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full"></div>
                  
                  <h4 className="font-black text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Info className="w-4 h-4 text-emerald-500" />
                    Projeção {displayPanelData.label}
                  </h4>

                  {/* Prediction Balance Main */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Final Previsto</span>
                    <h2 className={`text-3xl font-black tracking-tight ${
                      displayPanelData.endingBalance < 0 ? 'text-rose-500' : 'text-emerald-400'
                    }`}>
                      {displayPanelData.endingBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h2>
                  </div>

                  {/* Depletion Progress Bar */}
                  <div className="space-y-2 pt-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <span>Consumo de Receita + Saldo</span>
                      <span className={displayPanelData.depletionPercent > 80 ? 'text-orange-400' : 'text-slate-300'}>
                        {displayPanelData.depletionPercent}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          displayPanelData.depletionPercent > 90 
                            ? 'bg-rose-500' 
                            : displayPanelData.depletionPercent > 70 
                              ? 'bg-orange-500' 
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${displayPanelData.depletionPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Math Breakdown Lists */}
                  <div className="pt-6 border-t border-white/10 space-y-4 text-xs font-semibold">
                    <div className="flex justify-between items-center text-slate-400 py-1">
                      <span>Saldo Inicial</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500">R$</span>
                        <input
                          type="number"
                          placeholder={Math.round(displayPanelData.startingBalance).toString()}
                          value={manualBalances[selectedMonth] !== undefined ? manualBalances[selectedMonth] : ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            handleUpdateManualBalance(selectedMonth, val);
                          }}
                          className="w-24 px-2 py-0.5 bg-slate-800/80 dark:bg-slate-900/80 border border-white/10 rounded-lg text-white font-bold text-right focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        {manualBalances[selectedMonth] !== undefined && (
                          <button
                            type="button"
                            onClick={() => handleUpdateManualBalance(selectedMonth, undefined)}
                            className="text-[9px] text-rose-400 hover:text-rose-300 font-bold ml-1.5 shrink-0"
                            title="Resetar para saldo calculado"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Receitas Previstas */}
                    <div className="flex justify-between items-center text-slate-400 relative group cursor-help py-1">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Receitas Previstas</span>
                      </div>
                      <span className="text-emerald-400">
                        + {displayPanelData.incomes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      
                      {/* Tooltip */}
                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-slate-950/95 border border-white/15 p-4 rounded-xl shadow-2xl z-30 backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 text-[10px]">
                        <p className="font-bold text-[10px] text-slate-400 uppercase tracking-widest border-b border-white/10 pb-1.5 mb-2">Detalhamento Receitas</p>
                        {displayPanelData.details.incomesList.length === 0 ? (
                          <p className="text-slate-500 italic">Nenhuma receita prevista.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                            {displayPanelData.details.incomesList.map((item, idx) => (
                              <div key={idx} className="flex justify-between gap-2">
                                <span className="text-slate-300 truncate max-w-[150px]">{item.title}</span>
                                <span className="text-emerald-400 font-bold shrink-0">{item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assinaturas / Recorrências */}
                    <div className="flex justify-between items-center text-slate-400 relative group cursor-help py-1">
                      <div className="flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 text-blue-400" />
                        <span>Assinaturas / Recorrências</span>
                      </div>
                      <span className="text-slate-200">
                        - {displayPanelData.subscriptions.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      
                      {/* Tooltip */}
                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-slate-950/95 border border-white/15 p-4 rounded-xl shadow-2xl z-30 backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 text-[10px]">
                        <p className="font-bold text-[10px] text-slate-400 uppercase tracking-widest border-b border-white/10 pb-1.5 mb-2">Detalhamento Assinaturas</p>
                        {displayPanelData.details.subscriptionsList.length === 0 ? (
                          <p className="text-slate-500 italic">Nenhuma assinatura recorrente.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                            {displayPanelData.details.subscriptionsList.map((item, idx) => (
                              <div key={idx} className="flex justify-between gap-2">
                                <span className="text-slate-300 truncate max-w-[150px]">{item.title}</span>
                                <span className="text-slate-200 shrink-0">{item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contas a Pagar */}
                    <div className="flex justify-between items-center text-slate-400 relative group cursor-help py-1">
                      <div className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-amber-400" />
                        <span>Contas a Pagar</span>
                      </div>
                      <span className="text-slate-200">
                        - {displayPanelData.oneOffBills.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      
                      {/* Tooltip */}
                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-slate-950/95 border border-white/15 p-4 rounded-xl shadow-2xl z-30 backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 text-[10px]">
                        <p className="font-bold text-[10px] text-slate-400 uppercase tracking-widest border-b border-white/10 pb-1.5 mb-2">Detalhamento Contas</p>
                        {displayPanelData.details.oneOffBillsList.length === 0 ? (
                          <p className="text-slate-500 italic">Nenhuma conta pendente.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                            {displayPanelData.details.oneOffBillsList.map((item, idx) => (
                              <div key={idx} className="flex justify-between gap-2">
                                <span className="text-slate-300 truncate max-w-[150px]">{item.title}</span>
                                <span className="text-slate-200 shrink-0">{item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Faturas de Cartões */}
                    <div className="flex justify-between items-center text-slate-400 relative group cursor-help py-1">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Faturas de Cartões</span>
                      </div>
                      <span className="text-slate-200">
                        - {displayPanelData.invoices.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      
                      {/* Tooltip */}
                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-slate-950/95 border border-white/15 p-4 rounded-xl shadow-2xl z-30 backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 text-[10px]">
                        <p className="font-bold text-[10px] text-slate-400 uppercase tracking-widest border-b border-white/10 pb-1.5 mb-2">Faturas por Cartão</p>
                        {displayPanelData.details.invoicesList.length === 0 ? (
                          <p className="text-slate-500 italic">Nenhuma fatura de cartão.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                            {displayPanelData.details.invoicesList.map((item, idx) => (
                              <div key={idx} className="flex justify-between gap-2">
                                <span className="text-slate-300 truncate max-w-[150px]">{item.card_name}</span>
                                <span className="text-slate-200 shrink-0">{item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Compras Simuladas */}
                    <div className="flex justify-between items-center text-slate-400 relative group cursor-help py-1">
                      <div className="flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-rose-400" />
                        <span>Compras Simuladas</span>
                      </div>
                      <span className="text-rose-400">
                        - {displayPanelData.simulatedSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      
                      {/* Tooltip */}
                      <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-64 bg-slate-950/95 border border-white/15 p-4 rounded-xl shadow-2xl z-30 backdrop-blur-md animate-in fade-in slide-in-from-bottom-1 text-[10px]">
                        <p className="font-bold text-[10px] text-slate-400 uppercase tracking-widest border-b border-white/10 pb-1.5 mb-2">Detalhamento Simuladas</p>
                        {displayPanelData.details.simulatedList.length === 0 ? (
                          <p className="text-slate-500 italic">Nenhuma compra simulada.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                            {displayPanelData.details.simulatedList.map((item, idx) => (
                              <div key={idx} className="flex justify-between gap-2">
                                <span className="text-slate-300 truncate max-w-[150px]">{item.title}</span>
                                <span className="text-rose-400 font-bold shrink-0">{item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Visual warning on negative forecasted balance */}
                  {displayPanelData.endingBalance < 0 && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-start gap-2.5 mt-6 text-xs font-semibold">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-rose-300">Alerta de Fluxo de Caixa!</p>
                        <p className="mt-0.5 leading-normal opacity-90">Simulações indicam que seu saldo consolidado ficará negativo neste período. Revise compras ou planeje novos recebimentos.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Guide Information Panel */}
                <div className="p-8 rounded-[32px] bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 space-y-4">
                  <h5 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-2">
                    <Info className="w-4 h-4 text-emerald-500" />
                    Como funciona?
                  </h5>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Este simulador cruza o seu saldo bancário atual com despesas recorrentes e faturas registradas no banco para calcular a liquidez disponível.
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Adicionar compras parceladas distribuirá automaticamente a parcela devida pelos meses subsequentes, projetando o impacto nos saldos finais futuros.
                  </p>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
