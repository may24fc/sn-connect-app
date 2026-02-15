'use client';

import { useOnboardingDocuments } from '@/hooks/useOnboardingDocuments';
import { useOnboardingProfile } from '@/hooks/useOnboardingProfile';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, use, useState } from 'react';

function val(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  return String(value);
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminOnboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): ReactNode {
  const { id } = use(params);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  const profileQuery = useOnboardingProfile(id);
  const documentsQuery = useOnboardingDocuments(id);

  const profile = profileQuery.data?.data;
  const documents = documentsQuery.data?.data ?? [];

  const openPreview = async (documentId: string): Promise<void> => {
    setPreviewLoadingId(documentId);
    try {
      const response = await fetch(`/api/onboarding/documents/${documentId}/preview`);
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.data?.signedUrl) {
        window.open(payload.data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setPreviewLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/onboarding">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Onboarding Submission</h1>
            <p className="text-muted-foreground">Read-only onboarding profile details</p>
          </div>
        </div>
      </div>

      {profile && (
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>{initials(profile.full_name ?? 'NA')}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{profile.full_name ?? 'Unnamed'}</p>
                <p className="text-sm text-muted-foreground">
                  {profile.email_address ?? 'No email'}
                </p>
              </div>
            </div>
            <Badge variant={profile.status === 'completed' ? 'success' : 'warning'}>
              {profile.status === 'completed' ? 'Completed' : 'In Progress'}
            </Badge>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="personal_info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal_info">Personal Info</TabsTrigger>
          <TabsTrigger value="payment_info">Payment Info</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="personal_info">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
              <p>First Name: {val(profile?.first_name)}</p>
              <p>Middle Name: {val(profile?.middle_name)}</p>
              <p>Last Name: {val(profile?.last_name)}</p>
              <p>Position: {val(profile?.position)}</p>
              <p>Email: {val(profile?.email_address)}</p>
              <p>Contact Number: {val(profile?.contact_number)}</p>
              <p>Nationality: {val(profile?.nationality)}</p>
              <p>Education: {val(profile?.education)}</p>
              <p>Birthday: {val(profile?.birthday)}</p>
              <p>Age: {val(profile?.age)}</p>
              <p className="md:col-span-2">Address: {val(profile?.address)}</p>
              <p>Emergency Contact: {val(profile?.emergency_contact_name)}</p>
              <p>Emergency Number: {val(profile?.emergency_contact_number)}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment_info">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
              <p>Account Name: {val(profile?.payment_account_name)}</p>
              <p>Account Number: {val(profile?.payment_account_masked)}</p>
              <p>Payment Email: {val(profile?.payment_email)}</p>
              <p>Payment Phone: {val(profile?.payment_phone_number)}</p>
              <p>City: {val(profile?.payment_city)}</p>
              <p>Province: {val(profile?.payment_province)}</p>
              <p>Zipcode: {val(profile?.payment_zipcode)}</p>
              <p className="md:col-span-2">Address: {val(profile?.payment_address)}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submitted Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-4 rounded-md border border-zinc-200 dark:border-zinc-800 p-3"
                  >
                    <div>
                      <p className="font-medium">{doc.file_name}</p>
                      <p className="text-sm text-muted-foreground">{doc.document_type}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        void openPreview(doc.id);
                      }}
                      disabled={previewLoadingId === doc.id}
                    >
                      {previewLoadingId === doc.id ? 'Loading...' : 'Preview'}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
