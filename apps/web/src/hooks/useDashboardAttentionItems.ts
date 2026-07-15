'use client';

import { useAdminProfileCompletion } from '@/hooks/useAdminProfileCompletion';
import { usePendingApprovals } from '@/hooks/usePendingApprovals';
import { useProbation } from '@/hooks/useProbation';
import { useRealtimeOnboardingApprovals } from '@/hooks/useRealtimeOnboardingApprovals';
import type { DashboardAttentionItem } from '@hr-portal/ui';
import {
  AlertTriangle,
  ClipboardList,
  CreditCard,
  GraduationCap,
  Star,
  UserCog,
  UserCircle,
  Users,
} from 'lucide-react';

type DashboardAttentionRole = 'admin' | 'super_admin';

export function useDashboardAttentionItems(role: DashboardAttentionRole) {
  const { data: pendingData, isLoading: pendingLoading } = usePendingApprovals();
  const { data: profileData, isLoading: profileLoading } = useAdminProfileCompletion();
  const {
    pendingApprovals,
    isLoading: onboardingLoading,
  } = useRealtimeOnboardingApprovals();
  const { data: probationData, isLoading: probationLoading } = useProbation();

  const employeeOnboardingCount = pendingApprovals.filter(
    (approval) => approval.role === 'employee'
  ).length;
  const internOnboardingCount = pendingApprovals.filter(
    (approval) => approval.role === 'associate'
  ).length;

  const probationRecords = probationData?.data ?? [];
  const atRiskProbationCount = probationRecords.filter((record) => record.status === 'at-risk').length;
  const dueSoonProbationCount = probationRecords.filter(
    (record) => record.status !== 'completed' && record.daysRemaining <= 7
  ).length;
  const probationConcernRecords = probationRecords.filter(
    (record) => record.status === 'at-risk' || (record.status !== 'completed' && record.daysRemaining <= 7)
  );

  const items: DashboardAttentionItem[] = [];

  // Profile completion prompt for admins / super-admins
  if (profileData?.needsSetup) {
    items.push({
      id: 'admin-profile-setup',
      title: 'Complete Your Profile',
      description: 'Your employee profile is incomplete. Fill in personal details, emergency contacts, and more.',
      count: 1,
      href: '/admin/onboarding-setup',
      icon: UserCircle,
      severity: 'warning',
      actionLabel: 'Complete profile',
    });
  }

  if ((pendingData?.lateEodReports.count ?? 0) > 0) {
    items.push({
      id: 'late-associate-eods',
      title: 'Late Associate EODs',
      description: 'Active interns still need yesterday\'s end-of-day report reviewed or chased.',
      count: pendingData?.lateEodReports.count ?? 0,
      href: '/admin/interns',
      icon: Users,
      severity: 'critical',
      meta: `${pendingData?.lateEodReports.count ?? 0} overdue`,
      actionLabel: 'Open interns',
    });
  }

  if (employeeOnboardingCount > 0) {
    items.push({
      id: 'employee-onboarding-approvals',
      title: 'Employee Onboarding Approvals',
      description: 'Completed employee onboarding submissions are waiting for HR review.',
      count: employeeOnboardingCount,
      href: '/admin/employee-management',
      icon: UserCog,
      severity: 'warning',
      actionLabel: 'Review employees',
    });
  }

  if (internOnboardingCount > 0) {
    items.push({
      id: 'associate-onboarding-approvals',
      title: 'Associate Onboarding Approvals',
      description: 'Associate onboarding submissions are awaiting approval before activation.',
      count: internOnboardingCount,
      href: '/admin/interns',
      icon: GraduationCap,
      severity: 'warning',
      actionLabel: 'Review interns',
    });
  }

  if (role === 'super_admin' && (pendingData?.pendingReports.count ?? 0) > 0) {
    const overdueCount = pendingData?.pendingReports.overdue ?? 0;

    items.push({
      id: 'pending-reports',
      title: 'Reports to Review',
      description:
        overdueCount > 0
          ? 'Submitted reports are waiting for review and some are already overdue.'
          : 'Submitted reports are waiting for review.',
      count: pendingData?.pendingReports.count ?? 0,
      href: '/admin/reports',
      icon: ClipboardList,
      severity: overdueCount > 0 ? 'critical' : 'warning',
      ...(overdueCount > 0 ? { meta: `${overdueCount} overdue` } : {}),
      actionLabel: 'Open reports',
    });
  }

  if (probationConcernRecords.length > 0) {
    let meta: string | undefined;

    if (atRiskProbationCount > 0 && dueSoonProbationCount > 0) {
      meta = `${atRiskProbationCount} at risk, ${dueSoonProbationCount} due soon`;
    } else if (atRiskProbationCount > 0) {
      meta = `${atRiskProbationCount} at risk`;
    } else if (dueSoonProbationCount > 0) {
      meta = `${dueSoonProbationCount} due in 7 days`;
    }

    items.push({
      id: 'probation-concerns',
      title: 'Probation Follow-ups',
      description: 'Employees on probation need attention for upcoming deadlines or risk status.',
      count: probationConcernRecords.length,
      href: '/admin/probation',
      icon: AlertTriangle,
      severity: atRiskProbationCount > 0 ? 'critical' : 'warning',
      ...(meta ? { meta } : {}),
      actionLabel: 'Open probation',
    });
  }

  if ((pendingData?.pendingReviews.count ?? 0) > 0) {
    items.push({
      id: 'pending-reviews',
      title: 'OKRs & KPIs Reviews Pending',
      description: 'OKRs & KPI reviews are waiting for the next approval step.',
      count: pendingData?.pendingReviews.count ?? 0,
      href: '/admin/performance',
      icon: Star,
      severity: 'info',
      actionLabel: 'Open OKRs & KPIs',
    });
  }

  if (role === 'super_admin' && (pendingData?.pendingInvoices.count ?? 0) > 0) {
    items.push({
      id: 'pending-invoices',
      title: 'Payroll Approvals Pending',
      description: 'Submitted invoice and payroll items are awaiting super-admin approval.',
      count: pendingData?.pendingInvoices.count ?? 0,
      href: '/super-admin/payroll-approvals',
      icon: CreditCard,
      severity: 'warning',
      actionLabel: 'Open payroll',
    });
  }

  const totalCount = items.reduce((runningTotal, item) => runningTotal + item.count, 0);

  return {
    items,
    totalCount,
    isLoading: pendingLoading || onboardingLoading || probationLoading || profileLoading,
  };
}