const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { DateTime } = require("luxon");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- Middleware -------------------- */
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* -------------------- JWT Validation -------------------- */
function validateJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("Missing Authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).send("Invalid JWT");
  }
}

/* -------------------- SFMC OAuth -------------------- */
let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (cachedToken && tokenExpiry > Date.now()) {
    return cachedToken;
  }

  const response = await axios.post(
    `${process.env.SFMC_AUTH_BASE}/v2/token`,
    {
      grant_type: "client_credentials",
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      account_id: process.env.ACCOUNT_ID
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + response.data.expires_in * 1000 - 60000;

  return cachedToken;
}

/* -------------------- Fetch Country Rules from DE -------------------- */
async function getCountryRules(country) {
  const token = await getAccessToken();

  const response = await axios.post(
    `${process.env.SFMC_REST_BASE}/hub/v1/dataevents/key:Country_Restricted_Window/rowset`,
    {
      filter: {
        leftOperand: "Country",
        operator: "equals",
        rightOperand: country
      }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.items || [];
}

/* -------------------- Business Logic -------------------- */
async function evaluateDaytimeWindow(country) {
  if (!country) {
    return { isWithinWindow: false, currentHour: "" };
  }

  const rules = await getCountryRules(country);

  // No rule → allow send
  if (!rules.length) {
    return { isWithinWindow: true, currentHour: "" };
  }

  const rule = rules[0];
  const timezone = rule.Timezone;
  const startHour = Number(rule.StartHour);
  const endHour = Number(rule.EndHour);
  const weekendBlocked = rule.WeekendBlocked === true;

  const now = DateTime.now().setZone(timezone);
  const hour = now.hour;
  const weekday = now.weekday; // 6=Sat, 7=Sun

  // Weekend restriction
  if (weekendBlocked && (weekday === 6 || weekday === 7)) {
    return { isWithinWindow: false, currentHour: String(hour) };
  }

  // Time window restriction
  let isRestricted;
  if (startHour > endHour) {
    // Overnight window (e.g. 20 → 8)
    isRestricted = hour >= startHour || hour < endHour;
  } else {
    isRestricted = hour >= startHour && hour < endHour;
  }

  return {
    isWithinWindow: !isRestricted,
    currentHour: String(hour)
  };
}

/* -------------------- Static / Health -------------------- */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

app.get("/icon.png", (req, res) =>
  res.sendFile(path.join(__dirname, "public/icon.png"))
);

app.get("/health", (req, res) => res.send("OK"));

app.get("/.well-known/journeybuilder/config.json", (req, res) =>
  res.sendFile(path.join(__dirname, "public/config.json"))
);

/* -------------------- Execute Endpoint -------------------- */
app.post("/activity/execute", validateJwt, async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    const inArgs = Object.assign({}, ...(req.body.inArguments || []));
    const country = inArgs.country;

    const result = await evaluateDaytimeWindow(country);

    return res.status(200).json([
      {
        isWithinWindow: result.isWithinWindow ? "true" : "false",
        currentHour: result.currentHour
      }
    ]);
  } catch (err) {
    console.error("Execute error:", err);

    // NEVER return non-200 → prevents JB hard bounce
    return res.status(200).json([
      {
        isWithinWindow: "",
        currentHour: ""
      }
    ]);
  }
});

/* -------------------- Lifecycle Endpoints -------------------- */
app.post("/activity/save", validateJwt, (req, res) => res.sendStatus(200));
app.post("/activity/validate", validateJwt, (req, res) => res.sendStatus(200));
app.post("/activity/publish", validateJwt, (req, res) => res.sendStatus(200));
app.post("/activity/stop", validateJwt, (req, res) => res.sendStatus(200));

/* -------------------- Start Server -------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Country Time Restriction Activity running on port ${PORT}`);
});
