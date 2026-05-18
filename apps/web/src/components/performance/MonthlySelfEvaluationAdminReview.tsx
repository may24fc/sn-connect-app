'use client';

import { monthlySelfEvaluationDepartmentRoleOptions } from '@/lib/schemas/performance.schema';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@hr-portal/ui';
import { useEffect, useMemo, useState } from 'react';

type MonthlySelfEvaluationRecord = {
  id: string;
  month_key: string;
  full_name: string;
  department_role: string;
  top_three_things_worked_on: string;
  biggest_impact: string;
  impact_reason: string;
  significant_achievement: string;
  challenge_resolved: string;
  monthly_improvement: string;
  work_slowdown: string;
  unseen_workflow_issue: string;
  requested_support: string;
  productivity_score: number;
  productivity_reason: string;
  ownership_outside_role: string;
  professional_improvement_area: string;
  next_skill_to_learn: string;
  leadership_did_well: string;
  leadership_can_improve: string;
  contributions_visible: 'yes' | 'sometimes' | 'no';
  comfortable_raising_concerns: 'yes' | 'sometimes' | 'no';
  hidden_productivity_issue: string;
  immediate_improvement: string;
  additional_comments: string | null;
  next_month_goal: string;
  submitted_at: string;
};

type AdminListResponse = {
  data?: MonthlySelfEvaluationRecord[];
  error?: string;
};

function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function MonthlySelfEvaluationAdminReview() {
  const { addToast } = useToast();
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [departmentRole, setDepartmentRole] = useState('all');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<MonthlySelfEvaluationRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRecords() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ scope: 'admin', monthKey });
        if (departmentRole !== 'all') {
          params.set('departmentRole', departmentRole);
        }
        if (search.trim()) {
          params.set('search', search.trim());
        }

        const response = await fetch(`/api/performance/monthly-self-evaluations?${params.toString()}`, {
          credentials: 'include',
        });
        const payload = (await response.json()) as AdminListResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || 'Failed to load monthly self-evaluations');
        }

        const nextRecords = payload.data;

        if (!active) return;
        setRecords(nextRecords);
        setSelectedId((current) => {
          if (current && nextRecords.some((record) => record.id === current)) {
            return current;
          }
          return nextRecords[0]?.id ?? null;
        });
      } catch (error) {
        if (!active) return;
        addToast({
          title: 'Unable to load monthly self-evaluations',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'error',
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRecords();

    return () => {
      active = false;
    };
  }, [addToast, departmentRole, monthKey, search]);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Self-Evaluation Review</CardTitle>
          <CardDescription>
            Review responses by month, person, and department or role. The detail panel groups answers into accomplishment, impact, blocker, suggestion, leadership, and productivity sections.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="review-month">Month</Label>
            <Input id="review-month" type="month" value={monthKey} onChange={(event) => setMonthKey(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Department / Role</Label>
            <Select value={departmentRole} onValueChange={setDepartmentRole}>
              <SelectTrigger>
                <SelectValue placeholder="All departments and roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments and roles</SelectItem>
                {monthlySelfEvaluationDepartmentRoleOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-search">Search</Label>
            <Input
              id="review-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by full name"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Responses</CardTitle>
            <CardDescription>
              {records.length} submission{records.length === 1 ? '' : 's'} for {formatMonthKey(monthKey)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No monthly self-evaluations were found for the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Department / Role</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow
                        key={record.id}
                        className={record.id === selectedId ? 'bg-muted/50' : undefined}
                        onClick={() => setSelectedId(record.id)}
                      >
                        <TableCell className="font-medium">{record.full_name}</TableCell>
                        <TableCell>{record.department_role}</TableCell>
                        <TableCell>{record.productivity_score} / 10</TableCell>
                        <TableCell>
                          {new Date(record.submitted_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{selectedRecord?.full_name || 'Select a response'}</CardTitle>
                <CardDescription>
                  {selectedRecord
                    ? `${selectedRecord.department_role} • ${formatMonthKey(selectedRecord.month_key)}`
                    : 'Choose a submission from the list to review grouped answers.'}
                </CardDescription>
              </div>
              {selectedRecord && <Badge variant="secondary">{selectedRecord.productivity_score} / 10</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!selectedRecord ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No response selected.
              </div>
            ) : (
              <>
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Accomplishments</h3>
                  <div>
                    <p className="text-sm font-medium text-foreground">Top 3 things worked on</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.top_three_things_worked_on}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Significant achievement</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.significant_achievement}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Monthly improvement</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.monthly_improvement}</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Impact</h3>
                  <div>
                    <p className="text-sm font-medium text-foreground">Biggest impact</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.biggest_impact}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Why it mattered</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.impact_reason}</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Blockers & Suggestions</h3>
                  <div>
                    <p className="text-sm font-medium text-foreground">Resolved challenge</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.challenge_resolved}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">What slowed work down</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.work_slowdown}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Unseen workflow issue</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.unseen_workflow_issue}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Support requested</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.requested_support}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Immediate improvement</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.immediate_improvement}</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Leadership Feedback</h3>
                  <div>
                    <p className="text-sm font-medium text-foreground">Leadership did well</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.leadership_did_well}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Leadership can improve</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.leadership_can_improve}</p>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Productivity Reflections</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">Visibility of work</p>
                      <p className="mt-1 text-sm capitalize text-muted-foreground">{selectedRecord.contributions_visible}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Comfort raising concerns</p>
                      <p className="mt-1 text-sm capitalize text-muted-foreground">{selectedRecord.comfortable_raising_concerns}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Why they chose the score</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.productivity_reason}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Ownership outside role</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.ownership_outside_role}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Professional improvement area</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.professional_improvement_area}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Next skill or system to learn</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.next_skill_to_learn}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Hidden productivity issue</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.hidden_productivity_issue}</p>
                  </div>
                  {selectedRecord.additional_comments ? (
                    <div>
                      <p className="text-sm font-medium text-foreground">Additional comments</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.additional_comments}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-sm font-medium text-foreground">Next month goal</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{selectedRecord.next_month_goal}</p>
                  </div>
                </section>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}