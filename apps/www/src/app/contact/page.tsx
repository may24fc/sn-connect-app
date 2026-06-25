import type { Metadata } from 'next';
import RebrandContact from '@/components/contact/rebrand/RebrandContact';
import {
  getGoogleAppointmentScheduleUrl,
  getGoogleAppointmentEmbedUrl,
} from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Tell SN International Group what support you need and we will help scope the right offshore setup for your team.',
};

export default function ContactPage() {
  const scheduleUrl = getGoogleAppointmentScheduleUrl();
  const embedUrl = getGoogleAppointmentEmbedUrl();

  return <RebrandContact scheduleUrl={scheduleUrl} embedUrl={embedUrl} />;
}
