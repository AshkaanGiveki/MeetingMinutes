import { z } from 'zod';

export interface AiOrganizationMember {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  title?: string;
}

export interface AiMinutesInput {
  rawText: string;
  organizationMembers: AiOrganizationMember[];
  organizer?: AiOrganizationMember;
  meetingTitle?: string;
}

export interface AiAudioInput {
  audioData: string;
  mimeType: string;
}

const ParticipantSuggestionSchema = z.object({
  name: z.string().trim().min(1).max(300),
  memberId: z.string().trim().optional(),
  email: z.string().trim().optional(),
  role: z.enum(['Editor', 'Reviewer', 'Signer', 'Viewer', 'Participant']).default('Viewer'),
  roles: z.array(z.enum(['Editor', 'Reviewer', 'Signer', 'Viewer', 'Participant'])).max(5).default([]),
  reason: z.string().max(1_000).default(''),
  confidence: z.number().min(0).max(1).default(0.5),
});

const TaskSuggestionSchema = z.object({
  task: z.string().trim().min(1).max(2_000),
  assigneeName: z.string().trim().optional().default(''),
  assigneeId: z.string().trim().optional(),
  deadline: z.string().trim().optional().default(''),
  source: z.string().max(500).optional().default(''),
});

const MinutesDraftSchema = z.object({
  title: z.string().trim().min(3).max(500),
  agenda: z.array(z.string().trim().min(1).max(2_000)).max(30),
  discussion: z.string().trim().min(1).max(100_000),
  keyDecisions: z.array(z.string().trim().min(1).max(2_000)).max(50),
  suggestedTasks: z.array(TaskSuggestionSchema).max(50),
  participants: z.array(ParticipantSuggestionSchema).max(100).default([]),
  uncertainties: z.array(z.string().trim().max(1_000)).max(30).default([]),
});

export type AiMinutesDraft = z.infer<typeof MinutesDraftSchema>;

const providerName = () => {
  const requested = (process.env.AI_PROVIDER || 'auto').toLowerCase();
  if (requested !== 'auto') return requested;
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return '';
};

const modelFor = (provider: string) => process.env.AI_MODEL
  || process.env[`${provider.toUpperCase()}_MODEL`]
  || ({ gemini: 'gemini-2.5-flash', openai: 'gpt-4o-mini', anthropic: 'claude-3-5-haiku-latest' }[provider] || '');

const jsonFromText = (value: string): unknown => {
  const withoutFence = value.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  try { return JSON.parse(withoutFence); } catch {}
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(withoutFence.slice(start, end + 1));
  throw new Error('AI provider returned invalid JSON.');
};

const uniqueStrings = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const normalizeDraft = (raw: unknown, input: AiMinutesInput): AiMinutesDraft => {
  const parsed = MinutesDraftSchema.parse(raw);
  const membersById = new Map(input.organizationMembers.map((member) => [member.id, member]));
  const membersByName = input.organizationMembers
    .flatMap((member) => [member.name, member.email || ''].filter(Boolean).map((key) => [key.toLocaleLowerCase(), member] as const));
  const resolveMember = (suggestion: z.infer<typeof ParticipantSuggestionSchema>) => {
    const byId = suggestion.memberId ? membersById.get(suggestion.memberId) : undefined;
    const byName = membersByName.find(([key]) => key === suggestion.name.toLocaleLowerCase())?.[1];
    return byId || byName;
  };

  const participants = parsed.participants.map((suggestion) => {
    const member = resolveMember(suggestion);
    const roles = Array.from(new Set([suggestion.role, ...suggestion.roles].filter((role) => role !== 'Participant')));
    return {
      ...suggestion,
      memberId: member?.id || suggestion.memberId,
      name: member?.name || suggestion.name,
      email: member?.email || suggestion.email,
      roles: roles.length ? roles : ['Viewer' as const],
    };
  }).filter((suggestion, index, all) => all.findIndex((item) => (item.memberId || item.name.toLocaleLowerCase()) === (suggestion.memberId || suggestion.name.toLocaleLowerCase())) === index);

  const tasks = parsed.suggestedTasks.map((task) => {
    const member = task.assigneeId ? membersById.get(task.assigneeId) : membersByName.find(([key]) => key === task.assigneeName.toLocaleLowerCase())?.[1];
    return { ...task, assigneeId: member?.id || task.assigneeId, assigneeName: member?.name || task.assigneeName };
  });

  return {
    ...parsed,
    agenda: uniqueStrings(parsed.agenda),
    keyDecisions: uniqueStrings(parsed.keyDecisions),
    participants,
    suggestedTasks: tasks,
    uncertainties: uniqueStrings(parsed.uncertainties),
  };
};

const buildPrompt = (input: AiMinutesInput) => {
  const roster = input.organizationMembers.length
    ? input.organizationMembers.map((member) => ({ id: member.id, name: member.name, email: member.email, title: member.title }))
    : [];
  return `You are a senior corporate secretary and Persian-language meeting-minutes editor.
Convert the raw meeting notes below into a complete, formal, precise Persian meeting-minute draft.
The notes may be conversational, disordered, abbreviated, misspelled, contain speech-to-text errors,
or mix Persian and English. Correct obvious spelling and transcription errors using context, but never
invent a decision, person, date, amount, deadline, or commitment that is not supported by the notes.

Rules:
- Preserve every material fact and distinguish decisions from discussion and proposals.
- Write a specific, professional title that describes the actual meeting purpose.
- Create a logical ordered agenda from the topics actually discussed.
- Rewrite discussion as formal, neutral Persian prose with clear paragraphs.
- Include only decisions explicitly made or strongly implied by agreement; otherwise leave keyDecisions empty.
- Extract action items only when an action is assigned or clearly committed. Keep unknown assignees as names and add an uncertainty.
- For each person mentioned or clearly participating, suggest workflow roles from Editor, Reviewer, Signer, Viewer, Participant.
- Use the organization roster to match a person to memberId. Never create a memberId that is not in the roster.
- Reviewer and Signer are sensitive roles: assign them only when the notes explicitly support review or signature responsibility.
- Do not make the organizer a signer unless the notes support it. The application adds the organizer separately.
- Respond with JSON only, using exactly this shape:
{
  "title": "formal Persian title",
  "agenda": ["ordered agenda item"],
  "discussion": "formal Persian discussion",
  "keyDecisions": ["explicit decision"],
  "suggestedTasks": [{"task":"...","assigneeName":"...","assigneeId":"roster id or empty","deadline":"...","source":"evidence from notes"}],
  "participants": [{"name":"...","memberId":"roster id or empty","email":"...","role":"Editor|Reviewer|Signer|Viewer|Participant","roles":["..."],"reason":"...","confidence":0.0}],
  "uncertainties": ["ambiguous item requiring human confirmation"]
}

Organization roster:
${JSON.stringify(roster)}

Existing title, if any: ${input.meetingTitle || '(none)'}

Raw notes:
${input.rawText}`;
};

const requestJson = async (provider: string, model: string, prompt: string): Promise<unknown> => {
  const signal = AbortSignal.timeout(Number(process.env.AI_REQUEST_TIMEOUT_MS || 45_000));
  if (provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY || '')}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.15 } }),
    });
    const data = await response.json() as any;
    if (!response.ok) throw new Error(data?.error?.message || `Gemini request failed (${response.status}).`);
    return jsonFromText(data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') || '');
  }
  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}` }, signal,
      body: JSON.stringify({ model, temperature: 0.15, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Return valid JSON only.' }, { role: 'user', content: prompt }] }),
    });
    const data = await response.json() as any;
    if (!response.ok) throw new Error(data?.error?.message || `OpenAI request failed (${response.status}).`);
    return jsonFromText(data?.choices?.[0]?.message?.content || '');
  }
  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' }, signal,
      body: JSON.stringify({ model, max_tokens: 8_000, temperature: 0.15, system: 'Return valid JSON only. Do not use markdown fences.', messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await response.json() as any;
    if (!response.ok) throw new Error(data?.error?.message || `Anthropic request failed (${response.status}).`);
    return jsonFromText(data?.content?.map((part: any) => part.text || '').join('') || '');
  }
  throw new Error('No AI provider is configured. Set AI_PROVIDER and the corresponding API key.');
};

export async function transcribeAudio(input: AiAudioInput): Promise<{ transcript: string; provider: string; model: string }> {
  const requested = providerName();
  const candidates = requested === 'anthropic'
    ? ['gemini', 'openai']
    : [requested];
  const provider = candidates.find((candidate) => candidate === 'gemini' ? Boolean(process.env.GEMINI_API_KEY) : Boolean(process.env.OPENAI_API_KEY));
  if (!provider) throw new Error('Voice transcription requires a Gemini or OpenAI API key. Anthropic does not provide audio transcription in this integration.');
  const model = provider === 'gemini'
    ? modelFor('gemini')
    : (process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe');
  const signal = AbortSignal.timeout(Number(process.env.AI_REQUEST_TIMEOUT_MS || 45_000));
  const prompt = 'Transcribe this meeting recording accurately. Preserve the spoken language, names, dates, numbers, decisions, assignments, and uncertainty. Do not summarize, rewrite, or invent anything. Return only the verbatim transcript.';

  if (provider === 'gemini') {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY || '')}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: input.mimeType, data: input.audioData } }] }], generationConfig: { temperature: 0.1 } }),
    });
    const data = await response.json() as any;
    if (!response.ok) throw new Error(data?.error?.message || `Gemini transcription failed (${response.status}).`);
    const transcript = data?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('').trim();
    if (!transcript) throw new Error('Gemini returned an empty transcript.');
    return { transcript, provider, model };
  }

  const form = new FormData();
  form.append('file', new Blob([Buffer.from(input.audioData, 'base64')], { type: input.mimeType }), `meeting-recording.${input.mimeType.split('/')[1] || 'webm'}`);
  form.append('model', model);
  form.append('response_format', 'json');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY || ''}` }, body: form, signal,
  });
  const data = await response.json() as any;
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI transcription failed (${response.status}).`);
  const transcript = String(data?.text || '').trim();
  if (!transcript) throw new Error('OpenAI returned an empty transcript.');
  return { transcript, provider, model };
}

const deterministicDraft = (input: AiMinutesInput): AiMinutesDraft => {
  const lines = uniqueStrings(input.rawText.split(/\r?\n|[.!؟]+/).map((line) => line.replace(/^\s*[-*•\d.)]+\s*/, '').trim()).filter((line) => line.length >= 4));
  const first = lines[0] || 'بررسی و هماهنگی موضوعات جلسه';
  return {
    title: input.meetingTitle?.trim() || `جلسه بررسی ${first.slice(0, 80)}`,
    agenda: lines.slice(0, 8),
    discussion: lines.join('\n\n') || 'یادداشت قابل تبدیل به متن رسمی پیدا نشد.',
    keyDecisions: [],
    suggestedTasks: [],
    participants: [],
    uncertainties: ['هیچ مدل هوش مصنوعی در دسترس نبود؛ تصمیم‌ها، افراد و وظایف نیازمند تکمیل انسانی هستند.'],
  };
};

export async function generateAiMinutes(input: AiMinutesInput): Promise<{ draft: AiMinutesDraft; provider: string; model: string; fallback: boolean }> {
  const provider = providerName();
  const model = modelFor(provider);
  if (!provider || !model) return { draft: deterministicDraft(input), provider: '', model: '', fallback: true };
  try {
    const raw = await requestJson(provider, model, buildPrompt(input));
    return { draft: normalizeDraft(raw, input), provider, model, fallback: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[AI minutes] ${provider}/${model} failed: ${message}`);
    return { draft: deterministicDraft(input), provider, model, fallback: true };
  }
}
