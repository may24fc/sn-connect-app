import OpenAI from 'openai';
import { z } from 'zod';
import { getLangWatchTracer } from 'langwatch/observability';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import {
  claimApplicationEvaluationStatus,
  getApplicationEvaluationStatus,
  updateApplicationEvaluationStatus,
} from '@/lib/ats/evaluation';
import { inngest } from '../client';

const EVALUATION_MODEL = 'gpt-5.4-mini';

/**
 * JSON Schema passed to OpenAI structured outputs. Mirrors the Zod
 * `evaluationSchema` from the original prompt but expressed as a
 * JSON Schema object so we can use `response_format.type: "json_schema"`.
 */
const EVALUATION_JSON_SCHEMA = {
  name: 'resume_evaluation',
  strict: true,
  schema: {
    type: 'object' as const,
    properties: {
      matchScore: {
        type: 'number' as const,
        description: 'Overall match score from 0 to 100.',
      },
      topStrengths: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: 'Up to 3 key strengths of the candidate relevant to the role.',
      },
      missingRequirements: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description:
          'Required skills or qualifications entirely missing from the CV. Return empty array if none.',
      },
      executiveSummary: {
        type: 'string' as const,
        description:
          'A concise, objective 2-sentence summary for the HR manager.',
      },
    },
    required: ['matchScore', 'topStrengths', 'missingRequirements', 'executiveSummary'] as const,
    additionalProperties: false,
  },
};

/**
 * Build the system prompt with a few-shot example as specified in the
 * original ATS prompt requirements.
 */
function buildSystemPrompt(): string {
  return `You are a strict HR Executive Assistant for SN International Group.

Your job is to evaluate a candidate's resume against a specific job posting's requirements. You must be objective, factual, and concise.

RULES:
- Score from 0 (no match) to 100 (perfect match).
- Only list strengths that are DIRECTLY relevant to the job requirements.
- Only list missing requirements that are EXPLICITLY stated in the job posting.
- Do NOT infer skills the candidate does not mention.
- The executive summary must be exactly 2 sentences.
- topStrengths must have at most 3 items.

FEW-SHOT EXAMPLE:

Job Requirement: "Must have 3+ years of React experience, proficiency in TypeScript, and experience with CI/CD pipelines."

Resume Snippet: "Frontend Developer with 1 year of React experience. Familiar with JavaScript. Built personal projects using HTML/CSS."

Expected Output:
{
  "matchScore": 25,
  "topStrengths": ["Has foundational React experience"],
  "missingRequirements": ["Needs 2+ more years of React experience", "No TypeScript proficiency mentioned", "No CI/CD pipeline experience"],
  "executiveSummary": "The candidate has basic frontend skills with limited React exposure but falls significantly short of the required 3 years. Key gaps include TypeScript and CI/CD experience."
}

Now evaluate the candidate below.`;
}

const evaluationResultSchema = z.object({
  matchScore: z.number().min(0).max(100),
  topStrengths: z.array(z.string()).max(3).default([]),
  missingRequirements: z.array(z.string()).default([]),
  executiveSummary: z.string().min(1),
});

interface EvaluationContext {
  resumeMarkdown: string;
  applicantName: string;
  jobPostingId: string;
  jobTitle: string;
  jobDescription: string;
  jobRequirements: string;
  totalHeadcount: number | null;
}

/**
 * Inngest function: Evaluate a parsed resume against job requirements.
 *
 * Triggered by `ats/resume.parsed`.
 * Fetches the parsed markdown and job posting, sends to gpt-4o-mini
 * with structured output, and saves the evaluation result.
 */
export const evaluateResume = inngest.createFunction(
  {
    id: 'ats-evaluate-resume',
    retries: 3,
    concurrency: { limit: 5 },
  },
  { event: 'ats/resume.parsed' },
  async ({ event, step }) => {
    const { applicationId } = event.data;
    const atsTracer = getLangWatchTracer('sn-connect-ai-ats');

    return await atsTracer.withActiveSpan('ats-evaluate-resume', async (workflowSpan) => {
      workflowSpan.setType('workflow');
      workflowSpan.setInput('json', { applicationId, model: EVALUATION_MODEL });
      workflowSpan.setAttribute('ai.feature', 'ats');
      workflowSpan.setAttribute('ats.stage', 'evaluate');
      workflowSpan.setAttribute('ats.application.id', applicationId);
      workflowSpan.setAttribute('langwatch.thread.id', `ats:${applicationId}`);
      workflowSpan.setAttribute('langwatch.labels', ['ATS', 'Resume Evaluation']);

      try {
        const evaluationClaim = await step.run('claim-evaluation-work', async () => {
          const claimed = await claimApplicationEvaluationStatus(
            applicationId,
            'evaluating',
            ['queued', 'failed'],
          );

          if (claimed) {
            return { claimed: true, status: 'evaluating' };
          }

          const currentStatus = await getApplicationEvaluationStatus(applicationId);
          return { claimed: false, status: currentStatus };
        });

        if (!evaluationClaim.claimed) {
          const result = {
            status: 'ignored',
            reason: `Evaluation already handled with status ${evaluationClaim.status ?? 'unknown'}`,
            applicationId,
          };

          workflowSpan.setOutput('json', result);
          return result;
        }

        const context = await step.run('fetch-data', async () => {
          const supabase = createSupabaseAdminClient();

          const { data: application, error: appError } = await supabase
            .from('job_applications')
            .select(
              'id, parsed_resume_markdown, job_posting_id, full_name',
            )
            .eq('id', applicationId)
            .is('deleted_at', null)
            .single();

          if (appError || !application) {
            throw new Error(
              `Application ${applicationId} not found: ${appError?.message ?? 'no data'}`,
            );
          }

          if (!application.parsed_resume_markdown) {
            throw new Error(
              `Application ${applicationId} has no parsed resume text.`,
            );
          }

          if (!application.job_posting_id) {
            throw new Error(
              `Application ${applicationId} is not linked to a job posting.`,
            );
          }

          const { data: posting, error: postError } = await supabase
            .from('job_postings')
            .select('id, title, description, requirements, job_requisitions(total_headcount)')
            .eq('id', application.job_posting_id)
            .is('deleted_at', null)
            .single();

          if (postError || !posting) {
            throw new Error(
              `Job posting ${application.job_posting_id} not found: ${postError?.message ?? 'no data'}`,
            );
          }

          const requisitions = Array.isArray(posting.job_requisitions)
            ? posting.job_requisitions
            : [];
          const totalHeadcount = requisitions[0]?.total_headcount ?? null;

          return {
            resumeMarkdown: application.parsed_resume_markdown as string,
            applicantName: application.full_name as string,
            jobPostingId: application.job_posting_id as string,
            jobTitle: posting.title as string,
            jobDescription: (posting.description ?? '') as string,
            jobRequirements: (posting.requirements ?? '') as string,
            totalHeadcount,
          } satisfies EvaluationContext;
        });

        workflowSpan.setAttribute('ats.job_posting.id', context.jobPostingId);
        workflowSpan.setAttribute('ats.job_title', context.jobTitle);
        workflowSpan.setAttribute('langwatch.labels', ['ATS', 'Resume Evaluation', context.jobTitle]);

        const evaluation = await atsTracer.withActiveSpan('ats-openai-evaluation', async (llmSpan) => {
          llmSpan.setType('llm');
          llmSpan.setRequestModel(EVALUATION_MODEL);
          llmSpan.setInput('json', {
            applicationId,
            jobPostingId: context.jobPostingId,
            jobTitle: context.jobTitle,
            totalHeadcount: context.totalHeadcount,
            jobDescriptionCharacters: context.jobDescription.length,
            jobRequirementsCharacters: context.jobRequirements.length,
            resumeCharacters: context.resumeMarkdown.length,
            promptTemplate: 'strict-hr-executive-assistant-v1',
          });
          llmSpan.setAttribute('ai.feature', 'ats');
          llmSpan.setAttribute('ats.stage', 'llm');
          llmSpan.setAttribute('ats.application.id', applicationId);
          llmSpan.setAttribute('ats.job_posting.id', context.jobPostingId);
          llmSpan.setAttribute('langwatch.thread.id', `ats:${applicationId}`);
          llmSpan.setAttribute('langwatch.labels', ['ATS', 'Resume Evaluation']);

          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) {
            throw new Error('OPENAI_API_KEY is not configured.');
          }

          const openai = new OpenAI({ apiKey });

          const userMessage = [
            `## Job: ${context.jobTitle}`,
            context.totalHeadcount != null
              ? `Hiring ${context.totalHeadcount} candidate(s).`
              : '',
            '',
            '### Job Description',
            context.jobDescription,
            '',
            '### Job Requirements',
            context.jobRequirements || '(No specific requirements listed)',
            '',
            '---',
            '',
            `## Candidate: ${context.applicantName}`,
            '',
            '### Resume',
            context.resumeMarkdown,
          ]
            .filter(Boolean)
            .join('\n');

          const response = await openai.chat.completions.create({
            model: EVALUATION_MODEL,
            temperature: 0.2,
            max_completion_tokens: 2048,
            messages: [
              { role: 'system', content: buildSystemPrompt() },
              { role: 'user', content: userMessage },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: EVALUATION_JSON_SCHEMA,
            },
          });

          const content = response.choices[0]?.message?.content;
          if (!content) {
            throw new Error('OpenAI returned an empty response.');
          }

          const parsed = evaluationResultSchema.parse(JSON.parse(content));
          parsed.matchScore = Math.max(0, Math.min(100, Math.round(parsed.matchScore)));
          parsed.topStrengths = parsed.topStrengths.slice(0, 3);

          llmSpan.setOutput('json', {
            matchScore: parsed.matchScore,
            topStrengthCount: parsed.topStrengths.length,
            missingRequirementCount: parsed.missingRequirements.length,
            executiveSummaryCharacters: parsed.executiveSummary.length,
          });

          return parsed;
        });

        await step.run('save-result', async () => {
          const supabase = createSupabaseAdminClient();

          const { error } = await supabase
            .from('job_applications')
            .update({
              ai_evaluation_status: 'completed',
              ai_match_score: evaluation.matchScore,
              ai_top_strengths: evaluation.topStrengths,
              ai_missing_requirements: evaluation.missingRequirements,
              ai_executive_summary: evaluation.executiveSummary,
              ai_evaluated_at: new Date().toISOString(),
              ai_evaluation_model: EVALUATION_MODEL,
              updated_at: new Date().toISOString(),
            })
            .eq('id', applicationId)
            .is('deleted_at', null);

          if (error) {
            throw new Error(`Failed to save evaluation: ${error.message}`);
          }
        });

        await step.run('audit-log', async () => {
          const supabase = createSupabaseAdminClient();

          await supabase.from('audit_logs').insert({
            action: 'ats_resume_evaluated',
            table_name: 'job_applications',
            record_id: applicationId,
            metadata: {
              model: EVALUATION_MODEL,
              matchScore: evaluation.matchScore,
              topStrengths: evaluation.topStrengths,
              missingRequirements: evaluation.missingRequirements,
            },
          });
        });

        const result = {
          status: 'evaluated',
          applicationId,
          matchScore: evaluation.matchScore,
        };

        workflowSpan.setOutput('json', {
          ...result,
          jobPostingId: context.jobPostingId,
          jobTitle: context.jobTitle,
          topStrengthCount: evaluation.topStrengths.length,
          missingRequirementCount: evaluation.missingRequirements.length,
        });

        return result;
      } catch (error) {
        await step.run('mark-evaluation-failed', async () => {
          try {
            await updateApplicationEvaluationStatus(applicationId, 'failed');
          } catch (statusError) {
            console.error('Failed to mark evaluation status as failed:', statusError);
          }
        });
        workflowSpan.recordException(error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    });
  },
);
