'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
} from '@hr-portal/ui';
import { Camera, Edit2 } from 'lucide-react';
import { useState } from 'react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: employeesData, isLoading } = useEmployees({
    search: user?.email || '',
    pageSize: 1,
  });
  const employee = employeesData?.data?.[0] ?? null;

  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-24 w-24 rounded-full bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle missing employee data gracefully - show UI structure
  const displayName = employee
    ? `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim()
    : (user?.name ?? 'User');
  const initials = employee
    ? (employee.first_name?.[0] ?? '') + (employee.last_name?.[0] ?? '')
    : (user?.name
        ?.split(' ')
        .map((n) => n[0])
        .join('') ?? 'U');
  const position = employee?.position ?? 'Position not set';
  const department = employee?.department ?? 'Department not assigned';
  const employeeNumber = employee?.employee_number ?? 'N/A';

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                aria-label="Change profile picture"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <p className="text-muted-foreground">{position}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge variant="secondary">{department}</Badge>
                <Badge variant="outline">{employeeNumber}</Badge>
              </div>
              {!employee && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  Complete profile information will be available once your employee record is
                  created
                </p>
              )}
            </div>

            <Button
              variant={isEditing ? 'outline' : 'default'}
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
