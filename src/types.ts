export type IdeaCategory =
  | 'Product/Service'
  | 'Customer Experience'
  | 'Marketing'
  | 'Process'
  | 'Technology'
  | 'Business Model';

export interface CategoryInfo {
  name: IdeaCategory;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cardAccent: string;
  hex: string;
  gradient: string;
  pillBg: string;
  activeChip: string;
  iconName: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    name: 'Product/Service',
    description: 'Features, quality, usability, packaging, value proposition',
    badgeBg: 'bg-blue-100 text-blue-900 border-blue-300',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-300',
    cardAccent: 'border-l-4 border-l-blue-500',
    hex: '#3B82F6',
    gradient: 'from-blue-500 to-cyan-500',
    pillBg: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300',
    activeChip: 'bg-blue-600 text-white border-blue-700 shadow-[2px_2px_0px_#1E40AF]',
    iconName: 'Package',
  },
  {
    name: 'Customer Experience',
    description: 'Onboarding, service, support, user journey, delight factors',
    badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-300',
    cardAccent: 'border-l-4 border-l-amber-500',
    hex: '#F59E0B',
    gradient: 'from-amber-500 to-orange-500',
    pillBg: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300',
    activeChip: 'bg-amber-500 text-slate-950 border-amber-600 shadow-[2px_2px_0px_#B45309]',
    iconName: 'Sparkles',
  },
  {
    name: 'Marketing',
    description: 'Brand positioning, outreach, channels, storytelling, PR',
    badgeBg: 'bg-rose-100 text-rose-900 border-rose-300',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-300',
    cardAccent: 'border-l-4 border-l-rose-500',
    hex: '#F43F5E',
    gradient: 'from-rose-500 to-pink-500',
    pillBg: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-300',
    activeChip: 'bg-rose-500 text-white border-rose-600 shadow-[2px_2px_0px_#BE123C]',
    iconName: 'Megaphone',
  },
  {
    name: 'Process',
    description: 'Speed, efficiency, supply chain, delivery, operations',
    badgeBg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-300',
    cardAccent: 'border-l-4 border-l-indigo-500',
    hex: '#6366F1',
    gradient: 'from-indigo-500 to-blue-600',
    pillBg: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-300',
    activeChip: 'bg-indigo-600 text-white border-indigo-700 shadow-[2px_2px_0px_#4338CA]',
    iconName: 'Cpu',
  },
  {
    name: 'Technology',
    description: 'Digital tools, automation, AI, mobile, integrations',
    badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-300',
    cardAccent: 'border-l-4 border-l-purple-500',
    hex: '#A855F7',
    gradient: 'from-purple-500 to-fuchsia-500',
    pillBg: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300',
    activeChip: 'bg-purple-600 text-white border-purple-700 shadow-[2px_2px_0px_#7E22CE]',
    iconName: 'Laptop',
  },
  {
    name: 'Business Model',
    description: 'Pricing, monetization, partnerships, scaling, revenue streams',
    badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-300',
    cardAccent: 'border-l-4 border-l-emerald-500',
    hex: '#10B981',
    gradient: 'from-emerald-500 to-teal-500',
    pillBg: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300',
    activeChip: 'bg-emerald-600 text-white border-emerald-700 shadow-[2px_2px_0px_#047857]',
    iconName: 'TrendingUp',
  },
];

export interface Idea {
  id: string;
  businessId: string;
  text: string;
  category: IdeaCategory;
  createdAt: number;
  votesCount: number;
}

export interface Business {
  id: string;
  name: string;
  type: string;
  presenter?: string;
  description?: string;
  isVotingClosed?: boolean;
  createdAt: number;
}

export interface Session {
  code: string;
  title: string;
  cohort?: string;
  createdAt: number;
  businesses: Business[];
  ideas: Idea[];
  activeBusinessId?: string;
  lecturerKey?: string; // only stored server-side / in lecturer browser
  // Map of participantId -> { [businessId]: string[] (list of ideaIds voted for) }
  participantVotes?: Record<string, Record<string, string[]>>;
}

export interface SessionPublicState {
  code: string;
  title: string;
  cohort?: string;
  createdAt: number;
  businesses: Business[];
  ideas: Idea[];
  activeBusinessId?: string;
  totalParticipants?: number;
  totalVotes?: number;
}

export const MAX_VOTES_PER_BUSINESS = 3;
export const MAX_IDEA_LENGTH = 320;
