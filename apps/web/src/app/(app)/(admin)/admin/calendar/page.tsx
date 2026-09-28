import { CompanyCalendarView } from '@/components/CompanyCalendarView';

export default function AdminCalendarPage() {
  return (
    <CompanyCalendarView
      title="Company Calendar"
      description="Monitor the shared company schedule, verify what employees see, and jump back to the Company Calendar setup page when you need to manage the Google Calendar source."
      managementHref="/admin/company-pulse"
    />
  );
}