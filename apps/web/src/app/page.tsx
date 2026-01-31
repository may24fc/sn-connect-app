import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default function Home(): ReactNode {
  // TODO: Check authentication status and user role
  // For now, redirect to login page
  // In a real app, this would check the session and redirect accordingly:
  // - Unauthenticated: /login
  // - Employee/Intern: /dashboard
  // - Admin: /probation
  redirect('/login');
}
