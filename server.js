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
app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

/* -------------------- JWT Validation -------------------- */
function validateJwt(req, res, next) {

  const token = req.body?.jwt;
 
  if (!token) {

    return res.status(401).send("Missing JWT in request body");

  }
 
  try {

    jwt.verify(token, process.env.JWT_SECRET);

    next();

  } catch (err) {

    console.error("JWT validation failed:", err.message);

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
  console.log('access token:',authResponse);
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
    const url = `https://mcgdcvj-8bxvjrmps6j-r1cp-gk8.rest.marketingcloudapis.com/data/v1/customobjectdata/key/BC3BD432-1A15-4638-B238-EE4A490A61A8/rowset?$filter=Country eq '${encodeURIComponent(country)}'`;

    /*const payload = {
      filter: {
        leftOperand: { property: "Country", simpleOperator: "equals", value: 'india' }
      },
      pageSize: 1
    };
    */
    console.log('end point URL - ', url);
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    console.log('Response', response);
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
  console.log('Rules', rules);

  if (!rules || rules.length === 0) return { isWithinWindow: "false", currentHour: "" };

  const rule = rules[0];
  const timezone = rule.values.timezone;
  console.log('Timezone', timezone);
  const now = DateTime.now().setZone(timezone);
  const hour = now.hour;
  const weekday = now.weekday; // 1 = Mon, 7 = Sun

  const weekendBlocked = rule.values.weekendblocked === true || rule.values.weekendblocked === "true";
  if (weekendBlocked && (weekday === 6 || weekday === 7)) {
    return { isWithinWindow: "false", currentHour: String(hour) };
  }

  const start = Number(rule.values.starthour);
  const end = Number(rule.values.endhour);
  console.log('start hour', start);
  console.log('end  hour', end);

  const isRestricted = start > end ? hour >= start || hour < end : hour >= start && hour < end;

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
app.post("/activity/execute", async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];

    const responses = [];

    for (const item of items) {
      const inArgs = Object.assign({}, ...(item.inArguments || []));
      const country = inArgs.country;

      const result = await evaluateDaytimeWindow(country);

      responses.push({
        isWithinWindow: result.isWithinWindow === "true",
        currentHour: Number(result.currentHour)
      });
    }

    return res.status(200).json(responses); // ✅ IMPORTANT
  } catch (err) {
    console.error("Execute error:", err);

    return res.status(200).json([
      {
        isWithinWindow: false,
        currentHour: 0
      }
    ]);
  }
});
 
    // Journey Builder STILL expects valid JSON
    return res.status(200).json({
      outArguments: [
        {
          isWithinWindow: false,
          currentHour: null
        }
      ]
    });
  }
});
/* -------------------- Lifecycle Endpoints -------------------- */
app.post("/activity/save",  (req, res) => res.sendStatus(200));
app.post("/activity/validate",  (req, res) => res.sendStatus(200));
app.post("/activity/publish",  (req, res) => res.sendStatus(200));
app.post("/activity/stop",  (req, res) => res.sendStatus(200));

/* -------------------- Start Server -------------------- */
app.listen(PORT, () =>
  console.log(`🚀 Daytime Window Check running on port ${PORT}`)
);









