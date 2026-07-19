'use client';
import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart3, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', { redirect: false, email, password });
      if (res?.error) {
        setError('Email ou senha inválidos');
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setError('Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      <Card className="w-full max-w-md bg-[#1e293b] border-[#334155]">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BarChart3 className="h-8 w-8 text-green-500" />
            <span className="text-2xl font-display font-bold text-white">AfiliAds</span>
          </div>
          <CardTitle className="text-xl text-white">Entrar na Central</CardTitle>
          <CardDescription className="text-slate-400">Gerencie suas campanhas de afiliado</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-400 text-sm text-center bg-red-500/10 rounded-md p-2">{error}</p>}
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input type="email" placeholder="seu@email.com" value={email} onChange={(e: any) => setEmail(e?.target?.value ?? '')} className="bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500" required />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Senha</Label>
              <div className="relative">
                <Input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e: any) => setPassword(e?.target?.value ?? '')} className="bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500 pr-10" required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" loading={loading} className="w-full bg-green-600 hover:bg-green-700 text-white">
              Entrar
            </Button>
            <p className="text-center text-sm text-slate-400">
              Não tem conta?{' '}
              <Link href="/signup" className="text-green-400 hover:text-green-300 font-medium">Criar conta</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
