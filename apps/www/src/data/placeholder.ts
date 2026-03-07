import type { LucideIcon } from 'lucide-react';
import { Building2, Dumbbell, HardHat, Utensils } from 'lucide-react';

export interface BusinessUnit {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  color: string;
  services: { title: string; description: string }[];
  testimonials: { name: string; role: string; quote: string }[];
  contact: { email: string; phone: string };
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
    services: [
      { title: 'Corporate Catering', description: 'Full-service catering for offices, events, and conferences.' },
      { title: 'Institutional Food Service', description: 'Contracted meal programs for schools, hospitals, and government.' },
      { title: 'Event Catering', description: 'Custom menus for weddings, galas, and private celebrations.' },
      { title: 'Meal Planning & Consulting', description: 'Nutrition-focused menu design and food safety consulting.' },
    ],
    testimonials: [
      { name: 'Maria Santos', role: 'HR Director, TechCorp PH', quote: 'SFO transformed our company cafeteria. The quality and consistency are outstanding.' },
      { name: 'James Reyes', role: 'Event Coordinator', quote: 'Every event they cater is flawless — from setup to cleanup.' },
    ],
    contact: { email: 'sfo@sninternational.com', phone: '+63 (2) 8123 4568' },
  },
  {
    slug: 'uhp',
    name: 'UHP (Ultimate Health Project)',
    tagline: 'Healthcare Solutions for Every Filipino',
    description:
      'UHP is dedicated to making quality healthcare products accessible and affordable. From medical supplies to wellness essentials, UHP partners with healthcare providers and pharmacies nationwide.',
    icon: Building2,
    color: '#2563EB',
    services: [
      { title: 'Medical Supplies Distribution', description: 'Wide range of medical supplies for hospitals and clinics.' },
      { title: 'Pharmaceutical Products', description: 'Quality-assured pharma products at competitive prices.' },
      { title: 'Wellness & Personal Care', description: 'Health and wellness products for everyday consumers.' },
      { title: 'Institutional Partnerships', description: 'Long-term supply agreements with healthcare institutions.' },
    ],
    testimonials: [
      { name: 'Dr. Elena Cruz', role: 'Chief Medical Officer, Metro Hospital', quote: 'UHP has been a reliable partner for our supply chain needs for over 5 years.' },
      { name: 'Robert Lim', role: 'Pharmacy Owner', quote: 'Their product range and pricing make them our preferred distributor.' },
    ],
    contact: { email: 'uhp@sninternational.com', phone: '+63 (2) 8123 4569' },
  },
  {
    slug: '24-fit-club',
    name: '24 Fit Club',
    tagline: 'Your Fitness Journey, 24/7',
    description:
      '24 Fit Club is a modern fitness brand offering state-of-the-art gym facilities, personal training, and group classes. We believe fitness should be accessible to everyone, anytime.',
    icon: Dumbbell,
    color: '#DC2626',
    services: [
      { title: 'Gym Memberships', description: 'Flexible membership plans with 24/7 access to premium equipment.' },
      { title: 'Personal Training', description: 'Certified trainers creating personalized fitness programs.' },
      { title: 'Group Fitness Classes', description: 'Yoga, HIIT, spinning, and more — designed for all levels.' },
      { title: 'Corporate Wellness Programs', description: 'Tailored fitness programs for companies and their employees.' },
    ],
    testimonials: [
      { name: 'Anna Dela Cruz', role: 'Member since 2023', quote: 'The facilities are world-class and the trainers genuinely care about your progress.' },
      { name: 'Miguel Torres', role: 'Corporate Member', quote: 'Our company wellness program with 24 Fit Club has improved employee morale significantly.' },
    ],
    contact: { email: 'fitclub@sninternational.com', phone: '+63 (2) 8123 4570' },
  },
  {
    slug: 'construction',
    name: 'SN Property Development',
    tagline: 'Building the Future, One Structure at a Time',
    description:
      'SN Construction & Real Estate delivers commercial and residential projects with uncompromising quality. From land development to turnkey construction, we build spaces where people thrive.',
    icon: HardHat,
    color: '#059669',
    services: [
      { title: 'Commercial Construction', description: 'Office buildings, retail spaces, and industrial facilities.' },
      { title: 'Residential Development', description: 'Townhouses, condominiums, and subdivision projects.' },
      { title: 'Renovation & Retrofitting', description: 'Modernization of existing structures to meet current standards.' },
      { title: 'Project Management', description: 'End-to-end construction management and consulting.' },
    ],
    testimonials: [
      { name: 'Ricardo Gonzales', role: 'Property Developer', quote: 'SN Construction delivered our project ahead of schedule and under budget.' },
      { name: 'Linda Tan', role: 'Homeowner', quote: 'The quality of workmanship on our home exceeded our expectations.' },
    ],
    contact: { email: 'construction@sninternational.com', phone: '+63 (2) 8123 4571' },
  },
];

export const CEO_MESSAGE = {
  name: 'CEO Name',
  title: 'Chief Executive Officer',
  message: `At SN International Group, we believe that business is more than just commerce — it's about creating value that uplifts people and communities.

Since our founding, we have built a portfolio of businesses united by a single vision: to deliver excellence in everything we do. From nourishing communities through SFO, to making healthcare accessible through UHP, empowering fitness through 24 Fit Club, and building structures that stand the test of time through our construction arm — every venture reflects our commitment to quality and integrity.

Our team is our greatest asset. The passion, creativity, and dedication of our people drive us forward every day. As we continue to grow, we remain grounded in the values that define us: trust, innovation, and service.

Thank you for being part of our journey. Together, we are building a future that we can all be proud of.`,
};

export const MISSION =
  'To deliver exceptional value through diversified business ventures that uplift communities, empower individuals, and set new standards of excellence across every industry we serve.';

export const VISION =
  'To be the Philippines\' most trusted and admired conglomerate — known for innovation, integrity, and the positive impact we create in the lives of our employees, customers, and communities.';

export const WHATS_NEW = [
  '🎉 SFO opens new central kitchen facility in BGC',
  '💪 24 Fit Club launches corporate wellness partnerships',
  '🏗️ SN Construction breaks ground on new residential project',
  '🏥 UHP expands distribution to Visayas and Mindanao',
  '👥 SN International Group recognized as Top Employer 2026',
  '🌟 Now hiring across all business units — explore our Careers page',
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
  { src: '/images/culture/team-building.jpg', alt: 'Team building event', caption: 'Annual Team Building 2025' },
  { src: '/images/culture/office.jpg', alt: 'Modern office space', caption: 'Our BGC Headquarters' },
  { src: '/images/culture/awards.jpg', alt: 'Awards ceremony', caption: 'Best Employer Awards 2025' },
  { src: '/images/culture/volunteering.jpg', alt: 'Community volunteering', caption: 'CSR — Community Outreach' },
  { src: '/images/culture/fitness.jpg', alt: 'Company fitness event', caption: 'Wellness Wednesday' },
  { src: '/images/culture/celebration.jpg', alt: 'Company celebration', caption: 'Year-End Celebration' },
  { src: '/images/culture/training.jpg', alt: 'Training session', caption: 'Leadership Development Program' },
  { src: '/images/culture/lunch.jpg', alt: 'Team lunch', caption: 'Team Friday Lunch' },
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
