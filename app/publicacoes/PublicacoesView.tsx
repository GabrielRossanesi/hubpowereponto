'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Image as ImageIcon,
  Search,
  Filter,
  Plus,
  Check,
  AlertCircle,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  Clock,
  RefreshCw,
  Send,
  AlertTriangle
} from 'lucide-react';
import { PageHeader as UIHeader } from '../../components/ui/page-header';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Textarea from '../../components/ui/textarea';
import Select from '../../components/ui/select';
import Modal from '../../components/ui/modal';
import Card from '../../components/ui/card';
import StatusBadge from '../../components/ui/status-badge';
import EmptyState from '../../components/ui/empty-state';
import DatePicker from '../../components/ui/date-picker';
import type { Client, Publication } from '../../types';
import { formatDateBR } from '../../lib/date';

// Payload de criação/edição enviado pela View aos wrappers (DB ou sandbox).
export interface PublicationFormPayload {
  clientId: string;
  clientName: string;
  companyName: string;
  imageUrl: string;
  images: string[];
  postType: string;
  caption: string;
  scheduledDate: string;
  responsibleUser: string;
  platform: string;
  channels: string[];
  imageSource?: string;
  imageFileName?: string;
  imageSize?: number;
  imageMimeType?: string;
}

export interface PublicationActionResult {
  success: boolean;
  data?: Publication;
  error?: string;
}

export interface PublicacoesViewProps {
  initialPublications: Publication[];
  clients: Client[];
  members: { name: string }[];
  onCreate: (payload: PublicationFormPayload) => Promise<PublicationActionResult>;
  onUpdate: (id: string, payload: PublicationFormPayload) => Promise<PublicationActionResult>;
  onArchive: (id: string) => Promise<{ success: boolean; error?: string }>;
  onRestore: (id: string) => Promise<{ success: boolean; error?: string }>;
  onRegenerateLink: (id: string) => Promise<PublicationActionResult>;
}

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

// Helper component for the countdown timer
function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const diff = new Date(expiresAt).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft('Expirado');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`Expira em ${hours}h ${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // update every minute
    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className="text-xs font-semibold text-amber-500">{timeLeft}</span>;
}

// Helper to render platform icon
function PlatformIcon({ platform }: { platform?: string }) {
  switch (platform) {
    case 'instagram':
      return <InstagramIcon className="h-3.5 w-3.5 text-pink-500" />;
    case 'facebook':
      return <FacebookIcon className="h-3.5 w-3.5 text-blue-600" />;
    case 'linkedin':
      return <LinkedinIcon className="h-3.5 w-3.5 text-sky-700" />;
    default:
      return <Send className="h-3.5 w-3.5 text-primary" />;
  }
}

function isLikelyDirectImageUrl(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    return (
      hostname === 'i.ibb.co' ||
      pathname.endsWith('.jpg') ||
      pathname.endsWith('.jpeg') ||
      pathname.endsWith('.png') ||
      pathname.endsWith('.webp') ||
      pathname.endsWith('.gif')
    );
  } catch {
    return false;
  }
}

function isImgBbPageUrl(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return hostname === 'ibb.co' || hostname === 'imgbb.com';
  } catch {
    return false;
  }
}

export default function PublicacoesView({
  initialPublications,
  clients,
  members,
  onCreate,
  onUpdate,
  onArchive,
  onRestore,
  onRegenerateLink,
}: PublicacoesViewProps) {
  // Cópia de trabalho local — semeada com os dados vindos do servidor (DB) ou do
  // store (sandbox). Todas as mutações passam pelos callbacks e atualizam esta lista.
  const [publications, setPublications] = useState<Publication[]>(initialPublications);

  // Ressincroniza quando os dados iniciais mudam de identidade (ex.: sandbox
  // reativo). Padrão recomendado de ajuste de estado em render (sem useEffect).
  const [syncedInitial, setSyncedInitial] = useState(initialPublications);
  if (syncedInitial !== initialPublications) {
    setSyncedInitial(initialPublications);
    setPublications(initialPublications);
  }

  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['instagram']);
  const [editingPubId, setEditingPubId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form States
  const [selectedClientId, setSelectedClientId] = useState('');
  const [postType, setPostType] = useState<'single_image' | 'carousel'>('single_image');
  const [carouselImages, setCarouselImages] = useState<string[]>(['', '']);

  const [imageSource, setImageSource] = useState<'upload' | 'external_url'>('external_url');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80');
  const [imageFileBase64, setImageFileBase64] = useState('');
  const [imageFileName, setImageFileName] = useState('');
  const [imageSize, setImageSize] = useState(0);
  const [imageMimeType, setImageMimeType] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);

  const [caption, setCaption] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [responsavel, setResponsavel] = useState(members[0]?.name || '');

  // Preenche um responsável padrão assim que a lista de membros existir, sem
  // useEffect (ajuste de estado em render — a condição deixa de valer após o set).
  if (!responsavel && members.length > 0) {
    setResponsavel(members[0].name);
  }

  // Expanded caption state
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});

  // Clipboard copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Loading states for link generation
  const [loadingLinks, setLoadingLinks] = useState<Record<string, boolean>>({});

  const regenerateLink = useCallback(async (pubId: string, successMsg: string) => {
    if (loadingLinks[pubId]) return;
    setLoadingLinks(prev => ({ ...prev, [pubId]: true }));
    try {
      const res = await onRegenerateLink(pubId);
      if (res.success && res.data) {
        setPublications(prev => prev.map(p => (p.id === pubId ? res.data! : p)));
        alert(successMsg);
      } else {
        alert(res.error || 'Não foi possível gerar um novo link. Tente novamente.');
      }
    } catch (err) {
      console.error(err);
      alert('Não foi possível gerar um novo link. Tente novamente.');
    } finally {
      setLoadingLinks(prev => ({ ...prev, [pubId]: false }));
    }
  }, [loadingLinks, onRegenerateLink]);

  const handleCreateApprovalLink = (pubId: string) => regenerateLink(pubId, 'Link de aprovação gerado com sucesso.');
  const handleRegenerateApprovalLink = (pubId: string) => regenerateLink(pubId, 'Novo link de aprovação gerado com sucesso.');

  // Filtered publications
  const filteredPubs = publications.filter((pub) => {
    const matchesSearch =
      pub.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.caption.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = false;
    if (statusFilter === 'all') {
      matchesStatus = pub.status !== 'archived' && !pub.archivedAt;
    } else if (statusFilter === 'archived') {
      matchesStatus = pub.status === 'archived' || !!pub.archivedAt;
    } else {
      matchesStatus = pub.status === statusFilter && !pub.archivedAt;
    }

    return matchesSearch && matchesStatus;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (1.5MB max)
    if (file.size > 1.5 * 1024 * 1024) {
      setFileError('Imagem muito grande para o ambiente demonstrativo. Use uma imagem menor ou informe uma URL externa.');
      setImageFileBase64('');
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      setFileError('Tipo de arquivo inválido. Selecione uma imagem (PNG, JPG, WEBP).');
      setImageFileBase64('');
      return;
    }

    setFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageFileBase64(event.target.result as string);
        setImageFileName(file.name);
        setImageSize(file.size);
        setImageMimeType(file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setSelectedClientId('');
    setImageSource('external_url');
    setImageUrl('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80');
    setImageFileBase64('');
    setImageFileName('');
    setImageSize(0);
    setImageMimeType('');
    setCarouselImages(['', '']);
    setPostType('single_image');
    setCaption('');
    setScheduledDate('');
    setResponsavel(members[0]?.name || '');
    setSelectedChannels(['instagram']);
    setEditingPubId(null);
    setFileError(null);
    setIsModalOpen(false);
  };

  const handleCreatePublication = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id === selectedClientId);

    if (!client || !caption || !scheduledDate) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    let finalImageUrl = '';
    let finalImages: string[] = [];

    if (postType === 'single_image') {
      finalImageUrl = imageSource === 'upload' ? imageFileBase64 : imageUrl;
      if (!finalImageUrl) {
        alert('Adicione pelo menos uma imagem para esta publicação.');
        return;
      }

      // Validation for single image
      if (imageSource === 'external_url') {
        if (isImgBbPageUrl(finalImageUrl)) {
          alert('Esse parece ser o link da página do ImgBB. Copie o link direto da imagem, geralmente começando com https://i.ibb.co/');
          return;
        }
        if (!isLikelyDirectImageUrl(finalImageUrl)) {
          alert('O link informado não parece ser um endereço direto de imagem. Verifique se termina com uma extensão comum (.jpg, .png, etc.) ou se é um link direto do ImgBB (i.ibb.co).');
          return;
        }
      }
      finalImages = [finalImageUrl];
    } else {
      const validImages = carouselImages.filter(url => url.trim() !== '');
      if (validImages.length < 2) {
        alert('Adicione pelo menos duas imagens para criar um carrossel.');
        return;
      }

      // Validation for carousel images
      for (let i = 0; i < validImages.length; i++) {
        const url = validImages[i];
        if (isImgBbPageUrl(url)) {
          alert(`A imagem ${i + 1} parece ser um link da página do ImgBB. Use o link direto começando com https://i.ibb.co/`);
          return;
        }
        if (!isLikelyDirectImageUrl(url)) {
          alert(`A imagem ${i + 1} não parece ser um endereço direto de imagem. Use um link direto terminando em .jpg, .png, .webp ou começando com https://i.ibb.co/`);
          return;
        }
      }
      finalImageUrl = validImages[0];
      finalImages = validImages;
    }

    const payload: PublicationFormPayload = {
      clientId: client.id,
      clientName: client.name,
      companyName: client.companyName,
      imageUrl: finalImageUrl,
      images: finalImages,
      postType: postType,
      caption: caption,
      scheduledDate: scheduledDate,
      responsibleUser: responsavel,
      platform: selectedChannels[0] || 'instagram',
      channels: selectedChannels,
      imageSource: imageSource,
      imageFileName: postType === 'single_image' && imageSource === 'upload' ? imageFileName : undefined,
      imageSize: postType === 'single_image' && imageSource === 'upload' ? imageSize : undefined,
      imageMimeType: postType === 'single_image' && imageSource === 'upload' ? imageMimeType : undefined,
    };

    if (editingPubId) {
      const response = await onUpdate(editingPubId, payload);
      if (response.success && response.data) {
        setPublications(prev => prev.map(p => (p.id === editingPubId ? response.data! : p)));
        alert('Publicação atualizada com sucesso!');
      } else {
        alert('Erro ao atualizar publicação: ' + (response.error || 'Erro desconhecido.'));
        return;
      }
    } else {
      const response = await onCreate(payload);
      if (response.success && response.data) {
        setPublications(prev => [response.data!, ...prev]);
        alert('Publicação criada com sucesso!');
      } else {
        alert('Erro ao criar publicação: ' + (response.error || 'Erro desconhecido.'));
        return;
      }
    }

    resetForm();
  };

  const handleCopyLink = (pubId: string, approvalLink: string) => {
    if (typeof navigator !== 'undefined') {
      const fullLink = approvalLink.startsWith('http')
        ? approvalLink
        : `${window.location.origin}${approvalLink}`;
      navigator.clipboard.writeText(fullLink);
      setCopiedId(pubId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleOpenImgBB = () => {
    if (typeof window !== 'undefined') {
      window.open('https://imgbb.com/', '_blank', 'noopener,noreferrer');
    }
  };

  const handleStartEditPublication = (pub: Publication) => {
    setEditingPubId(pub.id);
    setSelectedClientId(pub.clientId);
    setPostType(pub.postType || 'single_image');
    setCaption(pub.caption);
    setScheduledDate(pub.scheduledDate);
    setResponsavel(pub.responsibleUser);
    setSelectedChannels(pub.channels || (pub.platform ? [pub.platform] : ['instagram']));

    if (pub.postType === 'carousel') {
      setCarouselImages(pub.images || ['', '']);
    } else {
      setImageSource(pub.imageSource === 'upload' ? 'upload' : 'external_url');
      setImageUrl(pub.imageUrl || '');
      if (pub.imageSource === 'upload') {
        setImageFileBase64(pub.imageUrl || '');
        setImageFileName(pub.imageFileName || '');
        setImageSize(pub.imageSize || 0);
        setImageMimeType(pub.imageMimeType || '');
      }
    }
    setFileError(null);
    setIsModalOpen(true);
  };

  const handleArchivePublication = async (id: string) => {
    if (!confirm('Tem certeza que deseja arquivar esta publicação?')) return;

    const res = await onArchive(id);
    if (res.success) {
      setPublications(prev => prev.map(p => (p.id === id ? { ...p, status: 'archived', archivedAt: new Date().toISOString() } : p)));
      alert('Publicação arquivada com sucesso!');
    } else {
      alert('Erro ao arquivar: ' + (res.error || 'Erro desconhecido.'));
    }
  };

  const handleRestorePublication = async (id: string) => {
    const res = await onRestore(id);
    if (res.success) {
      setPublications(prev => prev.map(p => (p.id === id ? { ...p, status: 'pending_approval', archivedAt: undefined, archivedBy: undefined } : p)));
      alert('Publicação restaurada com sucesso!');
    } else {
      alert('Erro ao restaurar: ' + (res.error || 'Erro desconhecido.'));
    }
  };

  const clientOptions = clients.length > 0
    ? clients.map(c => ({ value: c.id, label: c.companyName }))
    : [{ value: '', label: 'Nenhum cliente cadastrado nesta organização. Cadastre um cliente antes de criar uma publicação.' }];

  const teamOptions = members.length > 0
    ? members.map(m => ({ value: m.name, label: m.name }))
    : [{ value: '', label: 'Nenhum usuário encontrado nesta empresa' }];

  const channelOptions = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'tiktok', label: 'TikTok' },
    { value: 'google_business', label: 'Google Meu Negócio' },
    { value: 'youtube_shorts', label: 'YouTube Shorts' },
    { value: 'x', label: 'X / Twitter' }
  ];

  const finalPreviewImageUrl = postType === 'carousel' ? (carouselImages[0] || '') : (imageSource === 'upload' ? imageFileBase64 : imageUrl);
  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <UIHeader
        title="Controle de Publicações"
        description="Aprove mídias e artes de campanhas e redes sociais dos clientes."
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Nova Publicação
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-card p-4 rounded-xl border border-border/80 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Pesquisar por legenda, cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-all placeholder:text-muted-foreground/75"
          />
        </div>

        {/* Filter status buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto">
            {['all', 'pending_approval', 'approved', 'changes_requested', 'archived'].map((statusKey) => (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  statusFilter === statusKey
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {statusKey === 'all' && 'Todas'}
                {statusKey === 'pending_approval' && 'Aguardando Aprovação'}
                {statusKey === 'approved' && 'Aprovadas'}
                {statusKey === 'changes_requested' && 'Alteração Solicitada'}
                {statusKey === 'archived' && 'Arquivadas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Publications Grid */}
      {filteredPubs.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            title="Nenhuma publicação encontrada"
            description="Não existem posts cadastrados sob este status. Crie um novo post para testar."
            icon={<ImageIcon className="h-6 w-6" />}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPubs.map((pub) => {
            const isExpired = pub.approvalLinkExpiresAt && new Date(pub.approvalLinkExpiresAt) < new Date();

            const images = pub.images?.length
              ? pub.images
              : pub.imageUrl
                ? [pub.imageUrl]
                : [];
            const isCarousel = pub.postType === 'carousel' || images.length > 1;

            return (
              <Card key={pub.id} className="overflow-hidden border border-border flex flex-col justify-between hover:shadow-md transition-shadow h-full bg-card">
                <div className="flex flex-col flex-1">
                  {/* Visual Image Preview */}
                  <div className="relative h-48 bg-muted overflow-hidden shrink-0 border-b border-border/60">
                    {brokenImages[images[0] || pub.imageUrl] ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-muted text-muted-foreground gap-1 select-none">
                        <AlertCircle className="h-6 w-6 text-warning shrink-0" />
                        <span className="text-[11px] font-bold text-foreground">Imagem não carregada</span>
                        <span className="text-[9px] text-muted-foreground/90 max-w-[180px] leading-tight">Verifique se o link colado está correto.</span>
                        <a
                          href={images[0] || pub.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-primary font-bold hover:underline mt-1 cursor-pointer flex items-center gap-0.5"
                        >
                          Abrir link <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={images[0] || pub.imageUrl}
                        alt="Social media post visual creative"
                        className="w-full h-full object-cover"
                        onError={() => {
                          const url = images[0] || pub.imageUrl;
                          setBrokenImages(prev => ({ ...prev, [url]: true }));
                        }}
                      />
                    )}
                    {isCarousel && (
                      <div className="absolute bottom-2.5 left-2.5 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-semibold">
                        Carrossel ({images.length} imagens)
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                      {pub.channels && pub.channels.slice(0, 3).map((chan) => (
                        <div key={chan} className="h-6 w-6 rounded-full bg-slate-900/80 backdrop-blur-sm flex items-center justify-center shadow-sm text-white" title={chan}>
                          <PlatformIcon platform={chan as 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'google_business' | 'other'} />
                        </div>
                      ))}
                      {pub.channels && pub.channels.length > 3 && (
                        <div className="h-6 w-6 rounded-full bg-slate-900/80 backdrop-blur-sm flex items-center justify-center shadow-sm text-[8px] font-bold text-white" title={pub.channels.slice(3).join(', ')}>
                          +{pub.channels.length - 3}
                        </div>
                      )}
                      {(!pub.channels || pub.channels.length === 0) && pub.platform && (
                        <div className="h-6 w-6 rounded-full bg-slate-900/80 backdrop-blur-sm flex items-center justify-center shadow-sm text-white">
                          <PlatformIcon platform={pub.platform} />
                        </div>
                      )}
                      <StatusBadge type="publication" status={pub.status} />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4 flex flex-col flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-sm text-foreground block truncate" title={pub.companyName}>{pub.companyName}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">Contato: {pub.clientName}</span>
                      </div>
                      <div className="text-right text-[10px] text-muted-foreground shrink-0">
                        <span className="block font-medium">Agendamento:</span>
                        <strong className="text-foreground">{formatDateBR(pub.scheduledDate)}</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <span className="text-xs font-semibold text-foreground block">Legenda:</span>
                      <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/40 whitespace-pre-wrap leading-relaxed">
                        {expandedCaptions[pub.id]
                          ? pub.caption
                          : (pub.caption.length > 120 ? `${pub.caption.slice(0, 120)}...` : pub.caption)
                        }
                        {pub.caption.length > 120 && (
                          <button
                            type="button"
                            onClick={() => setExpandedCaptions({
                              ...expandedCaptions,
                              [pub.id]: !expandedCaptions[pub.id]
                            })}
                            className="text-primary hover:text-primary/80 font-bold block mt-1 focus:outline-none hover:underline cursor-pointer"
                          >
                            {expandedCaptions[pub.id] ? 'Ver menos' : 'Ver mais'}
                          </button>
                        )}
                      </div>
                    </div>

                    {pub.clientComments && (
                      <div className="p-3 bg-danger/5 border border-danger/25 rounded-lg space-y-1 text-xs mt-auto">
                        <span className="font-semibold text-danger flex items-center gap-1">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Comentários do Cliente:
                        </span>
                        <p className="text-muted-foreground leading-relaxed italic">
                          &ldquo;{pub.clientComments}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit / Archive / Restore action bar */}
                <div className="px-4 py-2 bg-muted/20 border-t border-border/20 flex gap-2 justify-end">
                  {pub.status === 'archived' || pub.archivedAt ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1 hover:border-success hover:text-success py-1"
                      onClick={() => handleRestorePublication(pub.id)}
                    >
                      <RefreshCw className="h-3 w-3" /> Restaurar
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1 py-1"
                        onClick={() => handleStartEditPublication(pub)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1 hover:border-danger hover:text-danger py-1"
                        onClick={() => handleArchivePublication(pub.id)}
                      >
                        Arquivar
                      </Button>
                    </>
                  )}
                </div>

                {/* Approval controls */}
                <div className="p-4 border-t border-border/40 bg-muted/10">
                  {pub.status === 'approved' ? (
                    <div className="space-y-2">
                      <div className="text-xs text-success font-semibold flex items-center gap-1.5 justify-center py-1.5 bg-success/5 border border-success/15 rounded-lg text-center">
                        <Check className="h-4 w-4 shrink-0" /> Aprovada pelo Cliente!
                      </div>
                      {pub.approvedAt && (
                        <span className="text-[10px] text-muted-foreground text-center block">
                          Aprovado em: {new Date(pub.approvedAt).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  ) : pub.status === 'changes_requested' ? (
                    <div className="space-y-3">
                      <div className="text-xs text-danger font-semibold flex items-center gap-1.5 justify-center py-1.5 bg-danger/5 border border-danger/15 rounded-lg text-center">
                        <AlertCircle className="h-4 w-4 shrink-0" /> Ajuste solicitado pelo cliente
                      </div>
                      {pub.changesRequestedAt && (
                        <span className="text-[10px] text-muted-foreground text-center block">
                          Solicitado em: {new Date(pub.changesRequestedAt).toLocaleString('pt-BR')}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-8.5 gap-1.5 justify-center hover:bg-muted"
                        onClick={() => handleRegenerateApprovalLink(pub.id)}
                        disabled={loadingLinks[pub.id]}
                      >
                        {loadingLinks[pub.id] ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        {loadingLinks[pub.id] ? 'Gerando...' : 'Gerar Novo Link após Ajuste'}
                      </Button>
                    </div>
                  ) : !pub.approvalToken || pub.approvalLinkStatus === 'not_created' ? (
                    <div className="space-y-2.5 text-center">
                      <span className="text-[10px] text-muted-foreground block">
                        Gere um link temporário para o cliente aprovar ou solicitar ajuste.
                      </span>
                      <Button
                        size="sm"
                        className="w-full text-xs h-8.5 gap-1.5 justify-center"
                        onClick={() => handleCreateApprovalLink(pub.id)}
                        disabled={loadingLinks[pub.id]}
                      >
                        {loadingLinks[pub.id] ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <LinkIcon className="h-3.5 w-3.5" />
                        )}
                        {loadingLinks[pub.id] ? 'Criando...' : 'Criar link de aprovação'}
                      </Button>
                    </div>
                  ) : pub.approvalLinkStatus === 'active' ? (
                    isExpired ? (
                      <div className="space-y-3">
                        <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 justify-center py-1.5 bg-muted border border-border rounded-lg text-center">
                          <Clock className="h-4 w-4 shrink-0" /> Link de aprovação expirado
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-8.5 gap-1.5 justify-center"
                          onClick={() => handleRegenerateApprovalLink(pub.id)}
                          disabled={loadingLinks[pub.id]}
                        >
                          {loadingLinks[pub.id] ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          {loadingLinks[pub.id] ? 'Gerando...' : 'Gerar Novo Link'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] text-success font-bold uppercase tracking-wider flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Link ativo
                          </span>
                          <CountdownTimer expiresAt={pub.approvalLinkExpiresAt!} />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-8.5 gap-1.5 justify-center"
                            onClick={() => handleCopyLink(pub.id, pub.approvalLink)}
                          >
                            <Copy className="h-3.5 w-3.5" /> {copiedId === pub.id ? 'Copiado!' : 'Copiar link'}
                          </Button>
                          <a
                            href={pub.approvalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 inline-flex items-center justify-center text-xs h-8.5 gap-1.5 rounded-lg border border-border bg-card text-foreground hover:bg-muted font-medium transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Abrir link
                          </a>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-1.5">
                      Status do Link: <strong className="text-foreground uppercase">{pub.approvalLinkStatus}</strong>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPubId(null);
        }}
        title={editingPubId ? "Editar Publicação" : "Cadastrar Nova Publicação"}
        description={editingPubId ? "Atualize os dados da publicação." : "Crie um novo post de teste para aprovação do cliente."}
      >
        <form onSubmit={handleCreatePublication} className="space-y-4 pt-2">
          <div className="space-y-4">
            <Select
              label="Selecione o Cliente"
              placeholder="Escolha um cliente..."
              options={clientOptions}
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              required
            />

            {/* Multi-channel checkboxes */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Redes Sociais / Canais (Selecione pelo menos um)</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {channelOptions.map(option => (
                  <label key={option.value} className="flex items-center gap-2 p-2 bg-muted/40 border border-border/40 rounded-lg text-xs font-semibold cursor-pointer select-none hover:bg-muted/60 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedChannels.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedChannels(prev => [...prev, option.value]);
                        } else {
                          if (selectedChannels.length > 1) {
                            setSelectedChannels(prev => prev.filter(c => c !== option.value));
                          } else {
                            alert('Selecione pelo menos uma rede social.');
                          }
                        }
                      }}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Post Type Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de post"
              options={[
                { value: 'single_image', label: 'Imagem única' },
                { value: 'carousel', label: 'Carrossel' }
              ]}
              value={postType}
              onChange={(e) => setPostType(e.target.value as 'single_image' | 'carousel')}
            />
            <div className="flex items-end pb-1 text-xs text-muted-foreground font-medium">
              {postType === 'single_image'
                ? 'Permite exatamente 1 imagem (upload ou URL).'
                : 'Permite carrossel de 2 a 10 imagens (URLs externas).'}
            </div>
          </div>

          {postType === 'single_image' ? (
            <>
              {/* Image source selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Origem da Imagem</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="imageSource"
                      checked={imageSource === 'external_url'}
                      onChange={() => setImageSource('external_url')}
                      className="accent-primary"
                    />
                    URL Externa
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="radio"
                      name="imageSource"
                      checked={imageSource === 'upload'}
                      onChange={() => setImageSource('upload')}
                      className="accent-primary"
                    />
                    Upload Local
                  </label>
                </div>
              </div>

              {imageSource === 'external_url' ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">URL da Imagem de Destaque</label>
                    <button
                      type="button"
                      onClick={handleOpenImgBB}
                      className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <ImageIcon className="h-3.5 w-3.5" /> Gerar link da imagem (ImgBB)
                    </button>
                  </div>
                  <Input
                    type="url"
                    placeholder="Link de imagem (ex: https://images.unsplash.com/...)"
                    value={imageUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setImageUrl(val);
                      if (brokenImages[val]) {
                        setBrokenImages(prev => {
                          const next = { ...prev };
                          delete next[val];
                          return next;
                        });
                      }
                    }}
                    required
                  />
                  <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                    Use o ImgBB para gerar uma URL. Depois copie o link direto da imagem, normalmente começando com <strong>https://i.ibb.co/</strong>.<br />
                    Exemplo correto: <code>https://i.ibb.co/.../imagem.jpg</code><br />
                    Evite links como: <code>https://ibb.co/...</code> ou <code>https://imgbb.com/...</code>
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Selecionar Imagem</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary file:hover:bg-primary/20 file:cursor-pointer"
                    required={!imageFileBase64}
                  />
                  {fileError && (
                    <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg flex items-start gap-2 text-red-400 text-xs mt-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 bg-muted/20 p-4 rounded-xl border border-border/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Imagens do Carrossel (URLs)</label>
                <button
                  type="button"
                  onClick={handleOpenImgBB}
                  className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <ImageIcon className="h-3.5 w-3.5" /> Gerar link da imagem (ImgBB)
                </button>
              </div>

              <div className="space-y-3">
                {carouselImages.map((imgUrl, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-16 shrink-0">Imagem {index + 1}:</span>
                    <input
                      type="url"
                      value={imgUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newList = [...carouselImages];
                        newList[index] = val;
                        setCarouselImages(newList);
                        if (brokenImages[val]) {
                          setBrokenImages(prev => {
                            const next = { ...prev };
                            delete next[val];
                            return next;
                          });
                        }
                      }}
                      placeholder={`https://images.unsplash.com/post-art-${index + 1}`}
                      className="h-10 flex-1 pl-3 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary transition-all placeholder:text-muted-foreground/75"
                      required
                    />
                    {carouselImages.length > 2 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newList = carouselImages.filter((_, i) => i !== index);
                          setCarouselImages(newList);
                        }}
                        className="px-2 py-1 text-xs font-bold text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                        title="Remover imagem"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                {carouselImages.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCarouselImages([...carouselImages, ''])}
                    className="text-xs font-semibold h-8"
                  >
                    + Adicionar Imagem ao Carrossel
                  </Button>
                )}
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed text-right">
                  Use o ImgBB para gerar as URLs. Copie os links diretos começando com <strong>https://i.ibb.co/</strong>.<br />
                  Evite links como: <code>https://ibb.co/...</code> ou <code>https://imgbb.com/...</code>
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="Previsão de Postagem"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              required
            />
            <Select
              label="Designer / Responsável"
              options={teamOptions}
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </div>

          <Textarea
            label="Legenda do Post (Copywriting)"
            placeholder="Texto que acompanhará o criativo..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={4}
            required
          />

          {/* Visual Simulation Preview */}
          {(caption || finalPreviewImageUrl) && (
            <div className="mt-4 p-4 border border-border/80 bg-muted/20 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Visualização Prévia (Simulação de Post)
              </span>
              <div className="border border-border/60 rounded-xl bg-card overflow-hidden max-w-sm mx-auto shadow-sm">
                <div className="p-3 border-b border-border/40 flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground block">
                    {selectedClient ? selectedClient.companyName : 'Nome do Cliente'}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                    {selectedChannels.map(chan => (
                      <PlatformIcon key={chan} platform={chan as 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'google_business' | 'other'} />
                    ))}
                  </span>
                </div>
                {finalPreviewImageUrl && (
                  <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden border-b border-border/30">
                    {brokenImages[finalPreviewImageUrl] ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-muted-foreground gap-1 select-none">
                        <AlertCircle className="h-6 w-6 text-warning shrink-0" />
                        <span className="text-[11px] font-bold text-foreground">Imagem não carregada</span>
                        <span className="text-[9px] text-muted-foreground/90 max-w-[180px] leading-tight">Verifique se o link colado está correto.</span>
                        <a
                          href={finalPreviewImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-primary font-bold hover:underline mt-1 cursor-pointer flex items-center gap-0.5"
                        >
                          Abrir link <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={finalPreviewImageUrl}
                          alt="Preview creative"
                          className="object-cover w-full h-full"
                          onError={() => {
                            setBrokenImages(prev => ({ ...prev, [finalPreviewImageUrl]: true }));
                          }}
                        />
                        {postType === 'carousel' && (
                          <div className="absolute bottom-2.5 right-2.5 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-semibold">
                            1 / {carouselImages.filter(url => url.trim() !== '').length || 2}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
                {postType === 'carousel' && (
                  <div className="flex justify-center gap-1.5 py-2 bg-card border-b border-border/10">
                    {Array.from({ length: Math.min(10, carouselImages.filter(url => url.trim() !== '').length || 2) }).map((_, i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/35'}`} />
                    ))}
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    <span className="font-bold text-foreground mr-1.5">
                      {selectedClient ? selectedClient.companyName.toLowerCase().replace(/\s+/g, '') : 'cliente'}
                    </span>
                    {caption || 'Seu texto de legenda...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border/20">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditingPubId(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingPubId ? 'Salvar Alterações' : 'Criar Publicação'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
