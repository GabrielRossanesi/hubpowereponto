'use client';

// ⚠️ DÍVIDA TÉCNICA — módulo de PROPOSTAS ainda NÃO migrado para o banco real.
// Esta página lê exclusivamente do store Zustand (mock/sandbox), independentemente
// do data-mode. NÃO é bug de produção: propostas/financeiro seguem em fase de
// estruturação. Ao migrar, seguir o padrão de publicações (Server Component +
// server actions com escopo de tenant). Ver task.md.

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ShieldAlert, Calendar, CreditCard, Clock, Check, X } from 'lucide-react';
import { useStore } from '../../../lib/store';
import { useMounted } from '../../../hooks/useMounted';
import { PLATFORM_NAME } from '../../../lib/config';
import { LogoHorizontal } from '../../../components/ui/logo';
import Button from '../../../components/ui/button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import Badge from '../../../components/ui/badge';
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/table';

export default function PublicProposalPage() {
  const params = useParams();
  const mounted = useMounted();
  const proposalId = params.id as string;
  const { proposals, organizations, organizationFeatures, acceptProposalFlow, declineProposalFlow } = useStore();

  const [hasAgreed, setHasAgreed] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  const proposal = proposals.find(p => p.id === proposalId);
  const organization = proposal ? organizations.find(o => o.id === proposal.organizationId) : null;

  if (!proposal || !organization) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-background">
        <ShieldAlert className="h-16 w-16 text-danger mb-4" />
        <h1 className="text-xl font-bold text-foreground">Proposta não encontrada</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">O link acessado é inválido, a proposta foi excluída ou a organização correspondente não está ativa.</p>
      </div>
    );
  }

  const features = organizationFeatures?.find(f => f.organizationId === organization.id);
  const isPublicProposalEnabled = features ? features.publicProposal !== false : true;

  if (!isPublicProposalEnabled) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-background text-center max-w-md mx-auto">
        <ShieldAlert className="h-16 w-16 text-warning mb-4" />
        <h1 className="text-xl font-bold text-foreground">Proposta indisponível</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          A página pública de proposta não está habilitada para esta organização no momento.
        </p>
      </div>
    );
  }

  const handleAccept = () => {
    if (!hasAgreed) {
      alert('Você precisa ler e marcar o termo de aceitação.');
      return;
    }
    
    acceptProposalFlow(proposal.id);
    setActionMessage('Proposta aceita com sucesso! O contrato e faturamento foram gerados. 🚀');
  };

  const handleDecline = () => {
    const confirm = window.confirm('Deseja realmente recusar esta proposta?');
    if (confirm) {
      declineProposalFlow(proposal.id);
      setActionMessage('Proposta recusada.');
    }
  };

  // Calculations
  const totalSetup = proposal.items.filter(i => !i.isMonthly).reduce((sum, item) => sum + item.value, 0);
  const totalMonthly = proposal.items.filter(i => i.isMonthly).reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
        
        {/* Top Navbar Header */}
        <header className="flex items-center justify-between border-b border-border/60 pb-6">
          <Link href="/" className="flex items-center">
            <LogoHorizontal size="md" />
          </Link>
          <div className="text-right">
            <span className="text-xs text-muted-foreground block font-mono">Cód: {proposal.id}</span>
            <span className="text-xs text-muted-foreground">Emissão: {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
        </header>

        {/* Global Action Banner */}
        {actionMessage && (
          <div className={`p-4 rounded-xl border flex items-center gap-2.5 text-sm font-semibold ${
            proposal.status === 'accepted' 
              ? 'bg-success/10 border-success/20 text-success' 
              : 'bg-muted border-border text-muted-foreground'
          }`}>
            {proposal.status === 'accepted' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <X className="h-5 w-5 shrink-0" />}
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column - Scope and Items */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Title Summary */}
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <div className="pb-1.5">
                    <Badge variant="default" className="px-4 py-1 text-[10px] sm:text-[11px] tracking-wider uppercase font-bold">PROPOSTA COMERCIAL</Badge>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                    {proposal.description}
                  </h1>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-between text-xs text-muted-foreground border-t border-border/40 pt-4">
                  <div>
                    <span>Preparado por:</span>
                    <strong className="text-foreground block mt-0.5 text-sm">{organization.name}</strong>
                    <span className="text-[10px] font-mono block text-muted-foreground">CNPJ: {organization.cnpj}</span>
                  </div>
                  <div className="sm:text-right">
                    <span>Destinatário:</span>
                    <strong className="text-foreground block mt-0.5 text-sm">{proposal.companyName}</strong>
                    <span className="text-[10px] block text-muted-foreground">A/C: {proposal.clientName}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan of Items Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Detalhamento dos Serviços</CardTitle>
                <CardDescription>Itens que compõem o escopo contratado.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop View */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição do Serviço</TableHead>
                        <TableHead>Frequência</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {proposal.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-foreground">{item.description}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {item.isMonthly ? (
                              <span className="text-primary font-semibold">Recorrente Mensal</span>
                            ) : (
                              'Setup / Taxa Única'
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card Layout Alternative */}
                <div className="block md:hidden divide-y divide-border/40">
                  {proposal.items.map((item) => (
                    <div key={item.id} className="p-4 space-y-2">
                      <div className="font-semibold text-sm text-foreground">{item.description}</div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Frequência:</span>
                        {item.isMonthly ? (
                          <span className="text-primary font-semibold">Recorrente Mensal</span>
                        ) : (
                          <span className="text-muted-foreground">Setup / Taxa Única</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="font-bold text-foreground">
                          R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Terms & Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold">Observações e Termos Contratuais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                <div className="p-4 bg-muted/40 border border-border rounded-lg text-foreground/90 whitespace-pre-line">
                  {proposal.notes || 'Nenhuma nota especial inserida na proposta comercial.'}
                </div>
                
                <div className="space-y-2">
                  <span className="font-semibold text-foreground block">Cláusulas Importantes:</span>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>O aceite desta proposta gera automaticamente a minuta de contrato de prestação de serviços correspondente.</li>
                    <li>As cobranças mensais recorrentes iniciarão em até 5 dias após a assinatura digital do contrato viaZapSign.</li>
                    <li>O faturamento padrão será realizado via Asaas e as faturas serão enviadas diretamente no e-mail informado.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Decision Action Card */}
          <div className="space-y-6">
            
            {/* Totals Summary */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo Financeiro</h2>
                
                <div className="space-y-3 divide-y divide-border/40">
                  <div className="flex justify-between py-1.5 text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4" /> Setup Único:</span>
                    <span className="font-bold text-foreground">R$ {totalSetup.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Calendar className="h-4 w-4 text-primary" /> Recorrente Mensal:</span>
                    <span className="font-bold text-primary text-base">R$ {totalMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-2.5 text-sm font-semibold border-t border-border/80">
                    <span className="text-foreground">Total Proposta:</span>
                    <span className="text-foreground font-bold">R$ {proposal.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="bg-muted/40 p-3 rounded-lg border border-border/40 text-[11px] text-muted-foreground space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Condições de Faturamento:</span>
                  <p>{proposal.paymentTerms}</p>
                </div>
              </CardContent>
            </Card>

            {/* Aceitação Box */}
            <Card className={`border ${
              proposal.status === 'accepted' 
                ? 'border-success/45 bg-success/5 shadow-success/5' 
                : 'border-border'
            }`}>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Decisão Comercial</h2>
                
                <div className="flex items-center justify-between text-xs py-1">
                  <span>Validade da Proposta:</span>
                  <span className="font-semibold text-foreground">{new Date(proposal.validityDate).toLocaleDateString('pt-BR')}</span>
                </div>

                {/* If Proposal is Sent/Viewed */}
                {proposal.status === 'sent' || proposal.status === 'viewed' ? (
                  <div className="space-y-4 pt-2 border-t border-border/40">
                    
                    {/* Agreement Checkbox */}
                    <div className="flex items-start gap-2.5 select-none">
                      <input
                        type="checkbox"
                        id="agree"
                        checked={hasAgreed}
                        onChange={(e) => setHasAgreed(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary/45 h-4.5 w-4.5 shrink-0 mt-0.5 cursor-pointer"
                      />
                      <label htmlFor="agree" className="text-xs text-muted-foreground leading-normal cursor-pointer">
                        Estou ciente e concordo com os escopos de serviços, valores e condições acima listadas.
                      </label>
                    </div>

                    {/* Decision Action Buttons */}
                    <div className="space-y-2.5">
                      <Button 
                        onClick={handleAccept} 
                        className="w-full h-11 text-sm font-semibold flex items-center justify-center gap-2"
                        disabled={!hasAgreed}
                      >
                        <Check className="h-4.5 w-4.5" /> Aceitar Proposta
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        onClick={handleDecline} 
                        className="w-full h-10 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-danger hover:bg-danger/5"
                      >
                        Recusar Proposta
                      </Button>
                    </div>
                  </div>
                ) : proposal.status === 'accepted' ? (
                  <div className="text-center py-4 space-y-3 border-t border-success/20">
                    <div className="h-10 w-10 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
                      <Check className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-sm text-foreground block">Proposta Comercial Aceita!</span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Agradecemos a confiança. O contrato está sendo formalizado eletronicamente na ZapSign e enviado por email.
                      </p>
                    </div>
                  </div>
                ) : proposal.status === 'declined' ? (
                  <div className="text-center py-4 space-y-3 border-t border-border/40 text-muted-foreground">
                    <div className="h-10 w-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                      <X className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-sm block">Proposta Recusada</span>
                    <p className="text-[11px] leading-relaxed">
                      Esta proposta comercial foi marcada como recusada. Entre em contato comercial para novas rodadas de negociação.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4 border-t border-border/40 text-xs text-muted-foreground font-semibold">
                    Status da Proposta: <strong className="text-foreground uppercase">{proposal.status}</strong>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Footer legal disclaimer */}
        <footer className="text-center py-10 text-[10px] text-muted-foreground border-t border-border/40">
          <p>© {new Date().getFullYear()} {organization.name}. Todos os direitos reservados. Gerado via {PLATFORM_NAME}.</p>
        </footer>

      </div>
    </div>
  );
}
