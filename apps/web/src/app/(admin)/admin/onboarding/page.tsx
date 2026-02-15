'use client';

import { useOnboardingProfiles } from '@/hooks/useOnboardingProfiles';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';

export default function AdminOnboardingListPage(): ReactNode {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'completed' | 'in_progress'>('all');
  const [role, setRole] = useState<'all' | 'employee' | 'intern'>('all');

  const filters = useMemo(() => {
    const next: {
      search?: string;
      status?: 'completed' | 'in_progress';
      role?: 'employee' | 'intern';
      page: number;
      pageSize: number;
    } = {
      page: 1,
      pageSize: 24,
    };

    if (search) {
      next.search = search;
    }

    if (status !== 'all') {
      next.status = status;
    }

    if (role !== 'all') {
      next.role = role;
    }

    return next;
  }, [search, status, role]);

  const { data, isLoading } = useOnboardingProfiles(filters);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Onboarding Data</h1>
        <p className="text-muted-foreground">
          Read-only view of employee/intern onboarding submissions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Submissions</p>
            <p className="text-2xl font-bold">{data?.summary.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold">{data?.summary.completed ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold">{data?.summary.inProgress ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="pl-10"
              />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {(data?.data ?? []).map((profile) => {
          const roleValue = Array.isArray(profile.users)
            ? profile.users[0]?.role
            : profile.users?.role;
          const department = Array.isArray(profile.departments)
            ? profile.departments[0]?.name
            : profile.departments?.name;

          return (
            <Card key={profile.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{profile.full_name || 'Unnamed'}</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.email_address ?? 'No email'}
                    </p>
                  </div>
                  <Badge variant={profile.status === 'completed' ? 'success' : 'warning'}>
                    {profile.status === 'completed' ? 'Completed' : 'In Progress'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Role: {roleValue ?? 'N/A'}</p>
                  <p>Department: {department ?? 'N/A'}</p>
                  <p>Payment: {profile.payment_account_masked ?? 'N/A'}</p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => router.push(`/admin/onboarding/${profile.id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading onboarding submissions...</p>
      )}
    </div>
  );
}
