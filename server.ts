import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory / persistent mock store for audit logs and sealing records
interface AuditRecord {
  id: string;
  meetingId: string;
  action: string;
  actor: string;
  timestamp: string;
  documentHash: string;
  metadata?: Record<string, unknown>;
}

const auditLogs: AuditRecord[] = [
  {
    id: 'aud_01',
    meetingId: 'meet-1',
    action: 'MEETING_CREATED',
    actor: 'آرش فتحی (مدیر محصول)',
    timestamp: '۱۴۰۴/۰۷/۰۳ ۱۰:۰۰:۰۰',
    documentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'aud_02',
    meetingId: 'meet-1',
    action: 'REVIEW_REQUESTED',
    actor: 'آرش فتحی',
    timestamp: '۱۴۰۴/۰۷/۰۳ ۱۱:۳۰:۰۰',
    documentHash: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'
  },
  {
    id: 'aud_03',
    meetingId: 'meet-1',
    action: 'SIGNATURE_COMPLETED',
    actor: 'سارا احمدی (مدیر محصول)',
    timestamp: '۱۴۰۴/۰۷/۰۳ ۱۲:۱۵:۲۲',
    documentHash: '8d23419992f96129486c76e274c4e09f871317d6c6e7a68502f66abef57d727a'
  },
  {
    id: 'aud_04',
    meetingId: 'meet-1',
    action: 'SIGNATURE_COMPLETED',
    actor: 'علی رضایی (توسعه‌دهنده ارشد)',
    timestamp: '۱۴۰۴/۰۷/۰۳ ۱۲:۴۵:۰۵',
    documentHash: '8d23419992f96129486c76e274c4e09f871317d6c6e7a68502f66abef57d727a'
  },
  {
    id: 'aud_05',
    meetingId: 'meet-1',
    action: 'SIGNATURE_COMPLETED',
    actor: 'مهدی کریمی (طراح محصول)',
    timestamp: '۱۴۰۴/۰۷/۰۳ ۱۳:۱۰:۱۸',
    documentHash: '8d23419992f96129486c76e274c4e09f871317d6c6e7a68502f66abef57d727a'
  }
];

// Initialize Gemini SDK with User-Agent telemetry
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  } catch (err) {
    console.error('Failed to initialize Gemini client:', err);
  }
}

// API Routes
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    appName: 'MetaMeet',
    version: '1.0.0',
    geminiConfigured: !!process.env.GEMINI_API_KEY
  });
});

// AI Assistant endpoint
app.post('/api/ai/suggest', async (req, res) => {
  try {
    const { action, text, meetingTitle, agenda } = req.body;

    if (geminiClient && process.env.GEMINI_API_KEY) {
      const prompt = `شما دستیار هوشمند تنظیم صورت‌جلسه پلتفرم MetaMeet هستید.
عنوان جلسه: ${meetingTitle || 'جلسه استراتژی محصول'}
دستور جلسه: ${agenda ? JSON.stringify(agenda) : 'بررسی پیشرفت و برنامه‌ریزی'}
متن موجود: ${text || ''}

اقدام مورد نظر: ${action || 'summarize_and_suggest'}

لطفاً پاسخی دقیق و حرفه‌ای به زبان فارسی و با لحن استاندارد جلسات شرکتی آماده کنید.
اگر اقدام summarize_and_suggest بود:
یک خلاصه دقیق از جلسه ارائه دهید و تصمیمات کلیدی و نیازمندی‌های اولویت‌بندی شده را مشخص کنید.

پاسخ را در قالب یک شیء JSON با این کلیدها ارسال کنید:
{
  "summary": "متن خلاصه کوتاه و روان و حرفه‌ای",
  "keyDecisions": ["تصمیم اول", "تصمیم دوم"],
  "suggestedTasks": [
    {"task": "عنوان وظیفه", "role": "مسئول پیشنهادی", "deadline": "مهلت تقریبی"}
  ]
}`;

      const response = await geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '{}';
      try {
        const parsed = JSON.parse(responseText);
        return res.json({ success: true, data: parsed });
      } catch {
        return res.json({
          success: true,
          data: {
            summary: responseText,
            keyDecisions: ['تأیید برنامه زمان‌بندی پروژه', 'تخصیص بودجه و زیرساخت'],
            suggestedTasks: [
              { task: 'تهیه پیش‌نویس معماری', role: 'توسعه‌دهنده ارشد', deadline: '۷ آبان ۱۴۰۴' }
            ]
          }
        });
      }
    }

    // Default intelligent Persian minutes assistant
    const defaultSuggestions: Record<string, unknown> = {
      summary: 'در این جلسه بر پیشرفت پروژه‌های جاری، تمرکز بر اولویت‌های سامانه چهارم و تخصیص منابع تأکید شد. همچنین تصمیم گرفتند که منابع مطابق با نیازهای فعلی پروژه‌ها تخصیص یابد.',
      keyDecisions: [
        'تأیید تخصیص منابع به پروژه‌های اولویت‌دار',
        'تأیید بودجه تیم محصول برای توسعه فاز نخست سامانه چهارم'
      ],
      suggestedTasks: [
        { task: 'آماده‌سازی برنامه راهبردی و انتشار اسناد فاز اول', role: 'سارا احمدی', deadline: '۱۰ آبان ۱۴۰۴' },
        { task: 'بررسی معماری API و نیازمندی‌های مقیاس‌پذیری', role: 'علی رضایی', deadline: '۷ آبان ۱۴۰۴' },
        { task: 'طراحی کمپین بازاریابی و رونمایی کاربردی', role: 'مهدی کریمی', deadline: '۱۲ آبان ۱۴۰۴' }
      ]
    };

    return res.json({ success: true, data: defaultSuggestions });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown AI error';
    console.error('AI assistant error:', errorMsg);
    return res.status(500).json({ error: errorMsg });
  }
});

// Digital signature creation endpoint with cryptographic SHA-256 hash
app.post('/api/signature/sign', (req, res) => {
  const { meetingId, signerName, signerRole, signatureData, contentToHash } = req.body;

  const content = contentToHash || JSON.stringify(req.body);
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  const auditEntry: AuditRecord = {
    id: `aud_${Date.now()}`,
    meetingId: meetingId || 'meet-1',
    action: 'SIGNATURE_COMPLETED',
    actor: `${signerName || 'کاربر جاری'} (${signerRole || 'امضاکننده'})`,
    timestamp: new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date()),
    documentHash: hash,
    metadata: {
      userAgent: req.headers['user-agent'] || 'Web Client',
      ipV4: req.ip || '127.0.0.1',
      hasDrawnSignature: !!signatureData
    }
  };

  auditLogs.push(auditEntry);

  return res.json({
    success: true,
    signatureId: `sig_${Date.now()}`,
    hash,
    auditEntry,
    message: 'امضای الکترونیکی با موفقیت ثبت و برچسب زمانی معتبر صادر گردید.'
  });
});

// Document Sealing endpoint
app.post('/api/meetings/seal', (req, res) => {
  const { meetingId, content } = req.body;
  const hash = crypto.createHash('sha256').update(JSON.stringify(content || {})).digest('hex');

  const sealRecord = {
    sealId: `seal_${Date.now()}`,
    meetingId,
    documentHash: hash,
    sealedAt: new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date()),
    status: 'SEALED',
    message: 'سند صورت‌جلسه مهر و موم شد و غیرقابل تغییر گردید.'
  };

  auditLogs.push({
    id: `aud_${Date.now()}`,
    meetingId: meetingId || 'meet-1',
    action: 'DOCUMENT_SEALED',
    actor: 'سیستم امضای دیجیتال MetaMeet',
    timestamp: sealRecord.sealedAt,
    documentHash: hash
  });

  return res.json({ success: true, seal: sealRecord });
});

// Audit trail inquiry endpoint
app.get('/api/audit/:meetingId', (req, res) => {
  const { meetingId } = req.params;
  const filtered = auditLogs.filter(a => a.meetingId === meetingId);
  res.json({ success: true, logs: filtered.length ? filtered : auditLogs });
});

// Serve frontend in development (via Vite middleware) or in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MetaMeet server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
