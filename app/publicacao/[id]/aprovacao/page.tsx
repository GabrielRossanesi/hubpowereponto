'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  MessageSquare, 
  Send, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { useStore } from '../../../../lib/store';
import { useMounted } from '../../../../hooks/useMounted';
import { LogoHorizontal } from '../../../../components/ui/logo';
import Card, { CardContent } from '../../../../components/ui/card';
import Button from '../../../../components/ui/button';
import { isDatabaseDataMode } from '../../../../lib/data-mode';
import { 
  getPublicationByApprovalToken, 
  approvePublicationByTokenAction, 
  requestPublicationChangesByTokenAction 
} from '../../../publicacoes/actions';
import type { Publication } from '../../../../types';

// Custom Brand Icons to avoid missing lucide-react exports
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

// Helper to render platform icon
function PlatformIcon({ platform }: { platform?: string }) {
  switch (platform) {
    case 'instagram':
      return <InstagramIcon className="h-4 w-4 text-pink-500" />;
    case 'facebook':
      return <FacebookIcon className="h-4 w-4 text-blue-600" />;
    case 'linkedin':
      return <LinkedinIcon className="h-4 w-4 text-sky-700" />;
    default:
      return <Send className="h-4 w-4 text-primary" />;
  }
}

function ApprovalContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const mounted = useMounted();
  
  const publicationId = params.id as string;
  const token = searchParams.get('token') || '';

  const { 
    publications, 
    approvePublicationByToken, 
    requestPublicationChangesByToken 
  } = useStore();

  const [dbPub, setDbPub] = useState<Publication | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(isDatabaseDataMode);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [feedback, setFeedback] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load publication from DB if in database mode
  useEffect(() => {
    if (!isDatabaseDataMode) return;
    let active = true;
    const fetchPub = async () => {
      try {
        setIsLoadingDb(true);
        const res = await getPublicationByApprovalToken(token);
        if (active) {
          setDbPub(res);
        }
      } catch (err) {
        console.error('Error fetching public publication:', err);
      } finally {
        if (active) {
          setIsLoadingDb(false);
        }
      }
    };
    if (token) {
      fetchPub();
    }
    return () => {
      active = false;
    };
  }, [token]);
  
  // Find publication
  const publication = isDatabaseDataMode ? dbPub : publications.find(p => p.id === publicationId);

  // Time remaining state
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!publication?.approvalLinkExpiresAt || publication.approvalLinkStatus !== 'active') return;

    // Check expiration immediately
    const checkExpiration = () => {
      const expiresAt = new Date(publication.approvalLinkExpiresAt!).getTime();
      const now = new Date().getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expirado');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    checkExpiration();
    const timer = setInterval(checkExpiration, 1000);

    return () => clearInterval(timer);
  }, [publication]);

  if (!mounted) return null;

  if (isDatabaseDataMode && isLoadingDb) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-muted-foreground font-medium">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-3" />
        Carregando publicação...
      </div>
    );
  }

  // Validation checks
  if (!publication) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 text-center">
        <Card className="max-w-md w-full shadow-2xl border-border/40 bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8 text-danger" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Publicação não encontrada</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              O registro da publicação solicitada não existe ou foi removido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Token validation
  if (!token || publication.approvalToken !== token) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 text-center">
        <Card className="max-w-md w-full shadow-2xl border-border/40 bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8 text-danger" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Acesso negado</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              O token de aprovação fornecido é inválido ou ausente. Entre em contato com a agência responsável.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Action Handlers
  const handleApprove = async () => {
    try {
      if (isDatabaseDataMode) {
        const res = await approvePublicationByTokenAction(token);
        if (!res.success) {
          throw new Error(res.error || 'Erro ao aprovar publicação.');
        }
        setDbPub(prev => prev ? { ...prev, status: 'approved' } : null);
      } else {
        approvePublicationByToken(publication.id, token);
      }
      setActionSuccess('approved');
    } catch (e) {
      const err = e as Error;
      setErrorMsg(err.message || 'Ocorreu um erro ao processar a aprovação.');
    }
  };

  const handleRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      alert('Por favor, informe detalhadamente quais ajustes são necessários.');
      return;
    }

    try {
      if (isDatabaseDataMode) {
        const res = await requestPublicationChangesByTokenAction(token, feedback);
        if (!res.success) {
          throw new Error(res.error || 'Erro ao solicitar alterações.');
        }
        setDbPub(prev => prev ? { ...prev, status: 'changes_requested', clientComments: feedback } : null);
      } else {
        requestPublicationChangesByToken(publication.id, token, feedback);
      }
      setActionSuccess('changes_requested');
    } catch (e) {
      const err = e as Error;
      setErrorMsg(err.message || 'Ocorreu um erro ao registrar as alterações.');
    }
  };

  // Determine current effective status (e.g. check local state or expiration)
  const isLinkExpired = isExpired || (publication.approvalLinkExpiresAt && new Date(publication.approvalLinkExpiresAt) < new Date());
  const linkStatus = publication.approvalLinkStatus;

  // Color coding class for the timer widget based on expiration state
  const getTimerColorClass = () => {
    if (!publication.approvalLinkExpiresAt) return 'text-primary bg-primary/5 border border-primary/20';
    const expiresAt = new Date(publication.approvalLinkExpiresAt).getTime();
    const now = new Date().getTime();
    const diff = expiresAt - now;
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) {
      return 'text-danger bg-danger/5 border border-danger/20';
    } else if (hours < 6) {
      return 'text-amber-500 bg-amber-500/5 border border-amber-500/20';
    }
    return 'text-primary bg-primary/5 border border-primary/20';
  };

  // Render state overrides based on action success
  if (actionSuccess === 'approved' || linkStatus === 'approved') {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 text-center">
        <Card className="max-w-md w-full shadow-2xl border-border/40 bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Post Aprovado!</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Agradecemos pelo seu retorno. A publicação de <strong className="text-foreground">{publication.companyName}</strong> foi aprovada e enviada para a fila de agendamento.
            </p>
            <div className="text-[11px] text-muted-foreground/60 font-mono pt-3 border-t border-border/20 mt-2">
              Registrado em: {publication.approvedAt ? new Date(publication.approvedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (actionSuccess === 'changes_requested' || linkStatus === 'changes_requested') {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 text-center">
        <Card className="max-w-md w-full shadow-2xl border-border/40 bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <MessageSquare className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Ajustes Solicitados</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Recebemos o seu feedback sobre a arte/legenda. Nossa equipe de criação já foi notificada e uma tarefa de ajuste imediata foi iniciada.
            </p>
            <div className="p-3.5 bg-background border border-border/40 rounded-xl text-left text-xs text-foreground italic leading-relaxed">
              &quot;{publication.clientFeedback || feedback}&quot;
            </div>
            <div className="text-[11px] text-muted-foreground/60 font-mono pt-3 border-t border-border/20 mt-2">
              Registrado em: {publication.changesRequestedAt ? new Date(publication.changesRequestedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLinkExpired || linkStatus === 'expired') {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 text-center">
        <Card className="max-w-md w-full shadow-2xl border-border/40 bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto">
              <Clock className="h-8 w-8 text-danger" />
            </div>
            <h1 className="text-2xl font-black text-foreground">Link Expirado</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Este link temporário de 24 horas expirou. Para a sua segurança e controle de versões, o acesso foi bloqueado.
            </p>
            <p className="text-xs text-muted-foreground/75 bg-muted/20 p-3 rounded-lg border border-border/10">
              Solicite um novo link de aprovação para a equipe responsável pelo seu projeto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const images = publication.images?.length
    ? publication.images
    : publication.imageUrl
      ? [publication.imageUrl]
      : [];
  const isCarousel = publication.postType === 'carousel' || images.length > 1;

  return (
    <div className="min-h-screen bg-background text-foreground py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/60 pb-6">
          <LogoHorizontal size="md" />
          {!isDatabaseDataMode && (
            <span className="bg-primary/5 border border-primary/20 text-primary px-3 py-0.5 rounded-full text-[10px] font-semibold tracking-wide">
              Ambiente demonstrativo
            </span>
          )}
        </header>

        {errorMsg && (
          <div className="p-4 bg-danger/10 border border-danger/20 rounded-xl flex items-center gap-3 text-danger text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Creative image preview - span 6 */}
          <div className="lg:col-span-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Pré-visualização do Post</h2>
            <Card className="overflow-hidden border-border/40 bg-card shadow-2xl">
              <div className="p-4 border-b border-border/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-primary border border-border/20">
                    {publication.companyName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-xs text-foreground block leading-tight">{publication.companyName}</span>
                    <span className="text-[10px] text-muted-foreground block mt-0.5">Agendado</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-background border border-border/40 px-2 py-0.5 rounded-full text-[10px] font-semibold text-foreground uppercase">
                  <PlatformIcon platform={publication.platform} />
                  <span>{publication.platform || 'Rede Social'}</span>
                </div>
              </div>
              
              {/* Image box */}
              <div className="aspect-square bg-background/50 flex items-center justify-center overflow-hidden relative border-b border-border/20">
                {images.length > 0 ? (
                  <>
                    {brokenImages[images[carouselIndex]] ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-card text-muted-foreground gap-2 select-none animate-in fade-in duration-200">
                        <AlertCircle className="h-8 w-8 text-warning shrink-0" />
                        <span className="text-sm font-bold text-foreground">Imagem não carregada</span>
                        <span className="text-xs text-muted-foreground/90 max-w-[240px] leading-relaxed">
                          Não foi possível carregar a mídia. Verifique se o endereço da imagem está correto.
                        </span>
                        <a 
                          href={images[carouselIndex]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary font-bold hover:underline mt-1 cursor-pointer flex items-center gap-0.5"
                        >
                          Abrir link original <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={images[carouselIndex]} 
                        alt={`Post preview creative ${carouselIndex + 1}`} 
                        className="object-cover w-full h-full"
                        onError={() => {
                          const url = images[carouselIndex];
                          setBrokenImages(prev => ({ ...prev, [url]: true }));
                        }}
                      />
                    )}
                    {isCarousel && (
                      <>
                        <div className="absolute bottom-2.5 left-2.5 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-semibold">
                          {carouselIndex + 1} / {images.length}
                        </div>
                        {carouselIndex > 0 && (
                          <button
                            type="button"
                            onClick={() => setCarouselIndex(prev => prev - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer select-none"
                          >
                            &lt;
                          </button>
                        )}
                        {carouselIndex < images.length - 1 && (
                          <button
                            type="button"
                            onClick={() => setCarouselIndex(prev => prev + 1)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer select-none"
                          >
                            &gt;
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground">Nenhuma imagem cadastrada</div>
                )}
              </div>

              {isCarousel && (
                <div className="flex justify-center gap-1.5 py-2.5 bg-card border-b border-border/10">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCarouselIndex(i)}
                      className={`h-1.5 w-1.5 rounded-full transition-all cursor-pointer ${
                        i === carouselIndex ? 'bg-primary w-3' : 'bg-muted-foreground/35 hover:bg-muted-foreground/50'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Feed simulation details */}
              <div className="p-4 space-y-2 bg-muted/10">
                <div className="text-xs text-muted-foreground leading-relaxed break-words whitespace-pre-wrap">
                  <span className="font-bold text-foreground mr-1.5">{publication.companyName.toLowerCase().replace(/\s+/g, '')}</span>
                  {publication.caption}
                </div>
              </div>
            </Card>
          </div>

          {/* Details & Actions - span 6 */}
          <div className="lg:col-span-6 space-y-6">
            
            <div className="space-y-1.5">
              <h1 className="text-2xl font-black tracking-tight text-foreground">Aprovação de Publicação</h1>
              <p className="text-sm text-muted-foreground">
                Revise os detalhes operacionais e a arte da publicação agendada abaixo.
              </p>
            </div>

            {/* Info Card */}
            <Card className="border-border/40 shadow-lg bg-card">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Cliente</span>
                    <span className="text-sm font-semibold text-foreground block leading-tight">{publication.companyName}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Data Programada</span>
                    <span className="text-sm font-semibold text-foreground block leading-tight flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      {new Date(publication.scheduledDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border/20 pt-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Responsável</span>
                    <span className="text-xs text-foreground block">{publication.responsibleUser}</span>
                  </div>
                  
                  {/* Countdown widget */}
                  <div className={`rounded-xl px-3 py-1.5 flex items-center gap-2 border ${getTimerColorClass()}`}>
                    <Clock className="h-4 w-4 animate-pulse shrink-0" />
                    <div>
                      <span className="text-[8px] uppercase font-bold block tracking-widest leading-none opacity-85">Expira em</span>
                      <span className="text-xs font-mono font-bold block leading-tight mt-0.5">{timeLeft}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            {!showFeedbackForm ? (
              <div className="space-y-3">
                <Button 
                  onClick={handleApprove}
                  variant="primary"
                  size="lg"
                  className="w-full justify-center text-sm font-bold shadow-lg shadow-primary/10"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar Publicação
                </Button>
                
                <Button 
                  onClick={() => setShowFeedbackForm(true)}
                  variant="outline"
                  size="lg"
                  className="w-full justify-center text-sm font-bold hover:border-amber-500/50 hover:text-amber-500 transition-colors"
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Solicitar Ajustes
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRequestChanges} className="space-y-4 bg-card border border-border/40 p-5 rounded-2xl animate-in slide-in-from-bottom-2 duration-300">
                <div className="space-y-2">
                  <label htmlFor="feedback" className="text-xs font-bold text-amber-500 uppercase tracking-wider block">
                    Quais alterações são necessárias?
                  </label>
                  <textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Descreva aqui o que deve ser ajustado (ex: trocar foto, corrigir erro de digitação na legenda, mudar a data)..."
                    className="w-full min-h-[120px] bg-background border border-border/60 rounded-xl p-3.5 text-sm text-foreground focus:outline-none focus:border-primary placeholder:text-muted-foreground/60 transition-colors focus:ring-1 focus:ring-primary/30"
                    required
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    type="submit"
                    variant="primary"
                    className="flex-1 justify-center text-xs font-bold py-2.5"
                  >
                    Enviar Solicitação
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => setShowFeedbackForm(false)}
                    variant="outline"
                    className="flex-1 justify-center text-xs font-bold py-2.5"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}

            <div className="p-4 bg-muted/10 border border-border/30 rounded-xl text-xs text-muted-foreground leading-relaxed text-center">
              {isDatabaseDataMode 
                ? 'Revise a arte e aprove ou solicite ajustes para esta publicação. Sua resposta será registrada no painel operacional da NV Hub.'
                : 'Ambiente demonstrativo da NV Hub. As ações realizadas nesta página atualizam o painel operacional em modo sandbox.'
              }
            </div>

          </div>

        </div>

      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center border-t border-border/20 pt-6 mt-8">
        <p className="text-[10px] text-muted-foreground/60">
          &copy; {new Date().getFullYear()} NV Hub. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}

export default function PublicationApprovalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col justify-center items-center text-muted-foreground font-medium">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-3" />
        Carregando painel de aprovação...
      </div>
    }>
      <ApprovalContent />
    </Suspense>
  );
}
