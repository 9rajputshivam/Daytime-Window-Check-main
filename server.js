const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const { DateTime } = require("luxon");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- Middleware -------------------- */
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* -------------------- SFMC OAuth -------------------- */
let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (cachedToken && tokenExpiry > Date.now()) {
    return cachedToken;
  }

  const response = await axios.post(
    `${process.env.AUTH_BASE_URL}/v2/token`,
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
    `${process.env.REST_BASE_URL}/hub/v1/dataevents/key:Country_Restricted_Window/rowset`,
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
    return { isWithinWindow: "true", currentHour: "" };
  }

  const rules = await getCountryRules(country);

  // If country not found → allow send
  if (!rules.length) {
    return { isWithinWindow: "true", currentHour: "" };
  }

  const rule = rules[0];
  const now = DateTime.now().setZone(rule.Timezone);
  const hour = now.hour;
  const weekday = now.weekday; // 6 = Sat, 7 = Sun

  // Weekend restriction
  if (rule.WeekendBlocked && (weekday === 6 || weekday === 7)) {
    return {
      isWithinWindow: "false",
      currentHour: String(hour)
    };
  }

  // Time restriction
  const start = rule.StartHour;
  const end = rule.EndHour;

  let isRestricted;
  if (start > end) {
    // Overnight window (e.g. 20 → 8)
    isRestricted = hour >= start || hour < end;
  } else {
    isRestricted = hour >= start && hour < end;
  }

  return {
    isWithinWindow: isRestricted ? "false" : "true",
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
app.post("/activity/execute", async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    const inArgs = Object.assign({}, ...(req.body.inArguments || []));
    const country = inArgs.country;

    const result = await evaluateDaytimeWindow(country);

    return res.status(200).json([
      {
        isWithinWindow: result.isWithinWindow,
        currentHour: result.currentHour
      }
    ]);
  } catch (err) {
    console.error("Execute error:", err);

    // MUST always return 200 to avoid JB hard bounce
    return res.status(200).json([
      { isWithinWindow: "", currentHour: "" }
    ]);
  }
});

/* -------------------- Lifecycle Endpoints -------------------- */
app.post("/activity/save", (req, res) => res.sendStatus(200));
app.post("/activity/validate", (req, res) => res.sendStatus(200));
app.post("/activity/publish", (req, res) => res.sendStatus(200));
app.post("/activity/stop", (req, res) => res.sendStatus(200));

/* -------------------- Start Server -------------------- */
app.listen(PORT, () =>
  console.log(`🚀 Daytime Window Check running on port ${PORT}`)
);
