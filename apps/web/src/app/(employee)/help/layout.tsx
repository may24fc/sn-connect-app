'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft, BookOpen, FileText, DollarSign, BarChart3, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@hr-portal/ui';
import Link from 'next/link';

const helpNav = [
  {
    title: 'OKRs & KPIs',
    href: '/help/performance-reviews',
    icon: BarChart3,
    description: 'Objectives, metrics, and review-cycle guidance',
  },
  {
    title: 'Marketing Reports',
    href: '/help/reports',
    icon: FileText,
    description: 'Marketing reporting workflow and FAQs',
  },
  {
    title: 'Invoices',
    href: '/help/invoices',
    icon: DollarSign,
    description: 'Payroll invoices and approvals',
  },
];

const backLink: Record<string, string> = {
  '/help/performance-reviews': '/performance',
  '/help/reports': '/reports',
  '/help/invoices': '/invoice',
};

export default function HelpLayout({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const isIndex = pathname === '/help';
  const backHref = backLink[pathname] ?? '/dashboard';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1.5 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="flex items-center gap-3 pb-2 border-b border-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
          <p className="text-sm text-muted-foreground">
            Guides and FAQs to help you use Control Hub
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 shrink-0 space-y-1">
          {helpNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{item.title}</p>
                </div>
                {isActive && <ChevronRight className="h-4 w-4 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isIndex ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {helpNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href}>
                    <Card className="hover:border-primary/40 hover:shadow-md transition-all cursor-pointer h-full">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{item.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
