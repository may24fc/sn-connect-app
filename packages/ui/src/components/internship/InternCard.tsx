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
  Pencil,
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
  associate: InternSummary;
  hoursMode?: 'weekly' | 'entire';
  onView?: (associate: InternSummary) => void;
  onEditDetails?: (associate: InternSummary) => void;
  onViewReports?: (associate: InternSummary) => void;
  onContact?: (associate: InternSummary) => void;
  onDelete?: (associate: InternSummary) => void;
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
  associate,
  hoursMode = 'weekly',
  onView,
  onEditDetails,
  onViewReports,
  onContact,
  onDelete,
  className,
}: InternCardProps): React.ReactNode {
  const daysRemaining = getDaysRemaining(associate.endDate);

  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {associate.avatarUrl && <AvatarImage src={associate.avatarUrl} />}
              <AvatarFallback className="text-sm">{getInitials(associate.name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{associate.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{associate.program}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InternshipStatusBadge status={associate.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={() => onView(associate)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onEditDetails && (
                  <DropdownMenuItem onClick={() => onEditDetails(associate)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Details
                  </DropdownMenuItem>
                )}
                {onViewReports && (
                  <DropdownMenuItem onClick={() => onViewReports(associate)}>
                    <FileText className="mr-2 h-4 w-4" />
                    View Reports
                  </DropdownMenuItem>
                )}
                {onContact && (
                  <DropdownMenuItem onClick={() => onContact(associate)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Associate
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(associate)}
                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Associate
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
            <span className="truncate">{associate.school}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{associate.department}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="truncate">{associate.supervisor}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{daysRemaining} days left</span>
          </div>
        </div>

        {/* Progress */}
        <HoursProgressMini
          completedHours={
            hoursMode === 'weekly'
              ? (associate.weeklyCompletedHours ?? associate.completedHours)
              : associate.completedHours
          }
          requiredHours={
            hoursMode === 'weekly'
              ? (associate.weeklyRequiredHours ?? associate.requiredHours)
              : associate.requiredHours
          }
          startDate={associate.startDate}
          endDate={associate.endDate}
        />

        {/* Last Report */}
        {associate.lastReportDate && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
            <span>Last report: {new Date(associate.lastReportDate).toLocaleDateString()}</span>
            {associate.pendingReports > 0 && (
              <span className="text-warning">{associate.pendingReports} pending review</span>
            )}
          </div>
        )}

        {onView && (
          <Button variant="outline" className="w-full" onClick={() => onView(associate)}>
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
  hoursMode?: 'weekly' | 'entire';
  onView?: (associate: InternSummary) => void;
  onEditDetails?: (associate: InternSummary) => void;
  onViewReports?: (associate: InternSummary) => void;
  onContact?: (associate: InternSummary) => void;
  onDelete?: (associate: InternSummary) => void;
  emptyMessage?: string;
  layout?: 'grid' | 'list';
  className?: string;
}

export function InternList({
  interns,
  hoursMode = 'weekly',
  onView,
  onEditDetails,
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
      {interns.map((associate) => (
        <InternCard
          key={associate.id}
          associate={associate}
          hoursMode={hoursMode}
          {...(onView && { onView })}
          {...(onEditDetails && { onEditDetails })}
          {...(onViewReports && { onViewReports })}
          {...(onContact && { onContact })}
          {...(onDelete && { onDelete })}
        />
      ))}
    </div>
  );
}

interface InternRowProps {
  associate: InternSummary;
  hoursMode?: 'weekly' | 'entire';
  onView?: (associate: InternSummary) => void;
  onDelete?: (associate: InternSummary) => void;
  className?: string;
}

export function InternRow({ associate, hoursMode = 'weekly', onView, onDelete, className }: InternRowProps): React.ReactNode {
  const daysRemaining = getDaysRemaining(associate.endDate);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!onView) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onView(associate);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors',
        onView && 'cursor-pointer',
        className
      )}
      onClick={() => onView?.(associate)}
      onKeyDown={handleKeyDown}
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : undefined}
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          {associate.avatarUrl && <AvatarImage src={associate.avatarUrl} />}
          <AvatarFallback className="text-xs">{getInitials(associate.name)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{associate.name}</p>
          <p className="text-sm text-muted-foreground">
            {associate.school} - {associate.program}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="hidden md:block w-32">
          <HoursProgressMini
            completedHours={
              hoursMode === 'weekly'
                ? (associate.weeklyCompletedHours ?? associate.completedHours)
                : associate.completedHours
            }
            requiredHours={
              hoursMode === 'weekly'
                ? (associate.weeklyRequiredHours ?? associate.requiredHours)
                : associate.requiredHours
            }
            startDate={associate.startDate}
            endDate={associate.endDate}
          />
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-sm text-muted-foreground">{associate.supervisor}</p>
          <p className="text-xs text-muted-foreground">{daysRemaining} days left</p>
        </div>
        <InternshipStatusBadge status={associate.status} />
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Remove Associate"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(associate);
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
