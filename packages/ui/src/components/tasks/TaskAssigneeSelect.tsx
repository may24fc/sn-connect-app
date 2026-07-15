'use client';

import { Loader2, Search, User, X } from 'lucide-react';
import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../primitives/avatar';
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

export interface TaskAssigneeSelectProps {
  selectedIds: Array<string>;
  onSelectionChange: (ids: Array<string>) => void;
  employees: Array<TaskAssignee>;
  isLoading?: boolean;
  className?: string;
}

export function TaskAssigneeSelect({
  selectedIds,
  onSelectionChange,
  employees,
  isLoading = false,
  className,
}: TaskAssigneeSelectProps): React.ReactNode {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<'all' | 'employee' | 'associate'>('all');
  const [departmentFilter, setDepartmentFilter] = React.useState<string>('all');

  // Get unique departments
  const departments = React.useMemo(() => {
    const depts = new Set(employees.map((emp) => emp.department));
    return Array.from(depts).sort();
  }, [employees]);

  // Filter employees based on search, role, and department
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        searchQuery === '' ||
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;

      const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;

      return matchesSearch && matchesRole && matchesDepartment;
    });
  }, [employees, searchQuery, roleFilter, departmentFilter]);

  // Get selected employees
  const selectedEmployees = React.useMemo(() => {
    return employees.filter((emp) => selectedIds.includes(emp.id));
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
          Assign To
        </CardTitle>
        <CardDescription>Select employees or interns to assign this task to</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
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
              >
                <SelectTrigger id="roleFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="employee">Employees</SelectItem>
                  <SelectItem value="associate">Interns</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="departmentFilter" className="text-xs text-muted-foreground">
                Department
              </Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
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
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedEmployees.map((emp) => (
                <Badge key={emp.id} variant="secondary" className="gap-1.5 pr-1 py-1">
                  <span>{emp.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmployee(emp.id)}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                    aria-label={`Remove ${emp.name}`}
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
                No employees found
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedIds.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted cursor-pointer',
                        isSelected && 'bg-muted'
                      )}
                      onClick={() => handleToggleEmployee(emp.id)}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleEmployee(emp.id);
                        }
                      }}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleEmployee(emp.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={emp.avatarUrl} alt={emp.name} />
                        <AvatarFallback className="text-xs">
                          {emp.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="truncate">{emp.department}</span>
                          <span>•</span>
                          <span className="capitalize">{emp.role}</span>
                        </div>
                      </div>
                    </div>
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
