import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { COMPANY } from '@/data/placeholder';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy Policy for ${COMPANY.name}. Learn how we collect, use, and protect your personal information.`,
};

export default function PrivacyPage(): ReactNode {
  return (
    <section className="bg-white py-20">
      <div className="section-max section-padding">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Last updated: March 1, 2026
          </p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-zinc-600">
            <section>
              <h2 className="text-lg font-semibold text-zinc-900">1. Information We Collect</h2>
              <p className="mt-2">
                We collect information you provide directly to us, such as when you create an account,
                submit a job application, use our services, or contact us. This may include your name,
                email address, phone number, resume, and other information you choose to provide.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900">2. How We Use Your Information</h2>
              <p className="mt-2">
                We use the information we collect to provide, maintain, and improve our services,
                process job applications, communicate with you, and comply with legal obligations.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900">3. Information Sharing</h2>
              <p className="mt-2">
                We do not sell your personal information. We may share your information with our
                business units for employment-related purposes, with service providers who assist
                in our operations, or when required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900">4. Data Security</h2>
              <p className="mt-2">
                We implement appropriate technical and organizational measures to protect your
                personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900">5. Your Rights</h2>
              <p className="mt-2">
                Under the Data Privacy Act of 2012 (Republic Act No. 10173), you have the right
                to access, correct, and request deletion of your personal data. You may also object to
                certain processing of your data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900">6. Contact Us</h2>
              <p className="mt-2">
                If you have questions about this Privacy Policy, please contact us at{' '}
                <a
                  href={`mailto:${COMPANY.email}`}
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  {COMPANY.email}
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
