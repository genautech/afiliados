'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserCircle2, Target, Loader2, Save, ShieldCheck } from 'lucide-react';

interface Profile {
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  metaReceitaMensal: number;
  metaRoi: number;
  budgetMensalAds: number;
  createdAt: string;
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', image: '', metaReceitaMensal: '0', metaRoi: '0', budgetMensalAds: '0' });

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then((d: Profile) => {
        if ((d as any)?.error) throw new Error((d as any).error);
        setProfile(d);
        setForm({
          name: d.name ?? '',
          image: d.image ?? '',
          metaReceitaMensal: String(d.metaReceitaMensal ?? 0),
          metaRoi: String(d.metaRoi ?? 0),
          budgetMensalAds: String(d.budgetMensalAds ?? 0),
        });
      })
      .catch(() => toast.error('Erro ao carregar perfil'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          image: form.image,
          metaReceitaMensal: Number(form.metaReceitaMensal) || 0,
          metaRoi: Number(form.metaRoi) || 0,
          budgetMensalAds: Number(form.budgetMensalAds) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao salvar');
      setProfile(data);
      toast.success('Perfil atualizado');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
          <UserCircle2 className="h-7 w-7 text-green-500" /> Meu Perfil
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Dados pessoais e metas da sua operação — tudo aqui é individual da sua conta.
        </p>
      </div>

      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base text-white">Dados pessoais</CardTitle>
            {profile?.role === 'ADMIN' && (
              <Badge className="bg-purple-500/20 text-purple-300 gap-1"><ShieldCheck className="h-3 w-3" /> Admin da plataforma</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Nome</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-[#0f172a] border-[#334155] text-white"
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Email</Label>
              <Input value={profile?.email ?? ''} disabled className="bg-[#0f172a] border-[#334155] text-slate-500" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">URL da foto (opcional)</Label>
            <Input
              value={form.image}
              onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
              className="bg-[#0f172a] border-[#334155] text-white"
              placeholder="https://…"
            />
          </div>
          {profile?.createdAt && (
            <p className="text-xs text-slate-500">
              Conta criada em {new Date(profile.createdAt).toLocaleDateString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-[#1e293b] border-[#334155]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Target className="h-4 w-4 text-green-400" /> Metas da operação
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Meta de receita mensal (USD)</Label>
            <Input
              type="number" min="0" step="50"
              value={form.metaReceitaMensal}
              onChange={e => setForm(f => ({ ...f, metaReceitaMensal: e.target.value }))}
              className="bg-[#0f172a] border-[#334155] text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Meta de ROI (%)</Label>
            <Input
              type="number" min="0" step="5"
              value={form.metaRoi}
              onChange={e => setForm(f => ({ ...f, metaRoi: e.target.value }))}
              className="bg-[#0f172a] border-[#334155] text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Budget mensal de ads (USD)</Label>
            <Input
              type="number" min="0" step="50"
              value={form.budgetMensalAds}
              onChange={e => setForm(f => ({ ...f, budgetMensalAds: e.target.value }))}
              className="bg-[#0f172a] border-[#334155] text-white"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</> : <><Save className="h-4 w-4" /> Salvar perfil</>}
        </Button>
      </div>
    </div>
  );
}
