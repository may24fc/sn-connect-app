'use client';

import { useEmployees } from '@/hooks/useEmployees';
import { useAddTicketHandler, useRemoveTicketHandler, useTicketHandlers } from '@/hooks/useTicketHandlers';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import { LifeBuoy } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';

interface ManageTicketHandlersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPLOYEE_PAGE_SIZE = 25;

export function ManageTicketHandlersDialog({
  open,
  onOpenChange,
}: ManageTicketHandlersDialogProps): ReactNode {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [search, setSearch] = useState('');
  const { data: handlersData } = useTicketHandlers(open);
  // Server-side search: the picker used to preload one fixed page, which hid
  // everyone beyond it.
  const { data: employeesData, isFetching: employeesFetching } = useEmployees(
    {
      ...(search.trim() ? { search: search.trim() } : {}),
      status: 'active',
      page: 1,
      pageSize: EMPLOYEE_PAGE_SIZE,
    },
    { enabled: open }
  );
  const addTicketHandler = useAddTicketHandler();
  const removeTicketHandler = useRemoveTicketHandler();

  const activeHandlers = handlersData?.data ?? [];
  const employees = employeesData?.data ?? [];
  const employeeTotal = employeesData?.pagination?.total ?? 0;
  const hasMoreThanShown = employeeTotal > employees.length;

  const activeHandlerIds = useMemo(
    () => new Set(activeHandlers.map((handler) => handler.user_id)),
    [activeHandlers]
  );

  const availableEmployees = useMemo(
    () => employees.filter((employee) => employee.user_id && !activeHandlerIds.has(employee.user_id)),
    [activeHandlerIds, employees]
  );

  const handleAdd = async () => {
    if (!selectedUserId) {
      return;
    }

    await addTicketHandler.mutateAsync(selectedUserId);
    setSelectedUserId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage IT Ticket Handlers</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2 rounded-lg border border-border p-4">
            <Label htmlFor="ticket-handler-search">Add IT Handler</Label>
            <Input
              id="ticket-handler-search"
              value={search}
              onChange={(event) => {
                setSelectedUserId('');
                setSearch(event.target.value);
              }}
              placeholder="Search employees by name..."
            />
            <div className="flex gap-3">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      employeesFetching ? 'Searching...' : 'Select an employee'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground">
                      {employeesFetching ? 'Searching...' : 'No matching employees'}
                    </div>
                  ) : (
                    availableEmployees.map((employee) => (
                      <SelectItem key={employee.user_id} value={employee.user_id}>
                        {employee.first_name} {employee.last_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button onClick={() => void handleAdd()} disabled={addTicketHandler.isPending || !selectedUserId}>
                {addTicketHandler.isPending ? 'Adding...' : 'Add Handler'}
              </Button>
            </div>
            {hasMoreThanShown && (
              <p className="text-xs text-muted-foreground">
                Showing {availableEmployees.length} of {employeeTotal} employees. Search by name to
                reach someone not listed.
              </p>
            )}
          </div>

          {activeHandlers.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="No IT handlers assigned"
              description="Add at least one active IT handler so super-admin can dispatch IT tickets."
              size="sm"
            />
          ) : (
            <div className="space-y-3">
              {activeHandlers.map((handler) => (
                <div key={handler.user_id} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="font-medium text-foreground">{handler.user_name}</p>
                    <p className="text-sm text-muted-foreground">{handler.user_email ?? 'No email on file'}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void removeTicketHandler.mutateAsync(handler.user_id)}
                    disabled={removeTicketHandler.isPending}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}