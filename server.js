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
  if (!authHeader) return res.status(401).send("Missing Authorization header");

  const token = authHeader.replace("Bearer ", "");
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).send("Invalid JWT");
  }
}

/* -------------------- SFMC OAuth -------------------- */
/*---------------------------*/
// Function to get Marketing Cloud access token
async function getAccessToken() {
  const authUrl = 'https://mcgdcvj-8bxvjrmps6j-r1cp-gk8.auth.marketingcloudapis.com/v2/token';
  const { SFMC_CLIENT_ID, SFMC_CLIENT_SECRET, SFMC_ACCOUNT_ID } = process.env;

  const authResponse = await axios.post(authUrl, {
    grant_type: 'client_credentials',
    client_id: SFMC_CLIENT_ID,
    client_secret: SFMC_CLIENT_SECRET,
    account_id: SFMC_ACCOUNT_ID
  });

  return authResponse.data.access_token;
}
/*--------------------------*/

/*-------------------------- fetch Country details ---------------------*/


/**
 * Fetch rows from a Data Extension
 */
async function getCountryRules(country) {
  try {
    const token = await getAccessToken();
    const url = `${process.env.SFMC_REST_BASE}/data/v1/customobjectdata/key/Country_Restricted_Window/rowset`;

    const payload = {
      filter: {
        leftOperand: { property: "Country", simpleOperator: "equals", value: country }
      },
      pageSize: 1
    };

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    return response.data.items || [];
  } catch (err) {
    console.error("❌ Error fetching DE rows:", err.response?.data || err.message);
    return [];
  }
}


/*--------------------------*/
  
/* -------------------- Fetch Country Rules from DE -------------------- */
/* added commnets
async function getCountryRules(country) {
  const token = await getAccessToken();

  const response = await axios.post(
    `${process.env.SFMC_REST_BASE}/hub/v1/dataevents/key:Country_Restricted_Window/rowset`,
    {
      props: ["Country", "Timezone", "StartHour", "EndHour", "WeekendBlocked"],
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
}*/


/* -------------------- Evaluate Daytime Window -------------------- */
async function evaluateDaytimeWindow(country) {
  if (!country) return { isWithinWindow: "false", currentHour: "" };

  const rules = await getCountryRules(country);

  // Country not found → block
  if (!rules || rules.length === 0) return { isWithinWindow: "false", currentHour: "" };

  const rule = rules[0];
  const timezone = rule.Timezone;
  const now = DateTime.now().setZone(timezone);
  const hour = now.hour;
  const weekday = now.weekday; // 1 = Mon, 7 = Sun

  // Weekend block
  const weekendBlocked = rule.WeekendBlocked === true || rule.WeekendBlocked === "true";
  if (weekendBlocked && (weekday === 2 || weekday === 7)) {
    return { isWithinWindow: "false", currentHour: String(hour) };
  }

  // Time window block
  const start = Number(rule.StartHour);
  const end = Number(rule.EndHour);

  let isRestricted;
  if (start > end) {
    // Overnight window (e.g., 20 → 8)
    isRestricted = hour >= start || hour < end;
  } else {
    isRestricted = hour >= start && hour < end;
  }

  return { isWithinWindow: isRestricted ? "false" : "true", currentHour: String(hour) };
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
        isWithinWindow: result.isWithinWindow,
        currentHour: result.currentHour
      }
    ]);
  } catch (err) {
    console.error("Execute error:", err);
    // NEVER break JB journey
    return res.status(200).json([{ isWithinWindow: "false", currentHour: "" }]);
  }
});

/* -------------------- Lifecycle Endpoints -------------------- */
app.post("/activity/save", validateJwt, (req, res) => res.sendStatus(200));
app.post("/activity/validate", validateJwt, (req, res) => res.sendStatus(200));
app.post("/activity/publish", validateJwt, (req, res) => res.sendStatus(200));
app.post("/activity/stop", validateJwt, (req, res) => res.sendStatus(200));

/* -------------------- Start Server -------------------- */
app.listen(PORT, () =>
  console.log(`🚀 Daytime Window Check running on port ${PORT}`)
);





