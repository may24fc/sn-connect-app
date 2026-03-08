import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { COMPANY } from '@/data/placeholder';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of Service for ${COMPANY.name}. Read our terms and conditions for using our services.`,
};

export default function TermsPage(): ReactNode {
  return (
    <section className="bg-white py-20">
      <div className="section-max section-padding">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            Last updated: March 1, 2026
          </p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-zinc-600">
            <section>
              <h2 className="text-lg font-semibold text-zinc-900">1. Acceptance of Terms</h2>
              <p className="mt-2">
                By accessing and using the {COMPANY.name} website and services, you agree to be
                bound by these Terms of Service. If you do not agree to these terms, please do not
                use our services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900">2. Use of Services</h2>
              <p className="mt-2">
                Our services are intended for lawful purposes only. You agree not to use our
                website or services in any way that violates applicable laws or regulations, or
                infringes upon the rights of others.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900">3. Intellectual Property</h2>
              <p className="mt-2">
                All content on this website, including text, graphics, logos, and images, is the
                property of {COMPANY.name} and is protected by Philippine and international
                copyright laws. You may not reproduce, distribute, or create derivative works
                without our written permission.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900">4. Job Applications</h2>
              <p className="mt-2">
                By submitting a job application through our website, you certify that all information
                provided is accurate and complete. {COMPANY.name} reserves the right to verify any
                information you provide and to reject applications that contain false or misleading
                information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900">5. Limitation of Liability</h2>
              <p className="mt-2">
                {COMPANY.name} shall not be liable for any indirect, incidental, special, or
                consequential damages arising from your use of our website or services. Our
                total liability shall not exceed the amount paid by you for the services in question.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900">6. Governing Law</h2>
              <p className="mt-2">
                These Terms of Service shall be governed by and construed in accordance with the
                laws of the Republic of the Philippines. Any disputes shall be resolved in the
                courts of Metro Manila, Philippines.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-zinc-900">7. Contact</h2>
              <p className="mt-2">
                For questions about these Terms of Service, please contact us at{' '}
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
