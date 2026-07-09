'use client';

import React, { useState, useEffect, Suspense, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  MessageSquare, 
  Send, 
  AlertCircle,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2
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
import type { PublicApprovalPublication } from '../../../../types';
import { formatDateBR } from '../../../../lib/date';

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
  const token = (params.token as string) || searchParams.get('token') || '';

  const { 
    publications, 
    approvePublicationByToken, 
    requestPublicationChangesByToken 
  } = useStore();

  const [dbPub, setDbPub] = useState<PublicApprovalPublication | null>(null);
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
  const publication = isDatabaseDataMode
    ? dbPub
    : (token
        ? publications.find(p => p.approvalToken === token)
        : (publicationId ? publications.find(p => p.id === publicationId) : undefined)
      );

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

  const images = useMemo(() => {
    return publication?.images?.length
      ? publication.images
      : publication?.imageUrl
        ? [publication.imageUrl]
        : [];
  }, [publication]);
  const isCarousel = publication ? (publication.postType === 'carousel' || images.length > 1) : false;
  const channels = publication?.channels?.length
    ? publication.channels
    : (publication?.platform ? [publication.platform] : ['instagram']);

  // Lightbox / Modal States & Logic
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  const loadedImagesRef = useRef(loadedImages);
  useEffect(() => {
    loadedImagesRef.current = loadedImages;
  }, [loadedImages]);

  // Track DOM Refs
  const mainTrackRef = useRef<HTMLDivElement | null>(null);
  const modalTrackRef = useRef<HTMLDivElement | null>(null);

  // Touch Swiping Refs for Mobile Swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const hasSwiped = useRef(false);
  const isDragging = useRef(false);

  // Reset touch refs helper
  const resetTouchRefs = () => {
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    touchEndY.current = null;
    isDragging.current = false;
  };

  // Touch handlers for Main Preview
  const handleMainTouchStart = (e: React.TouchEvent) => {
    if (images.length <= 1) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchEndX.current = null;
    touchEndY.current = null;
    hasSwiped.current = false;
    isDragging.current = true;

    if (mainTrackRef.current) {
      mainTrackRef.current.style.transition = 'none';
    }
  };

  const handleMainTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || images.length <= 1 || !mainTrackRef.current) return;

    const touch = e.touches[0];
    touchEndX.current = touch.clientX;
    touchEndY.current = touch.clientY;

    const dragDelta = touchEndX.current - touchStartX.current!;
    const dragDeltaY = touchEndY.current - touchStartY.current!;

    // If vertical scroll is dominant, don't drag the carousel
    if (Math.abs(dragDeltaY) > Math.abs(dragDelta)) {
      isDragging.current = false;
      mainTrackRef.current.style.transition = 'transform 300ms ease-out';
      mainTrackRef.current.style.transform = `translateX(-${carouselIndex * 100}%)`;
      return;
    }

    // Prevent browser horizontal navigation/gestures if horizontal swipe is dominant
    if (e.cancelable) {
      e.preventDefault();
    }

    const containerWidth = mainTrackRef.current.parentElement?.offsetWidth || 0;
    
    // Elastic resistance at boundaries
    let finalDragDelta = dragDelta;
    if (carouselIndex === 0 && dragDelta > 0) {
      finalDragDelta = dragDelta * 0.35; // 35% resistance dragging right at start
    } else if (carouselIndex === images.length - 1 && dragDelta < 0) {
      finalDragDelta = dragDelta * 0.35; // 35% resistance dragging left at end
    }

    const basePosition = -carouselIndex * containerWidth;
    const currentTranslate = basePosition + finalDragDelta;
    mainTrackRef.current.style.transform = `translateX(${currentTranslate}px)`;
  };

  const handleMainTouchEnd = () => {
    if (!isDragging.current || images.length <= 1 || !mainTrackRef.current) return;

    // Enable transition back
    mainTrackRef.current.style.transition = 'transform 300ms ease-out';

    if (touchStartX.current === null || touchEndX.current === null) {
      mainTrackRef.current.style.transform = `translateX(-${carouselIndex * 100}%)`;
      resetTouchRefs();
      return;
    }

    const dragDelta = touchEndX.current - touchStartX.current;
    const dragDeltaY = touchEndY.current! - (touchStartY.current || touchEndY.current!);
    const minSwipeDistance = 45; // Threshold of 45px

    if (Math.abs(dragDelta) > Math.abs(dragDeltaY) && Math.abs(dragDelta) > minSwipeDistance) {
      hasSwiped.current = true;
      if (dragDelta < 0 && carouselIndex < images.length - 1) {
        // Next image
        const newIndex = carouselIndex + 1;
        mainTrackRef.current.style.transform = `translateX(-${newIndex * 100}%)`;
        setCarouselIndex(newIndex);
      } else if (dragDelta > 0 && carouselIndex > 0) {
        // Previous image
        const newIndex = carouselIndex - 1;
        mainTrackRef.current.style.transform = `translateX(-${newIndex * 100}%)`;
        setCarouselIndex(newIndex);
      } else {
        // Boundary bounce back
        mainTrackRef.current.style.transform = `translateX(-${carouselIndex * 100}%)`;
      }
    } else {
      // Snap back
      mainTrackRef.current.style.transform = `translateX(-${carouselIndex * 100}%)`;
    }
    resetTouchRefs();
  };

  // Touch handlers for Lightbox Modal
  const handleModalTouchStart = (e: React.TouchEvent) => {
    if (images.length <= 1) return;
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchEndX.current = null;
    touchEndY.current = null;
    hasSwiped.current = false;
    isDragging.current = true;

    if (modalTrackRef.current) {
      modalTrackRef.current.style.transition = 'none';
    }
  };

  const handleModalTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || images.length <= 1 || !modalTrackRef.current) return;

    const touch = e.touches[0];
    touchEndX.current = touch.clientX;
    touchEndY.current = touch.clientY;

    const dragDelta = touchEndX.current - touchStartX.current!;
    const dragDeltaY = touchEndY.current - touchStartY.current!;

    // If vertical scroll is dominant, don't drag the modal carousel
    if (Math.abs(dragDeltaY) > Math.abs(dragDelta)) {
      isDragging.current = false;
      modalTrackRef.current.style.transition = 'transform 300ms ease-out';
      modalTrackRef.current.style.transform = `translateX(-${modalIndex * 100}%)`;
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    const containerWidth = modalTrackRef.current.parentElement?.offsetWidth || 0;
    
    // Elastic resistance at boundaries
    let finalDragDelta = dragDelta;
    if (modalIndex === 0 && dragDelta > 0) {
      finalDragDelta = dragDelta * 0.35;
    } else if (modalIndex === images.length - 1 && dragDelta < 0) {
      finalDragDelta = dragDelta * 0.35;
    }

    const basePosition = -modalIndex * containerWidth;
    const currentTranslate = basePosition + finalDragDelta;
    modalTrackRef.current.style.transform = `translateX(${currentTranslate}px)`;
  };

  const handleModalTouchEnd = () => {
    if (!isDragging.current || images.length <= 1 || !modalTrackRef.current) return;

    // Enable transition back
    modalTrackRef.current.style.transition = 'transform 300ms ease-out';

    if (touchStartX.current === null || touchEndX.current === null) {
      modalTrackRef.current.style.transform = `translateX(-${modalIndex * 100}%)`;
      resetTouchRefs();
      return;
    }

    const dragDelta = touchEndX.current - touchStartX.current;
    const dragDeltaY = touchEndY.current! - (touchStartY.current || touchEndY.current!);
    const minSwipeDistance = 45; // Threshold of 45px

    if (Math.abs(dragDelta) > Math.abs(dragDeltaY) && Math.abs(dragDelta) > minSwipeDistance) {
      hasSwiped.current = true;
      if (dragDelta < 0 && modalIndex < images.length - 1) {
        // Next image
        const newIndex = modalIndex + 1;
        modalTrackRef.current.style.transform = `translateX(-${newIndex * 100}%)`;
        setModalIndex(newIndex);
      } else if (dragDelta > 0 && modalIndex > 0) {
        // Previous image
        const newIndex = modalIndex - 1;
        modalTrackRef.current.style.transform = `translateX(-${newIndex * 100}%)`;
        setModalIndex(newIndex);
      } else {
        // Boundary bounce back
        modalTrackRef.current.style.transform = `translateX(-${modalIndex * 100}%)`;
      }
    } else {
      // Snap back
      modalTrackRef.current.style.transform = `translateX(-${modalIndex * 100}%)`;
    }
    resetTouchRefs();
  };

  // Synchronize tracks on index change (keyboard, button, dots, orientation resize)
  useEffect(() => {
    if (mainTrackRef.current) {
      mainTrackRef.current.style.transition = 'transform 300ms ease-out';
      mainTrackRef.current.style.transform = `translateX(-${carouselIndex * 100}%)`;
    }
  }, [carouselIndex]);

  useEffect(() => {
    if (modalTrackRef.current) {
      modalTrackRef.current.style.transition = 'transform 300ms ease-out';
      modalTrackRef.current.style.transform = `translateX(-${modalIndex * 100}%)`;
    }
  }, [modalIndex]);

  const markImageAsLoaded = (url: string) => {
    if (!url) return;
    setLoadedImages(prev => {
      if (prev[url]) return prev; // Avoid unnecessary re-renders
      return { ...prev, [url]: true };
    });
  };

  const openModal = () => {
    if (hasSwiped.current) {
      hasSwiped.current = false; // Reset flag and prevent opening lightbox
      return;
    }
    if (images.length > 0 && !brokenImages[images[carouselIndex]]) {
      setModalIndex(carouselIndex);
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCarouselIndex(modalIndex);
  };

  const handlePrevModalImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (modalIndex > 0) {
      setModalIndex(prev => prev - 1);
    }
  };

  const handleNextModalImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (modalIndex < images.length - 1) {
      setModalIndex(prev => prev + 1);
    }
  };

  // Image Preloading Logic
  useEffect(() => {
    if (!images || images.length === 0) return;

    const preloadImage = (url: string) => {
      if (!url || loadedImagesRef.current[url]) return;
      
      const img = new Image();
      img.src = url;
      img.onload = () => {
        markImageAsLoaded(url);
      };
      img.onerror = () => {
        setBrokenImages(prev => {
          if (prev[url]) return prev;
          return { ...prev, [url]: true };
        });
      };
    };

    // 1. Prioritize current image
    preloadImage(images[carouselIndex]);

    // 2. Prioritize next image
    if (carouselIndex + 1 < images.length) {
      preloadImage(images[carouselIndex + 1]);
    }

    // 3. Prioritize previous image
    if (carouselIndex - 1 >= 0) {
      preloadImage(images[carouselIndex - 1]);
    }

    // 4. Preload remaining images asynchronously (non-blocking)
    const remainingUrls = images.filter((url, index) => 
      index !== carouselIndex && 
      index !== carouselIndex + 1 && 
      index !== carouselIndex - 1
    );

    if (remainingUrls.length > 0) {
      const timer = setTimeout(() => {
        remainingUrls.forEach(url => preloadImage(url));
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [images, carouselIndex]);

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setCarouselIndex(modalIndex);
      } else if (e.key === 'ArrowLeft' && isCarousel && modalIndex > 0) {
        setModalIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && isCarousel && modalIndex < images.length - 1) {
        setModalIndex(prev => prev + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isModalOpen, modalIndex, isCarousel, images.length]);

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

  // Archived check
  if (publication.archivedAt || publication.status === 'archived') {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center px-4 text-center">
        <Card className="max-w-md w-full shadow-2xl border-border/40 bg-card">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Publicação Indisponível</h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Esta publicação não está mais disponível para aprovação.
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
                <div className="flex flex-wrap items-center gap-1.5 justify-end max-w-[50%]">
                  {channels.map((chan) => (
                    <div key={chan} className="flex items-center gap-1 bg-background border border-border/40 px-2 py-0.5 rounded-full text-[10px] font-semibold text-foreground uppercase shrink-0">
                      <PlatformIcon platform={chan} />
                      <span>{chan === 'google_business' ? 'Google' : chan}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Image box Outer Container */}
              <div 
                onClick={openModal}
                className="aspect-square bg-zinc-50 overflow-hidden relative border-b border-border/20 cursor-pointer group touch-pan-y"
              >
                {images.length > 0 ? (
                  <>
                    {/* Inner Swiper Track */}
                    <div 
                      ref={mainTrackRef}
                      onTouchStart={handleMainTouchStart}
                      onTouchMove={handleMainTouchMove}
                      onTouchEnd={handleMainTouchEnd}
                      className="flex h-full w-full transition-transform duration-300 ease-out"
                      style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                    >
                      {images.map((imgUrl, idx) => (
                        <div 
                          key={imgUrl} 
                          className="relative h-full min-w-full shrink-0 basis-full flex items-center justify-center bg-zinc-50"
                        >
                          {brokenImages[imgUrl] ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-card text-muted-foreground gap-2 select-none animate-in fade-in duration-200">
                              <AlertCircle className="h-8 w-8 text-warning shrink-0" />
                              <span className="text-sm font-bold text-foreground">Imagem não carregada</span>
                              <span className="text-xs text-muted-foreground/90 max-w-[240px] leading-relaxed">
                                Não foi possível carregar a mídia. Verifique se o endereço da imagem está correto.
                              </span>
                              <a 
                                href={imgUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary font-bold hover:underline mt-1 cursor-pointer flex items-center gap-0.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Abrir link original <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ) : (
                            <>
                              {/* Loader overlay */}
                              {!loadedImages[imgUrl] && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50 text-muted-foreground gap-3 select-none animate-in fade-in duration-200">
                                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                                  <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">Carregando arte...</span>
                                </div>
                              )}

                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={imgUrl} 
                                alt={`Post preview creative ${idx + 1}`} 
                                className={`object-contain w-full h-full max-h-full max-w-full select-none transition-opacity duration-300 ${
                                  loadedImages[imgUrl] ? 'opacity-100' : 'opacity-0'
                                }`}
                                onLoad={() => markImageAsLoaded(imgUrl)}
                                onError={() => {
                                  setBrokenImages(prev => ({ ...prev, [imgUrl]: true }));
                                }}
                              />
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Navigation Overlays (visible on active slide only) */}
                    {loadedImages[images[carouselIndex]] && !brokenImages[images[carouselIndex]] && (
                      <>
                        {/* Hover overlay for desktop & tap indicator for mobile */}
                        <div className="absolute inset-0 bg-black/0 md:group-hover:bg-black/35 flex items-center justify-center opacity-0 md:group-hover:opacity-100 transition-all duration-200 pointer-events-none">
                          <span className="hidden md:flex bg-black/75 text-white text-xs px-3 py-1.5 rounded-full font-medium items-center gap-1.5 backdrop-blur-xs">
                            <Maximize2 className="h-3.5 w-3.5" /> Clique para ampliar
                          </span>
                        </div>

                        {/* Mobile zoom indicator (fixed top right) */}
                        <div className="absolute top-2.5 right-2.5 bg-black/60 text-white/90 p-1.5 rounded-full backdrop-blur-xs transition-colors pointer-events-none z-10 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                          <Maximize2 className="h-3.5 w-3.5" />
                        </div>
                      </>
                    )}

                    {/* Carousel indicators/navigation */}
                    {isCarousel && (
                      <>
                        <div className="absolute bottom-2.5 left-2.5 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-semibold z-10">
                          {carouselIndex + 1} / {images.length}
                        </div>
                        {carouselIndex > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCarouselIndex(prev => prev - 1);
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer select-none z-10 focus:outline-none focus:ring-2 focus:ring-white/40"
                          >
                            &lt;
                          </button>
                        )}
                        {carouselIndex < images.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCarouselIndex(prev => prev + 1);
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs cursor-pointer select-none z-10 focus:outline-none focus:ring-2 focus:ring-white/40"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setCarouselIndex(i);
                      }}
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
                      {formatDateBR(publication.scheduledDate)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border/20 pt-4 flex items-center justify-end">
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

      {/* Lightbox / Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-xs select-none animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Visualização da imagem em tamanho cheio"
          onClick={closeModal}
        >
          {/* Close button at the top right */}
          <button
            type="button"
            onClick={closeModal}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors cursor-pointer z-50 focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label="Fechar visualização"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Modal content container */}
          <div 
            className="relative flex items-center justify-center w-full h-full max-w-5xl max-h-[80vh] px-4 md:px-12 overflow-hidden touch-pan-y"
            onClick={(e) => e.stopPropagation()}
          >
            {images.length > 0 ? (
              <div 
                ref={modalTrackRef}
                onTouchStart={handleModalTouchStart}
                onTouchMove={handleModalTouchMove}
                onTouchEnd={handleModalTouchEnd}
                className="flex h-full w-full transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${modalIndex * 100}%)` }}
              >
                {images.map((imgUrl, idx) => (
                  <div 
                    key={imgUrl} 
                    className="relative h-full min-w-full shrink-0 basis-full flex items-center justify-center bg-black/0"
                  >
                    {brokenImages[imgUrl] ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-card text-muted-foreground gap-2 select-none animate-in fade-in duration-200 max-w-md mx-auto rounded-xl border border-border/40">
                        <AlertCircle className="h-8 w-8 text-warning shrink-0" />
                        <span className="text-sm font-bold text-foreground">Imagem não carregada</span>
                        <span className="text-xs text-muted-foreground/90 max-w-[240px] leading-relaxed">
                          Não foi possível carregar a mídia no modal. Verifique se o endereço da imagem está correto.
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* Loader inside modal */}
                        {!loadedImages[imgUrl] && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/70 gap-3 select-none animate-in fade-in duration-200">
                            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                            <span className="text-[11px] font-semibold text-white/50 tracking-wider uppercase">Carregando arte...</span>
                          </div>
                        )}

                        {/* Main Image */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={imgUrl} 
                          alt={`Post full preview ${idx + 1}`}
                          className={`max-w-full max-h-full object-contain rounded-xs select-none transition-opacity duration-300 shadow-2xl ${
                            loadedImages[imgUrl] ? 'opacity-100' : 'opacity-0'
                          }`}
                          onLoad={() => markImageAsLoaded(imgUrl)}
                          onError={() => {
                            setBrokenImages(prev => ({ ...prev, [imgUrl]: true }));
                          }}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-white/70">Nenhuma imagem cadastrada</div>
            )}

            {/* Left navigation arrow */}
            {isCarousel && modalIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevModalImage}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white hover:scale-105 active:scale-95 h-12 w-12 rounded-full flex items-center justify-center transition-all cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
            )}

            {/* Right navigation arrow */}
            {isCarousel && modalIndex < images.length - 1 && (
              <button
                type="button"
                onClick={handleNextModalImage}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white hover:scale-105 active:scale-95 h-12 w-12 rounded-full flex items-center justify-center transition-all cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            )}
          </div>

          {/* Carousel dots and indicator below image inside modal */}
          {isCarousel && (
            <div className="mt-4 flex flex-col items-center gap-2 z-10">
              <span className="text-white/80 text-xs font-semibold bg-black/40 px-2.5 py-1 rounded-full">
                {modalIndex + 1} / {images.length}
              </span>
              <div className="flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModalIndex(i);
                    }}
                    className={`h-1.5 w-1.5 rounded-full transition-all cursor-pointer ${
                      i === modalIndex ? 'bg-primary w-3' : 'bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Ir para imagem ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
