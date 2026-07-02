'use client';

import React, { useState } from 'react';
import { useTenantStore } from '../../lib/store';
import { useMounted } from '../../hooks/useMounted';
import PageHeader from '../../components/ui/page-header';
import { DashboardTab } from '../../components/financial/dashboard-tab';
import { ReceivablesTab } from '../../components/financial/receivables-tab';
import { PayablesTab } from '../../components/financial/payables-tab';
import { CashflowTab } from '../../components/financial/cashflow-tab';
import { RecurrencesTab } from '../../components/financial/recurrences-tab';
import { ReportsTab } from '../../components/financial/reports-tab';

export default function FinanceiroPage() {
  const mounted = useMounted();
  const {
    currentOrganization,
    financialEntries,
    financialRecurrences,
    addFinancialEntry,
    updateFinancialEntry,
    confirmFinancialPayment,
    cancelFinancialEntry,
    addFinancialRecurrence,
    toggleFinancialRecurrence,
    resetFinancialSandboxData
  } = useTenantStore();

  const [activeTab, setActiveTab] = useState<'visao-geral' | 'a-receber' | 'a-pagar' | 'fluxo-caixa' | 'recorrencias' | 'relatorios'>('visao-geral');

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  const tabs = [
    { id: 'visao-geral', label: 'Visão Geral' },
    { id: 'a-receber', label: 'A Receber' },
    { id: 'a-pagar', label: 'A Pagar' },
    { id: 'fluxo-caixa', label: 'Fluxo de Caixa' },
    { id: 'recorrencias', label: 'Recorrências' },
    { id: 'relatorios', label: 'Relatórios' }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Financeiro: ${currentOrganization?.name || 'Organização'}`}
        description="Controle independente de contas a pagar, a receber, fluxo de caixa e relatórios de faturamento."
      />

      {/* Premium Horizontal Navigation Menu */}
      <div className="border-b border-border/20 overflow-x-auto scrollbar-none flex -mx-6 px-6 lg:mx-0 lg:px-0">
        <nav className="flex gap-1 min-w-max pb-px">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'border-primary text-primary shadow-[inset_0_-2px_0_rgba(223,177,91,0.12)]'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border/30'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tab Panel Content */}
      <div className="animate-in fade-in duration-200">
        {activeTab === 'visao-geral' && (
          <DashboardTab
            financialEntries={financialEntries}
            onReset={resetFinancialSandboxData}
          />
        )}
        
        {activeTab === 'a-receber' && (
          <ReceivablesTab
            financialEntries={financialEntries}
            onAddEntry={addFinancialEntry}
            onUpdateEntry={updateFinancialEntry}
            onConfirmPayment={confirmFinancialPayment}
            onCancelEntry={cancelFinancialEntry}
          />
        )}

        {activeTab === 'a-pagar' && (
          <PayablesTab
            financialEntries={financialEntries}
            onAddEntry={addFinancialEntry}
            onUpdateEntry={updateFinancialEntry}
            onConfirmPayment={confirmFinancialPayment}
            onCancelEntry={cancelFinancialEntry}
          />
        )}

        {activeTab === 'fluxo-caixa' && (
          <CashflowTab
            financialEntries={financialEntries}
          />
        )}

        {activeTab === 'recorrencias' && (
          <RecurrencesTab
            financialRecurrences={financialRecurrences}
            onAddRecurrence={addFinancialRecurrence}
            onToggleRecurrence={toggleFinancialRecurrence}
          />
        )}

        {activeTab === 'relatorios' && (
          <ReportsTab
            financialEntries={financialEntries}
          />
        )}
      </div>
    </div>
  );
}
