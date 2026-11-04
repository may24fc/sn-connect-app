'use client';

import { Loader2, Search, User, X } from 'lucide-react';
import * as React from 'react';
import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../primitives/card';
import { Checkbox } from '../../primitives/checkbox';
import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import type { TaskAssignee } from '../../types/task.types';
import { cn } from '../../utils/cn';
import { PersonMeta, UserAvatar, formatPersonRole } from '../people/UserAvatar';

export interface TaskAssigneeSelectProps {
  selectedIds: Array<string>;
  onSelectionChange: (ids: Array<string>) => void;
  employees: Array<
    Pick<TaskAssignee, 'id' | 'name' | 'email' | 'role' | 'department' | 'position' | 'avatarUrl'>
  >;
  isLoading?: boolean;
  className?: string;
  title?: string;
  description?: string;
  searchLabel?: string;
  emptyMessage?: string;
  primaryId?: string | null;
  disabled?: boolean;
  getPersonNote?: (personId: string) => string | null;
  searchPlaceholder?: string;
}

export function TaskAssigneeSelect({
  selectedIds,
  onSelectionChange,
  employees,
  isLoading = false,
  className,
  title = 'Assign To',
  description = 'Select employees or associates to assign this task to',
  searchLabel = 'Search by name or email',
  emptyMessage = 'No employees found',
  primaryId,
  disabled = false,
  getPersonNote,
  searchPlaceholder = 'Search by name or email...',
}: TaskAssigneeSelectProps): React.ReactNode {
  const controlId = React.useId();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<'all' | 'employee' | 'associate'>('all');
  const [departmentFilter, setDepartmentFilter] = React.useState<string>('all');

  // Get unique departments
  const departments = React.useMemo(() => {
    const depts = new Set(
      employees
        .map((emp) => emp.department)
        .filter((department): department is string => Boolean(department))
    );
    return Array.from(depts).sort();
  }, [employees]);

  // Filter employees based on search, role, and department
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        searchQuery === '' ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.email ?? '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;

      const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;

      return matchesSearch && matchesRole && matchesDepartment;
    });
  }, [employees, searchQuery, roleFilter, departmentFilter]);

  // Get selected employees
  const selectedEmployees = React.useMemo(() => {
    const byId = new Map(employees.map((employee) => [employee.id, employee]));
    return selectedIds.flatMap((id) => {
      const employee = byId.get(id);
      return employee ? [employee] : [];
    });
  }, [employees, selectedIds]);

  const handleToggleEmployee = (employeeId: string): void => {
    if (selectedIds.includes(employeeId)) {
      onSelectionChange(selectedIds.filter((id) => id !== employeeId));
    } else {
      onSelectionChange([...selectedIds, employeeId]);
    }
  };

  const handleRemoveEmployee = (employeeId: string): void => {
    onSelectionChange(selectedIds.filter((id) => id !== employeeId));
  };

  const handleClearSelection = (): void => {
    onSelectionChange([]);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              aria-label={searchLabel}
              value={searchQuery}
              maxLength={200}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              disabled={disabled}
            />
          </div>

          {/* Role and Department Filters */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="roleFilter" className="text-xs text-muted-foreground">
                Role
              </Label>
              <Select
                value={roleFilter}
                onValueChange={(value: 'all' | 'employee' | 'associate') => setRoleFilter(value)}
                disabled={disabled}
              >
                <SelectTrigger id="roleFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="employee">Employees</SelectItem>
                  <SelectItem value="associate">Associates</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="departmentFilter" className="text-xs text-muted-foreground">
                Department
              </Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter} disabled={disabled}>
                <SelectTrigger id="departmentFilter">
                  <SelectValue />
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
            </div>
          </div>
        </div>

        {/* Selected Employees */}
        {selectedEmployees.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Selected ({selectedEmployees.length})</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                disabled={disabled}
              >
                Clear all
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedEmployees.map((emp) => (
                <Badge key={emp.id} variant="secondary" className="gap-1.5 pr-1 py-1">
                  <span>
                    {emp.name}
                    {emp.id === primaryId ? ' (Primary)' : null}
                    {getPersonNote?.(emp.id) ? ` - ${getPersonNote?.(emp.id)}` : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmployee(emp.id)}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    aria-label={`Remove ${emp.name}`}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Employee List */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Available</Label>
          <div className="max-h-[300px] overflow-y-auto rounded-md border border-border">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedIds.includes(emp.id);
                  const checkboxId = `${controlId}-${emp.id}`;
                  return (
                    <label
                      key={emp.id}
                      htmlFor={checkboxId}
                      className={cn(
                        'flex items-center gap-3 rounded-lg p-2 transition-colors',
                        !disabled && 'cursor-pointer hover:bg-muted',
                        isSelected && 'bg-muted',
                        disabled && 'cursor-not-allowed'
                      )}
                    >
                      <Checkbox
                        id={checkboxId}
                        aria-label={emp.name}
                        checked={isSelected}
                        onCheckedChange={() => handleToggleEmployee(emp.id)}
                        disabled={disabled}
                      />
                      <UserAvatar name={emp.name} avatarUrl={emp.avatarUrl} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        <PersonMeta
                          className="block"
                          parts={[emp.department, formatPersonRole(emp.role)]}
                        />
                        {getPersonNote?.(emp.id) ? (
                          <span className="block break-words text-xs text-muted-foreground">
                            {getPersonNote?.(emp.id)}
                          </span>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
