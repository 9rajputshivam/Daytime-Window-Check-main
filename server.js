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

/* -------------------- Allow All (Journey Builder Safe) -------------------- */
function allowAll(req, res, next) {
  next();
}

/* -------------------- SFMC OAuth -------------------- */
let cachedToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (cachedToken && tokenExpiry > Date.now()) {
    return cachedToken;
  }

  const response = await axios.post(
    `https://${process.env.SFMC_SUBDOMAIN}.auth.marketingcloudapis.com/v2/token`,
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
    `https://${process.env.SFMC_SUBDOMAIN}.rest.marketingcloudapis.com/hub/v1/dataevents/key:Country_Restricted_Window/rowset`,
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
    return { isWithinWindow: false, currentHour: null };
  }

  const rules = await getCountryRules(country);

  // If no rules found → allow sending
  if (!rules.length) {
    return { isWithinWindow: true, currentHour: null };
  }

  const timezone = rules[0].Timezone;
  const now = DateTime.now().setZone(timezone);
  const hour = now.hour;
  const weekday = now.weekday; // 6 = Sat, 7 = Sun

  // Weekend restriction
  if (
    rules.some(r => r.WeekendBlocked === true) &&
    (weekday === 6 || weekday === 7)
  ) {
    return { isWithinWindow: false, currentHour: hour };
  }

  // Time window restriction
  const isRestricted = rules.some(r => {
    const start = r.StartHour;
    const end = r.EndHour;

    if (start > end) {
      // Overnight window (e.g. 20 → 8)
      return hour >= start || hour < end;
    }

    return hour >= start && hour < end;
  });

  return {
    isWithinWindow: !isRestricted,
    currentHour: hour
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
app.post("/activity/execute", allowAll, async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  try {
    const inArgs = Object.assign({}, ...(req.body.inArguments || []));
    const country = inArgs.country;

    const result = await evaluateDaytimeWindow(country);

    return res.status(200).json([
      {
        isWithinWindow: result.isWithinWindow ? "true" : "false",
        currentHour:
          result.currentHour !== null ? String(result.currentHour) : ""
      }
    ]);
  } catch (err) {
    console.error("Execute error:", err);

    // MUST always return 200 for Journey Builder
    return res.status(200).json([
      { isWithinWindow: "", currentHour: "" }
    ]);
  }
});

/* -------------------- Lifecycle Endpoints -------------------- */
app.post("/activity/save", allowAll, (req, res) => res.sendStatus(200));
app.post("/activity/validate", allowAll, (req, res) => res.sendStatus(200));
app.post("/activity/publish", allowAll, (req, res) => res.sendStatus(200));
app.post("/activity/stop", allowAll, (req, res) => res.sendStatus(200));

/* -------------------- Start Server -------------------- */
app.listen(PORT, () =>
  console.log(`🚀 Daytime Window Check running on port ${PORT}`)
);

