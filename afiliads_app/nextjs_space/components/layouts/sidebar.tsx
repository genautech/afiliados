'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  BarChart3, LayoutDashboard, Wand2, ListTodo, CalendarDays,
  Search, Settings, BookOpen, FileText, LogOut, Menu, X, ChevronLeft, FileSpreadsheet, Bot, Radar, PackageSearch
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wizard', label: 'Nova Campanha', icon: Wand2 },
  { href: '/agentes', label: 'Agentes', icon: Bot },
  { href: '/busca-produtos', label: 'Busca de Produtos', icon: PackageSearch },
  { href: '/campanhas', label: 'Campanhas', icon: ListTodo },
  { href: '/diario', label: 'Diário', icon: CalendarDays },
  { href: '/keywords', label: 'Keywords', icon: Search },
  { href: '/pesquisa-keywords', label: 'Pesquisa ATP', icon: Radar },
  { href: '/rsa', label: 'Gerador RSA', icon: FileText },
  { href: '/planilhas', label: 'Planilhas', icon: FileSpreadsheet },
  { href: '/conhecimento', label: 'Conhecimento', icon: BookOpen },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname() ?? '';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#1e293b] border border-[#334155] rounded-lg p-2 text-slate-300 hover:text-white"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed left-0 top-0 h-full bg-[#0f172a] border-r border-[#1e293b] z-50 transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1e293b]">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-green-500 shrink-0" />
              <span className="text-lg font-display font-bold text-white">AfiliAds</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="mx-auto">
              <BarChart3 className="h-7 w-7 text-green-500" />
            </Link>
          )}
          <button onClick={() => { setMobileOpen(false); setCollapsed(!collapsed); }} className="text-slate-400 hover:text-white hidden lg:block">
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
          <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems?.map((item: any) => {
            const Icon = item?.icon;
            const isActive = pathname === item?.href || pathname?.startsWith?.(item?.href + '/');
            return (
              <Link
                key={item?.href}
                href={item?.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-green-600/20 text-green-400 border border-green-500/20'
                    : 'text-slate-400 hover:bg-[#1e293b] hover:text-white',
                  collapsed && 'justify-center px-0'
                )}
                title={collapsed ? item?.label : undefined}
              >
                {Icon && <Icon className="h-5 w-5 shrink-0" />}
                {!collapsed && <span>{item?.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-[#1e293b]">
          <button
            onClick={() => signOut?.({ callbackUrl: '/login' })}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 w-full transition-all',
              collapsed && 'justify-center px-0'
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
