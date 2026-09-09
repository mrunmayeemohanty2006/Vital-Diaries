import express from 'express';
import http from 'http';
import path from 'path';
import net from 'net';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function ensureDjangoRunning() {
  const isRunning = await isPortOpen(8000);
  if (isRunning) {
    console.log('✓ Django Authentication Backend is active on http://127.0.0.1:8000');
    return;
  }

  console.log('⚡ Starting Django Backend on http://127.0.0.1:8000...');
  const pythonPath = path.join(__dirname, 'backend/venv/bin/python');
  const managePy = path.join(__dirname, 'backend/manage.py');

  const djangoProcess = spawn(pythonPath, [managePy, 'runserver', '127.0.0.1:8000', '--noreload'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
  });

  djangoProcess.on('error', (err) => {
    console.error('Django Subprocess Error:', err.message);
  });

  process.on('exit', () => {
    djangoProcess.kill();
  });
}

async function startServer() {
  await ensureDjangoRunning();
  const app = express();
  const PORT = Number(process.env.PORT) || 5174;
  const DJANGO_BASE_URL = process.env.DJANGO_BACKEND_URL || 'http://127.0.0.1:8000';

  // Increase payload limit for base64 PDF and image uploads
  app.use(express.json({ limit: '20mb' }));

  // Initialize Gemini AI client server-side
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * Endpoint 1: Parse Lab Report PDF or Image
   * Takes base64 PDF or Image data and extracts structured test metrics
   */
  app.post('/api/parse-lab-report', async (req, res) => {
    try {
      const { fileBase64, mimeType, fileName } = req.body;

      if (!fileBase64 || !mimeType) {
        return res.status(400).json({ error: 'Missing fileBase64 or mimeType parameter' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing' });
      }

      const prompt = `You are an expert clinical laboratory document parser. 
Analyze the provided medical lab document (${fileName || 'document'}) and extract all readable test metrics and report metadata into a clean structured JSON object.

Extract:
1. title: High-level descriptive name for the report (e.g., "Complete Blood Count (CBC) & Metabolic Panel" or "Lipid Profile & Thyroid Scan")
2. type: Choose strictly one category: "cbc", "imaging", "cardiology", "general", "vaccine", "genomics", or "other"
3. date: Date of the report in YYYY-MM-DD format (if missing, use current date ${new Date().toISOString().split('T')[0]})
4. doctorName: Physician or doctor name (e.g., "Dr. Sarah Jenkins") if visible
5. facility: Laboratory or hospital name (e.g., "Quest Diagnostics") if visible
6. summary: A brief 1-2 sentence overview of the lab document
7. results: Array of individual lab test items, each containing:
   - key: Test metric name (e.g., "Hemoglobin", "Total Cholesterol", "Glucose (Fast)", "WBC", "TSH")
   - value: Measured value with unit (e.g., "13.8 g/dL", "105 mg/dL", "6.2 x10^3/uL")
   - unit: Unit of measurement (e.g., "mg/dL", "g/dL") if discernible
   - referenceRange: Standard reference range (e.g., "13.5 - 17.5 g/dL") if visible
   - status: Choose strictly one: "normal", "high", "low", "critical"
8. notes: Key clinical notes or impressions from the report.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          {
            inlineData: {
              data: fileBase64,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              type: { type: Type.STRING },
              date: { type: Type.STRING },
              doctorName: { type: Type.STRING },
              facility: { type: Type.STRING },
              summary: { type: Type.STRING },
              notes: { type: Type.STRING },
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    value: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    referenceRange: { type: Type.STRING },
                    status: { type: Type.STRING },
                  },
                  required: ['key', 'value'],
                },
              },
            },
            required: ['title', 'type', 'results'],
          },
        },
      });

      const parsedData = JSON.parse(response.text || '{}');
      return res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.error('Error parsing lab report:', err);
      return res.status(500).json({ error: err.message || 'Failed to parse lab report document' });
    }
  });

  /**
   * Endpoint 2: Health Insights, Dietary Recommendations & Progress Measurement
   * Analyzes lab readings and generates dietary plan + historical improvement trajectory
   */
  app.post('/api/health-insights', async (req, res) => {
    try {
      const { userName, currentReport, previousReports } = req.body;

      if (!currentReport) {
        return res.status(400).json({ error: 'currentReport payload is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing' });
      }

      const prompt = `You are a clinical nutritionist and health analytics expert analyzing medical laboratory reports for patient ${userName || 'Patient'}.

Analyze the current lab report readings:
Current Report Title: ${currentReport.title || 'Lab Test'}
Date: ${currentReport.date || 'Recent'}
Readings: ${JSON.stringify(currentReport.results || {})}
Facility/Doctor: ${currentReport.facility || ''} ${currentReport.doctorName || ''}
Notes: ${currentReport.notes || ''}

Historical Reports Available:
${JSON.stringify(previousReports || [])}

Perform three core analyses:
1. CLINICAL SUMMARY & FLAGGED METRICS: Explain key readings in clear, supportive language. Highlight abnormal/high/low readings.
2. PERSONALIZED DIETARY & LIFESTYLE RECOMMENDATIONS:
   - Specific foods to prioritize (with medical rationale, e.g. iron-rich foods for anemia, soluble fiber for high cholesterol, low glycemic foods for elevated HbA1c)
   - Foods to avoid or limit
   - Key nutrient priorities
   - Sample 1-day meal plan (Breakfast, Lunch, Dinner, Snack) tailored to these specific lab results
3. HEALTH IMPROVEMENT & TRAJECTORY MEASUREMENT:
   - Compare current readings against historical reports (if present)
   - Calculate an overall Health Improvement Score (0-100) and status ("Improved", "Stable", or "Requires Attention")
   - Detail metric-by-metric comparison changes (e.g. "Glucose dropped from 115 mg/dL to 98 mg/dL - Improved")
   - Actionable lifestyle habits to maintain the positive trend or improve further.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              clinicalSummary: { type: Type.STRING },
              flaggedReadings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    metric: { type: Type.STRING },
                    value: { type: Type.STRING },
                    status: { type: Type.STRING },
                    concernLevel: { type: Type.STRING }, // "low" | "moderate" | "high"
                    explanation: { type: Type.STRING },
                  },
                },
              },
              dietaryPlan: {
                type: Type.OBJECT,
                properties: {
                  prioritizeFoods: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        foodCategory: { type: Type.STRING },
                        examples: { type: Type.STRING },
                        healthReason: { type: Type.STRING },
                      },
                    },
                  },
                  limitFoods: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        foodCategory: { type: Type.STRING },
                        reason: { type: Type.STRING },
                      },
                    },
                  },
                  keyNutrients: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  dailySampleMenu: {
                    type: Type.OBJECT,
                    properties: {
                      breakfast: { type: Type.STRING },
                      lunch: { type: Type.STRING },
                      dinner: { type: Type.STRING },
                      snack: { type: Type.STRING },
                    },
                  },
                },
              },
              healthImprovement: {
                type: Type.OBJECT,
                properties: {
                  overallStatus: { type: Type.STRING }, // "Improved" | "Stable" | "Requires Attention"
                  improvementScore: { type: Type.NUMBER }, // 0 to 100
                  summaryText: { type: Type.STRING },
                  comparisonMetrics: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        metric: { type: Type.STRING },
                        previousValue: { type: Type.STRING },
                        currentValue: { type: Type.STRING },
                        trend: { type: Type.STRING }, // "improved" | "declined" | "stable"
                        message: { type: Type.STRING },
                      },
                    },
                  },
                  keyHighlights: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
              },
            },
            required: ['clinicalSummary', 'dietaryPlan', 'healthImprovement'],
          },
        },
      });

      const insightsData = JSON.parse(response.text || '{}');
      return res.json({ success: true, data: insightsData });
    } catch (err: any) {
      console.error('Error generating health insights:', err);
      return res.status(500).json({ error: err.message || 'Failed to generate health insights' });
    }
  });

  /**
   * Endpoint 3: Interactive QA on Lab Readings
   * Allows asking custom follow-up health/nutrition questions
   */
  app.post('/api/ask-health-qa', async (req, res) => {
    try {
      const { userQuestion, reportContext } = req.body;

      if (!userQuestion) {
        return res.status(400).json({ error: 'userQuestion is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is missing' });
      }

      const prompt = `You are a supportive, knowledgeable clinical nutrition assistant. 
Patient Question: "${userQuestion}"

Patient Lab Context:
${JSON.stringify(reportContext || {})}

Provide an empathetic, clear, evidence-based answer explaining the physiological mechanisms, dietary choices, and actionable wellness tips in simple terms. Always advise consulting their healthcare provider for medical decisions.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });

      return res.json({ success: true, answer: response.text });
    } catch (err: any) {
      console.error('Error in health QA:', err);
      return res.status(500).json({ error: err.message || 'Failed to generate answer' });
    }
  });

  // Proxy Django authentication, device management, and admin portal
  app.use(['/api/auth', '/api/devices', '/api/activity', '/admin'], (req, res) => {
    try {
      const targetUrl = new URL(req.originalUrl, DJANGO_BASE_URL);
      const headers: Record<string, string | string[] | undefined> = { ...req.headers };
      headers.connection = 'close';
      delete headers.host;

      let bodyData: string | Buffer | null = null;
      if (req.body && Object.keys(req.body).length > 0) {
        bodyData = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        headers['content-type'] = 'application/json';
        headers['content-length'] = Buffer.byteLength(bodyData).toString();
      } else {
        delete headers['content-length'];
      }

      const proxyReq = http.request(
        {
          hostname: targetUrl.hostname || '127.0.0.1',
          port: Number(targetUrl.port) || 8000,
          path: targetUrl.pathname + targetUrl.search,
          method: req.method,
          headers,
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err: any) => {
        console.error(`Django Proxy Connection Error (${req.originalUrl}):`, err.message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            error: 'Authentication backend service is offline. Please start the Django server (python backend/manage.py runserver 127.0.0.1:8000).',
          });
        }
      });

      if (bodyData) {
        proxyReq.write(bodyData);
      }
      proxyReq.end();
    } catch (proxyErr: any) {
      console.error('Proxy dispatch error:', proxyErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Proxy dispatch failed' });
      }
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vital Diaries Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
