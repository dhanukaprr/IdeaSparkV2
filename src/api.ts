import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  runTransaction,
  Firestore,
} from 'firebase/firestore';
import { db, fallbackDb, ensureAuth } from './firebase';
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

// Local cache backup for instant load & resilience
function getLocalSession(code: string): Session | null {
  try {
    const raw = localStorage.getItem(`ideaspark_session_${code.toUpperCase()}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveLocalSession(session: Session): void {
  try {
    localStorage.setItem(`ideaspark_session_${session.code.toUpperCase()}`, JSON.stringify(session));
  } catch {}
}

// Default demo session data
export const SAMPLE_SESSION: Session = {
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

// Robust helper to get active database
async function getDocWithFallback(code: string): Promise<{ session: Session | null; activeDb: Firestore }> {
  try {
    const snap = await getDoc(doc(db, 'sessions', code));
    if (snap.exists()) {
      return { session: snap.data() as Session, activeDb: db };
    }
  } catch (err) {
    console.warn('Primary Firestore read note, attempting fallback:', err);
  }

  try {
    const fallbackSnap = await getDoc(doc(fallbackDb, 'sessions', code));
    if (fallbackSnap.exists()) {
      return { session: fallbackSnap.data() as Session, activeDb: fallbackDb };
    }
  } catch (err) {
    console.warn('Fallback Firestore read note:', err);
  }

  return { session: null, activeDb: db };
}

// 1. Fetch Session from Firestore (with automatic seed for demo session)
export async function fetchSession(code: string): Promise<SessionFetchResult> {
  const normalized = (code || '').toUpperCase().trim();
  if (!normalized) {
    throw new Error('Please enter a session code');
  }

  // Non-blocking auth attempt
  ensureAuth().catch(() => {});

  let session: Session | null = null;

  try {
    const { session: cloudSession, activeDb } = await getDocWithFallback(normalized);
    if (cloudSession) {
      session = cloudSession;
      saveLocalSession(session);
    } else if (normalized === 'SPARK') {
      // Auto seed demo session to cloud
      session = { ...SAMPLE_SESSION, createdAt: Date.now() };
      saveLocalSession(session);
      setDoc(doc(activeDb, 'sessions', 'SPARK'), session).catch(console.warn);
    } else {
      // Check local cache if offline
      const local = getLocalSession(normalized);
      if (local) {
        session = local;
      }
    }
  } catch (err) {
    console.warn('Error querying Firestore:', err);
    if (normalized === 'SPARK') {
      session = getLocalSession('SPARK') || { ...SAMPLE_SESSION, createdAt: Date.now() };
    } else {
      const local = getLocalSession(normalized);
      if (local) session = local;
    }
  }

  if (!session) {
    throw new Error(`Session "${normalized}" not found. Please check your session code or create a new session.`);
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
  ensureAuth().catch(() => {});

  let code = generateSessionCode();
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

  saveLocalSession(newSession);
  saveLecturerKey(code, lecturerKey);

  // Write to Firestore (both primary and fallback for safety)
  try {
    await setDoc(doc(db, 'sessions', code), newSession);
  } catch (err) {
    console.warn('Primary Firestore create write note, trying fallback:', err);
    try {
      await setDoc(doc(fallbackDb, 'sessions', code), newSession);
    } catch (e2) {
      console.warn('Fallback Firestore create write note:', e2);
    }
  }

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
  const normalized = (code || '').toUpperCase().trim();
  const newBusiness: Business = {
    id: 'biz_' + Math.random().toString(36).substring(2, 9),
    name: business.name.trim(),
    type: (business.type || 'Product/Service').trim(),
    presenter: (business.presenter || '').trim(),
    description: (business.description || '').trim(),
    isVotingClosed: false,
    createdAt: Date.now(),
  };

  const local = getLocalSession(normalized);
  let updatedSession: Session = local || {
    ...SAMPLE_SESSION,
    code: normalized,
  };

  const businesses = [...(updatedSession.businesses || []), newBusiness];
  const activeBusinessId = updatedSession.activeBusinessId || newBusiness.id;
  updatedSession = { ...updatedSession, businesses, activeBusinessId };
  saveLocalSession(updatedSession);

  // Sync to Firestore
  try {
    await runTransaction(db, async (transaction) => {
      const sessionRef = doc(db, 'sessions', normalized);
      const snap = await transaction.get(sessionRef);
      if (snap.exists()) {
        const sessionData = snap.data() as Session;
        const bList = [...(sessionData.businesses || []), newBusiness];
        const aId = sessionData.activeBusinessId || newBusiness.id;
        transaction.update(sessionRef, { businesses: bList, activeBusinessId: aId });
        updatedSession = { ...sessionData, businesses: bList, activeBusinessId: aId };
      } else {
        transaction.set(sessionRef, updatedSession);
      }
    });
  } catch (err) {
    console.warn('Firestore transaction error, updating directly:', err);
    try {
      await updateDoc(doc(db, 'sessions', normalized), { businesses, activeBusinessId });
    } catch {}
  }

  saveLocalSession(updatedSession);
  return { business: newBusiness, session: sanitizeSession(updatedSession) };
}

// 4. Update Business
export async function updateBusiness(
  code: string,
  businessId: string,
  updates: Partial<Business>,
  _lecturerKey: string
): Promise<{ business: Business; session: SessionPublicState }> {
  const normalized = (code || '').toUpperCase().trim();
  const local = getLocalSession(normalized) || { ...SAMPLE_SESSION, code: normalized };

  let updatedBiz!: Business;
  const businesses = (local.businesses || []).map((b) => {
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

  const updatedSession = { ...local, businesses };
  saveLocalSession(updatedSession);

  try {
    await updateDoc(doc(db, 'sessions', normalized), { businesses });
  } catch (err) {
    console.warn('Firestore updateDoc note:', err);
    try {
      await updateDoc(doc(fallbackDb, 'sessions', normalized), { businesses });
    } catch {}
  }

  return { business: updatedBiz, session: sanitizeSession(updatedSession) };
}

// 5. Delete Business
export async function deleteBusiness(
  code: string,
  businessId: string,
  _lecturerKey: string
): Promise<{ session: SessionPublicState }> {
  const normalized = (code || '').toUpperCase().trim();
  const local = getLocalSession(normalized) || { ...SAMPLE_SESSION, code: normalized };

  const businesses = (local.businesses || []).filter((b) => b.id !== businessId);
  const ideas = (local.ideas || []).filter((i) => i.businessId !== businessId);
  let activeBusinessId = local.activeBusinessId;
  if (activeBusinessId === businessId) {
    activeBusinessId = businesses.length > 0 ? businesses[0].id : undefined;
  }

  const updatedSession = { ...local, businesses, ideas, activeBusinessId };
  saveLocalSession(updatedSession);

  try {
    await updateDoc(doc(db, 'sessions', normalized), {
      businesses,
      ideas,
      activeBusinessId: activeBusinessId || null,
    });
  } catch (err) {
    console.warn('Firestore delete business note:', err);
  }

  return { session: sanitizeSession(updatedSession) };
}

// 6. Reset Business Ideas and Votes
export async function resetBusiness(
  code: string,
  businessId: string,
  _lecturerKey: string
): Promise<{ session: SessionPublicState }> {
  const normalized = (code || '').toUpperCase().trim();
  const local = getLocalSession(normalized) || { ...SAMPLE_SESSION, code: normalized };

  const ideas = (local.ideas || []).filter((i) => i.businessId !== businessId);
  const participantVotes = { ...(local.participantVotes || {}) };
  for (const pId of Object.keys(participantVotes)) {
    if (participantVotes[pId] && participantVotes[pId][businessId]) {
      const nextMap = { ...participantVotes[pId] };
      delete nextMap[businessId];
      participantVotes[pId] = nextMap;
    }
  }

  const updatedSession = { ...local, ideas, participantVotes };
  saveLocalSession(updatedSession);

  try {
    await updateDoc(doc(db, 'sessions', normalized), { ideas, participantVotes });
  } catch (err) {
    console.warn('Firestore reset business note:', err);
  }

  return { session: sanitizeSession(updatedSession) };
}

// 7. Set Active Business
export async function setActiveBusiness(
  code: string,
  businessId: string | null,
  _lecturerKey: string
): Promise<{ activeBusinessId?: string }> {
  const normalized = (code || '').toUpperCase().trim();
  const local = getLocalSession(normalized);
  if (local) {
    local.activeBusinessId = businessId || undefined;
    saveLocalSession(local);
  }

  try {
    await updateDoc(doc(db, 'sessions', normalized), {
      activeBusinessId: businessId || null,
    });
  } catch (err) {
    console.warn('Firestore set active note:', err);
  }

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
  const normalized = (code || '').toUpperCase().trim();
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

  // Optimistic local update
  const local = getLocalSession(normalized) || { ...SAMPLE_SESSION, code: normalized };
  const updatedIdeas = [...(local.ideas || []), newIdea];
  const updatedSession = { ...local, ideas: updatedIdeas };
  saveLocalSession(updatedSession);

  // Firestore transaction / update
  try {
    const sessionRef = doc(db, 'sessions', normalized);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(sessionRef);
      if (snap.exists()) {
        const sessionData = snap.data() as Session;
        const targetBiz = (sessionData.businesses || []).find((b) => b.id === data.businessId);
        if (targetBiz && targetBiz.isVotingClosed) {
          throw new Error('Submissions are closed for this venture');
        }
        const ideas = [...(sessionData.ideas || []), newIdea];
        transaction.update(sessionRef, { ideas });
      } else {
        transaction.set(sessionRef, updatedSession);
      }
    });
  } catch (err: any) {
    if (err.message && err.message.includes('closed')) {
      throw err;
    }
    console.warn('Firestore submit idea fallback write:', err);
    try {
      await updateDoc(doc(db, 'sessions', normalized), { ideas: updatedIdeas });
    } catch {}
  }

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
  const normalized = (code || '').toUpperCase().trim();
  const local = getLocalSession(normalized) || { ...SAMPLE_SESSION, code: normalized };

  const participantVotes = { ...(local.participantVotes || {}) };
  const pVotes = { ...(participantVotes[data.participantId] || {}) };
  const currentVotes = [...(pVotes[data.businessId] || [])];

  const hasVoted = currentVotes.includes(data.ideaId);
  let updatedVotes: string[];
  let nextVotesCount = 0;

  if (hasVoted) {
    updatedVotes = currentVotes.filter((id) => id !== data.ideaId);
  } else {
    if (currentVotes.length >= MAX_VOTES_PER_BUSINESS) {
      throw new Error(
        `You have reached the maximum of ${MAX_VOTES_PER_BUSINESS} votes for this venture. Tap a voted idea to unvote if you wish to change your choice.`
      );
    }
    updatedVotes = [...currentVotes, data.ideaId];
  }

  pVotes[data.businessId] = updatedVotes;
  participantVotes[data.participantId] = pVotes;

  const ideas = (local.ideas || []).map((idea) => {
    if (idea.id === data.ideaId) {
      const delta = hasVoted ? -1 : 1;
      nextVotesCount = Math.max(0, (idea.votesCount || 0) + delta);
      return { ...idea, votesCount: nextVotesCount };
    }
    return idea;
  });

  const updatedSession = { ...local, ideas, participantVotes };
  saveLocalSession(updatedSession);

  // Firestore transaction
  try {
    const sessionRef = doc(db, 'sessions', normalized);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(sessionRef);
      if (snap.exists()) {
        const sessionData = snap.data() as Session;
        const sPVotes = { ...(sessionData.participantVotes || {}) };
        const sP = { ...(sPVotes[data.participantId] || {}) };
        sP[data.businessId] = updatedVotes;
        sPVotes[data.participantId] = sP;

        const sIdeas = (sessionData.ideas || []).map((idea) => {
          if (idea.id === data.ideaId) {
            const delta = hasVoted ? -1 : 1;
            return { ...idea, votesCount: Math.max(0, (idea.votesCount || 0) + delta) };
          }
          return idea;
        });

        transaction.update(sessionRef, { ideas: sIdeas, participantVotes: sPVotes });
      } else {
        transaction.set(sessionRef, updatedSession);
      }
    });
  } catch (err: any) {
    if (err.message && err.message.includes('maximum')) {
      throw err;
    }
    console.warn('Firestore vote update fallback:', err);
    try {
      await updateDoc(doc(db, 'sessions', normalized), { ideas, participantVotes });
    } catch {}
  }

  return {
    success: true,
    hasVoted: !hasVoted,
    votesCount: nextVotesCount,
    myVotesForBusiness: updatedVotes,
    remainingVotes: MAX_VOTES_PER_BUSINESS - updatedVotes.length,
  };
}

// 10. Real-time Subscription to Firestore Session
export function subscribeSessionEvents(
  code: string,
  onUpdate: (data: SessionPublicState) => void,
  _onError?: (err: Error) => void
): () => void {
  const normalized = (code || '').toUpperCase().trim();
  if (!normalized) {
    return () => {};
  }

  let unsubFallback: (() => void) | null = null;

  const handleSnapshot = (snapshot: any) => {
    if (snapshot && snapshot.exists()) {
      const sessionData = snapshot.data() as Session;
      saveLocalSession(sessionData);
      const publicState = sanitizeSession(sessionData);
      onUpdate(publicState);
    } else if (normalized === 'SPARK') {
      // Auto seed demo
      const demo = { ...SAMPLE_SESSION, createdAt: Date.now() };
      saveLocalSession(demo);
      setDoc(doc(db, 'sessions', 'SPARK'), demo).catch(() => {});
      onUpdate(sanitizeSession(demo));
    }
  };

  const unsubPrimary = onSnapshot(
    doc(db, 'sessions', normalized),
    handleSnapshot,
    (err) => {
      console.warn('Primary snapshot listener notice, attaching fallback listener:', err);
      try {
        unsubFallback = onSnapshot(doc(fallbackDb, 'sessions', normalized), handleSnapshot, (e2) => {
          console.warn('Fallback snapshot listener notice:', e2);
        });
      } catch {}
    }
  );

  return () => {
    unsubPrimary();
    if (unsubFallback) unsubFallback();
  };
}
