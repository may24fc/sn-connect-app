import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';
import { Textarea } from '../../primitives/textarea';

export interface TargetingSelectorValue {
  rolesCsv: string;
  departmentsCsv: string;
  employeesCsv: string;
}

export interface TargetingSelectorProps {
  value: TargetingSelectorValue;
  onChange: (value: TargetingSelectorValue) => void;
}

export function TargetingSelector({ value, onChange }: TargetingSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Target Roles (comma-separated)</Label>
        <Input
          placeholder="employee, associate"
          value={value.rolesCsv}
          maxLength={1000}
          onChange={(event) => onChange({ ...value, rolesCsv: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Target Departments (UUID, comma-separated)</Label>
        <Textarea
          rows={2}
          value={value.departmentsCsv}
          maxLength={20000}
          onChange={(event) => onChange({ ...value, departmentsCsv: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Target Employees (UUID, comma-separated)</Label>
        <Textarea
          rows={2}
          value={value.employeesCsv}
          maxLength={20000}
          onChange={(event) => onChange({ ...value, employeesCsv: event.target.value })}
        />
      </div>
    </div>
  );
}
