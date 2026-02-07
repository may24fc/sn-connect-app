/**
 * UI Consistency Checks
 * Individual check functions for detecting UI issues
 */

import type { UIIssue, ConsoleMessage, NetworkRequest, UICheckType } from './types';

let issueCounter = 0;

function generateIssueId(): string {
  return `issue-${++issueCounter}-${Date.now()}`;
}

/**
 * Check console messages for errors and warnings
 */
export function checkConsoleErrors(
  route: string,
  consoleMessages: ConsoleMessage[]
): UIIssue[] {
  const issues: UIIssue[] = [];

  for (const msg of consoleMessages) {
    if (msg.type === 'error') {
      // Skip known benign errors
      if (isKnownBenignError(msg.text)) continue;

      issues.push({
        id: generateIssueId(),
        route,
        type: 'console-errors',
        severity: 'critical',
        message: 'Console error detected',
        details: msg.text,
        timestamp: new Date(),
      });
    } else if (msg.type === 'warning') {
      // Skip known benign warnings
      if (isKnownBenignWarning(msg.text)) continue;

      issues.push({
        id: generateIssueId(),
        route,
        type: 'console-errors',
        severity: 'warning',
        message: 'Console warning detected',
        details: msg.text,
        timestamp: new Date(),
      });
    }
  }

  return issues;
}

/**
 * Check network requests for failures
 */
export function checkNetworkErrors(
  route: string,
  networkRequests: NetworkRequest[]
): UIIssue[] {
  const issues: UIIssue[] = [];

  for (const request of networkRequests) {
    // Check for failed requests
    if (request.failed) {
      issues.push({
        id: generateIssueId(),
        route,
        type: 'network-errors',
        severity: 'critical',
        message: `Network request failed: ${request.method} ${request.url}`,
        details: `Status: ${request.status} ${request.statusText}`,
        timestamp: new Date(),
      });
    }

    // Check for 4xx/5xx status codes (excluding expected ones)
    if (request.status >= 400 && !isExpectedErrorStatus(request)) {
      issues.push({
        id: generateIssueId(),
        route,
        type: 'network-errors',
        severity: request.status >= 500 ? 'critical' : 'warning',
        message: `HTTP ${request.status} error: ${request.method} ${request.url}`,
        details: request.statusText,
        timestamp: new Date(),
      });
    }
  }

  return issues;
}

/**
 * Check accessibility tree for common issues
 */
export function checkAccessibility(
  route: string,
  accessibilityTree: string
): UIIssue[] {
  const issues: UIIssue[] = [];

  // Check for images without alt text
  const imgWithoutAlt = accessibilityTree.match(/img(?!\s+alt=)/gi);
  if (imgWithoutAlt && imgWithoutAlt.length > 0) {
    issues.push({
      id: generateIssueId(),
      route,
      type: 'accessibility',
      severity: 'warning',
      message: `${imgWithoutAlt.length} image(s) may be missing alt text`,
      details: 'Images should have descriptive alt text for screen readers',
      timestamp: new Date(),
    });
  }

  // Check for buttons without accessible names
  const buttonPattern = /button\s*\[ref=\w+\]\s*$/gim;
  const emptyButtons = accessibilityTree.match(buttonPattern);
  if (emptyButtons && emptyButtons.length > 0) {
    issues.push({
      id: generateIssueId(),
      route,
      type: 'accessibility',
      severity: 'warning',
      message: `${emptyButtons.length} button(s) may be missing accessible names`,
      details: 'Buttons should have visible text or aria-label',
      timestamp: new Date(),
    });
  }

  // Check for links without href or text
  const emptyLinkPattern = /link\s*\[ref=\w+\]\s*$/gim;
  const emptyLinks = accessibilityTree.match(emptyLinkPattern);
  if (emptyLinks && emptyLinks.length > 0) {
    issues.push({
      id: generateIssueId(),
      route,
      type: 'accessibility',
      severity: 'warning',
      message: `${emptyLinks.length} link(s) may be missing text content`,
      details: 'Links should have descriptive text',
      timestamp: new Date(),
    });
  }

  // Check for missing heading hierarchy
  const headings = accessibilityTree.match(/heading\s+"[^"]+"\s+\[level=(\d)\]/gi);
  if (headings) {
    const levels = headings.map(h => {
      const match = h.match(/level=(\d)/);
      return match ? parseInt(match[1]) : 0;
    });

    // Check if h1 exists
    if (!levels.includes(1)) {
      issues.push({
        id: generateIssueId(),
        route,
        type: 'accessibility',
        severity: 'info',
        message: 'Page may be missing an h1 heading',
        details: 'Each page should have a main heading (h1)',
        timestamp: new Date(),
      });
    }

    // Check for skipped heading levels
    const sortedLevels = [...new Set(levels)].sort();
    for (let i = 1; i < sortedLevels.length; i++) {
      if (sortedLevels[i] - sortedLevels[i - 1] > 1) {
        issues.push({
          id: generateIssueId(),
          route,
          type: 'accessibility',
          severity: 'info',
          message: `Heading levels may be skipped (h${sortedLevels[i - 1]} to h${sortedLevels[i]})`,
          details: 'Heading levels should not be skipped for proper document structure',
          timestamp: new Date(),
        });
        break;
      }
    }
  }

  return issues;
}

/**
 * Check for layout issues in the accessibility tree
 */
export function checkLayout(
  route: string,
  accessibilityTree: string
): UIIssue[] {
  const issues: UIIssue[] = [];

  // Check for potential overflow (very long text without breaks)
  const longTextPattern = /"[^"]{500,}"/g;
  const longTexts = accessibilityTree.match(longTextPattern);
  if (longTexts && longTexts.length > 0) {
    issues.push({
      id: generateIssueId(),
      route,
      type: 'layout',
      severity: 'info',
      message: 'Very long text content detected',
      details: `${longTexts.length} element(s) contain text over 500 characters. Check for overflow issues.`,
      timestamp: new Date(),
    });
  }

  // Check if page appears empty
  const contentElements = accessibilityTree.match(/(button|link|textbox|heading|paragraph)/gi);
  if (!contentElements || contentElements.length < 3) {
    issues.push({
      id: generateIssueId(),
      route,
      type: 'layout',
      severity: 'warning',
      message: 'Page appears to have very little content',
      details: 'The page may not have loaded correctly or content may be missing',
      timestamp: new Date(),
    });
  }

  return issues;
}

/**
 * Check for interactive element issues
 */
export function checkInteractiveElements(
  route: string,
  accessibilityTree: string
): UIIssue[] {
  const issues: UIIssue[] = [];

  // Check for disabled buttons
  const disabledButtons = accessibilityTree.match(/button.*disabled/gi);
  if (disabledButtons && disabledButtons.length > 5) {
    issues.push({
      id: generateIssueId(),
      route,
      type: 'interactive-elements',
      severity: 'info',
      message: `${disabledButtons.length} disabled buttons found`,
      details: 'Multiple disabled buttons may indicate a loading state or permission issue',
      timestamp: new Date(),
    });
  }

  // Check for form elements without labels
  const formElements = accessibilityTree.match(/textbox\s*\[ref=\w+\]\s*(?!.*name)/gim);
  if (formElements && formElements.length > 0) {
    issues.push({
      id: generateIssueId(),
      route,
      type: 'interactive-elements',
      severity: 'warning',
      message: `${formElements.length} form field(s) may be missing labels`,
      details: 'Form fields should have associated labels for accessibility',
      timestamp: new Date(),
    });
  }

  return issues;
}

/**
 * Check for image issues
 */
export function checkImages(
  route: string,
  accessibilityTree: string,
  networkRequests: NetworkRequest[]
): UIIssue[] {
  const issues: UIIssue[] = [];

  // Check for broken images
  const imageRequests = networkRequests.filter(
    r => r.resourceType === 'image' && (r.failed || r.status >= 400)
  );

  if (imageRequests.length > 0) {
    issues.push({
      id: generateIssueId(),
      route,
      type: 'images',
      severity: 'warning',
      message: `${imageRequests.length} image(s) failed to load`,
      details: imageRequests.map(r => r.url).join('\n'),
      timestamp: new Date(),
    });
  }

  return issues;
}

// Helper functions

function isKnownBenignError(message: string): boolean {
  const benignPatterns = [
    /ResizeObserver loop/i,
    /hydration/i, // Next.js hydration warnings
    /Warning: ReactDOM.render/i,
    /favicon\.ico.*404/i,
  ];
  return benignPatterns.some(pattern => pattern.test(message));
}

function isKnownBenignWarning(message: string): boolean {
  const benignPatterns = [
    /Download the React DevTools/i,
    /Warning: componentWillReceiveProps/i,
    /Warning: componentWillMount/i,
    /Warning: componentWillUpdate/i,
  ];
  return benignPatterns.some(pattern => pattern.test(message));
}

function isExpectedErrorStatus(request: NetworkRequest): boolean {
  // 401 on initial load before auth is expected
  if (request.status === 401 && request.url.includes('/api/')) {
    return true;
  }
  // 404 for optional resources
  if (request.status === 404 && request.url.includes('favicon')) {
    return true;
  }
  return false;
}

/**
 * Run all checks for a page
 */
export function runAllChecks(
  route: string,
  accessibilityTree: string,
  consoleMessages: ConsoleMessage[],
  networkRequests: NetworkRequest[],
  enabledChecks: UICheckType[]
): UIIssue[] {
  const issues: UIIssue[] = [];

  if (enabledChecks.includes('console-errors')) {
    issues.push(...checkConsoleErrors(route, consoleMessages));
  }

  if (enabledChecks.includes('network-errors')) {
    issues.push(...checkNetworkErrors(route, networkRequests));
  }

  if (enabledChecks.includes('accessibility')) {
    issues.push(...checkAccessibility(route, accessibilityTree));
  }

  if (enabledChecks.includes('layout')) {
    issues.push(...checkLayout(route, accessibilityTree));
  }

  if (enabledChecks.includes('interactive-elements')) {
    issues.push(...checkInteractiveElements(route, accessibilityTree));
  }

  if (enabledChecks.includes('images')) {
    issues.push(...checkImages(route, accessibilityTree, networkRequests));
  }

  return issues;
}
