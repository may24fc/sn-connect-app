import type { Metadata } from 'next';
import { COMPANY } from '@/data/placeholder';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { ScrollReveal } from '@/components/shared/ScrollReveal';
import { ContactForm } from '@/components/contact/ContactForm';
import { GoogleMap } from '@/components/contact/GoogleMap';
import { ContactCards } from '@/components/contact/ContactCards';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Get in touch with SN International Group. Reach out for partnerships, inquiries, or career opportunities.',
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-white py-24">
        <div className="section-max section-padding text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Get in <span className="text-amber-600">Touch</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            Have a question, proposal, or partnership opportunity? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact info + form */}
      <section className="section-max section-padding py-16">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Left — info */}
          <div className="lg:col-span-2">
            <ScrollReveal>
              <h2 className="text-2xl font-bold text-zinc-900">Contact Information</h2>
              <p className="mt-2 text-zinc-600">
                Reach out directly or fill out the form. Our team typically responds within 1–2 business days.
              </p>

              <div className="mt-8 space-y-5">
                <div>
                  <p className="text-sm font-medium text-zinc-900">Head Office</p>
                  <p className="text-sm text-zinc-600">{COMPANY.address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Phone</p>
                  <a
                    href={`tel:${COMPANY.phone}`}
                    className="text-sm text-zinc-600 hover:text-amber-600 transition-colors"
                  >
                    {COMPANY.phone}
                  </a>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Email</p>
                  <a
                    href={`mailto:${COMPANY.email}`}
                    className="text-sm text-zinc-600 hover:text-amber-600 transition-colors"
                  >
                    {COMPANY.email}
                  </a>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">Office Hours</p>
                  <p className="text-sm text-zinc-600">Mon – Fri, 8:00 AM – 6:00 PM (PHT)</p>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Right — form */}
          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Business unit contacts */}
      <section className="bg-zinc-50 py-16">
        <div className="section-max section-padding">
          <ScrollReveal>
            <SectionHeading
              title="Business Unit Contacts"
              subtitle="Reach out directly to the unit that suits your needs."
            />
          </ScrollReveal>
          <div className="mt-10">
            <ContactCards />
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="section-max section-padding py-16">
        <ScrollReveal>
          <SectionHeading
            title="Find Us"
            subtitle="Visit our headquarters in Bonifacio Global City, Taguig."
          />
        </ScrollReveal>
        <div className="mt-10">
          <GoogleMap />
        </div>
      </section>
    </>
  );
}
