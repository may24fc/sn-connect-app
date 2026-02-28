'use client';

import { useOnboardingProfiles } from '@/hooks/useOnboardingProfiles';
import { useProbation } from '@/hooks/useProbation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import { ArrowRight, CheckCircle2, Clock, Search, UserCog, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysRemaining(endDate: string | null | undefined): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function EmployeeManagementPage(): ReactNode {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('probation');
  const [searchTerm, setSearchTerm] = useState('');

  // Probation data
  const { data: probationData, isLoading: probationLoading } = useProbation();

  // Onboarding profiles
  const { data: onboardingData, isLoading: onboardingLoading } = useOnboardingProfiles({
    search: searchTerm || undefined,
    page: 1,
    pageSize: 50,
  });

  const probationEmployees = probationData?.data || [];
  const onboardingProfiles = onboardingData?.data || [];

  const filteredProbation = searchTerm
    ? probationEmployees.filter(
        (emp: { first_name?: string; last_name?: string; position?: string }) => {
          const name = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
          return (
            name.includes(searchTerm.toLowerCase()) ||
            emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
      )
    : probationEmployees;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <UserCog className="h-5 w-5 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Employee Management
          </h1>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Manage employee probation, onboarding, and directory access
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
          strokeWidth={1.5}
        />
        <Input
          placeholder="Search employees..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="probation">
            Probation
            {probationEmployees.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {probationEmployees.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="onboarding">
            Onboarding
            {onboardingProfiles.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {onboardingProfiles.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all-employees">All Employees</TabsTrigger>
        </TabsList>

        {/* Probation Tab */}
        <TabsContent value="probation" className="mt-4">
          {probationLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : filteredProbation.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2
                  className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No employees on probation
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProbation.map(
                (emp: {
                  id: string;
                  user_id?: string;
                  first_name?: string;
                  last_name?: string;
                  position?: string;
                  department?: string;
                  date_hired?: string;
                  probation_end_date?: string;
                  avatar_url?: string;
                }) => {
                  const daysRemaining = getDaysRemaining(emp.probation_end_date);
                  const isUrgent = daysRemaining !== null && daysRemaining <= 14;

                  return (
                    <Card
                      key={emp.id}
                      className={isUrgent ? 'border-amber-300 dark:border-amber-700' : ''}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={emp.avatar_url} />
                            <AvatarFallback className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                              {getInitials(`${emp.first_name || ''} ${emp.last_name || ''}`)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-sm">
                              {emp.first_name} {emp.last_name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {emp.position || 'No position'}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                          <span>Hired: {formatDate(emp.date_hired)}</span>
                          <span>End: {formatDate(emp.probation_end_date)}</span>
                        </div>
                        {daysRemaining !== null && (
                          <div className="flex items-center gap-2">
                            <Clock
                              className={`h-3.5 w-3.5 ${isUrgent ? 'text-amber-500' : 'text-zinc-500 dark:text-zinc-400'}`}
                              strokeWidth={1.5}
                            />
                            <span
                              className={`text-xs font-medium ${isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-300'}`}
                            >
                              {daysRemaining <= 0
                                ? 'Probation ended'
                                : `${daysRemaining} days remaining`}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>
          )}
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="mt-4">
          {onboardingLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : onboardingProfiles.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users
                  className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No pending onboarding profiles
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {onboardingProfiles.map(
                (profile: {
                  id: string;
                  user_id: string;
                  first_name?: string;
                  last_name?: string;
                  is_completed?: boolean;
                  completed_steps?: number;
                  total_steps?: number;
                  created_at?: string;
                  avatar_url?: string;
                }) => {
                  const progress =
                    profile.total_steps && profile.total_steps > 0
                      ? Math.round(((profile.completed_steps || 0) / profile.total_steps) * 100)
                      : 0;

                  return (
                    <Card key={profile.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                              {getInitials(
                                `${profile.first_name || ''} ${profile.last_name || ''}`
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-sm">
                              {profile.first_name} {profile.last_name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Started {formatDate(profile.created_at)}
                            </CardDescription>
                          </div>
                          {profile.is_completed && (
                            <Badge variant="default" className="ml-auto text-xs">
                              Completed
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                            <span>
                              {profile.completed_steps || 0} / {profile.total_steps || 0} steps
                            </span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>
          )}
        </TabsContent>

        {/* All Employees Tab */}
        <TabsContent value="all-employees" className="mt-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users
                className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3"
                strokeWidth={1.5}
              />
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-1 font-medium">
                View the Master Directory
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Access the full employee and intern directory for a complete view.
              </p>
              <Button variant="outline" size="sm" onClick={() => router.push('/admin/directory')}>
                Go to Directory
                <ArrowRight className="h-4 w-4 ml-2" strokeWidth={1.5} />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
