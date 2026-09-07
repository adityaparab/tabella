import type { Attribute, ObjectWithAttributes } from '@tabella/shared';

/**
 * The objects/attributes catalog. Single source of truth for the seed — and the set of
 * "hot keys" that get expression indexes (#5) matches what the demo filters and sorts on.
 */

export const OBJECT_COMPANIES = 'obj_companies';
export const OBJECT_PEOPLE = 'obj_people';
export const OBJECT_DEALS = 'obj_deals';

export const INDUSTRIES = ['SaaS', 'Fintech', 'Healthcare', 'Logistics', 'Retail', 'Energy'] as const;
export const TITLES = [
  'CEO',
  'CTO',
  'VP Engineering',
  'VP Sales',
  'Account Executive',
  'Sales Development Rep',
  'Customer Success Manager',
  'Data Analyst',
  'Product Manager',
  'Recruiter',
] as const;
export const STAGES = ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const;
export const OWNERS = [
  'A. Costa',
  'B. Nakamura',
  'C. Okafor',
  'D. Lindqvist',
  'E. Marchetti',
  'F. Haddad',
  'G. Novak',
  'H. Bhatt',
] as const;

export const CATALOG: ObjectWithAttributes[] = [
  {
    id: OBJECT_COMPANIES,
    slug: 'companies',
    name: 'Companies',
    createdAt: 1760000000000,
    attributes: [
      { id: 'attr_companies_name', objectId: OBJECT_COMPANIES, key: 'name', label: 'Name', type: 'text', options: [] },
      { id: 'attr_companies_domain', objectId: OBJECT_COMPANIES, key: 'domain', label: 'Domain', type: 'url', options: [] },
      { id: 'attr_companies_industry', objectId: OBJECT_COMPANIES, key: 'industry', label: 'Industry', type: 'select', options: [...INDUSTRIES] },
      { id: 'attr_companies_arr', objectId: OBJECT_COMPANIES, key: 'arr', label: 'ARR ($)', type: 'number', options: [] },
      { id: 'attr_companies_employees', objectId: OBJECT_COMPANIES, key: 'employees', label: 'Employees', type: 'number', options: [] },
      { id: 'attr_companies_founded', objectId: OBJECT_COMPANIES, key: 'founded', label: 'Founded', type: 'date', options: [] },
    ],
  },
  {
    id: OBJECT_PEOPLE,
    slug: 'people',
    name: 'People',
    createdAt: 1760000000000,
    attributes: [
      { id: 'attr_people_name', objectId: OBJECT_PEOPLE, key: 'name', label: 'Name', type: 'text', options: [] },
      { id: 'attr_people_email', objectId: OBJECT_PEOPLE, key: 'email', label: 'Email', type: 'email', options: [] },
      { id: 'attr_people_title', objectId: OBJECT_PEOPLE, key: 'title', label: 'Title', type: 'select', options: [...TITLES] },
      { id: 'attr_people_company_id', objectId: OBJECT_PEOPLE, key: 'company_id', label: 'Company ID', type: 'text', options: [] },
      { id: 'attr_people_company', objectId: OBJECT_PEOPLE, key: 'company', label: 'Company', type: 'text', options: [] },
      { id: 'attr_people_last_activity', objectId: OBJECT_PEOPLE, key: 'last_activity', label: 'Last activity', type: 'date', options: [] },
    ],
  },
  {
    id: OBJECT_DEALS,
    slug: 'deals',
    name: 'Deals',
    createdAt: 1760000000000,
    attributes: [
      { id: 'attr_deals_name', objectId: OBJECT_DEALS, key: 'name', label: 'Name', type: 'text', options: [] },
      { id: 'attr_deals_stage', objectId: OBJECT_DEALS, key: 'stage', label: 'Stage', type: 'select', options: [...STAGES] },
      { id: 'attr_deals_value', objectId: OBJECT_DEALS, key: 'value', label: 'Value ($)', type: 'number', options: [] },
      { id: 'attr_deals_company_id', objectId: OBJECT_DEALS, key: 'company_id', label: 'Company ID', type: 'text', options: [] },
      { id: 'attr_deals_company', objectId: OBJECT_DEALS, key: 'company', label: 'Company', type: 'text', options: [] },
      { id: 'attr_deals_owner', objectId: OBJECT_DEALS, key: 'owner', label: 'Owner', type: 'select', options: [...OWNERS] },
      { id: 'attr_deals_primary_contact', objectId: OBJECT_DEALS, key: 'primary_contact', label: 'Primary contact', type: 'text', options: [] },
      { id: 'attr_deals_created', objectId: OBJECT_DEALS, key: 'created', label: 'Created', type: 'date', options: [] },
      { id: 'attr_deals_close_date', objectId: OBJECT_DEALS, key: 'close_date', label: 'Close date', type: 'date', options: [] },
    ],
  },
];

export function attributesBySlug(slug: string): Attribute[] {
  return CATALOG.find((object) => object.slug === slug)?.attributes ?? [];
}
