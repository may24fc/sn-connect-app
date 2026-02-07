/**
 * UI Consistency Agent Types
 * Types for the automated UI consistency checking agent
 */

export type UserRole = 'employee' | 'intern' | 'admin' | 'super_admin';

export interface RouteConfig {
  path: string;
  name: string;
  requiresAuth: boolean;
  authRole?: UserRole;
  skipChecks?: UICheckType[];
}

export type UICheckType =
  | 'console-errors'
  | 'network-errors'
  | 'accessibility'
  | 'layout'
  | 'responsive'
  | 'interactive-elements'
  | 'images'
  | 'typography';

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface UIIssue {
  id: string;
  route: string;
  type: UICheckType;
  severity: IssueSeverity;
  message: string;
  details?: string;
  element?: string;
  screenshot?: string;
  timestamp: Date;
}

export interface ConsoleMessage {
  type: 'error' | 'warning' | 'info' | 'debug';
  text: string;
  url?: string;
  lineNumber?: number;
}

export interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  statusText: string;
  resourceType: string;
  failed: boolean;
}

export interface PageSnapshot {
  route: string;
  timestamp: Date;
  accessibilityTree: string;
  consoleMessages: ConsoleMessage[];
  networkRequests: NetworkRequest[];
  screenshot?: string;
}

export interface UICheckResult {
  route: RouteConfig;
  passed: boolean;
  issues: UIIssue[];
  snapshot: PageSnapshot;
  duration: number;
}

export interface AgentReport {
  startTime: Date;
  endTime: Date;
  totalRoutes: number;
  passedRoutes: number;
  failedRoutes: number;
  totalIssues: number;
  issuesByType: Record<UICheckType, number>;
  issuesBySeverity: Record<IssueSeverity, number>;
  results: UICheckResult[];
}

export interface AgentConfig {
  baseUrl: string;
  routes: RouteConfig[];
  screenshotsDir: string;
  reportsDir: string;
  viewport: {
    width: number;
    height: number;
  };
  mobileViewport: {
    width: number;
    height: number;
  };
  timeouts: {
    navigation: number;
    elementWait: number;
  };
  checks: UICheckType[];
}
