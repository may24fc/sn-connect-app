export const WORKSPACE_VALUES = ['internal', 'pa', 'sfo', 'uhp', 'property'] as const;
export type WorkspaceKey = (typeof WORKSPACE_VALUES)[number];
export type WorkspaceAccessLevel = 'read' | 'write';

export interface WorkspaceGrant {
  workspace: WorkspaceKey;
  accessLevel: WorkspaceAccessLevel;
}

export const WORKSPACE_LABELS: Record<WorkspaceKey, string> = {
  internal: 'Internal Management',
  pa: 'Personal Assistants',
  sfo: 'Seafood Factory Outlet',
  uhp: 'Ultimate Health Project',
  property: 'Property Development',
};

export function isWorkspaceKey(value: string): value is WorkspaceKey {
  return WORKSPACE_VALUES.includes(value as WorkspaceKey);
}

export function canWriteWorkspace(
  grants: ReadonlyArray<WorkspaceGrant>,
  workspace: WorkspaceKey
): boolean {
  return grants.some(
    (grant) => grant.workspace === workspace && grant.accessLevel === 'write'
  );
}

export function getWorkspaceLandingPath(workspace: WorkspaceKey): string {
  switch (workspace) {
    case 'pa':
      return '/pa-tasks';
    case 'sfo':
      return '/sfo/performance';
    case 'uhp':
      return '/uhp/clients';
    case 'property':
      return '/property/properties';
    default:
      return '/dashboard';
  }
}
