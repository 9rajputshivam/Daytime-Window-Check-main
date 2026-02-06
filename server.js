const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { DateTime } = require('luxon');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------- Middleware ---------------- */
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------------- Timezone Logic ---------------- */
const countryTimezones = {
  india: 'Asia/Kolkata',
  germany: 'Europe/Berlin',
  usa: 'America/New_York',
  uk: 'Europe/London',
  slovakia: 'Europe/Bratislava'
};

function evaluateDaytimeWindow(country) {
  if (!country) return { isWithinWindow: false, currentHour: null };

  const tz = countryTimezones[country.toLowerCase()];
  if (!tz) return { isWithinWindow: false, currentHour: null };

  const now = DateTime.now().setZone(tz);
  return {
    isWithinWindow: now.hour >= 9 && now.hour < 18,
    currentHour: now.hour
  };
}

/* ---------------- Deduplication ---------------- */
const executionCache = new Set();

/* ---------------- Static ---------------- */
app.get('/', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/index.html'))
);

app.get('/icon.png', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/icon.png'))
);

app.get('/health', (req, res) => res.send('OK'));

app.get('/.well-known/journeybuilder/config.json', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/config.json'))
);

/* ---------------- Execute ---------------- */
app.post('/activity/execute', (req, res) => {
  const dedupeKey = `${req.body.activityId}:${req.body.definitionInstanceId}`;
  if (executionCache.has(dedupeKey)) return res.sendStatus(200);
  executionCache.add(dedupeKey);

  const inArgs = Object.assign({}, ...(req.body.inArguments || []));
  const result = evaluateDaytimeWindow(inArgs.country);

  return res.status(200).json([
    {
      isWithinWindow: result.isWithinWindow,
      currentHour: result.currentHour
    }
  ]);
});

/* ---------------- Lifecycle (MANDATORY) ---------------- */
app.post('/activity/save', (req, res) => res.status(200).json(req.body));
app.post('/activity/validate', (req, res) => res.status(200).json(req.body));
app.post('/activity/publish', (req, res) => res.status(200).json(req.body));
app.post('/activity/stop', (req, res) => res.status(200).json(req.body));

/* ---------------- Start ---------------- */
app.listen(PORT, () => {
  console.log(`🚀 Daytime Window Check running on port ${PORT}`);
});
