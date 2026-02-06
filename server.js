const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { DateTime } = require('luxon');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- Middleware -------------------- */
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

/* -------------------- Allow All (NO JWT) -------------------- */
function allowAll(req, res, next) {
  next();
}

/* -------------------- Timezone Logic -------------------- */
const countryTimezones = {
  india: 'Asia/Kolkata',
  austria: 'Europe/Vienna',
  belgium: 'Europe/Brussels',
  bulgaria: 'Europe/Sofia',
  croatia: 'Europe/Zagreb',
  cyprus: 'Asia/Nicosia',
  czechia: 'Europe/Prague',
  denmark: 'Europe/Copenhagen',
  estonia: 'Europe/Tallinn',
  finland: 'Europe/Helsinki',
  france: 'Europe/Paris',
  germany: 'Europe/Berlin',
  greece: 'Europe/Athens',
  hungary: 'Europe/Budapest',
  ireland: 'Europe/Dublin',
  italy: 'Europe/Rome',
  latvia: 'Europe/Riga',
  lithuania: 'Europe/Vilnius',
  luxembourg: 'Europe/Luxembourg',
  malta: 'Europe/Malta',
  netherlands: 'Europe/Amsterdam',
  poland: 'Europe/Warsaw',
  portugal: 'Europe/Lisbon',
  romania: 'Europe/Bucharest',
  slovakia: 'Europe/Bratislava',
  slovenia: 'Europe/Ljubljana',
  spain: 'Europe/Madrid',
  sweden: 'Europe/Stockholm'
};

/* -------------------- Restricted Sending Windows -------------------- */
const countryRestrictedWindows = {
  india: [{ start: 20, end: 10 }],
  austria: [{ start: 20, end: 10 }],
  belgium: [{ start: 20, end: 9 }],
  bulgaria: [{ start: 21, end: 9 }],
  croatia: [{ start: 20, end: 8 }],
  cyprus: [{ start: 21, end: 8 }],
  czechia: [{ start: 20, end: 8 }],
  denmark: [{ start: 21, end: 9 }],
  estonia: [{ start: 21, end: 8 }],
  finland: [{ start: 21, end: 9 }],
  france: [
    { start: 20, end: 10 },
    { start: 13, end: 14 }
  ],
  germany: [{ start: 20, end: 8 }],
  greece: [
    { start: 20, end: 9 },
    { start: 14, end: 17 }
  ],
  hungary: [{ start: 21, end: 8 }],
  ireland: [{ start: 21, end: 9 }],
  italy: [{ start: 21, end: 9 }],
  latvia: [{ start: 21, end: 8 }],
  lithuania: [{ start: 21, end: 8 }],
  luxembourg: [{ start: 20, end: 8 }],
  malta: [{ start: 21, end: 8 }],
  netherlands: [{ start: 22, end: 9 }],
  poland: [{ start: 20, end: 8 }],
  portugal: [{ start: 21, end: 9 }],
  romania: [{ start: 21, end: 8 }],
  slovakia: [{ start: 20, end: 8 }],
  slovenia: [{ start: 20, end: 8 }],
  spain: [{ start: 21, end: 9 }],
  sweden: [{ start: 21, end: 9 }]
};

/* -------------------- Evaluate if current time is allowed -------------------- */
function evaluateDaytimeWindow(country) {
  if (!country) return { isWithinWindow: false, currentHour: null };

  const key = country.toLowerCase();
  const tz = countryTimezones[key];
  const restrictedWindows = countryRestrictedWindows[key];

  if (!tz || !restrictedWindows) return { isWithinWindow: false, currentHour: null };

  const now = DateTime.now().setZone(tz);
  const hour = now.hour;

  // Check if current hour falls in any restricted window
  const isRestricted = restrictedWindows.some(({ start, end }) => {
    if (start > end) {
      // Overnight window (e.g., 20 → 8)
      return hour >= start || hour < end;
    }
    // Same-day window (e.g., 13 → 14)
    return hour >= start && hour < end;
  });

  return { isWithinWindow: !isRestricted, currentHour: hour };
}

/* -------------------- Deduplication -------------------- */
const executionCache = new Set();

/* -------------------- Static / Health -------------------- */
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/icon.png', (req, res) => res.sendFile(path.join(__dirname, 'public/icon.png')));
app.get('/health', (req, res) => res.send('OK'));
app.get('/.well-known/journeybuilder/config.json', (req, res) =>
  res.sendFile(path.join(__dirname, 'public/config.json'))
);

/* -------------------- Execute Endpoint -------------------- */
app.post('/activity/execute', allowAll, (req, res) => {
  const dedupeKey = `${req.body.activityId}:${req.body.definitionInstanceId}`;
  if (executionCache.has(dedupeKey)) return res.sendStatus(200);
  executionCache.add(dedupeKey);

  const inArgs = Object.assign({}, ...(req.body.inArguments || []));
  const result = evaluateDaytimeWindow(inArgs.country);

  return res.status(200).json([{ isWithinWindow: result.isWithinWindow, currentHour: result.currentHour }]);
});

/* -------------------- Lifecycle Endpoints -------------------- */
app.post('/activity/save', allowAll, (req, res) => res.sendStatus(200));
app.post('/activity/validate', allowAll, (req, res) => res.sendStatus(200));
app.post('/activity/publish', allowAll, (req, res) => res.sendStatus(200));
app.post('/activity/stop', allowAll, (req, res) => res.sendStatus(200));

/* -------------------- Start Server -------------------- */
app.listen(PORT, () => console.log(`🚀 Daytime Window Check running on port ${PORT}`));


