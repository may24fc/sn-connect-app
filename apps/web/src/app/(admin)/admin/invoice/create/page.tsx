'use client';

import EmployeeInvoicePage from '@/app/(employee)/invoice/page';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { Button } from '@hr-portal/ui';
import { ArrowLeft } from 'lucide-react';

export default function AdminCreateInvoicePage() {
	const handleBack = useBackNavigation({ fallbackPath: '/admin/invoice' });

	return (
		<div className="space-y-4">
			<Button variant="ghost" size="sm" onClick={handleBack}>
				<ArrowLeft className="mr-1 h-4 w-4" />
				Back to Invoice Submissions
			</Button>

			<EmployeeInvoicePage />
		</div>
	);
}