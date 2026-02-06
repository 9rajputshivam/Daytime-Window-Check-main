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


