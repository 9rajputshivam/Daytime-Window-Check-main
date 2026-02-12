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


/* ----------------------------------------------------------------- 
add country holiday list to restrict sending communications 
------------------------------------------------------------------*/

/* -------------------- Hardcoded Holiday Dataset -------------------- */

const holidayDataset = [
  { country: "India", holiday: "Republic Day", date: "2026-01-26" },
  { country: "India", holiday: "Independence Day", date: "2026-08-15" },
  { country: "USA", holiday: "Independence Day", date: "2026-07-04" },
  { country: "USA", holiday: "Christmas", date: "2026-12-25" }
];


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
    // Master Data Extension - Country_Restricted_Window
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
  if (!country) {
    return { isWithinWindow: false, currentHour: 0 };
  }

  const rules = await getCountryRules(country);

  if (!rules || rules.length === 0) {
    return { isWithinWindow: false, currentHour: 0 };
  }

  const rule = rules[0];

  const timezone = rule.values.Timezone || rule.values.timezone;
  const start = Number(rule.values.StartHour || rule.values.starthour);
  const end = Number(rule.values.EndHour || rule.values.endhour);

  const weekendBlocked =
    rule.values.WeekendBlocked === true ||
    rule.values.WeekendBlocked === "true" ||
    rule.values.weekendblocked === true ||
    rule.values.weekendblocked === "true";

  if (!timezone) {
    return { isWithinWindow: false, currentHour: 0 };
  }

  const now = DateTime.now().setZone(timezone);
  const hour = now.hour;
  const weekday = now.weekday;
  const todayDate = now.toISODate(); // YYYY-MM-DD

  if (weekendBlocked && (weekday === 6 || weekday === 7)) {
    return { isWithinWindow: false, currentHour: hour };
  }

  /* -------------------- Holiday Check -------------------- */

  const isHoliday = holidayDataset.some(h =>
    h.country.toLowerCase() === country.toLowerCase() &&
    h.date === todayDate
  );
  
  if (isHoliday) {
    console.log(`🚫 Holiday matched for ${country} on ${todayDate}`);
    return {
      isWithinWindow: false,
      currentHour: hour
    };
  }

  /* -------------------- DND Check-------------------- */
  const isRestricted =
    start > end
      ? hour >= start || hour < end
      : hour >= start && hour < end;

  return {
    isWithinWindow: !isRestricted,   // ✅ Boolean
    currentHour: hour               // ✅ Number
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
/* -------------------- Execute Endpoint -------------------- */

app.post("/activity/execute", async (req, res) => {

  try {

    // Log the incoming request for debugging

    console.log("Execute request body:", JSON.stringify(req.body, null, 2));
 
    // ✅ Handle both single object and array of objects

    const items = Array.isArray(req.body) ? req.body : [req.body];
    
    const isBatchRequest = Array.isArray(req.body);

    const responseArray = [];
 
    for (const item of items) {

      const inArgs = Object.assign({}, ...(item.inArguments || []));

      const country = inArgs.country;
  
     
      const result = await evaluateDaytimeWindow(country);
      
      // ✅ Push ONLY the flat data object

      responseArray.push({

        isWithinWindow: result.isWithinWindow,

        currentHour: result.currentHour

      });
        

    }
 
    // ✅ Return format based on request type:

    // - Single request → single object

    // - Batch request → array of objects

    const response = isBatchRequest ? responseArray : responseArray[0];
 
    console.log("Execute response:", JSON.stringify(response, null, 2));
 
    return res.status(200).json(response);
 
  } catch (err) {

    console.error("Execute error:", err);
 
    // ✅ Error response matches request type

    const isBatchRequest = Array.isArray(req.body);

    const errorResponse = isBatchRequest 

      ? [{ isWithinWindow: false, currentHour: 0 }]

      : { isWithinWindow: false, currentHour: 0 };
 
    return res.status(200).json(errorResponse);

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







