export interface ProjectDescriptionSections {
  goals: string[];
  scope: string[];
  successCriteria: string[];
}

const DEFAULT_SECTIONS: ProjectDescriptionSections = {
  goals: [''],
  scope: [''],
  successCriteria: [''],
};

function normalizeLines(lines: string[] | undefined): string[] {
  if (!lines) return [];
  return lines.map((line) => line.trim()).filter(Boolean);
}

function withAtLeastOne(lines: string[]): string[] {
  return lines.length > 0 ? lines : [''];
}

export function parseProjectDescription(description: string | null | undefined): ProjectDescriptionSections {
  const raw = (description ?? '').trim();
  if (!raw) {
    return { ...DEFAULT_SECTIONS };
  }

  const sectionRegex = /(Goals|Scope|Success Criteria):\s*([\s\S]*?)(?=\n(?:Goals|Scope|Success Criteria):|$)/gi;
  const captured: Partial<ProjectDescriptionSections> = {};

  for (const match of raw.matchAll(sectionRegex)) {
    const sectionName = match[1]?.toLowerCase();
    const block = match[2] ?? '';
    const lines = block
      .split('\n')
      .map((line) => line.replace(/^[-*]\s*/, '').trim())
      .filter(Boolean);

    if (sectionName === 'goals') captured.goals = lines;
    if (sectionName === 'scope') captured.scope = lines;
    if (sectionName === 'success criteria') captured.successCriteria = lines;
  }

  if (!captured.goals && !captured.scope && !captured.successCriteria) {
    return {
      goals: withAtLeastOne([raw]),
      scope: [''],
      successCriteria: [''],
    };
  }

  return {
    goals: withAtLeastOne(captured.goals ?? []),
    scope: withAtLeastOne(captured.scope ?? []),
    successCriteria: withAtLeastOne(captured.successCriteria ?? []),
  };
}

export function composeProjectDescription(sections: ProjectDescriptionSections): string {
  const goals = normalizeLines(sections.goals);
  const scope = normalizeLines(sections.scope);
  const successCriteria = normalizeLines(sections.successCriteria);

  const blocks: string[] = [];

  if (goals.length > 0) {
    blocks.push(['Goals:', ...goals.map((line) => `- ${line}`)].join('\n'));
  }

  if (scope.length > 0) {
    blocks.push(['Scope:', ...scope.map((line) => `- ${line}`)].join('\n'));
  }

  if (successCriteria.length > 0) {
    blocks.push([
      'Success Criteria:',
      ...successCriteria.map((line) => `- ${line}`),
    ].join('\n'));
  }

  return blocks.join('\n\n');
}
