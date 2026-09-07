import { intBetween, logNormal, makeRng, pickWeighted, pick, recentTimestamp, type Rng } from './rng.js';
import { OBJECT_COMPANIES, OBJECT_DEALS, OBJECT_PEOPLE, OWNERS } from './catalog.js';

/**
 * Correlated, realistic distributions — the point is that filters visibly do something:
 * stage weights correlate with value, industry correlates with ARR, people belong to
 * companies, deals belong to both.
 */

export interface SeedCounts {
  companies: number;
  people: number;
  deals: number;
}

export const DEFAULT_COUNTS: SeedCounts = { companies: 40_000, people: 40_000, deals: 20_000 };

export interface GeneratedRecord {
  id: string;
  objectId: string;
  data: Record<string, string | number | boolean | null>;
  createdAt: number;
  updatedAt: number;
}

// Weighted distributions (see SPRINT_SCHEDULE: New > Qualified > Proposal > Negotiation > Won/Lost)
const INDUSTRY_WEIGHTS: readonly (readonly [string, number])[] = [
  ['SaaS', 30],
  ['Fintech', 20],
  ['Healthcare', 15],
  ['Logistics', 10],
  ['Retail', 15],
  ['Energy', 10],
];
const STAGE_WEIGHTS: readonly (readonly [string, number])[] = [
  ['New', 28],
  ['Qualified', 24],
  ['Proposal', 18],
  ['Negotiation', 12],
  ['Won', 10],
  ['Lost', 8],
];
const TITLE_WEIGHTS: readonly (readonly [string, number])[] = [
  ['CEO', 8],
  ['CTO', 8],
  ['VP Engineering', 10],
  ['VP Sales', 12],
  ['Account Executive', 22],
  ['Sales Development Rep', 18],
  ['Customer Success Manager', 10],
  ['Data Analyst', 5],
  ['Product Manager', 5],
  ['Recruiter', 2],
];
// Median deal value by stage — later stages carry bigger numbers.
const STAGE_MEDIAN: Record<string, number> = {
  New: 20_000,
  Qualified: 30_000,
  Proposal: 45_000,
  Negotiation: 60_000,
  Won: 80_000,
  Lost: 35_000,
};
// Revenue per employee by industry (rough, deliberate).
const INDUSTRY_RPE: Record<string, number> = {
  SaaS: 180_000,
  Fintech: 210_000,
  Healthcare: 120_000,
  Logistics: 90_000,
  Retail: 70_000,
  Energy: 160_000,
};

const NAME_PREFIXES = [
  'Northwind', 'Bright', 'Ironclad', 'Coastal', 'Summit', 'Cobalt', 'Harbor', 'Lantern',
  'Meridian', 'Quartz', 'Redwood', 'Sable', 'Terrace', 'Umbra', 'Vantage', 'Willow',
  'Alder', 'Beacon', 'Cinder', 'Drift', 'Ember', 'Fathom', 'Gale', 'Halcyon',
  'Keystone', 'Lumen', 'Marrow', 'Nimbus', 'Orchard', 'Pinnacle',
];
const NAME_SUFFIXES = [
  'Works', 'Labs', 'Systems', 'Dynamics', 'Group', 'Analytics', 'Industries', 'Partners',
  'Software', 'Technologies', 'Logistics', 'Health', 'Capital', 'Media', 'Robotics',
  'Energy', 'Cloud', 'Data', 'Networks', 'Supply',
];
const FIRST_NAMES = [
  'Ava', 'Bo', 'Cai', 'Dana', 'Eli', 'Farah', 'Gus', 'Hana', 'Ivo', 'Juno',
  'Kira', 'Leo', 'Mira', 'Nils', 'Omar', 'Priya', 'Quinn', 'Rosa', 'Sam', 'Tara',
  'Uma', 'Viktor', 'Wren', 'Xiu', 'Yara', 'Zane', 'Adrian', 'Bela', 'Chidi', 'Dmitri',
  'Elena', 'Felix', 'Gauri', 'Hugo', 'Ines', 'Jonas', 'Katya', 'Luca', 'Maya', 'Noor',
];
const LAST_NAMES = [
  'Alvarez', 'Baptiste', 'Chen', 'Dvorak', 'Eriksen', 'Fontaine', 'Gomez', 'Haruki',
  'Ibsen', 'Jansen', 'Kowalski', 'Lindgren', 'Marchetti', 'Nakamura', 'Okafor',
  'Petrov', 'Qureshi', 'Rossi', 'Silva', 'Tanaka', 'Ueda', 'Vargas', 'Wozniak',
  'Xu', 'Yilmaz', 'Zhang', 'Adeyemi', 'Bauer', 'Costa', 'Duarte',
];
const DEAL_KINDS = ['Renewal', 'Expansion', 'New Business', 'Pilot', 'Upsell', 'Platform'];

function isoDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  employees: number;
}

function makeId(prefix: string, n: number): string {
  return `rec_${prefix}${String(n).padStart(7, '0')}`;
}

export interface GeneratedData {
  companies: GeneratedRecord[];
  people: GeneratedRecord[];
  deals: GeneratedRecord[];
}

export function generateDataset(counts: SeedCounts = DEFAULT_COUNTS, seed = 42): GeneratedData {
  const rng = makeRng(seed);
  const now = Date.now();

  // --- companies: ARR correlates with headcount and industry ---
  const companyRows: GeneratedRecord[] = [];
  const companies: Company[] = [];
  const usedDomains = new Set<string>();
  for (let i = 1; i <= counts.companies; i++) {
    const prefix = pick(rng, NAME_PREFIXES);
    const suffix = pick(rng, NAME_SUFFIXES);
    const name = `${prefix} ${suffix}`;
    let domain = `${prefix.toLowerCase()}-${suffix.toLowerCase()}.com`.replace(/\s+/g, '');
    if (usedDomains.has(domain)) {
      domain = `${prefix.toLowerCase()}${suffix.toLowerCase()}${intBetween(rng, 2, 99)}.com`;
    }
    usedDomains.add(domain);
    const industry = pickWeighted(rng, INDUSTRY_WEIGHTS);
    const employees = logNormal(rng, 420, 1.2);
    const arr = Math.round((employees * INDUSTRY_RPE[industry]!) * Math.exp((rng() - 0.5) * 0.5));
    const founded = now - intBetween(rng, 365 * 1, 365 * 40) * 24 * 60 * 60 * 1000;
    const id = makeId('co', i);
    companies.push({ id, name, domain, industry, employees });
    companyRows.push({
      id,
      objectId: OBJECT_COMPANIES,
      data: { name, domain, industry, arr, employees, founded: isoDate(founded) },
      createdAt: founded,
      updatedAt: recentTimestamp(rng, 365),
    });
  }

  // --- people: belong to companies (bigger companies get more people) ---
  const cumulativeEmployees = new Uint32Array(companies.length + 1);
  for (let i = 0; i < companies.length; i++) {
    cumulativeEmployees[i + 1] = cumulativeEmployees[i]! + companies[i]!.employees;
  }
  const totalEmployees = cumulativeEmployees[companies.length]!;
  const companyByWeightedIndex = (r: Rng): Company => {
    const roll = r() * totalEmployees;
    let lo = 0;
    let hi = companies.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulativeEmployees[mid + 1]! < roll) lo = mid + 1;
      else hi = mid;
    }
    return companies[lo]!;
  };

  const peopleRows: GeneratedRecord[] = [];
  for (let i = 1; i <= counts.people; i++) {
    const company = companyByWeightedIndex(rng);
    const first = pick(rng, FIRST_NAMES);
    const last = pick(rng, LAST_NAMES);
    const name = `${first} ${last}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}@${company.domain}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const title = pickWeighted(rng, TITLE_WEIGHTS);
    const lastActivity = recentTimestamp(rng, 120, 0.6);
    peopleRows.push({
      id: makeId('pe', i),
      objectId: OBJECT_PEOPLE,
      data: {
        name,
        email,
        title,
        company_id: company.id,
        company: company.name,
        last_activity: isoDate(lastActivity),
      },
      createdAt: recentTimestamp(rng, 730),
      updatedAt: lastActivity,
    });
  }

  // Index people by company so deals can link a real contact (correlation, not just random).
  const peopleByCompany = new Map<string, string[]>();
  for (const person of peopleRows) {
    const companyId = person.data['company_id'] as string;
    const bucket = peopleByCompany.get(companyId) ?? [];
    bucket.push(person.data['name'] as string);
    peopleByCompany.set(companyId, bucket);
  }

  // --- deals: stage weights, log-normal value scaled by stage + industry ---
  const dealsRows: GeneratedRecord[] = [];
  for (let i = 1; i <= counts.deals; i++) {
    const company = companyByWeightedIndex(rng);
    const stage = pickWeighted(rng, STAGE_WEIGHTS);
    const industryFactor = INDUSTRY_RPE[company.industry]! / 150_000;
    const value = Math.max(
      1_000,
      Math.round(logNormal(rng, STAGE_MEDIAN[stage]! * industryFactor, 0.8) / 500) * 500,
    );
    const created = recentTimestamp(rng, 540, 0.8);
    const closed = stage === 'Won' || stage === 'Lost';
    const closeDate = closed ? created + intBetween(rng, 21, 150) * 24 * 60 * 60 * 1000 : null;
    const contacts = peopleByCompany.get(company.id);
    const contactName = contacts && contacts.length > 0 ? pick(rng, contacts) : null;
    dealsRows.push({
      id: makeId('de', i),
      objectId: OBJECT_DEALS,
      data: {
        name: `${company.name} — ${pick(rng, DEAL_KINDS)}`,
        stage,
        value,
        company_id: company.id,
        company: company.name,
        owner: pick(rng, OWNERS),
        created: isoDate(created),
        close_date: closeDate === null ? null : isoDate(closeDate),
        primary_contact: contactName,
      },
      createdAt: created,
      updatedAt: recentTimestamp(rng, 90),
    });
  }

  return { companies: companyRows, people: peopleRows, deals: dealsRows };
}
