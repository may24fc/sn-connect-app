import type { LucideIcon } from 'lucide-react';
import { Building2, Dumbbell, HardHat, Utensils } from 'lucide-react';

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
}

export const COMPANY = {
  name: 'SN International Group',
  tagline: 'Building Futures, Empowering Lives',
  description:
    'SN International Group is a diversified conglomerate committed to excellence across food service, universal healthcare products, fitness, and construction. With a growing team and a culture of innovation, we build businesses that transform industries and uplift communities.',
  email: 'info@sninternational.com',
  phone: '+63 (2) 8123 4567',
  address: 'SN International Tower, Bonifacio Global City, Taguig, Metro Manila, Philippines',
  social: {
    facebook: 'https://facebook.com/sninternational',
    linkedin: 'https://linkedin.com/company/sninternational',
    instagram: 'https://instagram.com/sninternational',
  },
};

export const BUSINESS_UNITS: BusinessUnit[] = [
  {
    slug: 'sfo',
    name: 'SFO (SeaFood Outlet)',
    tagline: 'Nourishing Communities, One Meal at a Time',
    description:
      'SFO is the food service arm of SN International Group, delivering quality meals and catering solutions to corporate clients, institutions, and events across the Philippines.',
    icon: Utensils,
    color: '#C5A059',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80&auto=format&fit=crop',
    stats: [{ label: 'Meals Served Daily', value: '10,000+' }, { label: 'Client Sites', value: '45+' }],
    services: [
      { title: 'Corporate Catering', description: 'Full-service catering for offices, events, and conferences.', image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80&auto=format&fit=crop' },
      { title: 'Institutional Food Service', description: 'Contracted meal programs for schools, hospitals, and government.', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&auto=format&fit=crop' },
      { title: 'Event Catering', description: 'Custom menus for weddings, galas, and private celebrations.', image: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=800&q=80&auto=format&fit=crop' },
      { title: 'Meal Planning & Consulting', description: 'Nutrition-focused menu design and food safety consulting.', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80&auto=format&fit=crop' },
    ],
    testimonials: [
      { name: 'Maria Santos', role: 'HR Director, TechCorp PH', quote: 'SFO transformed our company cafeteria. The quality and consistency are outstanding.' },
      { name: 'James Reyes', role: 'Event Coordinator', quote: 'Every event they cater is flawless — from setup to cleanup.' },
    ],
    contact: { email: 'sfo@sninternational.com', phone: '+63 (2) 8123 4568' },
    website_url: 'https://sfo.sninternational.com',
  },
  {
    slug: 'uhp',
    name: 'UHP (Ultimate Health Project)',
    tagline: 'Healthcare Solutions for Every Filipino',
    description:
      'UHP is dedicated to making quality healthcare products accessible and affordable. From medical supplies to wellness essentials, UHP partners with healthcare providers and pharmacies nationwide.',
    icon: Building2,
    color: '#2563EB',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80&auto=format&fit=crop',
    stats: [{ label: 'Healthcare Partners', value: '200+' }, { label: 'Products Distributed', value: '1,500+' }],
    services: [
      { title: 'Medical Supplies Distribution', description: 'Wide range of medical supplies for hospitals and clinics.', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80&auto=format&fit=crop' },
      { title: 'Pharmaceutical Products', description: 'Quality-assured pharma products at competitive prices.', image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80&auto=format&fit=crop' },
      { title: 'Wellness & Personal Care', description: 'Health and wellness products for everyday consumers.', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80&auto=format&fit=crop' },
      { title: 'Institutional Partnerships', description: 'Long-term supply agreements with healthcare institutions.', image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800&q=80&auto=format&fit=crop' },
    ],
    testimonials: [
      { name: 'Dr. Elena Cruz', role: 'Chief Medical Officer, Metro Hospital', quote: 'UHP has been a reliable partner for our supply chain needs for over 5 years.' },
      { name: 'Robert Lim', role: 'Pharmacy Owner', quote: 'Their product range and pricing make them our preferred distributor.' },
    ],
    contact: { email: 'uhp@sninternational.com', phone: '+63 (2) 8123 4569' },
    website_url: 'https://uhp.sninternational.com',
  },
  {
    slug: '24-fit-club',
    name: '24 Fit Club',
    tagline: 'Your Fitness Journey, 24/7',
    description:
      '24 Fit Club is a modern fitness brand offering state-of-the-art gym facilities, personal training, and group classes. We believe fitness should be accessible to everyone, anytime.',
    icon: Dumbbell,
    color: '#DC2626',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80&auto=format&fit=crop',
    stats: [{ label: 'Active Members', value: '5,000+' }, { label: 'Locations', value: '12' }],
    services: [
      { title: 'Gym Memberships', description: 'Flexible membership plans with 24/7 access to premium equipment.', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80&auto=format&fit=crop' },
      { title: 'Personal Training', description: 'Certified trainers creating personalized fitness programs.', image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80&auto=format&fit=crop' },
      { title: 'Group Fitness Classes', description: 'Yoga, HIIT, spinning, and more — designed for all levels.', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80&auto=format&fit=crop' },
      { title: 'Corporate Wellness Programs', description: 'Tailored fitness programs for companies and their employees.', image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80&auto=format&fit=crop' },
    ],
    testimonials: [
      { name: 'Anna Dela Cruz', role: 'Member since 2023', quote: 'The facilities are world-class and the trainers genuinely care about your progress.' },
      { name: 'Miguel Torres', role: 'Corporate Member', quote: 'Our company wellness program with 24 Fit Club has improved employee morale significantly.' },
    ],
    contact: { email: 'fitclub@sninternational.com', phone: '+63 (2) 8123 4570' },
    website_url: 'https://24fitclub.com',
  },
  {
    slug: 'construction',
    name: 'SN Property Development',
    tagline: 'Building the Future, One Structure at a Time',
    description:
      'SN Construction & Real Estate delivers commercial and residential projects with uncompromising quality. From land development to turnkey construction, we build spaces where people thrive.',
    icon: HardHat,
    color: '#059669',
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80&auto=format&fit=crop',
    stats: [{ label: 'Projects Completed', value: '80+' }, { label: 'Sqm Developed', value: '250K+' }],
    services: [
      { title: 'Commercial Construction', description: 'Office buildings, retail spaces, and industrial facilities.', image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80&auto=format&fit=crop' },
      { title: 'Residential Development', description: 'Townhouses, condominiums, and subdivision projects.', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80&auto=format&fit=crop' },
      { title: 'Renovation & Retrofitting', description: 'Modernization of existing structures to meet current standards.', image: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80&auto=format&fit=crop' },
      { title: 'Project Management', description: 'End-to-end construction management and consulting.', image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80&auto=format&fit=crop' },
    ],
    testimonials: [
      { name: 'Ricardo Gonzales', role: 'Property Developer', quote: 'SN Construction delivered our project ahead of schedule and under budget.' },
      { name: 'Linda Tan', role: 'Homeowner', quote: 'The quality of workmanship on our home exceeded our expectations.' },
    ],
    contact: { email: 'construction@sninternational.com', phone: '+63 (2) 8123 4571' },
    website_url: 'https://snproperty.sninternational.com',
  },
];

export const CEO_MESSAGE = {
  name: 'Antonio S. Navarro',
  title: 'Chief Executive Officer',
  initials: 'ASN',
  message: `At SN International Group, we believe that business is more than just commerce — it's about creating value that uplifts people and communities.

Since our founding, we have built a portfolio of businesses united by a single vision: to deliver excellence in everything we do. From nourishing communities through SFO, to making healthcare accessible through UHP, empowering fitness through 24 Fit Club, and building structures that stand the test of time through our construction arm — every venture reflects our commitment to quality and integrity.

Our team is our greatest asset. The passion, creativity, and dedication of our people drive us forward every day. As we continue to grow, we remain grounded in the values that define us: trust, innovation, and service.

Thank you for being part of our journey. Together, we are building a future that we can all be proud of.`,
};

export const MISSION =
  'To deliver exceptional value through diversified business ventures that uplift communities, empower individuals, and set new standards of excellence across every industry we serve.';

export const VISION =
  'To be the Philippines\' most trusted and admired conglomerate — known for innovation, integrity, and the positive impact we create in the lives of our employees, customers, and communities.';

export interface NewsItem {
  text: string;
  category: string;
  categoryColor: string;
  href: string;
  daysAgo: number;
}

export const WHATS_NEW: NewsItem[] = [
  { text: 'SFO opens new central kitchen facility in BGC', category: 'SFO', categoryColor: '#C5A059', href: '/businesses/sfo', daysAgo: 1 },
  { text: '24 Fit Club launches corporate wellness partnerships', category: '24 Fit', categoryColor: '#DC2626', href: '/businesses/24-fit-club', daysAgo: 3 },
  { text: 'SN Construction breaks ground on new residential project', category: 'Construction', categoryColor: '#059669', href: '/businesses/construction', daysAgo: 5 },
  { text: 'UHP expands distribution to Visayas and Mindanao', category: 'UHP', categoryColor: '#2563EB', href: '/businesses/uhp', daysAgo: 7 },
  { text: 'SN International Group recognized as Top Employer 2026', category: 'Corporate', categoryColor: '#4F46E5', href: '/about', daysAgo: 10 },
  { text: 'Now hiring across all business units — explore our Careers page', category: 'Careers', categoryColor: '#7C3AED', href: '/careers', daysAgo: 2 },
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
      'Our annual team building event brought together 200+ employees for a full day of collaboration, friendly competitions, and camaraderie at Tagaytay Highlands — strengthening bonds that carry back into the workplace.',
  },
  {
    src: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80&auto=format&fit=crop',
    alt: 'Modern open-plan office space at BGC headquarters',
    caption: 'Our BGC Headquarters',
    category: 'Office Life',
    slug: 'bgc-headquarters',
    description:
      'Take a tour of our modern headquarters in Bonifacio Global City — an open, bright workspace designed for collaboration, creativity, and focus where great ideas come to life every day.',
  },
  {
    src: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80&auto=format&fit=crop',
    alt: 'Awards ceremony on stage at Philippine Business Excellence Awards',
    caption: 'Best Employer Awards 2025',
    category: 'Events',
    slug: 'best-employer-awards-2025',
    description:
      'SN International Group was recognized as a Best Employer of 2025 at the Philippine Business Excellence Awards — a landmark achievement that reflects our unwavering commitment to our people and workplace culture.',
  },
  {
    src: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1200&q=80&auto=format&fit=crop',
    alt: 'Volunteers from SN distributing goods in underserved communities',
    caption: 'CSR — Community Outreach',
    category: 'Events',
    slug: 'community-outreach',
    description:
      'Our CSR team mobilized over 150 employee volunteers to distribute food packs and essential goods to underserved communities in Taguig — because giving back is part of who we are at SN International Group.',
  },
  {
    src: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1200&q=80&auto=format&fit=crop',
    alt: 'Employees joining a fitness and wellness class',
    caption: 'Wellness Wednesday',
    category: 'Office Life',
    slug: 'wellness-wednesday',
    description:
      'Every Wednesday, employees across all business units enjoy free fitness classes, guided meditation, and wellness check-ins — part of our commitment to nurturing a healthy and balanced work environment.',
  },
  {
    src: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=1200&q=80&auto=format&fit=crop',
    alt: 'Employees celebrating at the annual year-end party',
    caption: 'Year-End Celebration',
    category: 'Events',
    slug: 'year-end-celebration',
    description:
      'We closed out the year in grand style with our annual Year-End Bash — a memorable evening of awards, live entertainment, heartfelt speeches, and genuine gratitude for the incredible people who make SN what it is.',
  },
  {
    src: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80&auto=format&fit=crop',
    alt: 'Employees participating in a leadership development training workshop',
    caption: 'Leadership Development Program',
    category: 'Team Building',
    slug: 'leadership-development-program',
    description:
      "Our Leadership Development Program empowers high-potential employees with executive coaching, cross-functional mentorship, and hands-on challenges — building tomorrow's leaders from within our own ranks.",
  },
  {
    src: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1200&q=80&auto=format&fit=crop',
    alt: 'Team sharing a meal together on Team Friday Lunch',
    caption: 'Team Friday Lunch',
    category: 'Team Building',
    slug: 'team-friday-lunch',
    description:
      'Every Friday, teams across the company gather for a shared lunch — a simple but meaningful tradition that keeps our culture warm, connected, and rooted in genuine human relationships.',
  },
];

export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About Us' },
  { href: '/businesses', label: 'Businesses', hasMegaMenu: true },
  { href: '/careers', label: 'Careers' },
  { href: '/life-at-sn', label: 'Life at SN' },
  { href: '/team', label: 'Meet the Team' },
  { href: '/contact', label: 'Contact Us' },
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
