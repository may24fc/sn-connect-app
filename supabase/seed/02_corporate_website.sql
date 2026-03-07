-- Seed data for the SN International Group corporate website

-- ============================================================================
-- Business Units
-- ============================================================================
INSERT INTO public.business_units (slug, name, tagline, description, overview, contact_email, contact_phone, services, testimonials, display_order)
VALUES
(
  'sfo',
  'SFO (SN Food Operations)',
  'Nourishing Communities, One Meal at a Time',
  'SFO is the food service arm of SN International Group, delivering quality meals and catering solutions to corporate clients, institutions, and events across the Philippines.',
  'With over a decade of experience in food service management, SFO has grown from a small catering operation to one of the most trusted names in institutional food service in the Philippines. Our team of chefs, nutritionists, and service professionals work together to deliver meals that nourish the body and delight the palate.',
  'sfo@sninternational.com',
  '+63 (2) 8123 4568',
  '[{"title": "Corporate Catering", "description": "Full-service catering for offices, events, and conferences."}, {"title": "Institutional Food Service", "description": "Contracted meal programs for schools, hospitals, and government."}, {"title": "Event Catering", "description": "Custom menus for weddings, galas, and private celebrations."}, {"title": "Meal Planning & Consulting", "description": "Nutrition-focused menu design and food safety consulting."}]'::jsonb,
  '[{"name": "Maria Santos", "role": "HR Director, TechCorp PH", "quote": "SFO transformed our company cafeteria. The quality and consistency are outstanding."}, {"name": "James Reyes", "role": "Event Coordinator", "quote": "Every event they cater is flawless — from setup to cleanup."}]'::jsonb,
  1
),
(
  'uhp',
  'UHP (Universal Healthcare Products)',
  'Healthcare Solutions for Every Filipino',
  'UHP is dedicated to making quality healthcare products accessible and affordable. From medical supplies to wellness essentials, UHP partners with healthcare providers and pharmacies nationwide.',
  'Universal Healthcare Products was founded with a mission to bridge the gap between quality healthcare products and the communities that need them most. Today we distribute to over 500 pharmacies and 100 hospitals across Luzon, Visayas, and Mindanao.',
  'uhp@sninternational.com',
  '+63 (2) 8123 4569',
  '[{"title": "Medical Supplies Distribution", "description": "Wide range of medical supplies for hospitals and clinics."}, {"title": "Pharmaceutical Products", "description": "Quality-assured pharma products at competitive prices."}, {"title": "Wellness & Personal Care", "description": "Health and wellness products for everyday consumers."}, {"title": "Institutional Partnerships", "description": "Long-term supply agreements with healthcare institutions."}]'::jsonb,
  '[{"name": "Dr. Elena Cruz", "role": "Chief Medical Officer, Metro Hospital", "quote": "UHP has been a reliable partner for our supply chain needs for over 5 years."}, {"name": "Robert Lim", "role": "Pharmacy Owner", "quote": "Their product range and pricing make them our preferred distributor."}]'::jsonb,
  2
),
(
  '24-fit-club',
  '24 Fit Club',
  'Your Fitness Journey, 24/7',
  '24 Fit Club is a modern fitness brand offering state-of-the-art gym facilities, personal training, and group classes. We believe fitness should be accessible to everyone, anytime.',
  '24 Fit Club combines world-class equipment with certified trainers to create a fitness experience that works for everyone — from beginners to athletes. With 24/7 access and multiple locations, we remove the barriers to a healthier lifestyle.',
  'fitclub@sninternational.com',
  '+63 (2) 8123 4570',
  '[{"title": "Gym Memberships", "description": "Flexible membership plans with 24/7 access to premium equipment."}, {"title": "Personal Training", "description": "Certified trainers creating personalized fitness programs."}, {"title": "Group Fitness Classes", "description": "Yoga, HIIT, spinning, and more — designed for all levels."}, {"title": "Corporate Wellness Programs", "description": "Tailored fitness programs for companies and their employees."}]'::jsonb,
  '[{"name": "Anna Dela Cruz", "role": "Member since 2023", "quote": "The facilities are world-class and the trainers genuinely care about your progress."}, {"name": "Miguel Torres", "role": "Corporate Member", "quote": "Our company wellness program with 24 Fit Club has improved employee morale significantly."}]'::jsonb,
  3
),
(
  'construction',
  'SN Construction & Real Estate',
  'Building the Future, One Structure at a Time',
  'SN Construction & Real Estate delivers commercial and residential projects with uncompromising quality. From land development to turnkey construction, we build spaces where people thrive.',
  'With a portfolio spanning residential subdivisions, commercial complexes, and industrial facilities, SN Construction & Real Estate has earned a reputation for delivering projects on time, within budget, and to the highest standards of quality and safety.',
  'construction@sninternational.com',
  '+63 (2) 8123 4571',
  '[{"title": "Commercial Construction", "description": "Office buildings, retail spaces, and industrial facilities."}, {"title": "Residential Development", "description": "Townhouses, condominiums, and subdivision projects."}, {"title": "Renovation & Retrofitting", "description": "Modernization of existing structures to meet current standards."}, {"title": "Project Management", "description": "End-to-end construction management and consulting."}]'::jsonb,
  '[{"name": "Ricardo Gonzales", "role": "Property Developer", "quote": "SN Construction delivered our project ahead of schedule and under budget."}, {"name": "Linda Tan", "role": "Homeowner", "quote": "The quality of workmanship on our home exceeded our expectations."}]'::jsonb,
  4
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- Sample Job Postings
-- ============================================================================
INSERT INTO public.job_postings (title, business_unit_id, department, location, employment_type, description, requirements, benefits, is_active)
SELECT
  'Executive Chef',
  bu.id,
  'Culinary',
  'BGC, Taguig',
  'full-time',
  'We are looking for an experienced Executive Chef to lead our culinary team and oversee all food operations for corporate clients.',
  'At least 8 years of experience in professional kitchens. Degree in Culinary Arts preferred. Strong leadership and menu development skills.',
  'Competitive salary, health insurance, meal allowance, career development opportunities.',
  true
FROM public.business_units bu WHERE bu.slug = 'sfo';

INSERT INTO public.job_postings (title, business_unit_id, department, location, employment_type, description, requirements, benefits, is_active)
SELECT
  'Sales Representative',
  bu.id,
  'Sales',
  'Makati City',
  'full-time',
  'Join our sales team to expand UHP product distribution to pharmacies and healthcare institutions across the Philippines.',
  'Bachelor''s degree in Business or related field. 2+ years sales experience, preferably in pharmaceutical or healthcare distribution.',
  'Base salary plus commission, HMO, company vehicle, performance bonuses.',
  true
FROM public.business_units bu WHERE bu.slug = 'uhp';

INSERT INTO public.job_postings (title, business_unit_id, department, location, employment_type, description, requirements, benefits, is_active)
SELECT
  'Certified Personal Trainer',
  bu.id,
  'Fitness',
  'Multiple Locations',
  'full-time',
  'We''re hiring passionate personal trainers to join our growing team and help members achieve their fitness goals.',
  'Certified by a recognized fitness organization (ACE, NASM, or equivalent). CPR/First Aid certified. Excellent interpersonal skills.',
  'Competitive hourly rate, free gym membership, continuing education allowance.',
  true
FROM public.business_units bu WHERE bu.slug = '24-fit-club';

INSERT INTO public.job_postings (title, business_unit_id, department, location, employment_type, description, requirements, benefits, is_active)
SELECT
  'Project Engineer',
  bu.id,
  'Engineering',
  'Quezon City',
  'full-time',
  'Manage construction projects from planning through completion, ensuring quality standards and timely delivery.',
  'Licensed Civil Engineer. 3+ years experience in construction project management. Proficient in AutoCAD and project management software.',
  'Competitive salary, project completion bonuses, HMO, company-sponsored training.',
  true
FROM public.business_units bu WHERE bu.slug = 'construction';

INSERT INTO public.job_postings (title, business_unit_id, department, location, employment_type, description, requirements, benefits, is_active)
SELECT
  'Marketing Intern',
  bu.id,
  'Marketing',
  'BGC, Taguig',
  'internship',
  'Gain hands-on marketing experience at a dynamic fitness brand. Help create content, manage social media, and coordinate events.',
  'Currently enrolled in Marketing, Communications, or related course. Creative, proactive, and social-media savvy.',
  'Monthly stipend, free gym membership, mentorship from senior marketing team.',
  true
FROM public.business_units bu WHERE bu.slug = '24-fit-club';

-- ============================================================================
-- Website Content
-- ============================================================================
INSERT INTO public.website_content (section, key, value, metadata) VALUES
  ('hero', 'headline', 'Building Futures, Empowering Lives', '{}'),
  ('hero', 'subheadline', 'A diversified conglomerate committed to excellence across food service, healthcare, fitness, and construction.', '{}'),
  ('whats_new', 'item_1', 'SFO opens new central kitchen facility in BGC', '{"icon": "🎉"}'),
  ('whats_new', 'item_2', '24 Fit Club launches corporate wellness partnerships', '{"icon": "💪"}'),
  ('whats_new', 'item_3', 'SN Construction breaks ground on new residential project', '{"icon": "🏗️"}'),
  ('whats_new', 'item_4', 'UHP expands distribution to Visayas and Mindanao', '{"icon": "🏥"}'),
  ('whats_new', 'item_5', 'SN International Group recognized as Top Employer 2026', '{"icon": "👥"}'),
  ('whats_new', 'item_6', 'Now hiring across all business units — explore our Careers page', '{"icon": "🌟"}')
ON CONFLICT (section, key) DO NOTHING;
