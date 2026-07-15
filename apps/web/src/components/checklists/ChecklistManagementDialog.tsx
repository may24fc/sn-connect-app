'use client';

import { OffboardingChecklistManager } from '@/components/admin/OffboardingChecklistDialog';
import { OnboardingChecklistManager } from '@/components/admin/OnboardingChecklistDialog';
import type { OffboardingRecord } from '@/hooks/useOffboarding';
import type { OnboardingProfileListItem } from '@/hooks/useOnboardingProfiles';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';

export type ChecklistManagementTab = 'employees' | 'interns' | 'offboarding';

export function ChecklistManagementDialog({
  open,
  onOpenChange,
  activeTab,
  onActiveTabChange,
  employeeProfiles,
  internProfiles,
  offboardingRecords,
  selectedOffboardingId,
  onSelectedOffboardingId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: ChecklistManagementTab;
  onActiveTabChange: (tab: ChecklistManagementTab) => void;
  employeeProfiles: Array<OnboardingProfileListItem>;
  internProfiles: Array<OnboardingProfileListItem>;
  offboardingRecords: Array<OffboardingRecord>;
  selectedOffboardingId: string | null;
  onSelectedOffboardingId: (recordId: string | null) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Checklists</DialogTitle>
          <DialogDescription>
            Manage employee onboarding, associate onboarding, and offboarding tasks from one workspace.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => onActiveTabChange(value as ChecklistManagementTab)}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="employees">Employees</TabsTrigger>
            <TabsTrigger value="interns">Interns</TabsTrigger>
            <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
          </TabsList>

          <TabsContent value="employees" className="space-y-4">
            <OnboardingChecklistManager
              active={open && activeTab === 'employees'}
              closeDialog={() => onOpenChange(false)}
              profiles={employeeProfiles}
              roleLabel="employee"
            />
          </TabsContent>

          <TabsContent value="interns" className="space-y-4">
            <OnboardingChecklistManager
              active={open && activeTab === 'interns'}
              closeDialog={() => onOpenChange(false)}
              profiles={internProfiles}
              roleLabel="associate"
            />
          </TabsContent>

          <TabsContent value="offboarding" className="space-y-4">
            <OffboardingChecklistManager
              active={open && activeTab === 'offboarding'}
              records={offboardingRecords}
              selectedRecordId={selectedOffboardingId}
              onSelectedRecordChange={onSelectedOffboardingId}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
