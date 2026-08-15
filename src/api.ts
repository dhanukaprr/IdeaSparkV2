import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db, ensureAuth } from './firebase';
import {
  Business,
  Idea,
  IdeaCategory,
  MAX_IDEA_LENGTH,
  MAX_VOTES_PER_BUSINESS,
  Session,
  SessionPublicState,
} from './types';

const PARTICIPANT_KEY = 'ideaspark_participant_id';

export function getParticipantId(): string {
  let id = localStorage.getItem(PARTICIPANT_KEY);
  if (!id) {
    id = 'p_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem(PARTICIPANT_KEY, id);
  }
  return id;
}

export function getLecturerKey(code: string): string | null {
  const normalized = (code || '').toUpperCase();
  const saved = localStorage.getItem(`ideaspark_lec_${normalized}`);
  if (!saved && normalized === 'SPARK') {
    return 'lec_demo_spark';
  }
  return saved;
}

export function saveLecturerKey(code: string, key: string): void {
  localStorage.setItem(`ideaspark_lec_${code.toUpperCase()}`, key);
}

export function clearLecturerKey(code: string): void {
  localStorage.removeItem(`ideaspark_lec_${code.toUpperCase()}`);
}

export interface SessionFetchResult extends SessionPublicState {
  isLecturer?: boolean;
  myVotes?: Record<string, string[]>;
}

// Default demo session data
const SAMPLE_SESSION: Session = {
  code: 'SPARK',
  title: 'EBM Creativity & Innovation Live Pitch Session',
  cohort: 'Higher Diploma Batch 2026',
  createdAt: Date.now(),
  businesses: [
    {
      id: 'biz_1',
      name: 'EcoSip Smart Bottles',
      type: 'Sustainable Consumer Tech',
      presenter: 'Samantha Silva',
      description: 'Self-cleaning insulated hydration bottle with micro-filtration and hydration tracking app.',
      isVotingClosed: false,
      createdAt: Date.now() - 3600000,
    },
    {
      id: 'biz_2',
      name: 'ArtisanRoast Direct',
      type: 'Subscription Specialty Coffee',
      presenter: 'Kavindu Perera',
      description: 'Single-origin highland coffee beans delivered fresh within 48 hours of micro-batch roasting.',
      isVotingClosed: false,
      createdAt: Date.now() - 3500000,
    },
    {
      id: 'biz_3',
      name: 'FitPulse On-Demand Gyms',
      type: 'Fitness & Wellness Space',
      presenter: 'Nadeesha Fernando',
      description: 'Private 24/7 micro-gym pods bookable via smartphone for solo workouts with virtual trainers.',
      isVotingClosed: false,
      createdAt: Date.now() - 3400000,
    },
  ],
  ideas: [
    {
      id: 'idea_1',
      businessId: 'biz_1',
      text: 'Add a built-in fruit infuser compartment that clips seamlessly into the filter base.',
      category: 'Product/Service',
      createdAt: Date.now() - 2500000,
      votesCount: 7,
    },
    {
      id: 'idea_2',
      businessId: 'biz_1',
      text: 'Partner with universities & gyms for customized branded campus editions with refill discounts.',
      category: 'Marketing',
      createdAt: Date.now() - 2200000,
      votesCount: 9,
    },
    {
      id: 'idea_3',
      businessId: 'biz_1',
      text: 'Gamify daily hydration goals with AR badges and tree-planting donations for water streaks.',
      category: 'Customer Experience',
      createdAt: Date.now() - 1900000,
      votesCount: 12,
    },
    {
      id: 'idea_4',
      businessId: 'biz_2',
      text: 'Include a tasting passport card with flavor wheels and QR video notes from the local coffee farmers.',
      category: 'Customer Experience',
      createdAt: Date.now() - 1500000,
      votesCount: 11,
    },
    {
      id: 'idea_5',
      businessId: 'biz_2',
      text: 'Office B2B subscription tier offering automatic bean refills plus monthly barista masterclasses.',
      category: 'Business Model',
      createdAt: Date.now() - 1200000,
      votesCount: 8,
    },
    {
      id: 'idea_6',
      businessId: 'biz_3',
      text: 'Smart mirror with AI posture analysis that provides real-time form correction during lifts.',
      category: 'Technology',
      createdAt: Date.now() - 900000,
      votesCount: 14,
    },
    {
      id: 'idea_7',
      businessId: 'biz_3',
      text: 'Automated ultra-violet (UV-C) sanitization cycle running 90 seconds between guest bookings.',
      category: 'Process',
      createdAt: Date.now() - 600000,
      votesCount: 15,
    },
  ],
  activeBusinessId: 'biz_1',
  lecturerKey: 'lec_demo_spark',
  participantVotes: {},
};

function sanitizeSession(session: Session): SessionPublicState {
  let totalVotes = 0;
  for (const idea of session.ideas || []) {
    totalVotes += idea.votesCount || 0;
  }
  const participantCount = session.participantVotes ? Object.keys(session.participantVotes).length : 0;

  return {
    code: session.code,
    title: session.title,
    cohort: session.cohort,
    createdAt: session.createdAt,
    businesses: session.businesses || [],
    ideas: session.ideas || [],
    activeBusinessId: session.activeBusinessId,
    totalParticipants: participantCount,
    totalVotes,
  };
}

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateLecturerKey(): string {
  return 'lec_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

// 1. Fetch Session from Firestore (with automatic seed for demo session)
export async function fetchSession(code: string): Promise<SessionFetchResult> {
  await ensureAuth();
  const normalized = (code || '').toUpperCase().trim();
  if (!normalized) {
    throw new Error('Please provide a valid session code');
  }

  const sessionRef = doc(db, 'sessions', normalized);
  const snap = await getDoc(sessionRef);

  let session: Session;
  if (!snap.exists()) {
    if (normalized === 'SPARK') {
      // Auto seed demo session
      session = { ...SAMPLE_SESSION, createdAt: Date.now() };
      await setDoc(sessionRef, session);
    } else {
      throw new Error(`Session "${normalized}" not found. Please check your session code or create a new session.`);
    }
  } else {
    session = snap.data() as Session;
  }

  const lecturerKey = getLecturerKey(normalized);
  const isLecturer =
    (lecturerKey && lecturerKey === session.lecturerKey) ||
    (normalized === 'SPARK' && (!lecturerKey || lecturerKey === 'lec_demo_spark' || lecturerKey === session.lecturerKey));

  const participantId = getParticipantId();
  let myVotes: Record<string, string[]> = {};
  if (participantId && session.participantVotes && session.participantVotes[participantId]) {
    myVotes = session.participantVotes[participantId];
  }

  return {
    ...sanitizeSession(session),
    isLecturer: Boolean(isLecturer),
    myVotes,
  };
}

// 2. Create New Classroom Session in Firestore
export async function createSession(data: {
  title: string;
  cohort?: string;
  initialBusinesses?: { name: string; type?: string; presenter?: string; description?: string }[];
}): Promise<{ code: string; lecturerKey: string; session: SessionPublicState }> {
  await ensureAuth();

  // Find unused unique 4-character code
  let code = generateSessionCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await getDoc(doc(db, 'sessions', code));
    if (!existing.exists()) break;
    code = generateSessionCode();
    attempts++;
  }

  const lecturerKey = generateLecturerKey();

  const businesses: Business[] = [];
  if (Array.isArray(data.initialBusinesses)) {
    for (const b of data.initialBusinesses) {
      if (b.name && b.name.trim()) {
        businesses.push({
          id: 'biz_' + Math.random().toString(36).substring(2, 9),
          name: b.name.trim(),
          type: (b.type || 'Product/Service').trim(),
          presenter: (b.presenter || '').trim(),
          description: (b.description || '').trim(),
          isVotingClosed: false,
          createdAt: Date.now(),
        });
      }
    }
  }

  const newSession: Session = {
    code,
    title: (data.title || 'Classroom Creativity & Innovation Session').trim(),
    cohort: (data.cohort || '').trim(),
    createdAt: Date.now(),
    businesses,
    ideas: [],
    activeBusinessId: businesses.length > 0 ? businesses[0].id : undefined,
    lecturerKey,
    participantVotes: {},
  };

  const sessionRef = doc(db, 'sessions', code);
  await setDoc(sessionRef, newSession);

  saveLecturerKey(code, lecturerKey);

  return {
    code,
    lecturerKey,
    session: sanitizeSession(newSession),
  };
}

// 3. Add Business to Session
export async function addBusiness(
  code: string,
  business: { name: string; type?: string; presenter?: string; description?: string },
  lecturerKey: string
): Promise<{ business: Business; session: SessionPublicState }> {
  await ensureAuth();
  const normalized = (code || '').toUpperCase().trim();
  const sessionRef = doc(db, 'sessions', normalized);

  const newBusiness: Business = {
    id: 'biz_' + Math.random().toString(36).substring(2, 9),
    name: business.name.trim(),
    type: (business.type || 'Product/Service').trim(),
    presenter: (business.presenter || '').trim(),
    description: (business.description || '').trim(),
    isVotingClosed: false,
    createdAt: Date.now(),
  };

  let updatedSession!: Session;

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(sessionRef);
    if (!snap.exists()) {
      throw new Error('Session not found');
    }
    const sessionData = snap.data() as Session;
    if (sessionData.lecturerKey && sessionData.lecturerKey !== lecturerKey && normalized !== 'SPARK') {
      throw new Error('Unauthorized: Invalid lecturer key');
    }

    const businesses = [...(sessionData.businesses || []), newBusiness];
    const activeBusinessId = sessionData.activeBusinessId || newBusiness.id;

    transaction.update(sessionRef, {
      businesses,
      activeBusinessId,
    });

    updatedSession = {
      ...sessionData,
      businesses,
      activeBusinessId,
    };
  });

  return { business: newBusiness, session: sanitizeSession(updatedSession) };
}

// 4. Update Business
export async function updateBusiness(
  code: string,
  businessId: string,
  updates: Partial<Business>,
  lecturerKey: string
): Promise<{ business: Business; session: SessionPublicState }> {
  await ensureAuth();
  const normalized = (code || '').toUpperCase().trim();
  const sessionRef = doc(db, 'sessions', normalized);

  let updatedBiz!: Business;
  let updatedSession!: Session;

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(sessionRef);
    if (!snap.exists()) {
      throw new Error('Session not found');
    }
    const sessionData = snap.data() as Session;
    if (sessionData.lecturerKey && sessionData.lecturerKey !== lecturerKey && normalized !== 'SPARK') {
      throw new Error('Unauthorized: Invalid lecturer key');
    }

    const businesses = (sessionData.businesses || []).map((b) => {
      if (b.id === businessId) {
        updatedBiz = {
          ...b,
          ...updates,
          name: updates.name !== undefined ? updates.name.trim() : b.name,
          type: updates.type !== undefined ? updates.type.trim() : b.type,
          presenter: updates.presenter !== undefined ? updates.presenter.trim() : b.presenter,
          description: updates.description !== undefined ? updates.description.trim() : b.description,
          isVotingClosed: updates.isVotingClosed !== undefined ? Boolean(updates.isVotingClosed) : b.isVotingClosed,
        };
        return updatedBiz;
      }
      return b;
    });

    transaction.update(sessionRef, { businesses });

    updatedSession = {
      ...sessionData,
      businesses,
    };
  });

  return { business: updatedBiz, session: sanitizeSession(updatedSession) };
}

// 5. Delete Business
export async function deleteBusiness(
  code: string,
  businessId: string,
  lecturerKey: string
): Promise<{ session: SessionPublicState }> {
  await ensureAuth();
  const normalized = (code || '').toUpperCase().trim();
  const sessionRef = doc(db, 'sessions', normalized);

  let updatedSession!: Session;

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(sessionRef);
    if (!snap.exists()) {
      throw new Error('Session not found');
    }
    const sessionData = snap.data() as Session;
    if (sessionData.lecturerKey && sessionData.lecturerKey !== lecturerKey && normalized !== 'SPARK') {
      throw new Error('Unauthorized: Invalid lecturer key');
    }

    const businesses = (sessionData.businesses || []).filter((b) => b.id !== businessId);
    const ideas = (sessionData.ideas || []).filter((i) => i.businessId !== businessId);

    const participantVotes = { ...(sessionData.participantVotes || {}) };
    for (const pId of Object.keys(participantVotes)) {
      if (participantVotes[pId] && participantVotes[pId][businessId]) {
        const nextMap = { ...participantVotes[pId] };
        delete nextMap[businessId];
        participantVotes[pId] = nextMap;
      }
    }

    let activeBusinessId = sessionData.activeBusinessId;
    if (activeBusinessId === businessId) {
      activeBusinessId = businesses.length > 0 ? businesses[0].id : undefined;
    }

    transaction.update(sessionRef, {
      businesses,
      ideas,
      participantVotes,
      activeBusinessId: activeBusinessId || null,
    });

    updatedSession = {
      ...sessionData,
      businesses,
      ideas,
      participantVotes,
      activeBusinessId,
    };
  });

  return { session: sanitizeSession(updatedSession) };
}

// 6. Reset Business Ideas and Votes
export async function resetBusiness(
  code: string,
  businessId: string,
  lecturerKey: string
): Promise<{ session: SessionPublicState }> {
  await ensureAuth();
  const normalized = (code || '').toUpperCase().trim();
  const sessionRef = doc(db, 'sessions', normalized);

  let updatedSession!: Session;

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(sessionRef);
    if (!snap.exists()) {
      throw new Error('Session not found');
    }
    const sessionData = snap.data() as Session;
    if (sessionData.lecturerKey && sessionData.lecturerKey !== lecturerKey && normalized !== 'SPARK') {
      throw new Error('Unauthorized: Invalid lecturer key');
    }

    const ideas = (sessionData.ideas || []).filter((i) => i.businessId !== businessId);

    const participantVotes = { ...(sessionData.participantVotes || {}) };
    for (const pId of Object.keys(participantVotes)) {
      if (participantVotes[pId] && participantVotes[pId][businessId]) {
        const nextMap = { ...participantVotes[pId] };
        delete nextMap[businessId];
        participantVotes[pId] = nextMap;
      }
    }

    transaction.update(sessionRef, {
      ideas,
      participantVotes,
    });

    updatedSession = {
      ...sessionData,
      ideas,
      participantVotes,
    };
  });

  return { session: sanitizeSession(updatedSession) };
}

// 7. Set Active Business
export async function setActiveBusiness(
  code: string,
  businessId: string | null,
  lecturerKey: string
): Promise<{ activeBusinessId?: string }> {
  await ensureAuth();
  const normalized = (code || '').toUpperCase().trim();
  const sessionRef = doc(db, 'sessions', normalized);

  await updateDoc(sessionRef, {
    activeBusinessId: businessId || null,
  });

  return { activeBusinessId: businessId || undefined };
}

// 8. Submit Idea
export async function submitIdea(
  code: string,
  data: {
    businessId: string;
    text: string;
    category: IdeaCategory;
    participantId: string;
  }
) {
  await ensureAuth();
  const normalized = (code || '').toUpperCase().trim();
  const sessionRef = doc(db, 'sessions', normalized);

  const cleanText = (data.text || '').trim();
  if (cleanText.length < 3) {
    throw new Error('Idea must be at least 3 characters long.');
  }
  if (cleanText.length > MAX_IDEA_LENGTH) {
    throw new Error(`Idea cannot exceed ${MAX_IDEA_LENGTH} characters.`);
  }

  const newIdea: Idea = {
    id: 'idea_' + Math.random().toString(36).substring(2, 9),
    businessId: data.businessId,
    text: cleanText,
    category: data.category,
    createdAt: Date.now(),
    votesCount: 0,
  };

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(sessionRef);
    if (!snap.exists()) {
      throw new Error('Session not found');
    }
    const sessionData = snap.data() as Session;

    const targetBiz = (sessionData.businesses || []).find((b) => b.id === data.businessId);
    if (!targetBiz) {
      throw new Error('Venture not found');
    }
    if (targetBiz.isVotingClosed) {
      throw new Error('Submissions are closed for this venture');
    }

    const ideas = [...(sessionData.ideas || []), newIdea];

    const participantVotes = { ...(sessionData.participantVotes || {}) };
    if (data.participantId && !participantVotes[data.participantId]) {
      participantVotes[data.participantId] = {};
    }

    transaction.update(sessionRef, {
      ideas,
      participantVotes,
    });
  });

  return { success: true, idea: newIdea };
}

// 9. Toggle Vote (Max 3 per venture, 1 per idea)
export async function toggleVote(
  code: string,
  data: {
    businessId: string;
    ideaId: string;
    participantId: string;
  }
) {
  await ensureAuth();
  const normalized = (code || '').toUpperCase().trim();
  const sessionRef = doc(db, 'sessions', normalized);

  let resultInfo = {
    hasVoted: false,
    votesCount: 0,
    myVotesForBusiness: [] as string[],
    remainingVotes: MAX_VOTES_PER_BUSINESS,
  };

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(sessionRef);
    if (!snap.exists()) {
      throw new Error('Session not found');
    }
    const sessionData = snap.data() as Session;

    const targetBiz = (sessionData.businesses || []).find((b) => b.id === data.businessId);
    if (!targetBiz) {
      throw new Error('Venture not found');
    }
    if (targetBiz.isVotingClosed) {
      throw new Error('Voting is closed for this venture');
    }

    const participantVotes = { ...(sessionData.participantVotes || {}) };
    const pVotes = { ...(participantVotes[data.participantId] || {}) };
    const currentVotes = [...(pVotes[data.businessId] || [])];

    const hasVoted = currentVotes.includes(data.ideaId);

    let updatedVotes: string[];
    let nextVotesCount = 0;

    if (hasVoted) {
      // Unvote
      updatedVotes = currentVotes.filter((id) => id !== data.ideaId);
    } else {
      // Vote
      if (currentVotes.length >= MAX_VOTES_PER_BUSINESS) {
        throw new Error(
          `You have reached the maximum of ${MAX_VOTES_PER_BUSINESS} votes for ${targetBiz.name}. Tap a voted idea to unvote if you wish to change your choice.`
        );
      }
      updatedVotes = [...currentVotes, data.ideaId];
    }

    pVotes[data.businessId] = updatedVotes;
    participantVotes[data.participantId] = pVotes;

    const ideas = (sessionData.ideas || []).map((idea) => {
      if (idea.id === data.ideaId) {
        const delta = hasVoted ? -1 : 1;
        nextVotesCount = Math.max(0, (idea.votesCount || 0) + delta);
        return {
          ...idea,
          votesCount: nextVotesCount,
        };
      }
      return idea;
    });

    transaction.update(sessionRef, {
      ideas,
      participantVotes,
    });

    resultInfo = {
      hasVoted: !hasVoted,
      votesCount: nextVotesCount,
      myVotesForBusiness: updatedVotes,
      remainingVotes: MAX_VOTES_PER_BUSINESS - updatedVotes.length,
    };
  });

  return { success: true, ...resultInfo };
}

// 10. Real-time Subscription to Firestore Session
export function subscribeSessionEvents(
  code: string,
  onUpdate: (data: SessionPublicState) => void,
  onError?: (err: Error) => void
): () => void {
  const normalized = (code || '').toUpperCase().trim();
  if (!normalized) {
    return () => {};
  }

  const sessionRef = doc(db, 'sessions', normalized);

  const unsubscribe = onSnapshot(
    sessionRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const sessionData = snapshot.data() as Session;
        const publicState = sanitizeSession(sessionData);
        onUpdate(publicState);
      }
    },
    (error) => {
      console.error('Firestore real-time subscription error:', error);
      if (onError) {
        onError(error);
      }
    }
  );

  return unsubscribe;
}
