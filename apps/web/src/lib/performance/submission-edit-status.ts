export type SubmissionEditStatus = {
  hasEmployeeEdits: boolean;
  lastEmployeeEditAt: string | null;
};

type SubmissionEditStatusInput = {
  submittedAt?: string | null;
  updatedAt?: string | null;
};

export function getSubmissionEditStatus({
  submittedAt,
  updatedAt,
}: SubmissionEditStatusInput): SubmissionEditStatus {
  if (!submittedAt || !updatedAt) {
    return {
      hasEmployeeEdits: false,
      lastEmployeeEditAt: null,
    };
  }

  const submittedAtMs = new Date(submittedAt).getTime();
  const updatedAtMs = new Date(updatedAt).getTime();

  if (!Number.isFinite(submittedAtMs) || !Number.isFinite(updatedAtMs) || updatedAtMs <= submittedAtMs) {
    return {
      hasEmployeeEdits: false,
      lastEmployeeEditAt: null,
    };
  }

  return {
    hasEmployeeEdits: true,
    lastEmployeeEditAt: updatedAt,
  };
}