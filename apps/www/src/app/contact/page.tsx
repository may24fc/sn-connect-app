import type { Metadata } from 'next';
import { Linkedin, Mail } from 'lucide-react';
import { COMPANY } from '@/data/placeholder';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { ContactForm } from '@/components/contact/ContactForm';
import { ContactCards } from '@/components/contact/ContactCards';
import { BookingCard } from '@/components/contact/BookingCard';
import {
  getGoogleAppointmentEmbedUrl,
  getGoogleAppointmentScheduleUrl,
} from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Tell SN International Group what support you need and we will help scope the right offshore setup for your team.',
};

export default function ContactPage() {
  const appointmentScheduleUrl = getGoogleAppointmentScheduleUrl();
  const appointmentEmbedUrl = getGoogleAppointmentEmbedUrl();

  return (
    <>
      {/* Hero */}
      <section className="bg-[linear-gradient(180deg,#f2f8fa_0%,#ffffff_68%)] py-24">
        <div className="section-max section-padding text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Tell us what you want to <span className="text-primary-800">delegate</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            Share the role, workload, or workflow you need help with. We&apos;ll help shape the right support setup for your business.
          </p>

          {/* Quick-contact strip */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`mailto:${COMPANY.email}`}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:border-primary-200 hover:text-primary-900"
            >
              <Mail className="h-4 w-4 text-primary-800" />
              {COMPANY.email}
            </a>
            <a
              href={COMPANY.social.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:border-primary-200 hover:text-primary-900"
            >
              <Linkedin className="h-4 w-4 text-primary-800" />
              SN International Group Pty. Ltd.
            </a>
          </div>
        </div>
      </section>

      {/* Main content — form + contact info sidebar */}
      <section className="section-max section-padding py-16">
        <div className="grid gap-8 lg:grid-cols-5 lg:items-start">
          {/* Contact form — wider column */}
          <div className="lg:col-span-3">
            <ScrollReveal>
              <ContactForm />
            </ScrollReveal>
          </div>

          {/* Right panel — contact info + optional booking card */}
          <div className="flex flex-col gap-6 lg:col-span-2">


            {/* Booking card — only when appointment URL is configured */}
            {appointmentScheduleUrl ? (
              <ScrollReveal>
                <BookingCard
                  scheduleUrl={appointmentScheduleUrl}
                  embedUrl={appointmentEmbedUrl}
                />
              </ScrollReveal>
            ) : null}
          </div>
        </div>
      </section>

      {/* Business unit contacts — below the form, not above */}
      <section className="bg-zinc-50 py-16">
        <div className="section-max section-padding">
          <ScrollReveal>
            <SectionHeading
              title="Service Contacts"
              subtitle="If you already know the support stream you need, start with the closest fit below."
            />
          </ScrollReveal>
          <div className="mt-10">
            <ContactCards />
          </div>
        </div>
      </section>
    </>
  );
}
