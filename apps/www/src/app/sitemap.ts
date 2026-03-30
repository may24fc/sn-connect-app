import type { MetadataRoute } from 'next';
import { BUSINESS_UNITS } from '@/data/placeholder';
import { HIDE_EXPANSION_SECTIONS } from '@/lib/site-config';

const BASE_URL = 'https://www.sninternational.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    ...(!HIDE_EXPANSION_SECTIONS
      ? [
          { url: `${BASE_URL}/businesses`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.8 },
          { url: `${BASE_URL}/careers`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
          { url: `${BASE_URL}/life-at-sn`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.6 },
        ]
      : []),
    { url: `${BASE_URL}/team`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.7 },
  ];

  const businessPages: MetadataRoute.Sitemap = HIDE_EXPANSION_SECTIONS
    ? []
    : BUSINESS_UNITS.map((unit) => ({
        url: `${BASE_URL}/businesses/${unit.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      }));

  return [...staticPages, ...businessPages];
}
