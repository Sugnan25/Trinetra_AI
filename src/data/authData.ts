import { AgencyType, AgencyThemeConfig, UserSession, UserRole } from '../types';

export const AGENCY_CONFIGS: Record<AgencyType, AgencyThemeConfig> = {
  CBI: {
    name: 'Central Bureau of Investigation',
    code: 'CBI',
    prefix: 'cbi_',
    accentHex: '#1e3a8a',
    borderClass: 'border-blue-700',
    bgClass: 'bg-blue-950/50',
    textClass: 'text-blue-400',
    badgeClass: 'bg-blue-900/60 text-blue-200 border border-blue-700',
    ringClass: 'focus:ring-blue-600',
    tagline: 'Industry, Impartiality, Integrity | Federal Jurisdiction',
  },
  NIA: {
    name: 'National Investigation Agency',
    code: 'NIA',
    prefix: 'nia_',
    accentHex: '#991b1b',
    borderClass: 'border-red-700',
    bgClass: 'bg-red-950/50',
    textClass: 'text-red-400',
    badgeClass: 'bg-red-900/60 text-red-200 border border-red-700',
    ringClass: 'focus:ring-red-600',
    tagline: 'Counter-Terrorism & National Security | UAPA Special Court',
  },
  CID: {
    name: 'State Crime Investigation Department',
    code: 'CID',
    prefix: 'cid_',
    accentHex: '#334155',
    borderClass: 'border-slate-600',
    bgClass: 'bg-slate-900/70',
    textClass: 'text-slate-300',
    badgeClass: 'bg-slate-800 text-slate-200 border border-slate-600',
    ringClass: 'focus:ring-slate-500',
    tagline: 'State Specialized Crime Wing | Multi-District Coordination',
  },
  POLICE: {
    name: 'State Police Department (All States & UTs)',
    code: 'POLICE',
    prefix: 'police_',
    accentHex: '#a16207',
    borderClass: 'border-amber-700',
    bgClass: 'bg-amber-950/40',
    textClass: 'text-amber-400',
    badgeClass: 'bg-amber-900/60 text-amber-200 border border-amber-700',
    ringClass: 'focus:ring-amber-600',
    tagline: 'State Law Enforcement & Station Beat Operations | Applicable to All State Police & UTs',
  },
};

export function resolveAgencyFromGovId(govId: string): AgencyType {
  const clean = govId.trim().toLowerCase();
  if (clean.startsWith('cbi_')) return 'CBI';
  if (clean.startsWith('nia_')) return 'NIA';
  if (clean.startsWith('cid_')) return 'CID';
  return 'POLICE';
}

export const INDIAN_STATES_AND_UTS = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (National Capital Territory)',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export const AGENCY_RANKS: Record<AgencyType, string[]> = {
  POLICE: [
    'Director General of Police (DGP)',
    'Additional Director General of Police (ADGP)',
    'Inspector General of Police (IGP / Joint CP)',
    'Deputy Inspector General of Police (DIG / Addl. CP)',
    'Senior Superintendent of Police (SSP / DCP)',
    'Superintendent of Police (SP / DCP)',
    'Additional Superintendent of Police (Addl. SP / Addl. DCP)',
    'Deputy Superintendent of Police (DySP / ACP)',
    'Police Inspector (PI / Station House Officer)',
    'Assistant Police Inspector (API)',
    'Police Sub-Inspector (PSI)',
    'Assistant Sub-Inspector (ASI)',
    'Head Constable (HC / Station Beat Operative)',
    'Police Constable (PC / Beat Responder)',
  ],
  CID: [
    'Additional Director General of Police (ADGP CID Crime)',
    'Inspector General of Police (IGP CID)',
    'Deputy Inspector General of Police (DIG CID)',
    'Superintendent of Police (SP CID / Crime Branch)',
    'Deputy Superintendent of Police (DySP CID - Homicide & Cyber)',
    'Police Inspector (PI CID - Special Investigation Team)',
    'Police Sub-Inspector (PSI CID Crime)',
    'Senior Cyber Forensics Investigator (CID Cyber Cell)',
    'Assistant Director & Ballistics Expert (CID FSL)',
    'Senior Scientific Officer (Forensic Science Laboratory)',
    'Intelligence & Telecom Intercept Analyst (CID)',
  ],
  CBI: [
    'Director (CBI)',
    'Special Director / Additional Director (CBI)',
    'Joint Director (CBI / Zone Head)',
    'Deputy Inspector General of Police (DIG CBI)',
    'Senior Superintendent of Police (SSP CBI)',
    'Superintendent of Police (SP CBI / Head of Branch)',
    'Additional Superintendent of Police (Addl. SP CBI)',
    'Deputy Superintendent of Police (DySP CBI / Investigating Officer)',
    'Inspector of Police (CBI IO)',
    'Sub-Inspector of Police (SI CBI)',
    'Senior Public Prosecutor / Special Legal Advisor',
    'Cyber & Technical Intelligence Officer (CBI Cyber Crime Division)',
  ],
  NIA: [
    'Director General (DG NIA)',
    'Additional Director General (ADG NIA)',
    'Inspector General (IG NIA / Operations)',
    'Deputy Inspector General (DIG NIA / Counter-Terrorism)',
    'Superintendent of Police (SP NIA / Field Division)',
    'Additional Superintendent of Police (Addl. SP NIA)',
    'Deputy Superintendent of Police (DySP NIA / Senior IO)',
    'Inspector (NIA Investigating Officer)',
    'Sub-Inspector (SI NIA / Operative)',
    'Specialist Counter-Terror Financing Analyst (TFFC)',
    'Ballistics & Explosives Forensics Specialist (IED Cell)',
  ],
};

export const PRESET_OFFICERS: Array<{
  govId: string;
  name: string;
  agency: AgencyType;
  role: UserRole;
  rank: string;
  badge: string;
  departmentName: string;
  desc: string;
}> = [];
