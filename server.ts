import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { Business, Idea, IdeaCategory, MAX_IDEA_LENGTH, MAX_VOTES_PER_BUSINESS, Session, SessionPublicState } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory Session Database
const sessions = new Map<string, Session>();
// Active SSE clients mapped by session code: sessionCode -> Set of Express Response objects
const sseClients = new Map<string, Set<Response>>();

// Helper: generate 4-character clean alphanumeric session code
function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // If collision, retry
  if (sessions.has(code)) {
    return generateSessionCode();
  }
  return code;
}

// Helper: generate lecturer secret key
function generateLecturerKey(): string {
  return 'lec_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

// Helper: broadcast update to all SSE clients of a session
function broadcastSession(code: string) {
  const clients = sseClients.get(code);
  if (!clients || clients.size === 0) return;

  const session = sessions.get(code);
  if (!session) return;

  const publicData = sanitizeSession(session);
  const payload = `data: ${JSON.stringify(publicData)}\n\n`;

  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

// Helper: create public sanitized state
function sanitizeSession(session: Session): SessionPublicState {
  let totalVotes = 0;
  for (const idea of session.ideas) {
    totalVotes += idea.votesCount;
  }
  const participantCount = session.participantVotes ? Object.keys(session.participantVotes).length : 0;

  return {
    code: session.code,
    title: session.title,
    cohort: session.cohort,
    createdAt: session.createdAt,
    businesses: session.businesses,
    ideas: session.ideas,
    activeBusinessId: session.activeBusinessId,
    totalParticipants: participantCount,
    totalVotes,
  };
}

// Seed initial sample session for instant preview/testing if empty
function seedSampleSession() {
  const sampleCode = 'SPARK';
  const sampleSession: Session = {
    code: sampleCode,
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
      }
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
      }
    ],
    activeBusinessId: 'biz_1',
    lecturerKey: 'lec_demo_spark',
    participantVotes: {},
  };

  sessions.set(sampleCode, sampleSession);
}

seedSampleSession();

// ==========================================
// API ROUTES
// ==========================================

// 1. Create Session (Lecturer)
app.post('/api/sessions', (req: Request, res: Response) => {
  const { title, cohort, initialBusinesses } = req.body;
  const code = generateSessionCode();
  const lecturerKey = generateLecturerKey();

  const businesses: Business[] = [];
  if (Array.isArray(initialBusinesses)) {
    for (const b of initialBusinesses) {
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
    title: (title || 'Classroom Creativity & Innovation Session').trim(),
    cohort: (cohort || '').trim(),
    createdAt: Date.now(),
    businesses,
    ideas: [],
    activeBusinessId: businesses.length > 0 ? businesses[0].id : undefined,
    lecturerKey,
    participantVotes: {},
  };

  sessions.set(code, newSession);

  res.json({
    success: true,
    code,
    lecturerKey,
    session: sanitizeSession(newSession),
  });
});

// 2. Get Session State (Public / Student / Projector)
app.get('/api/sessions/:code', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const session = sessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'Session not found. Please check your session code.' });
    return;
  }

  const lecturerKeyHeader = req.headers['x-lecturer-key'];
  const isLecturer = lecturerKeyHeader && lecturerKeyHeader === session.lecturerKey;

  const participantId = (req.headers['x-participant-id'] as string) || '';
  let myVotesByBusiness: Record<string, string[]> = {};

  if (participantId && session.participantVotes && session.participantVotes[participantId]) {
    myVotesByBusiness = session.participantVotes[participantId];
  }

  res.json({
    ...sanitizeSession(session),
    isLecturer: Boolean(isLecturer),
    myVotes: myVotesByBusiness,
  });
});

// Helper: check if request is from authorized lecturer
function isAuthorizedLecturer(session: Session, req: Request): boolean {
  const lecturerKey = req.headers['x-lecturer-key'] as string | undefined;
  if (!session.lecturerKey) return true;
  // For demo SPARK session, allow default demo key or open access
  if (session.code === 'SPARK') {
    if (!lecturerKey || lecturerKey === 'lec_demo_spark' || lecturerKey === session.lecturerKey) {
      return true;
    }
  }
  return Boolean(lecturerKey && lecturerKey === session.lecturerKey);
}

// 3. Verify Lecturer Key
app.post('/api/sessions/:code/auth-lecturer', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const { lecturerKey } = req.body;
  const session = sessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }

  if (session.code === 'SPARK' && (!lecturerKey || lecturerKey === 'lec_demo_spark')) {
    res.json({ success: true, authorized: true });
    return;
  }

  if (session.lecturerKey !== lecturerKey) {
    res.status(403).json({ error: 'Invalid lecturer credentials.' });
    return;
  }

  res.json({ success: true, authorized: true });
});

// 4. Add Business (Lecturer)
app.post('/api/sessions/:code/businesses', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const session = sessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }
  if (!isAuthorizedLecturer(session, req)) {
    res.status(403).json({ error: 'Unauthorized: Lecturer key required.' });
    return;
  }

  const { name, type, presenter, description } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Business name is required.' });
    return;
  }

  const newBusiness: Business = {
    id: 'biz_' + Math.random().toString(36).substring(2, 9),
    name: name.trim(),
    type: (type || 'Product/Service').trim(),
    presenter: (presenter || '').trim(),
    description: (description || '').trim(),
    isVotingClosed: false,
    createdAt: Date.now(),
  };

  session.businesses.push(newBusiness);
  if (!session.activeBusinessId) {
    session.activeBusinessId = newBusiness.id;
  }

  broadcastSession(code);
  res.json({ success: true, business: newBusiness, session: sanitizeSession(session) });
});

// 5. Update Business (Lecturer: edit info or close/open voting)
app.put('/api/sessions/:code/businesses/:businessId', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const businessId = req.params.businessId;
  const session = sessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }
  if (!isAuthorizedLecturer(session, req)) {
    res.status(403).json({ error: 'Unauthorized: Lecturer key required.' });
    return;
  }

  const business = session.businesses.find((b) => b.id === businessId);
  if (!business) {
    res.status(404).json({ error: 'Business not found.' });
    return;
  }

  const { name, type, presenter, description, isVotingClosed } = req.body;
  if (name !== undefined) business.name = name.trim();
  if (type !== undefined) business.type = type.trim();
  if (presenter !== undefined) business.presenter = presenter.trim();
  if (description !== undefined) business.description = description.trim();
  if (isVotingClosed !== undefined) business.isVotingClosed = Boolean(isVotingClosed);

  broadcastSession(code);
  res.json({ success: true, business, session: sanitizeSession(session) });
});

// 6. Delete Business (Lecturer)
app.delete('/api/sessions/:code/businesses/:businessId', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const businessId = req.params.businessId;
  const session = sessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }
  if (!isAuthorizedLecturer(session, req)) {
    res.status(403).json({ error: 'Unauthorized: Lecturer key required.' });
    return;
  }

  const existingBiz = session.businesses.find((b) => b.id === businessId);
  if (!existingBiz) {
    res.status(404).json({ error: 'Business not found.' });
    return;
  }

  session.businesses = session.businesses.filter((b) => b.id !== businessId);
  session.ideas = session.ideas.filter((i) => i.businessId !== businessId);

  // Clean participant votes for this business safely
  if (session.participantVotes && typeof session.participantVotes === 'object') {
    for (const pId of Object.keys(session.participantVotes)) {
      if (session.participantVotes[pId] && typeof session.participantVotes[pId] === 'object') {
        delete session.participantVotes[pId][businessId];
      }
    }
  }

  if (session.activeBusinessId === businessId) {
    session.activeBusinessId = session.businesses.length > 0 ? session.businesses[0].id : undefined;
  }

  broadcastSession(code);
  res.json({ success: true, session: sanitizeSession(session) });
});

// 7. Reset Business Ideas & Votes (Lecturer)
app.post('/api/sessions/:code/businesses/:businessId/reset', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const businessId = req.params.businessId;
  const session = sessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }
  if (!isAuthorizedLecturer(session, req)) {
    res.status(403).json({ error: 'Unauthorized: Lecturer key required.' });
    return;
  }

  const existingBiz = session.businesses.find((b) => b.id === businessId);
  if (!existingBiz) {
    res.status(404).json({ error: 'Business not found.' });
    return;
  }

  session.ideas = session.ideas.filter((i) => i.businessId !== businessId);

  if (session.participantVotes && typeof session.participantVotes === 'object') {
    for (const pId of Object.keys(session.participantVotes)) {
      if (session.participantVotes[pId] && typeof session.participantVotes[pId] === 'object') {
        delete session.participantVotes[pId][businessId];
      }
    }
  }

  broadcastSession(code);
  res.json({ success: true, session: sanitizeSession(session) });
});

// 8. Set Active Business for Room Focus (Lecturer)
app.post('/api/sessions/:code/active-business', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const session = sessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }
  if (!isAuthorizedLecturer(session, req)) {
    res.status(403).json({ error: 'Unauthorized: Lecturer key required.' });
    return;
  }

  const { businessId } = req.body;
  if (businessId && !session.businesses.some((b) => b.id === businessId)) {
    res.status(400).json({ error: 'Invalid business ID.' });
    return;
  }

  session.activeBusinessId = businessId || undefined;
  broadcastSession(code);
  res.json({ success: true, activeBusinessId: session.activeBusinessId });
});

// 9. Submit Anonymous Idea (Student)
app.post('/api/sessions/:code/ideas', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const session = sessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }

  const { businessId, text, category, participantId } = req.body;

  if (!businessId || !session.businesses.some((b) => b.id === businessId)) {
    res.status(400).json({ error: 'Please select a valid business.' });
    return;
  }

  const targetBusiness = session.businesses.find((b) => b.id === businessId);
  if (targetBusiness?.isVotingClosed) {
    res.status(400).json({ error: 'Submissions are currently closed for this business.' });
    return;
  }

  const cleanText = (text || '').trim();
  if (cleanText.length < 3) {
    res.status(400).json({ error: 'Idea must be at least 3 characters long.' });
    return;
  }
  if (cleanText.length > MAX_IDEA_LENGTH) {
    res.status(400).json({ error: `Idea cannot exceed ${MAX_IDEA_LENGTH} characters.` });
    return;
  }

  const validCategories: IdeaCategory[] = [
    'Product/Service',
    'Customer Experience',
    'Marketing',
    'Process',
    'Technology',
    'Business Model',
  ];

  if (!validCategories.includes(category)) {
    res.status(400).json({ error: 'Invalid category selection.' });
    return;
  }

  const newIdea: Idea = {
    id: 'idea_' + Math.random().toString(36).substring(2, 9),
    businessId,
    text: cleanText,
    category,
    createdAt: Date.now(),
    votesCount: 0,
  };

  session.ideas.push(newIdea);

  // Track participant presence
  if (participantId) {
    if (!session.participantVotes) session.participantVotes = {};
    if (!session.participantVotes[participantId]) {
      session.participantVotes[participantId] = {};
    }
  }

  broadcastSession(code);
  res.json({ success: true, idea: newIdea });
});

// 10. Toggle Vote (Student: Max 3 votes per participant per business, 1 vote per idea)
app.post('/api/sessions/:code/vote', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const session = sessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }

  const { businessId, ideaId, participantId } = req.body;

  if (!participantId || !participantId.trim()) {
    res.status(400).json({ error: 'Participant identification missing.' });
    return;
  }

  const targetBusiness = session.businesses.find((b) => b.id === businessId);
  if (!targetBusiness) {
    res.status(400).json({ error: 'Business not found.' });
    return;
  }

  if (targetBusiness.isVotingClosed) {
    res.status(400).json({ error: 'Voting is closed for this business.' });
    return;
  }

  const targetIdea = session.ideas.find((i) => i.id === ideaId && i.businessId === businessId);
  if (!targetIdea) {
    res.status(404).json({ error: 'Idea not found.' });
    return;
  }

  if (!session.participantVotes) session.participantVotes = {};
  if (!session.participantVotes[participantId]) {
    session.participantVotes[participantId] = {};
  }
  if (!session.participantVotes[participantId][businessId]) {
    session.participantVotes[participantId][businessId] = [];
  }

  const currentVotes = session.participantVotes[participantId][businessId];
  const hasVoted = currentVotes.includes(ideaId);

  if (hasVoted) {
    // Unvote
    session.participantVotes[participantId][businessId] = currentVotes.filter((id) => id !== ideaId);
    targetIdea.votesCount = Math.max(0, targetIdea.votesCount - 1);
  } else {
    // Vote check: max 3 per business
    if (currentVotes.length >= MAX_VOTES_PER_BUSINESS) {
      res.status(400).json({
        error: `You have reached the maximum of ${MAX_VOTES_PER_BUSINESS} votes for ${targetBusiness.name}. Tap a voted idea to unvote if you wish to change your choice.`,
        currentVotesCount: currentVotes.length,
      });
      return;
    }
    currentVotes.push(ideaId);
    targetIdea.votesCount += 1;
  }

  const updatedVotes = session.participantVotes[participantId][businessId];

  broadcastSession(code);
  res.json({
    success: true,
    hasVoted: !hasVoted,
    votesCount: targetIdea.votesCount,
    myVotesForBusiness: updatedVotes,
    remainingVotes: MAX_VOTES_PER_BUSINESS - updatedVotes.length,
  });
});

// 11. SSE Live Stream for instant classroom updates
app.get('/api/sessions/:code/events', (req: Request, res: Response) => {
  const code = (req.params.code || '').toUpperCase().trim();
  const session = sessions.get(code);

  if (!session) {
    res.status(404).json({ error: 'Session not found.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseClients.has(code)) {
    sseClients.set(code, new Set());
  }
  sseClients.get(code)!.add(res);

  // Send initial session snapshot immediately
  const publicData = sanitizeSession(session);
  res.write(`data: ${JSON.stringify(publicData)}\n\n`);

  req.on('close', () => {
    const clients = sseClients.get(code);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        sseClients.delete(code);
      }
    }
  });
});

// ==========================================
// Vite & Static Asset Handling
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IdeaSpark classroom server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
