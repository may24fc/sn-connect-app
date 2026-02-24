import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';
import { Textarea } from '../../primitives/textarea';

export interface ResourceTargetingSelectorValue {
  rolesCsv: string;
  departmentsCsv: string;
  employeesCsv: string;
}

export interface ResourceTargetingSelectorProps {
  value: ResourceTargetingSelectorValue;
  onChange: (value: ResourceTargetingSelectorValue) => void;
}

export function ResourceTargetingSelector({ value, onChange }: ResourceTargetingSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm text-zinc-700 dark:text-zinc-300">
          Target Roles (comma-separated)
        </Label>
        <Input
          placeholder="employee, intern, hr"
          value={value.rolesCsv}
          onChange={(event) => onChange({ ...value, rolesCsv: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-zinc-700 dark:text-zinc-300">
          Target Departments (UUID, comma-separated)
        </Label>
        <Textarea
          rows={2}
          value={value.departmentsCsv}
          onChange={(event) => onChange({ ...value, departmentsCsv: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-zinc-700 dark:text-zinc-300">
          Target Employees (UUID, comma-separated)
        </Label>
        <Textarea
          rows={2}
          value={value.employeesCsv}
          onChange={(event) => onChange({ ...value, employeesCsv: event.target.value })}
        />
      </div>
    </div>
  );
}
