import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import Button from '../components/ui/button';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-background via-card/10 to-background">
      <div className="h-16 w-16 rounded-full bg-danger/10 text-danger flex items-center justify-center mb-6 ring-8 ring-danger/5">
        <ShieldAlert className="h-8 w-8 animate-pulse" />
      </div>
      <h1 className="text-2xl font-bold mb-3 tracking-tight text-foreground">
        403 - Acesso Negado
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-md">
        Você não possui permissão para acessar esta área operacional. Caso ache que isso seja um erro, entre em contato com a equipe NV Hub.
      </p>
      <Link href="/dashboard">
        <Button className="px-6">Voltar ao Dashboard</Button>
      </Link>
    </div>
  );
}