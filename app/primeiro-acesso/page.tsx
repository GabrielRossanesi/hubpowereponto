'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, ShieldAlert, LogOut } from 'lucide-react';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { LogoIcon } from '../../components/ui/logo';
import { useSession, signOut } from '../../lib/auth-client';
import { isDatabaseDataMode } from '../../lib/data-mode';
import { changeFirstPasswordAction, checkMustChangePasswordAction } from './actions';

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const isDatabaseMode = isDatabaseDataMode;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(isDatabaseMode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isDatabaseMode) {
      return;
    }

    if (!isPending && !session) {
      router.replace('/login');
      return;
    }

    if (session) {
      // Check if they actually need to change password
      checkMustChangePasswordAction()
        .then((res) => {
          if (!res.mustChange) {
            router.replace('/dashboard');
          } else {
            setChecking(false);
          }
        })
        .catch(() => {
          setChecking(false);
        });
    }
  }, [session, isPending, isDatabaseMode, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError('A nova senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação de senha não coincidem.');
      return;
    }

    setIsLoading(true);

    if (isDatabaseMode) {
      try {
        await changeFirstPasswordAction(newPassword, confirmPassword);
        setSuccess(true);
        setTimeout(() => {
          router.replace('/dashboard');
          router.refresh();
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao alterar senha. Tente novamente.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Sandbox simulation
      setTimeout(() => {
        setSuccess(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }, 1000);
    }
  };

  const handleLogout = async () => {
    if (isDatabaseMode) {
      await signOut();
    }
    router.replace('/login');
  };

  if (isDatabaseMode && (isPending || checking)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-card/10 to-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-b from-background via-card/10 to-background relative overflow-hidden">
      
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/4 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-cool/3 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex flex-col items-center justify-center text-center">
          <LogoIcon size="xl" className="mb-4" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground select-none">
            Primeiro Acesso
          </h1>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs font-semibold">
            Segurança NV Hub: Defina sua nova senha operacional para continuar.
          </p>
        </div>

        <Card className="border border-border/40 bg-card/60 backdrop-blur-md shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Lock className="h-4.5 w-4.5 text-primary" /> Alterar Senha Temporária
            </CardTitle>
            <CardDescription className="text-xs">
              Sua conta foi criada com uma senha temporária. Escolha uma senha segura de uso pessoal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="py-6 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-success/15 text-success flex items-center justify-center mx-auto ring-8 ring-success/5 animate-bounce">
                  <LogoIcon size="md" />
                </div>
                <h3 className="text-sm font-bold text-success">Senha atualizada com sucesso!</h3>
                <p className="text-xs text-muted-foreground">Redirecionando para o seu painel...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs font-semibold rounded-lg flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Senha Temporária Atual
                  </label>
                  <div className="relative">
                    <Input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                    >
                      {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">Mínimo de 6 caracteres.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? 'Atualizando senha...' : 'Confirmar Alteração'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer bg-transparent border-0 outline-none"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Voltar ao login / Sair</span>
          </button>
        </div>
      </div>
    </div>
  );
}