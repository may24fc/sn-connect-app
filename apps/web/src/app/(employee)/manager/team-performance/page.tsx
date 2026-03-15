'use client';

import { useManagerTeamPerformance } from '@/hooks/useIndividualPerformance';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import { ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

function progressTone(value: number): 'approved' | 'pending' | 'error' | 'secondary' {
  if (value >= 75) return 'approved';
  if (value >= 50) return 'pending';
  if (value > 0) return 'error';
  return 'secondary';
}

export default function ManagerTeamPerformancePage(): ReactNode {
  const { data, isLoading, error } = useManagerTeamPerformance();
  const entries = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manager Team Performance</h1>
          <p className="text-muted-foreground">
            Performance summary for your direct reports only.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Direct Reports</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{entries.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average OKR Progress</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {entries.length > 0
              ? `${Math.round(entries.reduce((sum, entry) => sum + entry.okrProgress, 0) / entries.length)}%`
              : '0%'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average KPI Progress</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {entries.length > 0
              ? `${Math.round(entries.reduce((sum, entry) => sum + entry.kpiProgress, 0) / entries.length)}%`
              : '0%'}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading team performance...</div>
          ) : error ? (
            <div className="p-6 text-sm text-error">Failed to load team performance.</div>
          ) : entries.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              No direct reports were found for your account.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>OKR Progress</TableHead>
                  <TableHead>KPI Progress</TableHead>
                  <TableHead>Reviews</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.employeeId}>
                    <TableCell className="font-medium">{entry.fullName}</TableCell>
                    <TableCell>{entry.department || '—'}</TableCell>
                    <TableCell>{entry.position || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={progressTone(entry.okrProgress)}>{entry.okrProgress}%</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={progressTone(entry.kpiProgress)}>{entry.kpiProgress}%</Badge>
                    </TableCell>
                    <TableCell>{entry.reviewCount}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/performance/employee/${entry.employeeId}`}>
                        <Button size="sm" variant="outline">
                          View
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}