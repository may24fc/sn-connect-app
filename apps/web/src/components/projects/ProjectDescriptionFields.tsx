'use client';

import { Button, Input, Label } from '@hr-portal/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { ProjectDescriptionSections } from '@/lib/projects/descriptionSections';

interface SectionConfig {
  key: keyof ProjectDescriptionSections;
  title: string;
  placeholder: string;
}

const SECTION_CONFIGS: SectionConfig[] = [
  { key: 'goals', title: 'Goals', placeholder: 'Add a goal' },
  { key: 'scope', title: 'Scope', placeholder: 'Add scope detail' },
  {
    key: 'successCriteria',
    title: 'Success Criteria',
    placeholder: 'Add success criterion',
  },
];

interface ProjectDescriptionFieldsProps {
  value: ProjectDescriptionSections;
  onChange: (next: ProjectDescriptionSections) => void;
}

export function ProjectDescriptionFields({
  value,
  onChange,
}: ProjectDescriptionFieldsProps) {
  function updateItem(section: keyof ProjectDescriptionSections, index: number, nextValue: string) {
    const nextItems = [...value[section]];
    nextItems[index] = nextValue;
    onChange({ ...value, [section]: nextItems });
  }

  function addItem(section: keyof ProjectDescriptionSections) {
    onChange({ ...value, [section]: [...value[section], ''] });
  }

  function removeItem(section: keyof ProjectDescriptionSections, index: number) {
    if (value[section].length === 1) {
      onChange({ ...value, [section]: [''] });
      return;
    }

    onChange({
      ...value,
      [section]: value[section].filter((_, itemIndex) => itemIndex !== index),
    });
  }

  return (
    <div className="space-y-4">
      <Label>Description</Label>
      {SECTION_CONFIGS.map((sectionConfig) => (
        <div
          key={sectionConfig.key}
          className="rounded-md border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-900 p-3 border-b">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {sectionConfig.title}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addItem(sectionConfig.key)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add
            </Button>
          </div>

          <div className="max-h-[180px] overflow-y-auto p-3 space-y-2">
            {value[sectionConfig.key].map((item, index) => (
              <div key={`${sectionConfig.key}-${index}`} className="flex items-center gap-2">
                <Input
                  value={item}
                  onChange={(event) =>
                    updateItem(sectionConfig.key, index, event.target.value)
                  }
                  placeholder={sectionConfig.placeholder}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(sectionConfig.key, index)}
                  aria-label={`Remove ${sectionConfig.title} item ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
