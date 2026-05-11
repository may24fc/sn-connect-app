'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useCreateProject } from '@/hooks/useProjects';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();
  const createProject = useCreateProject();

  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [targetEndDate, setTargetEndDate] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    if (!name.trim() || !startDate || !targetEndDate) {
      addToast({ title: 'Missing fields', description: 'Name, start, and target end are required.', variant: 'warning' });
      return;
    }
    try {
      const result = await createProject.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        leadUserId: user.id,
        startDate,
        targetEndDate,
        status: 'active',
      });
      addToast({ title: 'Project created', description: name.trim(), variant: 'success' });
      router.push(`/projects/${result.data.id}`);
    } catch (err) {
      addToast({
        title: 'Failed to create project',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'error',
      });
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <Link
          href="/projects"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            New Project
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create a project, then break it into monthly milestones.
          </p>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="name">Project name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marketing Analytics Dashboard"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Goals, scope, success criteria..."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start">Start date</Label>
                  <Input
                    id="start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Target end date</Label>
                  <Input
                    id="end"
                    type="date"
                    value={targetEndDate}
                    onChange={(e) => setTargetEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? 'Creating…' : 'Create Project'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
