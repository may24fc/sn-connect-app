import type { LucideIcon } from 'lucide-react';
import { Bot, Briefcase, Megaphone, PenTool } from 'lucide-react';

/** Convert a human-readable title to a URL-safe slug, e.g. "Corporate Catering" → "corporate-catering" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export interface BusinessUnit {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  color: string;
  image: string;
  stats: { label: string; value: string }[];
  services: { title: string; description: string; image?: string }[];
  testimonials: { name: string; role: string; quote: string; company?: string }[];
  contact: { email: string; phone: string };
  website_url?: string;
  cardBg: string;
}

export const COMPANY = {
  name: 'SN International Group Pty. Ltd.',
  tagline: 'Remote support teams, matched with care.',
  description:
    'SN International Group Pty. Ltd. helps founders, operators, and growing teams build dependable offshore support across executive assistance, marketing support, content creation, and AI operations.',
  email: 'info@sngroup.com.au',
  phone: '+63 (2) 8123 4567',
  social: {
    facebook: 'https://facebook.com/sninternational',
    linkedin: 'https://www.linkedin.com/company/sn-international-group/posts/?feedView=all',
    instagram: 'https://instagram.com/sninternational',
  },
};

export const BUSINESS_UNITS: BusinessUnit[] = [
  {
    slug: 'executive-assistance',
    name: 'Executive Assistance',
    tagline: 'Inbox, calendar, admin, and follow-through handled with precision',
    description:
      'Dedicated executive assistants who manage inboxes, calendars, reporting, travel coordination, SOP upkeep, and recurring admin so founders and operators can stay focused on growth.',
    icon: Briefcase,
    color: '#175063',
    cardBg: 'bg-[rgba(23,80,99,0.08)] border-[rgba(23,80,99,0.16)]',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80&auto=format&fit=crop',
    stats: [{ label: 'Coverage Windows', value: 'AU / US' }, { label: 'Typical Launch', value: '7 days' }],
    services: [
      { title: 'Calendar and inbox management', description: 'Own meeting flow, inbox triage, follow-ups, and internal coordination.', image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80&auto=format&fit=crop' },
      { title: 'Reporting and documentation', description: 'Keep leadership dashboards, minutes, SOPs, and trackers current.', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&auto=format&fit=crop' },
      { title: 'Research and coordination', description: 'Support hiring, vendors, bookings, and special projects with reliable follow-through.', image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80&auto=format&fit=crop' },
      { title: 'Executive support pods', description: 'Scale from one assistant to shared support coverage across multiple leaders.', image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=800&q=80&auto=format&fit=crop' },
    ],
    testimonials: [
      { name: 'Sophie Graham', role: 'Founder, Property Advisory Studio', quote: 'Our EA took over scheduling, client follow-ups, and weekly reporting within days. It immediately gave me back strategic time.' },
      { name: 'Theo Ramirez', role: 'Operations Director, Service Company', quote: 'SN built a support rhythm around our operating calendar instead of forcing us into a generic VA setup.' },
    ],
    contact: { email: 'assist@sngroup.com.au', phone: '+63 (2) 8123 4568' },
    website_url: '/contact?service=executive-assistance',
  },
  {
    slug: 'marketing-support',
    name: 'Marketing Support',
    tagline: 'Execution support for campaigns, outreach, reporting, and launch coordination',
    description:
      'Flexible support for marketing teams that need help with campaign coordination, CRM updates, social scheduling, reporting, research, and recurring execution work.',
    icon: Megaphone,
    color: '#6099AC',
    cardBg: 'bg-[rgba(96,153,172,0.12)] border-[rgba(96,153,172,0.2)]',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80&auto=format&fit=crop',
    stats: [{ label: 'Campaign Rhythm', value: 'Weekly' }, { label: 'Ramp Time', value: '2 weeks' }],
    services: [
      { title: 'Campaign coordination', description: 'Keep briefs, timelines, approvals, and launch checklists moving.', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80&auto=format&fit=crop' },
      { title: 'Social and email scheduling', description: 'Prepare assets, schedule sends, and maintain publishing cadence.', image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&q=80&auto=format&fit=crop' },
      { title: 'Marketing admin and reporting', description: 'Handle recurring dashboards, CRM cleanup, and campaign tracking.', image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=800&q=80&auto=format&fit=crop' },
      { title: 'Research and list preparation', description: 'Support outreach and planning with organized source data and notes.', image: 'https://images.unsplash.com/photo-1516321165247-4aa89a48be28?w=800&q=80&auto=format&fit=crop' },
    ],
    testimonials: [
      { name: 'Chloe Bennett', role: 'Marketing Lead, Retail Brand', quote: 'We stopped dropping campaign tasks between strategy and execution because SN owned the operational layer.' },
      { name: 'Mark Dizon', role: 'Founder, Service Marketplace', quote: 'They brought structure to our weekly marketing rhythm without forcing us into a bloated in-house hire.' },
    ],
    contact: { email: 'marketing@sngroup.com.au', phone: '+63 (2) 8123 4569' },
    website_url: '/contact?service=marketing-support',
  },
  {
    slug: 'content-creation',
    name: 'Content Creation',
    tagline: 'Production support for copy, visual assets, publishing, and creative handoff',
    description:
      'Content support for founders and teams that need writing assistance, asset preparation, publishing help, repurposing, and dependable production follow-through.',
    icon: PenTool,
    color: '#0E3A49',
    cardBg: 'bg-[rgba(23,80,99,0.12)] border-[rgba(14,58,73,0.18)]',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80&auto=format&fit=crop',
    stats: [{ label: 'Output Types', value: 'Copy / Visuals' }, { label: 'Use Cases', value: 'B2B / Agency' }],
    services: [
      { title: 'Content drafting support', description: 'Assist with blogs, newsletters, captions, scripts, and campaign copy.', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80&auto=format&fit=crop' },
      { title: 'Asset preparation', description: 'Organize source files, briefs, revisions, and creative handoff steps.', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&auto=format&fit=crop' },
      { title: 'Repurposing workflows', description: 'Turn one source asset into multiple publish-ready content pieces.', image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80&auto=format&fit=crop' },
      { title: 'Publishing coordination', description: 'Keep edits, approvals, and posting queues on schedule.', image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80&auto=format&fit=crop' },
    ],
    testimonials: [
      { name: 'Nina Patel', role: 'Content Lead, SaaS Team', quote: 'They kept our content calendar moving when internal bandwidth disappeared, and quality stayed consistent.' },
      { name: 'Luke Harrison', role: 'Agency Founder', quote: 'SN became the production layer that helped us ship more content without burning out the core team.' },
    ],
    contact: { email: 'content@sngroup.com.au', phone: '+63 (2) 8123 4570' },
    website_url: '/contact?service=content-creation',
  },
  {
    slug: 'ai-operations',
    name: 'AI Operations',
    tagline: 'Human-led AI workflow support for research, systems, prompts, and repeatable ops',
    description:
      'Operational support for teams adopting AI into day-to-day work, including prompt libraries, workflow documentation, QA checks, knowledge-base upkeep, and tool coordination.',
    icon: Bot,
    color: '#B8BAB3',
    cardBg: 'bg-[rgba(184,186,179,0.16)] border-[rgba(184,186,179,0.35)]',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=80&auto=format&fit=crop',
    stats: [{ label: 'Workflow Type', value: 'Ops / Research' }, { label: 'Team Fit', value: 'Founders / Ops' }],
    services: [
      { title: 'Prompt and SOP libraries', description: 'Document prompts, usage notes, and team-ready operating procedures.', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80&auto=format&fit=crop' },
      { title: 'AI workflow coordination', description: 'Support intake, output routing, and repeatable task flows across tools.', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80&auto=format&fit=crop' },
      { title: 'Research and synthesis support', description: 'Turn raw source material into organized summaries, trackers, and briefs.', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80&auto=format&fit=crop' },
      { title: 'Quality and knowledge maintenance', description: 'Review outputs, maintain references, and keep systems usable over time.', image: 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800&q=80&auto=format&fit=crop' },
    ],
    testimonials: [
      { name: 'Erin Cole', role: 'Operations Lead, Advisory Firm', quote: 'They helped us turn scattered AI experiments into repeatable workflows the team could actually use.' },
      { name: 'Paolo Cruz', role: 'Agency Director', quote: 'SN gave us structure around prompt libraries and QA so AI outputs became operational, not just interesting.' },
    ],
    contact: { email: 'aiops@sngroup.com.au', phone: '+63 (2) 8123 4571' },
    website_url: '/contact?service=ai-operations',
  },
];

export const CEO_MESSAGE = {
  name: 'Antonio S. Navarro',
  title: 'Chief Executive Officer',
  initials: 'ASN',
  message: `At SN International Group Pty. Ltd., we believe outsourcing works best when it feels intentional, accountable, and deeply integrated with the way a client already operates.

We do not treat support as a commodity. We build service roles around real workflows, communication rhythms, and performance expectations so founders and teams get support that is dependable from day one.

Our commitment is simple: thoughtful matching, disciplined operations, and a standard of service that protects both trust and momentum as your business grows.

Thank you for considering SN as part of your next growth phase.`,
};

export const MISSION =
  'To help growing businesses scale with dependable remote support built on clear process, careful matching, and consistent service quality.';

export const VISION =
  'To be the trusted operating partner behind high-performing remote support teams for founders, operators, and modern service businesses.';

export interface NewsItem {
  text: string;
  category: string;
  categoryColor: string;
  href: string;
  daysAgo: number;
}

export const WHATS_NEW: NewsItem[] = [
  { text: 'Executive support pods now available for founder and director coverage', category: 'Executive', categoryColor: '#175063', href: '/contact?service=executive-assistance', daysAgo: 1 },
  { text: 'Marketing support pods now cover campaign coordination, scheduling, and weekly reporting', category: 'Marketing', categoryColor: '#6099AC', href: '/contact?service=marketing-support', daysAgo: 3 },
  { text: 'Content creation support now includes drafting, repurposing, and publishing coordination', category: 'Content', categoryColor: '#0E3A49', href: '/contact?service=content-creation', daysAgo: 5 },
  { text: 'AI operations support now includes prompt libraries, workflow QA, and research handoff', category: 'AI Ops', categoryColor: '#6F726B', href: '/contact?service=ai-operations', daysAgo: 7 },
  { text: 'SN refocuses its public site around VA outsourcing and remote support', category: 'SN', categoryColor: '#000000', href: '/about', daysAgo: 10 },
  { text: 'Book a discovery call to scope your first support role', category: 'Contact', categoryColor: '#175063', href: '/contact', daysAgo: 2 },
];

export const CULTURE_VALUES = [
  {
    title: 'Excellence',
    description: 'We set high standards and strive to exceed them in everything we do.',
  },
  {
    title: 'Integrity',
    description: 'We conduct business with honesty, transparency, and ethical responsibility.',
  },
  {
    title: 'Innovation',
    description: 'We embrace new ideas and continuously seek better ways to serve our stakeholders.',
  },
  {
    title: 'Teamwork',
    description: 'We believe in the power of collaboration and support each other to achieve shared goals.',
  },
  {
    title: 'Community',
    description: 'We invest in the well-being of the communities where we live and work.',
  },
  {
    title: 'Growth',
    description: 'We foster an environment where every individual can learn, develop, and thrive.',
  },
];

export const LIFE_PHOTOS = [
  {
    src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80&auto=format&fit=crop',
    alt: 'Team members collaborating at annual team building event',
    caption: 'Annual Team Building 2025',
    category: 'Team Building',
    slug: 'annual-team-building-2025',
    description:
      'Our annual team building event brought together 200+ employees for a full day of collaboration, friendly competitions, and camaraderie at Tagaytay Highlands, strengthening bonds that carry back into the workplace.',
  },
  {
    src: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80&auto=format&fit=crop',
    alt: 'Modern open-plan office space at BGC headquarters',
    caption: 'Our BGC Headquarters',
    category: 'Office Life',
    slug: 'bgc-headquarters',
    description:
      'Take a tour of our modern headquarters in Bonifacio Global City, an open, bright workspace designed for collaboration, creativity, and focus where great ideas come to life every day.',
  },
  {
    src: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80&auto=format&fit=crop',
    alt: 'Awards ceremony on stage at Philippine Business Excellence Awards',
    caption: 'Best Employer Awards 2025',
    category: 'Events',
    slug: 'best-employer-awards-2025',
    description:
      'SN International Group was recognized as a Best Employer of 2025 at the Philippine Business Excellence Awards, a landmark achievement that reflects our unwavering commitment to our people and workplace culture.',
  },
  {
    src: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200&q=80&auto=format&fit=crop',
    alt: 'Volunteers from SN distributing goods in underserved communities',
    caption: 'CSR, Community Outreach',
    category: 'Events',
    slug: 'community-outreach',
    description:
      'Our CSR team mobilized over 150 employee volunteers to distribute food packs and essential goods to underserved communities in Taguig, because giving back is part of who we are at SN International Group.',
  },
  {
    src: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80&auto=format&fit=crop',
    alt: 'Employees joining a fitness and wellness class',
    caption: 'Wellness Wednesday',
    category: 'Office Life',
    slug: 'wellness-wednesday',
    description:
      'Every Wednesday, employees across all business units enjoy free fitness classes, guided meditation, and wellness check-ins, part of our commitment to nurturing a healthy and balanced work environment.',
  },
  {
    src: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=1200&q=80&auto=format&fit=crop',
    alt: 'Employees celebrating at the annual year-end party',
    caption: 'Year-End Celebration',
    category: 'Events',
    slug: 'year-end-celebration',
    description:
      'We closed out the year in grand style with our annual Year-End Bash, a memorable evening of awards, live entertainment, heartfelt speeches, and genuine gratitude for the incredible people who make SN what it is.',
  },
  {
    src: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80&auto=format&fit=crop',
    alt: 'Employees participating in a leadership development training workshop',
    caption: 'Leadership Development Program',
    category: 'Team Building',
    slug: 'leadership-development-program',
    description:
      "Our Leadership Development Program empowers high-potential employees with executive coaching, cross-functional mentorship, and hands-on challenges, building tomorrow's leaders from within our own ranks.",
  },
  {
    src: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1200&q=80&auto=format&fit=crop',
    alt: 'Team sharing a meal together on Team Friday Lunch',
    caption: 'Team Friday Lunch',
    category: 'Team Building',
    slug: 'team-friday-lunch',
    description:
      'Every Friday, teams across the company gather for a shared lunch, a simple but meaningful tradition that keeps our culture warm, connected, and rooted in genuine human relationships.',
  },
];

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#services', label: 'Services', hasMegaMenu: true },
  { href: '/about', label: 'About Us' },
  { href: '/team', label: 'Meet the Team' },
  { href: '/contact', label: 'Contact' },
] as const;

export const GOOGLE_MAPS_EMBED_URL =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.5!2d121.0508!3d14.5547!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sBonifacio+Global+City!5e0!3m2!1sen!2sph!4v1709000000000';

export interface JobPosting {
  id: string;
  title: string;
  business_unit_slug: string;
  business_unit_name: string;
  location: string;
  employment_type: string;
  description: string;
  responsibilities?: string[];
  qualifications?: string[];
  applicants?: number;
  posted_at?: string;
  salary_range?: string;
}

export const PLACEHOLDER_JOBS: JobPosting[] = [
  {
    id: '1',
    title: 'Operations Manager',
    business_unit_slug: 'sfo',
    business_unit_name: 'SFO (SeaFood Outlet)',
    location: 'BGC, Taguig',
    employment_type: 'Full-time',
    description:
      'Oversee daily food service operations, manage a team of 50+ staff, and ensure quality and safety compliance across all client sites.',
    responsibilities: [
      'Lead day-to-day operations across multiple client sites',
      'Manage scheduling, staffing, and team performance',
      'Ensure compliance with food safety and hygiene standards',
      'Coordinate with clients on service delivery and quality assurance',
      'Prepare operational reports and manage budget targets',
    ],
    qualifications: [
      'Bachelor\'s degree in Business, Hospitality, or related field',
      '5+ years of experience in food service or operations management',
      'Strong leadership and communication skills',
      'Food safety certification (HACCP or equivalent preferred)',
    ],
    applicants: 18,
    posted_at: '2026-03-01T08:00:00Z',
    salary_range: '₱45,000 – ₱65,000',
  },
  {
    id: '2',
    title: 'Sales Executive',
    business_unit_slug: 'uhp',
    business_unit_name: 'UHP (Ultimate Health Project)',
    location: 'Makati City',
    employment_type: 'Full-time',
    description:
      'Drive revenue growth by building relationships with hospitals, clinics, and pharmacies. Manage the full sales cycle from prospecting to close.',
    responsibilities: [
      'Prospect and acquire new healthcare clients across Metro Manila',
      'Manage and grow existing accounts through consultative selling',
      'Present products and conduct demos for medical purchasing committees',
      'Meet or exceed monthly and quarterly sales targets',
      'Maintain accurate records in the CRM system',
    ],
    qualifications: [
      'Bachelor\'s degree in Business, Pharmacy, or Healthcare Management',
      '3+ years of B2B sales experience, preferably in healthcare or pharma',
      'Established network within the healthcare industry is a plus',
      'Excellent presentation and negotiation skills',
    ],
    applicants: 34,
    posted_at: '2026-02-25T08:00:00Z',
    salary_range: '₱30,000 – ₱50,000',
  },
  {
    id: '3',
    title: 'Fitness Trainer',
    business_unit_slug: '24-fit-club',
    business_unit_name: '24 Fit Club',
    location: 'Multiple Locations',
    employment_type: 'Full-time',
    description:
      'Design and deliver personal training programs. Conduct group fitness classes and help members achieve their fitness goals.',
    responsibilities: [
      'Conduct one-on-one personal training sessions',
      'Lead group fitness classes (HIIT, yoga, spinning)',
      'Create personalized fitness programs for members',
      'Monitor member progress and adjust plans accordingly',
      'Ensure a safe, motivating, and inclusive gym environment',
    ],
    qualifications: [
      'NSCA, ACE, or equivalent fitness certification required',
      '2+ years of experience as a personal trainer or group instructor',
      'Strong interpersonal and motivational skills',
      'First Aid and CPR certified',
    ],
    applicants: 52,
    posted_at: '2026-03-04T08:00:00Z',
    salary_range: '₱25,000 – ₱35,000',
  },
  {
    id: '4',
    title: 'Civil Engineer',
    business_unit_slug: 'construction',
    business_unit_name: 'SN Property Development',
    location: 'Quezon City',
    employment_type: 'Full-time',
    description:
      'Manage structural design and on-site construction activities for commercial and residential projects.',
    responsibilities: [
      'Prepare and review structural and civil engineering designs',
      'Supervise on-site construction and enforce quality standards',
      'Coordinate with architects, contractors, and subcontractors',
      'Ensure projects comply with local building codes and regulations',
      'Monitor project timelines, budgets, and resource allocation',
    ],
    qualifications: [
      'Licensed Civil Engineer (PRC Board Passer)',
      '4+ years of experience in commercial or residential construction',
      'Proficiency in AutoCAD, STAAD Pro, or similar tools',
      'Strong project management and problem-solving skills',
    ],
    applicants: 11,
    posted_at: '2026-02-20T08:00:00Z',
    salary_range: '₱50,000 – ₱75,000',
  },
  {
    id: '5',
    title: 'Marketing Intern',
    business_unit_slug: 'sfo',
    business_unit_name: 'SFO (SeaFood Outlet)',
    location: 'BGC, Taguig',
    employment_type: 'Internship',
    description:
      'Assist the marketing team with social media management, content creation, and campaign execution for SFO brand awareness.',
    responsibilities: [
      'Create and schedule content for social media platforms',
      'Assist in planning and executing marketing campaigns',
      'Conduct competitor and market research',
      'Support event coordination and on-ground activations',
      'Track campaign performance and compile reports',
    ],
    qualifications: [
      'Currently enrolled in Marketing, Communications, or related degree (3rd/4th year)',
      'Basic knowledge of Canva, Adobe tools, or similar design software',
      'Creative eye and strong written communication skills',
      'Ability to commit to at least 3 days per week on-site',
    ],
    applicants: 67,
    posted_at: '2026-03-06T08:00:00Z',
    salary_range: 'Unpaid Internship',
  },
];

export const EMPLOYEE_SPOTLIGHTS = [
  {
    name: 'Andrea Reyes',
    role: 'Operations Lead',
    department: 'SFO',
    tenure: '4 years',
    quote:
      'What I love most about SN is the trust and autonomy. I was given the freedom to innovate our meal programs, and the leadership always supported me.',
  },
  {
    name: 'Marco Santos',
    role: 'Sales Manager',
    department: 'UHP',
    tenure: '3 years',
    quote:
      'SN invests in your growth. I started as a sales executive and within three years, I was leading a team. The opportunities here are real.',
  },
  {
    name: 'Jessica Lim',
    role: 'Fitness Program Director',
    department: '24 Fit Club',
    tenure: '2 years',
    quote:
      'The culture at 24 Fit Club is incredible. We genuinely care about our members and each other. It doesn\'t feel like work when you love what you do.',
  },
  {
    name: 'Carlos Rivera',
    role: 'Project Engineer',
    department: 'SN Property Development',
    tenure: '5 years',
    quote:
      'Every project is a learning experience. SN Construction gives you ownership of your work and the resources to deliver excellence.',
  },
];
