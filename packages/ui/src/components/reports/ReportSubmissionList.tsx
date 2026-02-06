'use client';

import * as React from 'react';
import { Eye, Mail, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../primitives/table';
import { Button } from '../../primitives/button';
import { Input } from '../../primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import { cn } from '../../utils/cn';
import { ReportStatusBadge } from './ReportStatusBadge';
import type { ReportSubmission, ReportStatus } from './types';

interface ReportSubmissionListProps {
  submissions: ReportSubmission[];
  onView?: (submission: ReportSubmission) => void;
  onSendReminder?: (submitterId: string) => void;
  className?: string;
}

export function ReportSubmissionList({
  submissions,
  onView,
  onSendReminder,
  className,
}: ReportSubmissionListProps): React.ReactNode {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = React.useState<string>('all');

  // Get unique departments
  const departments = React.useMemo(() => {
    const unique = new Set(submissions.map((s) => s.submitterDepartment));
    return Array.from(unique).sort();
  }, [submissions]);

  // Filter submissions
  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter((submission) => {
      const matchesSearch =
        submission.submitterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        submission.submitterDepartment.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;

      const matchesDepartment =
        departmentFilter === 'all' || submission.submitterDepartment === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [submissions, searchQuery, statusFilter, departmentFilter]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubmissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No submissions found.
                </TableCell>
              </TableRow>
            ) : (
              filteredSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="font-medium">{submission.submitterName}</TableCell>
                  <TableCell>{submission.submitterDepartment}</TableCell>
                  <TableCell>
                    <ReportStatusBadge status={submission.status} />
                  </TableCell>
                  <TableCell>{formatDate(submission.submittedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {submission.status === 'submitted' || submission.status === 'reviewed' ? (
                        onView && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onView(submission)}
                            title="View report"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                        )
                      ) : (
                        onSendReminder && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onSendReminder(submission.submitterId)}
                            title="Send reminder"
                          >
                            <Mail className="h-4 w-4" />
                            <span className="sr-only">Send Reminder</span>
                          </Button>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredSubmissions.length} of {submissions.length} submissions
      </div>
    </div>
  );
}
