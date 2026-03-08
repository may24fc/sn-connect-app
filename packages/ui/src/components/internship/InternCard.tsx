'use client';

import {
  Building2,
  Calendar,
  ChevronRight,
  Eye,
  FileText,
  GraduationCap,
  Mail,
  MoreVertical,
  Trash2,
  User,
} from 'lucide-react';
import type * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../primitives/avatar';
import { Button } from '../../primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../primitives/dropdown-menu';
import type { InternSummary } from '../../types/internship.types';
import { getDaysRemaining } from '../../types/internship.types';
import { cn } from '../../utils/cn';
import { HoursProgressMini } from './HoursProgressCard';
import { InternshipStatusBadge } from './InternStatusBadge';

interface InternCardProps {
  intern: InternSummary;
  onView?: (intern: InternSummary) => void;
  onViewReports?: (intern: InternSummary) => void;
  onContact?: (intern: InternSummary) => void;
  onDelete?: (intern: InternSummary) => void;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function InternCard({
  intern,
  onView,
  onViewReports,
  onContact,
  onDelete,
  className,
}: InternCardProps): React.ReactNode {
  const daysRemaining = getDaysRemaining(intern.endDate);

  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {intern.avatarUrl && <AvatarImage src={intern.avatarUrl} />}
              <AvatarFallback className="text-sm">{getInitials(intern.name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{intern.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{intern.program}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InternshipStatusBadge status={intern.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={() => onView(intern)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onViewReports && (
                  <DropdownMenuItem onClick={() => onViewReports(intern)}>
                    <FileText className="mr-2 h-4 w-4" />
                    View Reports
                  </DropdownMenuItem>
                )}
                {onContact && (
                  <DropdownMenuItem onClick={() => onContact(intern)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Intern
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(intern)}
                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Intern
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-4 w-4" />
            <span className="truncate">{intern.school}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{intern.department}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="truncate">{intern.supervisor}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{daysRemaining} days left</span>
          </div>
        </div>

        {/* Progress */}
        <HoursProgressMini
          completedHours={intern.completedHours}
          requiredHours={intern.requiredHours}
          startDate={intern.startDate}
          endDate={intern.endDate}
        />

        {/* Last Report */}
        {intern.lastReportDate && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span>Last report: {new Date(intern.lastReportDate).toLocaleDateString()}</span>
            {intern.pendingReports > 0 && (
              <span className="text-warning">{intern.pendingReports} pending review</span>
            )}
          </div>
        )}

        {onView && (
          <Button variant="outline" className="w-full" onClick={() => onView(intern)}>
            View Profile
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface InternListProps {
  interns: Array<InternSummary>;
  onView?: (intern: InternSummary) => void;
  onViewReports?: (intern: InternSummary) => void;
  onContact?: (intern: InternSummary) => void;
  onDelete?: (intern: InternSummary) => void;
  emptyMessage?: string;
  layout?: 'grid' | 'list';
  className?: string;
}

export function InternList({
  interns,
  onView,
  onViewReports,
  onContact,
  onDelete,
  emptyMessage = 'No interns found',
  layout = 'grid',
  className,
}: InternListProps): React.ReactNode {
  if (interns.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={cn(
        layout === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4',
        className
      )}
    >
      {interns.map((intern) => (
        <InternCard
          key={intern.id}
          intern={intern}
          {...(onView && { onView })}
          {...(onViewReports && { onViewReports })}
          {...(onContact && { onContact })}
          {...(onDelete && { onDelete })}
        />
      ))}
    </div>
  );
}

interface InternRowProps {
  intern: InternSummary;
  onView?: (intern: InternSummary) => void;
  onDelete?: (intern: InternSummary) => void;
  className?: string;
}

export function InternRow({ intern, onView, onDelete, className }: InternRowProps): React.ReactNode {
  const daysRemaining = getDaysRemaining(intern.endDate);

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors',
        onView && 'cursor-pointer',
        className
      )}
      onClick={() => onView?.(intern)}
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : undefined}
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          {intern.avatarUrl && <AvatarImage src={intern.avatarUrl} />}
          <AvatarFallback className="text-xs">{getInitials(intern.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{intern.name}</p>
          <p className="text-sm text-muted-foreground">
            {intern.school} - {intern.program}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden md:block w-32">
          <HoursProgressMini
            completedHours={intern.completedHours}
            requiredHours={intern.requiredHours}
            startDate={intern.startDate}
            endDate={intern.endDate}
          />
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm text-muted-foreground">{intern.supervisor}</p>
          <p className="text-xs text-muted-foreground">{daysRemaining} days left</p>
        </div>
        <InternshipStatusBadge status={intern.status} />
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Remove Intern"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(intern);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {onView && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </div>
    </div>
  );
}
