import { Business, IdeaCategory, SessionPublicState } from './types';

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

export async function fetchSession(code: string): Promise<SessionFetchResult> {
  const participantId = getParticipantId();
  const lecturerKey = getLecturerKey(code);

  const headers: Record<string, string> = {
    'X-Participant-ID': participantId,
  };
  if (lecturerKey) {
    headers['X-Lecturer-Key'] = lecturerKey;
  }

  const res = await fetch(`/api/sessions/${encodeURIComponent(code.toUpperCase())}`, {
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to load session');
  }

  return res.json();
}

export async function createSession(data: {
  title: string;
  cohort?: string;
  initialBusinesses?: { name: string; type?: string; presenter?: string; description?: string }[];
}): Promise<{ code: string; lecturerKey: string; session: SessionPublicState }> {
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create session');
  }

  const result = await res.json();
  if (result.code && result.lecturerKey) {
    saveLecturerKey(result.code, result.lecturerKey);
  }
  return result;
}

export async function addBusiness(
  code: string,
  business: { name: string; type?: string; presenter?: string; description?: string },
  lecturerKey: string
): Promise<{ business: Business; session: SessionPublicState }> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(code.toUpperCase())}/businesses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Lecturer-Key': lecturerKey,
    },
    body: JSON.stringify(business),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to add business');
  }

  return res.json();
}

export async function updateBusiness(
  code: string,
  businessId: string,
  updates: Partial<Business>,
  lecturerKey: string
): Promise<{ business: Business; session: SessionPublicState }> {
  const res = await fetch(
    `/api/sessions/${encodeURIComponent(code.toUpperCase())}/businesses/${encodeURIComponent(businessId)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Lecturer-Key': lecturerKey,
      },
      body: JSON.stringify(updates),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update business');
  }

  return res.json();
}

export async function deleteBusiness(
  code: string,
  businessId: string,
  lecturerKey: string
): Promise<{ session: SessionPublicState }> {
  const res = await fetch(
    `/api/sessions/${encodeURIComponent(code.toUpperCase())}/businesses/${encodeURIComponent(businessId)}`,
    {
      method: 'DELETE',
      headers: {
        'X-Lecturer-Key': lecturerKey,
      },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete business');
  }

  return res.json();
}

export async function resetBusiness(
  code: string,
  businessId: string,
  lecturerKey: string
): Promise<{ session: SessionPublicState }> {
  const res = await fetch(
    `/api/sessions/${encodeURIComponent(code.toUpperCase())}/businesses/${encodeURIComponent(businessId)}/reset`,
    {
      method: 'POST',
      headers: {
        'X-Lecturer-Key': lecturerKey,
      },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to reset business');
  }

  return res.json();
}

export async function setActiveBusiness(
  code: string,
  businessId: string | null,
  lecturerKey: string
): Promise<{ activeBusinessId?: string }> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(code.toUpperCase())}/active-business`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Lecturer-Key': lecturerKey,
    },
    body: JSON.stringify({ businessId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to set active business');
  }

  return res.json();
}

export async function submitIdea(
  code: string,
  data: {
    businessId: string;
    text: string;
    category: IdeaCategory;
    participantId: string;
  }
) {
  const res = await fetch(`/api/sessions/${encodeURIComponent(code.toUpperCase())}/ideas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to submit idea');
  }

  return res.json();
}

export async function toggleVote(
  code: string,
  data: {
    businessId: string;
    ideaId: string;
    participantId: string;
  }
) {
  const res = await fetch(`/api/sessions/${encodeURIComponent(code.toUpperCase())}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to cast vote');
  }

  return res.json();
}

export function subscribeSessionEvents(
  code: string,
  onUpdate: (data: SessionPublicState) => void,
  onError?: (err: Event) => void
): () => void {
  let eventSource: EventSource | null = null;
  let isClosed = false;

  try {
    eventSource = new EventSource(`/api/sessions/${encodeURIComponent(code.toUpperCase())}/events`);

    eventSource.onmessage = (event) => {
      if (isClosed) return;
      try {
        const data = JSON.parse(event.data);
        onUpdate(data);
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      if (onError && !isClosed) {
        onError(err);
      }
    };
  } catch (err) {
    console.error('SSE initialization error:', err);
  }

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
