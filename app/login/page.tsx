'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Card from '../../components/ui/card';
import { PLATFORM_DESCRIPTION } from '../../lib/config';
import { LogoIcon } from '../../components/ui/logo';
import { signIn, useSession } from '../../lib/auth-client';
import { isDatabaseDataMode } from '../../lib/data-mode';

export default function LoginPage() {
  const router = useRouter();

  const isDatabaseMode = isDatabaseDataMode;
  const { data: session, isPending } = useSession();

  const [email, setEmail] = useState(isDatabaseMode ? '' : 'ana.silva@powerponto.com.br');
  const [password, setPassword] = useState(isDatabaseMode ? '' : 'power123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isDatabaseMode && !isPending && session) {
      router.replace('/dashboard');
    }
  }, [isDatabaseMode, isPending, router, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (isDatabaseMode) {
      await signIn.email({
        email,
        password,
      }, {
        onRequest: () => {
          setIsLoading(true);
        },
        onSuccess: () => {
          setIsLoading(false);
          router.replace('/dashboard');
        },
        onError: () => {
          setError('Não foi possível entrar. Verifique suas credenciais e tente novamente.');
          setIsLoading(false);
        }
      });
    } else {
      // Simulate authenticating for sandbox
      setTimeout(() => {
        if (email && password) {
          setIsLoading(false);
          router.push('/dashboard');
        } else {
          setIsLoading(false);
          setError('Preencha os campos de login para continuar.');
        }
      }, 1200);
    }
  };

  if (isDatabaseMode && (isPending || session)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-background via-card/10 to-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-b from-background via-card/10 to-background relative overflow-hidden">
      
      {/* Glow ambient background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/4 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-cool/3 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center">
          <LogoIcon size="xl" className="mb-4 hover:scale-105 transition-transform duration-300" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground leading-none select-none">
            {isDatabaseMode ? (
              'Entrar na NV Hub'
            ) : (
              <>
                <span>NV</span>
                <span className="text-primary font-semibold tracking-wide ml-0.5">Hub</span>
              </>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-2 max-w-xs font-semibold">
            {isDatabaseMode
              ? 'Acesse sua área operacional e acompanhe os módulos habilitados para sua empresa.'
              : PLATFORM_DESCRIPTION}
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-8 border border-border/40 shadow-2xl bg-card/60 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                {isDatabaseMode ? 'Acesso restrito' : 'Ambiente Demonstrativo'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isDatabaseMode 
                  ? 'Entre com as credenciais fornecidas pela equipe NV Hub.'
                  : 'Use as credenciais abaixo para acessar a demo da NV Hub.'}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger font-medium flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            <Input
              label="E-mail Operacional"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.nome@empresa.com"
              required
            />

            <div className="relative">
              <Input
                label="Senha de Acesso"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-8.5 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              {isDatabaseMode ? 'Entrar no sistema' : 'Entrar no Painel'}
            </Button>

            {isDatabaseMode && (
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                Não possui acesso? Fale com a equipe NV Hub para liberar sua empresa.
              </p>
            )}
          </form>
        </Card>

        {/* Guest Credentials Indicator */}
        {!isDatabaseMode && (
          <div className="p-4 bg-muted/30 border border-border/50 rounded-xl text-center flex items-center justify-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <div className="text-left text-[11px] text-muted-foreground">
              <span className="font-semibold block text-foreground">Credenciais de Acesso à Demo:</span>
              Email: <code className="text-primary select-all">ana.silva@powerponto.com.br</code>
              <br />
              Senha: <code className="text-primary select-all">power123</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
