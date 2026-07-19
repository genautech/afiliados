'use client';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Save, ExternalLink, CheckCircle2, XCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// wired=false: chaves apenas ARMAZENADAS — nenhum código do app as consome ainda
const SERVICES = [
  {
    name: 'Google Ads',
    key: 'google_ads',
    link: 'https://ads.google.com',
    wired: false,
    fields: [
      { name: 'customer_id', label: 'Customer ID', placeholder: 'xxx-xxx-xxxx' },
      { name: 'developer_token', label: 'Developer Token', placeholder: 'Token', sensitive: true },
      { name: 'client_id', label: 'Client ID', placeholder: 'Client ID', sensitive: true },
      { name: 'client_secret', label: 'Client Secret', placeholder: 'Secret', sensitive: true },
      { name: 'refresh_token', label: 'Refresh Token', placeholder: 'Token', sensitive: true },
    ],
  },
  {
    name: 'ClickBank',
    key: 'clickbank',
    link: 'https://accounts.clickbank.com/',
    fields: [
      { name: 'api_key', label: 'API Key', placeholder: 'Sua API Key', sensitive: true },
      { name: 'account_nickname', label: 'Account Nickname', placeholder: 'Seu nickname' },
    ],
  },
  {
    name: 'MaxWeb',
    key: 'maxweb',
    link: 'https://maxweb.com/',
    wired: false,
    fields: [
      { name: 'api_key', label: 'API Key', placeholder: 'API Key', sensitive: true },
      { name: 'postback_base_url', label: 'Postback Base URL', placeholder: 'https://...' },
    ],
  },
  {
    name: 'BuyGoods',
    key: 'buygoods',
    link: 'https://buygoods.com/',
    wired: false,
    fields: [
      { name: 'affiliate_id', label: 'Affiliate ID', placeholder: 'Seu ID' },
    ],
  },
  {
    name: 'Hotmart',
    key: 'hotmart',
    link: 'https://hotmart.com/',
    wired: false,
    fields: [
      { name: 'token', label: 'Token de Acesso', placeholder: 'Token', sensitive: true },
    ],
  },
  {
    name: 'AnswerThePublic',
    key: 'answerthepublic',
    link: 'https://answerthepublic.com/',
    fields: [
      { name: 'api_key', label: 'API Key (Personal Access Token)', placeholder: 'atp_pk_live_...', sensitive: true },
    ],
  },
  {
    name: 'Modelos de Linguagem / IA (Claude, Gemini, GPT, Ollama)',
    key: 'llm',
    link: 'https://console.anthropic.com/',
    fields: [
      { name: 'api_key_anthropic', label: 'API Key (Anthropic - Claude)', placeholder: 'API Key do Claude (Anthropic)', sensitive: true },
      { name: 'model_anthropic', label: 'Modelo Anthropic (Claude)', placeholder: 'Selecione o modelo do Claude' },
      { name: 'api_key_google', label: 'API Key (Google Gemini)', placeholder: 'API Key do Gemini (Google)', sensitive: true },
      { name: 'api_key_openai', label: 'API Key (OpenAI - GPT-4o)', placeholder: 'API Key do OpenAI', sensitive: true },
      { name: 'api_key_ollama', label: 'API Key (Ollama Cloud — grátis)', placeholder: 'Key de ollama.com (vazio = servidor local)', sensitive: true },
    ],
  },
];

export default function ConfiguracoesPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/integrations')
      .then(r => r.json())
      .then(data => {
        setIntegrations(data ?? []);
        const initial: Record<string, string> = {};
        for (const item of data ?? []) {
          initial[`${item?.serviceName}_${item?.fieldName}`] = item?.fieldValue ?? '';
        }
        setFormData(initial);
      })
      .catch(console.error);
  }, []);

  const saveField = async (serviceName: string, fieldName: string) => {
    const key = `${serviceName}_${fieldName}`;
    const value = formData[key] ?? '';
    if (!value || value?.startsWith?.('•')) return;
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName, fieldName, fieldValue: value }),
      });
      toast.success(`${fieldName} salvo!`);
      setFormData(prev => ({ ...prev, [key]: '••••' + value?.slice?.(-4) }));
    } catch { toast.error('Erro ao salvar'); } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const isConnected = (serviceKey: string) => {
    return (integrations ?? []).some((i: any) => i?.serviceName === serviceKey);
  };

  const inputCls = "bg-[#0f172a] border-[#334155] text-white placeholder:text-slate-500";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-400" /> Configurações & Integrações
        </h1>
        <p className="text-slate-400 text-sm mt-1">Configure as credenciais das suas plataformas de afiliado</p>
      </div>

      {SERVICES.map(service => (
        <Card key={service.key} className="bg-[#1e293b] border-[#334155]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg text-white">{service.name}</CardTitle>
                {(service as any).wired === false ? (
                  <Badge className="bg-yellow-500/20 text-yellow-400 gap-1" title="As chaves são salvas mas o app ainda não tem integração que as use — servem de cofre para uso via chat/skills">
                    <AlertTriangle className="h-3 w-3" /> {isConnected(service.key) ? 'Armazenada (não conectada ao app)' : 'Não conectada ao app'}
                  </Badge>
                ) : isConnected(service.key) ? (
                  <Badge className="bg-green-500/20 text-green-400 gap-1"><CheckCircle2 className="h-3 w-3" /> Ativa no app</Badge>
                ) : (
                  <Badge className="bg-slate-500/20 text-slate-400 gap-1"><XCircle className="h-3 w-3" /> Não configurado</Badge>
                )}
              </div>
              <a href={service.link} target="_blank" rel="noopener">
                <Button size="sm" variant="outline" className="border-[#334155] text-slate-300 gap-1">
                  <ExternalLink className="h-3 w-3" /> Abrir
                </Button>
              </a>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {service.fields.map(field => {
              const key = `${service.key}_${field.name}`;
              return (
                <div key={field.name} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label className="text-slate-300 text-sm">{field.label}</Label>
                    <div className="relative">
                      {field.name === 'model_anthropic' ? (
                        <Select
                          value={formData[key] || 'claude-opus-4-7'}
                          onValueChange={async (val) => {
                            setFormData(prev => ({ ...prev, [key]: val }));
                            try {
                              await fetch('/api/integrations', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ serviceName: service.key, fieldName: field.name, fieldValue: val }),
                              });
                              toast.success('Modelo Anthropic atualizado!');
                            } catch {
                              toast.error('Erro ao atualizar modelo');
                            }
                          }}
                        >
                          <SelectTrigger className={inputCls}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1e293b] border-[#334155]">
                            <SelectItem value="claude-opus-4-7" className="text-white">Claude Opus 4.7 (.7)</SelectItem>
                            <SelectItem value="claude-sonnet-5" className="text-white">Claude Sonnet 5</SelectItem>
                            <SelectItem value="claude-opus-4-8" className="text-white">Claude Opus 4.8</SelectItem>
                            <SelectItem value="claude-sonnet-4-6" className="text-white">Claude Sonnet 4.6</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <>
                          <Input
                            type={field.sensitive && !showValues[key] ? 'password' : 'text'}
                            value={formData[key] ?? ''}
                            onChange={(e:any) => setFormData(prev => ({ ...prev, [key]: e?.target?.value ?? '' }))}
                            placeholder={field.placeholder}
                            className={`${inputCls} ${field.sensitive ? 'pr-10' : ''}`}
                          />
                          {field.sensitive && (
                            <button onClick={() => setShowValues(prev => ({ ...prev, [key]: !prev[key] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                              {showValues[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {field.name !== 'provider' && field.name !== 'model_anthropic' && (
                    <Button onClick={() => saveField(service.key, field.name)} loading={saving[key]} className="bg-green-600 hover:bg-green-700 text-white gap-1" size="sm">
                      <Save className="h-3 w-3" /> Salvar
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
