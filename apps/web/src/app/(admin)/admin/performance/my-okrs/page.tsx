import { redirect } from 'next/navigation';

export default function AdminMyOKRsPage() {
  redirect('/my-performance?create=1');
}
