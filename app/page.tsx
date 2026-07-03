'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Building2, Users, FileText, CheckSquare, CreditCard, 
  UserPlus, Megaphone, History, Shield, ArrowRight, 
  CheckCircle2, HelpCircle, PhoneCall, Play, X, Star,
  AlertTriangle, Sparkles, Settings, Activity, Send,
  Lock, Zap, Target
} from 'lucide-react';
import { useMounted } from '../hooks/useMounted';
import ThemeToggle from '../components/ui/theme-toggle';
import Button from '../components/ui/button';
import Modal from '../components/ui/modal';
import { PLATFORM_NAME, PLATFORM_DOMAIN } from '../lib/config';
import { LogoIcon, LogoHorizontal } from '../components/ui/logo';

export default function LandingPage() {
  const mounted = useMounted();
  
  // Interactive solution flow state
  const [activeFlowStep, setActiveFlowStep] = useState<number>(0);
  
  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Demo Modal state
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoCompany, setDemoCompany] = useState('');
  const [demoWhatsapp, setDemoWhatsapp] = useState('');
  const [demoTeamSize, setDemoTeamSize] = useState('2 a 5 pessoas');
  const [demoChallenge, setDemoChallenge] = useState('Organização geral da operação');
  const [isDemoSubmitted, setIsDemoSubmitted] = useState(false);

  // Pre-fill target plan if selected from price card
  const [selectedPlanContext, setSelectedPlanContext] = useState<string | null>(null);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  const flowSteps = [
    { name: 'Lead', desc: 'Receba e organize oportunidades vindas de campanhas, formulários, WhatsApp e canais orgânicos.' },
    { name: 'Cliente', desc: 'Registro inicial do contato comercial e centralização de metadados do lead.' },
    { name: 'Proposta', desc: 'Geração automática de propostas detalhadas com escopo e valores recorrentes.' },
    { name: 'Aceite', desc: 'Aprovação digital pelo cliente em uma página pública exclusiva e segura.' },
    { name: 'Contrato', desc: 'Criação eletrônica de contrato na ZapSign disparada imediatamente após o aceite.' },
    { name: 'Cobrança', desc: 'Emissão automática de faturamento (PIX/Cartão/Boleto) integrado ao Asaas.' },
    { name: 'Pagamento', desc: 'Confirmação do faturamento com liberação imediata e sem intervenção humana.' },
    { name: 'Onboarding', desc: 'Criação automatizada de pastas no Google Drive e workspaces dedicados no ClickUp.' },
    { name: 'Tarefas', desc: 'Sincronização de tarefas e check-ins semanais da equipe técnica e de conteúdo.' },
    { name: 'Histórico', desc: 'Registro consolidado de todos os eventos no painel de auditoria do tenant.' }
  ];

  const primaryFeatures = [
    { title: 'Central de Leads e Campanhas', desc: 'Organize leads de Meta, Google, WhatsApp, formulários e indicações em um funil visual com status, responsáveis, temperatura e histórico. Fontes simuladas/sandbox no MVP.', icon: Target },
    { title: 'Propostas Comerciais', desc: 'Gere propostas dinâmicas em minutos com tabelas de serviços e valores de setup ou mensais recorrentes.', icon: FileText },
    { title: 'Contratos e Assinatura', desc: 'Assinatura digital e envio automático de contratos via ZapSign assim que a proposta é aceita.', icon: Shield },
    { title: 'Cobranças e Asaas', desc: 'Integração financeira para emissão e conciliação automática de Pix, cartões ou boletos com régua de cobrança.', icon: CreditCard },
    { title: 'Onboarding Automatizado', desc: 'Criação imediata de pastas no Drive e projetos de entrega no ClickUp após a compensação do pagamento.', icon: UserPlus },
    { title: 'Aprovação de Publicações', desc: 'Interface limpa para o cliente revisar, comentar e aprovar criativos e legendas sem o caos do WhatsApp.', icon: Megaphone },
    { title: 'Tarefas da Equipe', desc: 'Sincronização automática de demandas operacionais associadas diretamente a cada cliente e contrato.', icon: CheckSquare },
    { title: 'Histórico Operacional', desc: 'Auditoria cronológica das ações e modificações de faturamento, propostas e tarefas.', icon: History }
  ];

  const secondaryFeatures = [
    { title: 'Isolamento Multiempresa', desc: 'Gerencie múltiplas marcas, filiais ou franquias mantendo os dados totalmente segregados.', icon: Building2 },
    { title: 'Painel Administrativo', desc: 'Visão do operador para controle de limites, auditoria de inquilinos e consumo do plano.', icon: Settings },
    { title: 'Configurações de APIs', desc: 'Campos centralizados para autenticar conectores ou utilizar o modo simulação de MVP.', icon: Activity }
  ];

  const faqItems = [
    { 
      q: 'A NV Hub já possui integrações reais?', 
      a: 'A plataforma é preparada para integração com conectores planejados para as APIs oficiais do Asaas, ZapSign, Google Drive e ClickUp. Nesta versão demonstrativa, as APIs operam em modo sandbox simulado; a conexão das chaves de produção de sua empresa é realizada através de nossa implantação assistida na fase de onboarding.' 
    },
    { 
      q: 'Posso usar a NV Hub sem integrações no início?', 
      a: 'Com certeza. A NV Hub conta com um Modo Simulador (Mock) integrado que permite que você utilize todos os recursos, emita faturamentos fictícios e crie projetos de onboarding simulados para testar ou treinar a equipe antes de plugar as contas de produção.' 
    },
    { 
      q: 'Como funciona a implantação e o setup inicial?', 
      a: 'Nossa equipe acompanha você em todo o processo de onboarding do seu negócio. Fazemos a configuração inicial dos modelos de propostas, adequação dos templates de contratos, treinamento inicial do time e conexão segura das APIs dos integradores parceiros.' 
    },
    { 
      q: 'O setup inicial possui algum custo extra?', 
      a: 'O setup é gratuito para a ativação padrão no plano Pro e Enterprise durante a nossa fase de lançamento. Configurações avançadas, integrações de APIs adicionais ou migração pesada de dados antigos podem ser cobradas separadamente conforme o escopo de implantação.' 
    },
    { 
      q: 'Existe algum período de fidelidade contratual?', 
      a: 'Não. Os planos recorrentes da NV Hub são mensais e sem carência contratual. Você pode fazer o upgrade, downgrade ou cancelamento do serviço quando quiser, sem taxas de saída ou multas.' 
    },
    { 
      q: 'Como os dados das empresas ficam separados?', 
      a: 'A NV Hub utiliza uma arquitetura multi-tenant lógica estrita. Cada organização assinante possui uma chave exclusiva de isolamento no banco de dados. Isso significa que seus clientes, propostas, contratos, histórico e membros da equipe nunca cruzam ou vazam para outros assinantes.' 
    },
    { 
      q: 'A página pública de proposta exige login do meu cliente?', 
      a: 'Não. As propostas geradas geram links públicos exclusivos criptografados. Seu cliente final pode visualizar, concordar com os termos e assinar sem precisar criar uma conta ou lembrar de senhas, acelerando a conversão.' 
    },
    { 
      q: 'Quem deve usar a NV Hub?', 
      a: 'A NV Hub é ideal para agências de marketing, gestores de tráfego, social medias, consultorias, empresas B2B e operações de venda recorrente. É especialmente útil para equipes que recebem leads de campanhas (Meta Ads, Google Ads), precisam centralizá-los e acompanhar toda a jornada de conversão de contatos em propostas comerciais e onboarding de entrega.' 
    },
    { 
      q: 'A NV Hub também organiza leads de tráfego pago?', 
      a: 'Sim. A Central de Leads permite receber contatos de campanhas patrocinadas (Meta Ads e Google Ads), formulários do site e WhatsApp, organizando-os em um funil Kanban para que você visualize e atenda cada oportunidade sem dispersão.' 
    },
    { 
      q: 'A Central de Leads já conecta Meta Ads e Google Ads?', 
      a: 'Esta demonstração possui um ambiente de sandbox integrado para simular a captura e fluxo dessas origens sem expor credenciais reais. A conexão com as APIs oficiais do Meta e Google em produção está no cronograma de conectores planejados e é feita por fase de implantação assistida.' 
    },
    { 
      q: 'Posso usar a Central de Leads manualmente no começo?', 
      a: 'Sim. Você pode cadastrar leads manualmente com facilidade, definir responsáveis, temperaturas (quente/morno/frio) e adicionar observações de ligações e atendimentos antes de configurar coletores automáticos.' 
    },
    { 
      q: 'Consigo transformar lead em cliente e proposta?', 
      a: 'Com certeza. Com apenas um clique, o lead qualificado é convertido em cliente na mesma organização (copiando dados como telefone, e-mail e empresa com detecção de duplicidades) e uma proposta rascunho de serviços pode ser gerada instantaneamente no funil.' 
    },
    { 
      q: 'A NV Hub substitui um CRM?', 
      a: 'A NV Hub atua como um hub comercial e operacional. Ela substitui as etapas básicas de funil de CRM focado em prospecção de serviços recorrentes e estende esse fluxo de ponta a ponta, conectando a venda aceita diretamente com o onboarding (Drive, ClickUp) e o faturamento.' 
    },
    { 
      q: 'Gestores de tráfego podem usar a NV Hub com seus clientes?', 
      a: 'Sim. Gestores de tráfego e agências de marketing utilizam a plataforma para apresentar a seus clientes o caminho operacional do lead desde a campanha de origem até virar faturamento real, trazendo máxima transparência e prova de ROI.' 
    },
    { 
      q: 'Posso trocar de plano depois?', 
      a: 'Sim, você pode alterar seu plano a qualquer momento no painel de controle ou solicitando ao nosso suporte operacional. O reajuste nos limites de clientes e usuários é refletido instantaneamente.' 
    },
    { 
      q: 'As integrações dependem do meu plano?', 
      a: 'Sim, o acesso completo a conectores de produção com Asaas, ClickUp e ZapSign é exclusivo a partir do plano Pro. O plano Starter é voltado para operações pequenas usando fluxos simplificados ou o modo simulador.' 
    }
  ];

  const handleOpenDemoModal = (planName: string | null = null) => {
    setSelectedPlanContext(planName);
    setIsDemoModalOpen(true);
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDemoSubmitted(true);
    setTimeout(() => {
      setIsDemoSubmitted(false);
      setIsDemoModalOpen(false);
      setDemoName('');
      setDemoEmail('');
      setDemoCompany('');
      setDemoWhatsapp('');
      setSelectedPlanContext(null);
    }, 4000);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/20 transition-colors duration-300">
      
      {/* Glow Ambient Effects */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md transition-all">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <LogoHorizontal size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a>
            <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#seguranca" className="hover:text-foreground transition-colors">Segurança</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>

          {/* Right Action buttons */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="outline" size="sm" className="font-semibold text-xs border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                Entrar no sistema
              </Button>
            </Link>
            <Button variant="primary" size="sm" className="font-bold text-xs" onClick={() => handleOpenDemoModal(null)}>
              Agendar demonstração
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Text and CTAs */}
            <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider animate-pulse">
                <Sparkles className="h-3 w-3" /> Gestão Comercial &amp; Operacional
              </div>
              <h1 className="text-3xl sm:text-4.5xl lg:text-5.5xl font-extrabold tracking-tight text-foreground leading-tight">
                Do lead à entrega do serviço, <span className="text-primary block sm:inline">tudo flui em uma única plataforma.</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                A {PLATFORM_NAME} centraliza leads, propostas, contratos, cobranças, onboarding, aprovações e tarefas para empresas que vendem serviços recorrentes.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
                <Button variant="primary" size="lg" className="gap-2 font-bold shadow-md shadow-primary/20" onClick={() => handleOpenDemoModal(null)}>
                  Agendar demonstração <ArrowRight className="h-4 w-4" />
                </Button>
                <a href="#como-funciona" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full font-bold gap-2">
                    Ver como funciona <Play className="h-3.5 w-3.5 fill-current" />
                  </Button>
                </a>
              </div>
            </div>

            {/* Right Column: Premium CSS Dashboard Mockup */}
            <div className="lg:col-span-7 relative max-w-xl lg:max-w-none mx-auto w-full">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/15 to-accent-cool/15 rounded-2xl blur-2xl opacity-30 -rotate-1 pointer-events-none" />
              <div className="relative border border-border/30 bg-card rounded-2xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.82)] overflow-hidden aspect-[16/10] transition-all duration-300 hover:border-primary/45 group">
                
                {/* Mock Browser Header */}
                <div className="h-9 border-b border-border/40 bg-muted/40 flex items-center px-4 justify-between select-none">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground bg-background/50 px-8 py-0.5 rounded-md border border-border/20">
                    {PLATFORM_DOMAIN}/dashboard
                  </div>
                  <div className="w-4" />
                </div>

                {/* Mock Dashboard Surface */}
                <div className="p-4 flex gap-4 h-[calc(100%-36px)] font-sans">
                  {/* Mock Sidebar */}
                  <div className="w-24 border-r border-border/20 pr-3 flex flex-col gap-2 select-none shrink-0 h-full">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <LogoIcon size="sm" className="h-4.5 w-4.5" />
                      <div className="flex flex-col">
                        <span className="text-[7.5px] font-black text-foreground leading-none">NV<span className="text-primary font-bold">Hub</span></span>
                        <span className="text-[5px] text-muted-foreground font-mono font-bold uppercase tracking-wide leading-none mt-0.5">Revenue &amp; Ops</span>
                      </div>
                    </div>
                    <div className="space-y-2.5 flex-1 overflow-hidden">
                      <div>
                        <div className="text-[5px] font-black text-muted-foreground/60 uppercase tracking-widest mb-0.5 scale-90 origin-left">Comercial</div>
                        {['Dashboard', 'Leads', 'Clientes'].map((item, idx) => (
                          <div key={item} className={`h-4.5 rounded px-1 flex items-center gap-1.5 ${idx === 0 ? 'bg-primary/10 text-primary border-l-2 border-primary rounded-l-none pl-0.5' : 'text-muted-foreground/80'}`}>
                            <div className="h-1 w-1 rounded-full bg-current" />
                            <span className="text-[6.5px] font-bold uppercase tracking-wider">{item}</span>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="text-[5px] font-black text-muted-foreground/60 uppercase tracking-widest mb-0.5 scale-90 origin-left">Operação</div>
                        {['Onboarding', 'Tarefas'].map((item) => (
                          <div key={item} className="h-4.5 rounded px-1 flex items-center gap-1.5 text-muted-foreground/80">
                            <div className="h-1 w-1 rounded-full bg-current" />
                            <span className="text-[6.5px] font-bold uppercase tracking-wider">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mock App Core */}
                  <div className="flex-1 flex flex-col gap-4 overflow-hidden h-full">
                    {/* Mock Topbar */}
                    <div className="flex justify-between items-center select-none border-b border-border/20 pb-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-muted-foreground font-semibold">Empresa Ativa</span>
                        <span className="text-[10px] font-bold text-foreground">Power &amp; Ponto</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-5 px-1.5 rounded bg-success/15 border border-success/20 text-success text-[7px] font-bold flex items-center uppercase tracking-wider">
                          Plano Pro
                        </div>
                        <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-[8px]">
                          AS
                        </div>
                      </div>
                    </div>

                    {/* Mock Metrics grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {['Leads Novos', 'Clientes Ativos', 'Receita Estimada'].map((stat, i) => (
                        <div key={stat} className="p-2 border border-border/15 rounded-lg bg-card/60 backdrop-blur-md flex flex-col gap-0.5 shadow-sm">
                          <span className="text-[7px] text-muted-foreground font-medium">{stat}</span>
                          <span className="text-xs font-bold text-foreground">
                            {i === 0 ? '18' : i === 1 ? '14' : 'R$ 24.950'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Mock Activity Chart Area */}
                    <div className="flex-1 border border-border/15 rounded-lg bg-card/30 backdrop-blur-md p-2 flex flex-col gap-2 relative shadow-sm">
                      <span className="text-[8px] font-bold text-foreground">Fluxo de Funil Recorrente (Simulado)</span>
                      
                      {/* Flow mockup visual lines */}
                      <div className="flex-1 flex items-end justify-between px-2 gap-1 pb-1">
                        {[40, 75, 55, 90, 60, 80, 45, 95].map((h, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full bg-primary/20 hover:bg-primary/40 rounded-t-sm transition-all duration-300 relative" style={{ height: `${h}%` }}>
                              <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-sm" />
                            </div>
                            <span className="text-[6px] text-muted-foreground font-mono">M{i+1}</span>
                          </div>
                        ))}
                      </div>

                      {/* Mock Notification box popping up */}
                      <div className="absolute bottom-2 right-2 p-2 bg-success/90 text-success-foreground border border-success/20 rounded-lg shadow-lg text-[7px] font-bold flex items-center gap-1.5 animate-bounce max-w-[120px]">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>Contrato assinado!</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ROI / Ganho de tempo Section */}
      <section className="py-12 border-t border-border/40 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-border/50">
            
            {/* Metric 1 */}
            <div className="pt-6 md:pt-0 md:px-6 space-y-2">
              <div className="text-3xl font-extrabold text-primary flex justify-center items-baseline gap-1">
                Fluxo Único
                <span className="text-xs text-muted-foreground font-normal">integrado</span>
              </div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">De processos espalhados para uma esteira única</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Garante a transição fluida do lead para cliente e a estruturação automática de workspaces no ClickUp e Drive de forma padronizada.
              </p>
            </div>

            {/* Metric 2 */}
            <div className="pt-6 md:pt-0 md:px-6 space-y-2">
              <div className="text-3xl font-extrabold text-primary flex justify-center items-baseline gap-1">
                1 Esteira
                <span className="text-xs text-muted-foreground font-normal">unificada</span>
              </div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">Do Lead ao Cumprimento de Demandas</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Visualize a trajetória completa de cada oportunidade: origem da campanha, conversão em cliente, proposta aceita e tarefas diárias.
              </p>
            </div>

            {/* Metric 3 */}
            <div className="pt-6 md:pt-0 md:px-6 space-y-2">
              <div className="text-3xl font-extrabold text-primary flex justify-center items-baseline gap-1">
                Mais Controle
                <span className="text-xs text-muted-foreground font-normal">e ROI</span>
              </div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">Redução de Oportunidades Perdidas</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Evite que contatos esfriem por falta de acompanhamento. Dê aos gestores de tráfego e donos da operação clareza sobre o status de cada lead.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Dores / Problema Section */}
      <section className="py-16 sm:py-20 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-danger font-bold text-xs uppercase tracking-wider">O gargalo das empresas de serviço</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Onde sua operação perde dinheiro todos os dias?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Vender serviços de recorrência exige agilidade. Usar ferramentas isoladas sabota a produtividade e a retenção do cliente.
            </p>
          </div>

          {/* Dores Grid - Cardless layout per Skill.md */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-3 p-4 border-l-2 border-danger/40 bg-danger/5 rounded-r-xl">
              <Target className="h-6 w-6 text-danger" />
              <h3 className="font-bold text-base text-foreground">Descentralização de Leads</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Leads chegam por Meta, Google Ads, WhatsApp e formulários sem centralização. Sem acompanhamento, contatos quentes se perdem e o cliente não sabe quem foi atendido.
              </p>
            </div>

            <div className="space-y-3 p-4 border-l-2 border-danger/40 bg-danger/5 rounded-r-xl">
              <AlertTriangle className="h-6 w-6 text-danger" />
              <h3 className="font-bold text-base text-foreground">Vazamento Comercial</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Propostas perdidas em PDFs soltos de WhatsApp, contratos manuais que dependem do preenchimento no Word e cobranças emitidas com atraso que prejudicam seu fluxo de caixa.
              </p>
            </div>

            <div className="space-y-3 p-4 border-l-2 border-danger/40 bg-danger/5 rounded-r-xl">
              <Users className="h-6 w-6 text-danger" />
              <h3 className="font-bold text-base text-foreground">Gargalo no Onboarding</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Toda vez que uma proposta é aceita, sua equipe técnica perde horas configurando diretórios no Drive e criando tarefas de escopo manualmente no ClickUp.
              </p>
            </div>

            <div className="space-y-3 p-4 border-l-2 border-danger/40 bg-danger/5 rounded-r-xl">
              <Megaphone className="h-6 w-6 text-danger" />
              <h3 className="font-bold text-base text-foreground">Desconexão de Campanhas</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                As campanhas de marketing geram novos contatos, mas a equipe de tráfego e gestores não conseguem provar facilmente o caminho do lead até a proposta comercial fechada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrações / Conectores Section */}
      <section className="py-12 border-t border-border/40 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Esteira preparada para integração com canais de aquisição, atendimento, cobrança e entrega.</h3>
            <p className="text-[10px] text-muted-foreground font-semibold">
              Ambiente demonstrativo operando em modo sandbox. Conectores planejados e ativados por fase de implantação assistida conforme o plano corporativo.
            </p>
          </div>

          {/* Typographic Badges representing Integrations */}
          <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto select-none">
            {[
              { name: 'Meta Ads API', color: 'border-blue-500/30 text-blue-500 bg-blue-500/5' },
              { name: 'Google Ads API', color: 'border-cyan-500/30 text-cyan-500 bg-cyan-500/5' },
              { name: 'WhatsApp Webhook', color: 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' },
              { name: 'Formulários Customizados', color: 'border-teal-500/30 text-teal-500 bg-teal-500/5' },
              { name: 'Asaas API', color: 'border-indigo-500/30 text-indigo-500 bg-indigo-500/5' },
              { name: 'ClickUp API', color: 'border-pink-500/30 text-pink-500 bg-pink-500/5' },
              { name: 'Google Drive', color: 'border-green-500/30 text-green-500 bg-green-500/5' },
              { name: 'Google Docs', color: 'border-sky-500/30 text-sky-500 bg-sky-500/5' },
              { name: 'ZapSign API', color: 'border-violet-500/30 text-violet-500 bg-violet-500/5' }
            ].map((tool) => (
              <span 
                key={tool.name}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold tracking-wide flex items-center gap-1.5 transition-all hover:scale-105 ${tool.color}`}
              >
                <Zap className="h-3 w-3 fill-current" />
                {tool.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Solução / Pipeline Flow Section */}
      <section id="como-funciona" className="py-16 sm:py-20 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">A Jornada Fluida</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Uma única linha de automação, do contrato à entrega.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Substitua dezenas de gatilhos manuais por um fluxo automatizado e sequencial onde cada ação destrava o próximo passo sem esforço.
            </p>
          </div>

          {/* Interactive Flow visualizer */}
          <div className="space-y-10">
            {/* Interactive Timeline Bar */}
            <div className="relative flex justify-between items-center max-w-4xl mx-auto overflow-x-auto pb-4 pt-8 px-4 scrollbar-thin">
              <div className="absolute top-12 left-6 right-6 h-0.5 bg-border/40 -z-10" />
              
              {flowSteps.map((step, idx) => (
                <button
                  key={step.name}
                  type="button"
                  onClick={() => setActiveFlowStep(idx)}
                  className={`flex flex-col items-center gap-3 shrink-0 cursor-pointer focus:outline-none transition-all ${
                    activeFlowStep === idx ? 'scale-110' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                    activeFlowStep === idx 
                      ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20' 
                      : 'bg-background border-border text-muted-foreground'
                  }`}>
                    {idx + 1}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${activeFlowStep === idx ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Display active step detail */}
            <div className="max-w-2xl mx-auto border border-border/60 bg-muted/15 rounded-xl p-6 text-center space-y-3 shadow-sm transition-all duration-300">
              <span className="bg-primary/20 text-primary text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                Etapa {activeFlowStep + 1}: {flowSteps[activeFlowStep].name}
              </span>
              <p className="text-sm text-foreground font-semibold leading-relaxed">
                {flowSteps[activeFlowStep].desc}
              </p>
              <div className="text-xs text-muted-foreground">
                Garante que nada seja esquecido no processo e que o cliente tenha uma experiência 100% fluida.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Central de Leads Solution Section */}
      <section className="py-16 sm:py-20 border-t border-border/40 bg-gradient-to-b from-transparent to-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left side: Visual representation of a Lead Card/History */}
            <div className="lg:col-span-6 space-y-4">
              <div className="border border-border bg-card rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[9px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                  Lead Qualificado (Sandbox)
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground">Carlos Santos</h4>
                  <span className="text-[10px] text-muted-foreground block">Santos Engenharia &bull; carlos@santoseng.com</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-border/40 text-[10px]">
                  <div>
                    <span className="text-[8px] text-muted-foreground block uppercase font-bold">Origem</span>
                    <span className="font-semibold text-foreground">Google Ads Pesquisa</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-muted-foreground block uppercase font-bold">Plataforma</span>
                    <span className="font-semibold text-foreground">Google Ads</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-muted-foreground block uppercase font-bold">Campanha</span>
                    <span className="font-mono text-foreground font-semibold">pesquisa_b2b_2026</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-border/40 text-[10px]">
                  <div>
                    <span className="text-[8px] text-muted-foreground block uppercase font-bold">Temperatura</span>
                    <span className="inline-flex items-center gap-1 text-danger font-bold">
                      ● Quente
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] text-muted-foreground block uppercase font-bold">Responsável</span>
                    <span className="font-semibold text-foreground">Ana Silva</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-muted-foreground block uppercase font-bold">Status</span>
                    <span className="bg-info/10 text-info text-[9px] font-bold px-1.5 py-0.5 rounded border border-info/20">
                      Reunião Marcada
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40 space-y-2">
                  <span className="text-[8px] text-muted-foreground block uppercase font-bold">Histórico de Interações</span>
                  <div className="space-y-1.5 text-[9px] leading-relaxed">
                    <div className="flex gap-2 text-muted-foreground">
                      <span className="text-foreground font-semibold">14/06:</span>
                      <span>Lead originado via Webhook Meta Ads (Ad Group: b2b_proprietarios).</span>
                    </div>
                    <div className="flex gap-2 text-muted-foreground">
                      <span className="text-foreground font-semibold">15/06:</span>
                      <span>Ana Silva alterou temperatura para Quente e agendou reunião.</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Conversion flow triggers visual indicator */}
                <div className="pt-4 flex gap-2 border-t border-border/40">
                  <div className="flex-1 p-2 bg-success/5 border border-success/20 rounded-lg text-center text-[9px] font-bold text-success select-none">
                    ✓ Converter em Cliente
                  </div>
                  <div className="flex-1 p-2 bg-primary/5 border border-primary/20 rounded-lg text-center text-[9px] font-bold text-primary select-none">
                    ⚡ Gerar Proposta
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Solution Copy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider">
                <Target className="h-3.5 w-3.5" /> Central de Leads integrada ao fluxo comercial
              </div>
              <h2 className="text-2xl sm:text-3.5xl font-extrabold tracking-tight text-foreground leading-tight">
                Acompanhe o caminho do lead comercial até o onboarding.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Com a Central de Leads, sua equipe acompanha cada oportunidade desde a origem da campanha até a conversão em cliente, proposta e onboarding. Sem dados espalhados e sem perder contatos quentes.
              </p>
              
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs font-semibold text-foreground/90">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Rastreamento de Origem e Campanha
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Filtro por Plataforma e Canal
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Temperatura e Status Visuais
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Atribuição de Responsável
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Conversão em Cliente em 1 Clique
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Geração de Proposta Automatizada
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades / Features Section */}
      <section id="recursos" className="py-16 sm:py-20 border-t border-border/40 bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">Recursos da Plataforma</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Tudo o que sua agência ou equipe precisa para rodar.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dividido entre as automações âncora do fluxo e os recursos analíticos da operação.
            </p>
          </div>

          {/* Key Automas Grid (Anchors) */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">Principais Automações Operacionais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {primaryFeatures.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div 
                    key={feat.title} 
                    className="p-5 border border-border/40 bg-card rounded-xl hover:border-primary/30 hover:shadow-lg transition-all duration-300 flex gap-4 items-start group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground">{feat.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Secondary features in smaller presentation */}
          <div className="space-y-6 pt-12">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-2">Recursos Analíticos &amp; Controle</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {secondaryFeatures.map((feat) => {
                const Icon = feat.icon;
                return (
                  <div key={feat.title} className="p-4 border border-border/20 bg-background/50 rounded-lg flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-foreground truncate">{feat.title}</h4>
                      <p className="text-[10px] text-muted-foreground truncate leading-normal" title={feat.desc}>{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Segurança & Confiança Section */}
      <section id="seguranca" className="py-16 sm:py-20 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Graphics */}
            <div className="lg:col-span-5 relative max-w-md mx-auto w-full space-y-4">
              <div className="p-6 border border-border/40 bg-card rounded-2xl shadow-xl space-y-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Cada empresa com seus dados. Cada operação no seu fluxo.</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Estruturado sob arquitetura de inquilinos lógicos independentes (multi-tenant) assegurando privacidade total das informações comerciais e permissões de acesso.
                </p>
              </div>
            </div>

            {/* Right Column: Details list */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-primary font-bold text-xs uppercase tracking-wider block">Segurança e Privacidade B2B</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Privacidade lógica construída desde a raiz.
              </h2>
              
              <ul className="space-y-3.5">
                {[
                  { title: 'Isolamento por Organização', desc: 'Arquitetura projetada para isolamento lógico de dados por organização. Esta versão é um ambiente sandbox demonstrativo; a versão de produção contará com autenticação real, banco de dados criptografado e isolamento multi-tenant completo no backend.' },
                  { title: 'Segregação Total por Organização', desc: 'Nenhum cliente, proposta ou histórico de tarefas corre risco de cruzar com outro tenant.' },
                  { title: 'Controle de Membros por Permissão', desc: 'Controle hierárquico robusto (owner, admin, member, viewer) customizável por usuário.' },
                  { title: 'Histórico Operacional Rastreável', desc: 'Eventos cronológicos de faturamento e criação auditáveis pelo operador.' },
                  { title: 'Proposta Pública Segura', desc: 'Páginas exclusivas de visualização de PDF que não expõem o dashboard interno.' }
                ].map((item) => (
                  <li key={item.title} className="flex gap-3 items-start text-xs leading-normal">
                    <CheckCircle2 className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground block">{item.title}</strong>
                      <span className="text-muted-foreground">{item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Planos / Pricing Section */}
      <section id="planos" className="py-16 sm:py-20 border-t border-border/40 bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">Planos e Preços</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Um plano que acompanha o ritmo da sua operação.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Selecione o plano inicial e expanda seus limites conforme atrai mais clientes recorrentes.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="border border-border/60 bg-card rounded-xl p-6 flex flex-col justify-between hover:border-border transition-all">
              <div className="space-y-4">
                <div>
                  <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider block">Ideal para iniciantes</span>
                  <h3 className="text-lg font-bold text-foreground">Starter</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-foreground">R$ 149</span>
                  <span className="text-xs text-muted-foreground">/mês</span>
                </div>
                <hr className="border-border/40" />
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Central de Leads manual e funil básico</li>
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Até 3 Clientes Cadastrados</li>
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Até 2 Membros na Equipe</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Até 5 Propostas Emitidas</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Até 10 Tarefas Ativas</li>
                  <li className="flex items-center gap-2 opacity-50"><X className="h-4 w-4 text-muted-foreground shrink-0" /> Sem Integrações Externas (Modo Mock)</li>
                </ul>
              </div>
              <Button variant="outline" className="w-full mt-8 font-bold text-xs" onClick={() => handleOpenDemoModal('Starter')}>
                Começar com Starter
              </Button>
            </div>

            {/* Pro Plan */}
            <div className="border-2 border-primary bg-card rounded-xl p-6 flex flex-col justify-between shadow-xl shadow-primary/10 relative scale-105">
              <div className="absolute top-0 right-6 -translate-y-1/2 px-2.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider">
                Mais Recomendado
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-primary text-[10px] font-bold uppercase tracking-wider block">Melhor para agências &amp; equipes</span>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                    Pro <Star className="h-4 w-4 text-amber-500 fill-current" />
                  </h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-foreground">R$ 499</span>
                  <span className="text-xs text-muted-foreground">/mês</span>
                </div>
                <hr className="border-border/40" />
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Central de Leads (Fontes simuladas/Sandbox)</li>
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Conversão em Cliente e Geração de Proposta</li>
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Até 30 Clientes Cadastrados</li>
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Até 5 Membros na Equipe</li>
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Até 50 Propostas Emitidas</li>
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Acesso a conectores (sob implantação assistida)</li>
                </ul>
              </div>
              <Button variant="primary" className="w-full mt-8 font-bold text-xs" onClick={() => handleOpenDemoModal('Pro')}>
                Agendar demo do Pro
              </Button>
            </div>

            {/* Enterprise Plan */}
            <div className="border border-border/60 bg-card rounded-xl p-6 flex flex-col justify-between hover:border-border transition-all">
              <div className="space-y-4">
                <div>
                  <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider block">Para grandes operações</span>
                  <h3 className="text-lg font-bold text-foreground">Enterprise</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-foreground">R$ 1.499</span>
                  <span className="text-xs text-muted-foreground">/mês</span>
                </div>
                <hr className="border-border/40" />
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Central de Leads e fluxos customizados</li>
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Preparação para integrações e conectores planejados</li>
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Clientes e Membros Ilimitados</li>
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> Propostas e Onboarding Ilimitados</li>
                  <li className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> SLA e Suporte VIP no Onboarding</li>
                </ul>
              </div>
              <Button variant="outline" className="w-full mt-8 font-bold text-xs" onClick={() => handleOpenDemoModal('Enterprise')}>
                Falar com especialista
              </Button>
            </div>
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-8 max-w-xl mx-auto leading-normal">
            * Mensalidades de referência para o licenciamento do software. Os serviços de setup de conectores adicionais e implantação assistida são orçados sob medida para a sua operação.
          </p>
        </div>
      </section>

      {/* Setup Inicial Section */}
      <section className="py-16 sm:py-20 border-t border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">Apoio na Implementação</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Estruturamos sua esteira comercial e operacional.
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A implantação pode incluir configuração de fluxos, treinamento básico da equipe e adaptação inicial da operação.
            </p>
          </div>

          {/* Custom plan setup breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-xs">
            <div className="p-4 border border-border/40 bg-card rounded-xl space-y-2.5">
              <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono font-bold uppercase text-[9px]">Plano Starter</span>
              <h4 className="font-bold text-foreground">Setup Assistido</h4>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Configuração inicial simplificada e guias para estruturação do funil de leads e propostas.
              </p>
            </div>

            <div className="p-4 border-2 border-primary/20 bg-primary/5 rounded-xl space-y-2.5">
              <span className="bg-primary/20 px-2 py-0.5 rounded text-primary font-mono font-bold uppercase text-[9px]">Plano Pro</span>
              <h4 className="font-bold text-foreground">Setup Guiado por Especialista</h4>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Apoio completo na configuração do fluxo comercial. Auxiliamos na estruturação de modelos de propostas, conexão simulada da Central de Leads, faturamento Asaas e fluxos ClickUp.
              </p>
            </div>

            <div className="p-4 border border-border/40 bg-card rounded-xl space-y-2.5">
              <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground font-mono font-bold uppercase text-[9px]">Plano Enterprise</span>
              <h4 className="font-bold text-foreground">Setup Avançado &amp; SLA</h4>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Implantação assistida avançada com integrações de APIs adicionais, fluxos sob medida e acompanhamento estratégico inicial das campanhas e equipe técnica.
              </p>
            </div>
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-6 leading-normal">
            * O setup inicial técnico pode ser cobrado separadamente conforme a complexidade e volume de dados do escopo contratado.
          </p>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-16 sm:py-20 border-t border-border/40 bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-primary font-bold text-xs uppercase tracking-wider">Suporte Técnico</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Perguntas Frequentes
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tudo o que você precisa saber sobre o funcionamento comercial, financeiro e técnico da NV Hub.
            </p>
          </div>

          {/* Accordion List */}
          <div className="max-w-3xl mx-auto space-y-3">
            {faqItems.map((item, idx) => (
              <div 
                key={idx} 
                className="border border-border/40 bg-card rounded-xl overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-xs sm:text-sm text-foreground focus:outline-none hover:bg-muted/15 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-4.5 w-4.5 text-primary shrink-0" />
                    {item.q}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {openFaq === idx ? '▲' : '▼'}
                  </span>
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground border-t border-border/20 leading-relaxed bg-muted/5 animate-in fade-in duration-200">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demonstração CTA Section */}
      <section className="py-16 sm:py-20 border-t border-border/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-primary via-primary/95 to-indigo-600 p-8 sm:p-12 text-center text-primary-foreground shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-60" />
            <div className="relative space-y-6 max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Quer ver a NV Hub funcionando na prática?
              </h2>
              <p className="text-sm sm:text-base text-primary-foreground/85 leading-relaxed">
                Agende uma conversa com nossos especialistas. Demonstramos em tempo real a automação do fluxo comercial, os limites de planos e a área operacional do ClickUp e Asaas.
              </p>
              <div className="pt-2">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="bg-white text-primary border-white hover:bg-white/95 font-bold shadow-md gap-2 text-sm"
                  onClick={() => handleOpenDemoModal(null)}
                >
                  <PhoneCall className="h-4 w-4" /> Solicitar demonstração gratuita
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-card py-12 text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand details */}
          <div className="space-y-4">
            <LogoHorizontal size="sm" />
            <p className="leading-relaxed text-[11px]">
              O fluxo comercial e operacional integrado e sem fricção para agências e consultorias recorrentes.
            </p>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Navegação</h4>
            <ul className="space-y-2">
              <li><a href="#como-funciona" className="hover:text-foreground transition-colors">Como funciona</a></li>
              <li><a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a></li>
              <li><a href="#planos" className="hover:text-foreground transition-colors">Planos</a></li>
              <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Col 3: Legal/Access */}
          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Acesso rápido</h4>
            <ul className="space-y-2">
              <li><Link href="/login" className="hover:text-foreground transition-colors">Login no Painel</Link></li>
              <li><Link href="/login" className="hover:text-foreground transition-colors">Acesso Inquilino</Link></li>
              <li><Link href="/empresas" className="hover:text-foreground transition-colors">Painel do Operador</Link></li>
            </ul>
          </div>

          {/* Col 4: Contact info */}
          <div className="space-y-3">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Contato</h4>
            <p className="leading-relaxed">
              Dúvidas comerciais?
              <br />
              <strong className="text-foreground">contato@{PLATFORM_DOMAIN}</strong>
              <br />
              Suporte Técnico 24/7.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 border-t border-border/40 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <p>© {new Date().getFullYear()} NV Hub. Todos os direitos reservados. Plataforma SaaS de Gestão Operacional.</p>
          <div className="flex gap-4">
            <span className="hover:underline cursor-pointer">Termos de Uso</span>
            <span className="hover:underline cursor-pointer">Privacidade</span>
          </div>
        </div>
      </footer>

      {/* Demo Booking Modal */}
      {isDemoModalOpen && (
        <Modal
          isOpen={isDemoModalOpen}
          onClose={() => {
            setIsDemoModalOpen(false);
            setIsDemoSubmitted(false);
          }}
          title="Agendar Demonstração NV Hub"
          description={selectedPlanContext ? `Solicitação de demonstração personalizada voltada para o Plano ${selectedPlanContext}.` : 'Preencha o formulário abaixo e um especialista entrará em contato comercial dentro de 24 horas.'}
          size="md"
        >
          {isDemoSubmitted ? (
            <div className="text-center py-8 space-y-3 animate-in zoom-in-95">
              <div className="h-12 w-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground text-success">Demonstração solicitada com sucesso</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Em breve entraremos em contato pelo WhatsApp informado (<strong className="text-foreground">{demoWhatsapp}</strong>) para confirmar seu agendamento.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit} className="space-y-4 pt-2 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-muted-foreground block text-[10px] uppercase tracking-wide" htmlFor="demo-name">Nome Completo</label>
                <input
                  type="text"
                  id="demo-name"
                  required
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground block text-[10px] uppercase tracking-wide" htmlFor="demo-company">Empresa</label>
                <input
                  type="text"
                  id="demo-company"
                  required
                  value={demoCompany}
                  onChange={(e) => setDemoCompany(e.target.value)}
                  placeholder="Ex: Agência Crescimento Ltda"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground block text-[10px] uppercase tracking-wide" htmlFor="demo-whatsapp">WhatsApp com DDD</label>
                <input
                  type="tel"
                  id="demo-whatsapp"
                  required
                  value={demoWhatsapp}
                  onChange={(e) => setDemoWhatsapp(e.target.value)}
                  placeholder="Ex: (11) 99999-9999"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground block text-[10px] uppercase tracking-wide" htmlFor="demo-email">E-mail Corporativo</label>
                <input
                  type="email"
                  id="demo-email"
                  required
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  placeholder="Ex: joao@suaempresa.com"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground block text-[10px] uppercase tracking-wide" htmlFor="demo-teamsize">Tamanho da equipe / operação</label>
                <select
                  id="demo-teamsize"
                  value={demoTeamSize}
                  onChange={(e) => setDemoTeamSize(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary cursor-pointer"
                >
                  <option value="Apenas eu">Apenas eu</option>
                  <option value="2 a 5 pessoas">2 a 5 pessoas</option>
                  <option value="6 a 15 pessoas">6 a 15 pessoas</option>
                  <option value="16 a 50 pessoas">16 a 50 pessoas</option>
                  <option value="Mais de 50 pessoas">Mais de 50 pessoas</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-muted-foreground block text-[10px] uppercase tracking-wide" htmlFor="demo-challenge">Principal desafio atual</label>
                <select
                  id="demo-challenge"
                  value={demoChallenge}
                  onChange={(e) => setDemoChallenge(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary cursor-pointer"
                >
                  <option value="Propostas e contratos">Propostas e contratos</option>
                  <option value="Cobranças">Cobranças</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="Tarefas da equipe">Tarefas da equipe</option>
                  <option value="Aprovação de publicações">Aprovação de publicações</option>
                  <option value="Organização geral da operação">Organização geral da operação</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full h-11 font-bold gap-2 justify-center text-xs">
                  <Send className="h-4 w-4" /> Solicitar Contato Comercial
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
