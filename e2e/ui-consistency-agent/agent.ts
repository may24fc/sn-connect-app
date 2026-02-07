/**
 * UI Consistency Agent
 *
 * An automated agent that navigates pages and checks for UI inconsistencies
 * using Playwright MCP tools. This agent is designed to be run via Claude Code
 * with Playwright MCP integration.
 *
 * Usage:
 * 1. Start the development server: pnpm --filter @hr-portal/web dev
 * 2. Run this agent through Claude Code with Playwright MCP enabled
 *
 * The agent will:
 * - Navigate to each configured route
 * - Capture accessibility snapshots
 * - Check for console errors
 * - Check for network failures
 * - Analyze the page for UI issues
 * - Generate a comprehensive report
 */

import type {
  RouteConfig,
  UICheckResult,
  AgentReport,
  UIIssue,
  PageSnapshot,
  ConsoleMessage,
  NetworkRequest,
  AgentConfig,
  UICheckType,
  IssueSeverity,
} from './types';
import { defaultConfig, publicRoutes, employeeRoutes, adminRoutes, superAdminRoutes, internRoutes } from './routes.config';
import { runAllChecks } from './checks';

export class UIConsistencyAgent {
  private config: AgentConfig;
  private results: UICheckResult[] = [];
  private startTime: Date = new Date();

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Instructions for running checks with Playwright MCP
   * This returns step-by-step instructions for Claude to execute
   */
  getCheckInstructions(route: RouteConfig): string {
    return `
## Checking Route: ${route.name} (${route.path})

### Step 1: Navigate to the page
Use browser_navigate to go to: ${this.config.baseUrl}${route.path}

### Step 2: Wait for page to load
Use browser_wait_for with time: 2 to allow the page to fully load

### Step 3: Capture accessibility snapshot
Use browser_snapshot to get the page's accessibility tree

### Step 4: Get console messages
Use browser_console_messages with level: "warning" to capture errors and warnings

### Step 5: Get network requests
Use browser_network_requests with includeStatic: false to check for failed requests

### Step 6: Take a screenshot (optional)
Use browser_take_screenshot to capture the visual state

### Step 7: Analyze results
Look for:
- Console errors (especially JavaScript errors)
- Network failures (4xx, 5xx status codes)
- Missing accessibility labels
- Layout issues (empty pages, broken structure)
- Missing images or broken media
`;
  }

  /**
   * Get all routes to check, optionally filtered by role
   */
  getRoutesToCheck(role?: string): RouteConfig[] {
    if (!role) {
      return this.config.routes;
    }

    switch (role) {
      case 'public':
        return publicRoutes;
      case 'employee':
        return [...publicRoutes, ...employeeRoutes];
      case 'intern':
        return [...publicRoutes, ...internRoutes];
      case 'admin':
        return [...publicRoutes, ...adminRoutes];
      case 'super_admin':
        return [...publicRoutes, ...superAdminRoutes];
      default:
        return this.config.routes;
    }
  }

  /**
   * Parse console messages from Playwright MCP output
   */
  parseConsoleMessages(rawOutput: string): ConsoleMessage[] {
    const messages: ConsoleMessage[] = [];
    const lines = rawOutput.split('\n');

    for (const line of lines) {
      if (line.includes('[error]')) {
        messages.push({ type: 'error', text: line });
      } else if (line.includes('[warning]')) {
        messages.push({ type: 'warning', text: line });
      } else if (line.includes('[info]')) {
        messages.push({ type: 'info', text: line });
      }
    }

    return messages;
  }

  /**
   * Parse network requests from Playwright MCP output
   */
  parseNetworkRequests(rawOutput: string): NetworkRequest[] {
    const requests: NetworkRequest[] = [];
    const lines = rawOutput.split('\n');

    for (const line of lines) {
      // Parse format: "GET https://example.com/api/data 200 OK"
      const match = line.match(/^(\w+)\s+(https?:\/\/\S+)\s+(\d+)\s*(.*)$/);
      if (match) {
        const [, method, url, status, statusText] = match;
        requests.push({
          url,
          method,
          status: parseInt(status),
          statusText: statusText || '',
          resourceType: 'xhr',
          failed: parseInt(status) >= 400,
        });
      }
    }

    return requests;
  }

  /**
   * Analyze a page and return issues found
   */
  analyzePageResults(
    route: RouteConfig,
    accessibilityTree: string,
    consoleOutput: string,
    networkOutput: string
  ): UICheckResult {
    const startTime = Date.now();

    const consoleMessages = this.parseConsoleMessages(consoleOutput);
    const networkRequests = this.parseNetworkRequests(networkOutput);

    const issues = runAllChecks(
      route.path,
      accessibilityTree,
      consoleMessages,
      networkRequests,
      this.config.checks
    );

    const snapshot: PageSnapshot = {
      route: route.path,
      timestamp: new Date(),
      accessibilityTree,
      consoleMessages,
      networkRequests,
    };

    const result: UICheckResult = {
      route,
      passed: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
      snapshot,
      duration: Date.now() - startTime,
    };

    this.results.push(result);
    return result;
  }

  /**
   * Generate the final report
   */
  generateReport(): AgentReport {
    const endTime = new Date();
    const allIssues = this.results.flatMap(r => r.issues);

    const issuesByType: Record<UICheckType, number> = {
      'console-errors': 0,
      'network-errors': 0,
      'accessibility': 0,
      'layout': 0,
      'responsive': 0,
      'interactive-elements': 0,
      'images': 0,
      'typography': 0,
    };

    const issuesBySeverity: Record<IssueSeverity, number> = {
      critical: 0,
      warning: 0,
      info: 0,
    };

    for (const issue of allIssues) {
      issuesByType[issue.type]++;
      issuesBySeverity[issue.severity]++;
    }

    return {
      startTime: this.startTime,
      endTime,
      totalRoutes: this.results.length,
      passedRoutes: this.results.filter(r => r.passed).length,
      failedRoutes: this.results.filter(r => !r.passed).length,
      totalIssues: allIssues.length,
      issuesByType,
      issuesBySeverity,
      results: this.results,
    };
  }

  /**
   * Format the report as markdown
   */
  formatReportAsMarkdown(report: AgentReport): string {
    const lines: string[] = [
      '# UI Consistency Check Report',
      '',
      `**Generated:** ${report.endTime.toISOString()}`,
      `**Duration:** ${((report.endTime.getTime() - report.startTime.getTime()) / 1000).toFixed(1)}s`,
      '',
      '## Summary',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Routes Checked | ${report.totalRoutes} |`,
      `| Passed | ${report.passedRoutes} |`,
      `| Failed | ${report.failedRoutes} |`,
      `| Total Issues | ${report.totalIssues} |`,
      '',
      '### Issues by Severity',
      '',
      `- **Critical:** ${report.issuesBySeverity.critical}`,
      `- **Warning:** ${report.issuesBySeverity.warning}`,
      `- **Info:** ${report.issuesBySeverity.info}`,
      '',
      '### Issues by Type',
      '',
    ];

    for (const [type, count] of Object.entries(report.issuesByType)) {
      if (count > 0) {
        lines.push(`- **${type}:** ${count}`);
      }
    }

    lines.push('', '## Detailed Results', '');

    for (const result of report.results) {
      const status = result.passed ? '✅' : '❌';
      lines.push(`### ${status} ${result.route.name} (\`${result.route.path}\`)`);
      lines.push('');

      if (result.issues.length === 0) {
        lines.push('No issues found.');
      } else {
        lines.push(`**${result.issues.length} issue(s) found:**`);
        lines.push('');

        for (const issue of result.issues) {
          const severityIcon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
          lines.push(`${severityIcon} **[${issue.type}]** ${issue.message}`);
          if (issue.details) {
            lines.push(`  - ${issue.details.substring(0, 200)}${issue.details.length > 200 ? '...' : ''}`);
          }
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Reset the agent for a new run
   */
  reset(): void {
    this.results = [];
    this.startTime = new Date();
  }
}

// Export a default instance
export const uiAgent = new UIConsistencyAgent();

// Export route groups for easy access
export { publicRoutes, employeeRoutes, adminRoutes, superAdminRoutes, internRoutes };
