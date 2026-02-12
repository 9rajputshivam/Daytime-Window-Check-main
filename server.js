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


/* -------------------- Hardcoded Holiday Dataset -------------------- */

const holidayDataset = [
  { country: "Austria", holiday: "New Year’s Day", date: "2026-01-01" },
  { country: "Austria", holiday: "Epiphany", date: "2026-01-06" },
  { country: "Austria", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Austria", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Austria", holiday: "Ascension Day", date: "2026-05-14" },
  { country: "Austria", holiday: "Whit Monday", date: "2026-05-25" },
  { country: "Austria", holiday: "Corpus Christi", date: "2026-06-04" },
  { country: "Austria", holiday: "Assumption day", date: "2026-08-15" },
  { country: "Austria", holiday: "National Day", date: "2026-10-26" },
  { country: "Austria", holiday: "All Saints' Day", date: "2026-11-01" },
  { country: "Austria", holiday: "Immaculate Conception", date: "2026-12-08" },
  { country: "Austria", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Austria", holiday: "St. Stephen's Day", date: "2026-12-26" },
  { country: "Belgium", holiday: "New Year’s Day", date: "2026-01-01" },
  { country: "Belgium", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Belgium", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Belgium", holiday: "Ascension Day", date: "2026-05-14" },
  { country: "Belgium", holiday: "Pentecost Monday", date: "2026-05-25" },
  { country: "Belgium", holiday: "National Day", date: "2026-07-21" },
  { country: "Belgium", holiday: "Armistice Day", date: "2026-11-11" },
  { country: "Belgium", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Bulgaria", holiday: "New Year’s Day", date: "2026-01-01" },
  { country: "Bulgaria", holiday: "National Holiday /Bulgaria’s Liberation from the Ottoman Empire", date: "2026-03-03" },
  { country: "Bulgaria", holiday: "Good Friday", date: "2026-04-10" },
  { country: "Bulgaria", holiday: "Holy Saturday", date: "2026-04-11" },
  { country: "Bulgaria", holiday: "Easter Sunday", date: "2026-04-12" },
  { country: "Bulgaria", holiday: "Easter Monday", date: "2026-04-13" },
  { country: "Bulgaria", holiday: "Labour and International Worker’s Solidarity Day", date: "2026-05-01" },
  { country: "Bulgaria", holiday: "Gergyovden (St. George’s Day), and the Bulgarian Army’s Day", date: "2026-05-06" },
  { country: "Bulgaria", holiday: "Bulgarian Education and Culture, and Slavic Script Day", date: "2026-05-25" },
  { country: "Bulgaria", holiday: "Unification Day", date: "2026-09-07" },
  { country: "Bulgaria", holiday: "Independence Day", date: "2026-09-22" },
  { country: "Bulgaria", holiday: "Christmas Eve", date: "2026-12-24" },
  { country: "Bulgaria", holiday: "Christmas Days", date: "2026-12-25" },
  { country: "Bulgaria", holiday: "Christmas Days", date: "2026-12-28" },
  { country: "Croatia", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Croatia", holiday: "Epiphany", date: "2026-01-06" },
  { country: "Croatia", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Croatia", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Croatia", holiday: "Statehood Day", date: "2026-05-30" },
  { country: "Croatia", holiday: "Corpus Christi", date: "2026-06-04" },
  { country: "Croatia", holiday: "Anti-Fascist Resistance Day", date: "2026-06-22" },
  { country: "Croatia", holiday: "Victory and Homeland Thanksgiving Day and the Day of Croatian Defenders", date: "2026-08-05" },
  { country: "Croatia", holiday: "Assumption day", date: "2026-08-15" },
  { country: "Croatia", holiday: "All Saints' Day", date: "2026-11-01" },
  { country: "Croatia", holiday: "Remembrance Day for Homeland War Victims", date: "2026-11-18" },
  { country: "Croatia", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Croatia", holiday: "St. Stephen's Day", date: "2026-12-26" },
  { country: "Cyprus", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Cyprus", holiday: "Epiphany", date: "2026-01-06" },
  { country: "Cyprus", holiday: "Clean Monday", date: "2026-02-23" },
  { country: "Cyprus", holiday: "Greek Revolution Day", date: "2026-03-25" },
  { country: "Cyprus", holiday: "National Holiday", date: "2026-04-01" },
  { country: "Cyprus", holiday: "Orthodox Good Friday", date: "2026-04-10" },
  { country: "Cyprus", holiday: "Orthodox Easter Sunday", date: "2026-04-12" },
  { country: "Cyprus", holiday: "Orthodox Easter Monday", date: "2026-04-13" },
  { country: "Cyprus", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Cyprus", holiday: "Holy Spirit Day", date: "2026-06-01" },
  { country: "Cyprus", holiday: "Assumption Day", date: "2026-08-15" },
  { country: "Cyprus", holiday: "Cyprus Independence Day", date: "2026-10-01" },
  { country: "Cyprus", holiday: "Ochi Day", date: "2026-10-28" },
  { country: "Cyprus", holiday: "Christmas Eve", date: "2026-12-24" },
  { country: "Cyprus", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Cyprus", holiday: "Next day of Christmas", date: "2026-12-26" },
  { country: "Czechia", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Czechia", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Czechia", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Czechia", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Czechia", holiday: "Liberation Day", date: "2026-05-08" },
  { country: "Czechia", holiday: "Saints Cyril and Methodius Day", date: "2026-07-05" },
  { country: "Czechia", holiday: "Jan Hus Day", date: "2026-07-06" },
  { country: "Czechia", holiday: "Czech Statehood Day", date: "2026-09-28" },
  { country: "Czechia", holiday: "Independence Day", date: "2026-10-28" },
  { country: "Czechia", holiday: "Struggle for Freedom and Democracy Day", date: "2026-11-17" },
  { country: "Czechia", holiday: "Christmas Eve", date: "2026-12-24" },
  { country: "Czechia", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Czechia", holiday: "St. Stephen's Day", date: "2026-12-26" },
  { country: "Denmark", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Denmark", holiday: "Palm Sunday", date: "2026-03-29" },
  { country: "Denmark", holiday: "Maundy Thursday", date: "2026-04-02" },
  { country: "Denmark", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Denmark", holiday: "Easter Sunday", date: "2026-04-05" },
  { country: "Denmark", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Denmark", holiday: "Ascension Day", date: "2026-05-14" },
  { country: "Denmark", holiday: "Whit Sunday", date: "2026-05-24" },
  { country: "Denmark", holiday: "Whit Monday", date: "2026-05-25" },
  { country: "Denmark", holiday: "Constitution Day (Denmark)", date: "2026-06-05" },
  { country: "Denmark", holiday: "Christmas Eve", date: "2026-12-24" },
  { country: "Denmark", holiday: "First Day Of Christmas", date: "2026-12-25" },
  { country: "Denmark", holiday: "Second Day of Christmas", date: "2026-12-26" },
  { country: "Estonia", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Estonia", holiday: "Independence Day", date: "2026-02-24" },
  { country: "Estonia", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Estonia", holiday: "Easter Sunday", date: "2026-04-05" },
  { country: "Estonia", holiday: "Spring Day", date: "2026-05-01" },
  { country: "Estonia", holiday: "Whit Sunday", date: "2026-05-24" },
  { country: "Estonia", holiday: "Victory Day", date: "2026-06-23" },
  { country: "Estonia", holiday: "Midsummer Day", date: "2026-06-24" },
  { country: "Estonia", holiday: "Independence Restoration Day", date: "2026-08-20" },
  { country: "Estonia", holiday: "Christmas Eve", date: "2026-12-24" },
  { country: "Estonia", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Estonia", holiday: "2nd Day of Christmas", date: "2026-12-26" },
  { country: "Finland", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Finland", holiday: "Epiphany", date: "2026-01-06" },
  { country: "Finland", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Finland", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Finland", holiday: "May Day", date: "2026-05-01" },
  { country: "Finland", holiday: "Ascension", date: "2026-05-14" },
  { country: "Finland", holiday: "Midsummer Eve", date: "2026-06-19" },
  { country: "Finland", holiday: "Christmas Eve", date: "2026-12-24" },
  { country: "Finland", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Finland", holiday: "Boxing Day", date: "2026-12-26" },
{ country: "France", holiday: "New Year’s Day", date: "2026-01-01" },
  { country: "France", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "France", holiday: "Labour day", date: "2026-05-01" },
  { country: "France", holiday: "Second world war victory", date: "2026-05-08" },
  { country: "France", holiday: "Ascension Day", date: "2026-05-14" },
  { country: "France", holiday: "Pentecost Day", date: "2026-05-25" },
  { country: "France", holiday: "National Holiday", date: "2026-07-14" },
  { country: "France", holiday: "Assumption Day", date: "2026-08-15" },
  { country: "France", holiday: "All Saints’ Day", date: "2026-11-01" },
  { country: "France", holiday: "First world war armistice day", date: "2026-11-11" },
  { country: "France", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Germany", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Germany", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Germany", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Germany", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Germany", holiday: "Ascension Day", date: "2026-05-14" },
  { country: "Germany", holiday: "Whit Monday", date: "2026-05-25" },
  { country: "Germany", holiday: "German Unity Day", date: "2026-10-03" },
  { country: "Germany", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Germany", holiday: "Christmas Day 2", date: "2026-12-26" },
  { country: "Greece", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Greece", holiday: "Epiphany", date: "2026-01-06" },
  { country: "Greece", holiday: "Clean Monday", date: "2026-02-23" },
  { country: "Greece", holiday: "Greek Revolution Day", date: "2026-03-25" },
  { country: "Greece", holiday: "Good Friday", date: "2026-04-10" },
  { country: "Greece", holiday: "Easter Sunday", date: "2026-04-12" },
  { country: "Greece", holiday: "Easter Monday", date: "2026-04-13" },
  { country: "Greece", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Greece", holiday: "Whit Monday", date: "2026-06-01" },
  { country: "Greece", holiday: "Assumption Day", date: "2026-08-15" },
  { country: "Greece", holiday: "Ohi Day", date: "2026-10-28" },
  { country: "Greece", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Greece", holiday: "Glorifying Mother of God", date: "2026-12-26" },
  { country: "Hungary", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Hungary", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Hungary", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Hungary", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Hungary", holiday: "Whit Monday", date: "2026-05-25" },
  { country: "Hungary", holiday: "Semmelweis Day", date: "2026-07-01" },
  { country: "Hungary", holiday: "State Foundation Day", date: "2026-08-20" },
  { country: "Hungary", holiday: "1956 Revolution Memorial Day", date: "2026-10-23" },
  { country: "Hungary", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Ireland", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Ireland", holiday: "St Brigid’s Day", date: "2026-02-02" },
  { country: "Ireland", holiday: "St Patrick's Day", date: "2026-03-17" },
  { country: "Ireland", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Ireland", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Ireland", holiday: "May day", date: "2026-05-04" },
  { country: "Ireland", holiday: "June Bank Holiday", date: "2026-06-01" },
  { country: "Ireland", holiday: "August Bank Holiday", date: "2026-08-03" },
  { country: "Ireland", holiday: "October Bank Holiday", date: "2026-10-26" },
  { country: "Ireland", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Ireland", holiday: "St Stephens Day", date: "2026-12-28" },
  { country: "Italy", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Italy", holiday: "Epiphany", date: "2026-01-06" },
  { country: "Italy", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Italy", holiday: "Liberation from nazi-fascism", date: "2026-04-25" },
  { country: "Italy", holiday: "Labour day", date: "2026-05-01" },
  { country: "Italy", holiday: "Republic day", date: "2026-06-02" },
  { country: "Italy", holiday: "Patron Saint Feast", date: "2026-06-29" },
  { country: "Italy", holiday: "Assumption Day", date: "2026-08-15" },
  { country: "Italy", holiday: "All Saints' Day", date: "2026-11-01" },
  { country: "Italy", holiday: "Feast of the Immaculate Conception", date: "2026-12-08" },
  { country: "Italy", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Italy", holiday: "Saint Stephen's Day", date: "2026-12-26" },
  { country: "Latvia", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Latvia", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Latvia", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Latvia", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Latvia", holiday: "Independence Restoration Day", date: "2026-05-04" },
  { country: "Latvia", holiday: "The postponed holiday", date: "2026-05-05" },
  { country: "Latvia", holiday: "Midsummer's Eve", date: "2026-06-23" },
  { country: "Latvia", holiday: "Saint Johan's Day", date: "2026-06-24" },
  { country: "Latvia", holiday: "Independence Day", date: "2026-11-18" },
  { country: "Latvia", holiday: "Christmas Eve", date: "2026-12-24" },
  { country: "Latvia", holiday: "Christmas", date: "2026-12-25" },
  { country: "Latvia", holiday: "Second Day of Christmas", date: "2026-12-26" },
  { country: "Latvia", holiday: "New Years eve", date: "2026-12-31" },
  { country: "Lithuania", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Lithuania", holiday: "Lithuanian State Restoration Day", date: "2026-02-16" },
  { country: "Lithuania", holiday: "Lithuanian Independence Restoration Day", date: "2026-03-11" },
  { country: "Lithuania", holiday: "Easter Sunday", date: "2026-04-05" },
  { country: "Lithuania", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Lithuania", holiday: "International Labour Day", date: "2026-05-01" },
  { country: "Lithuania", holiday: "Mother's Day", date: "2026-05-03" },
  { country: "Lithuania", holiday: "Father's Day", date: "2026-06-07" },
  { country: "Lithuania", holiday: "St John's Day", date: "2026-06-24" },
  { country: "Lithuania", holiday: "Statehood Coronation of King Mindaugas of Lithuania Day", date: "2026-07-06" },
  { country: "Lithuania", holiday: "The Assumption Day", date: "2026-08-15" },
  { country: "Lithuania", holiday: "All Saints' Day", date: "2026-11-01" },
  { country: "Lithuania", holiday: "All Souls' Day", date: "2026-11-02" },
  { country: "Lithuania", holiday: "Christmas Eve", date: "2026-12-24" },
  { country: "Lithuania", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Lithuania", holiday: "The Second Day of Christmas", date: "2026-12-26" },
  { country: "Luxembourg", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Luxembourg", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Luxembourg", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Luxembourg", holiday: "Europe Day", date: "2026-05-09" },
  { country: "Luxembourg", holiday: "Ascension Day", date: "2026-05-14" },
  { country: "Luxembourg", holiday: "Pentecost Monday", date: "2026-05-25" },
  { country: "Luxembourg", holiday: "National Day", date: "2026-06-23" },
  { country: "Luxembourg", holiday: "Assumption Day", date: "2026-08-15" },
  { country: "Luxembourg", holiday: "All Saints", date: "2026-11-01" },
  { country: "Luxembourg", holiday: "Christmas", date: "2026-12-25" },
  { country: "Luxembourg", holiday: "St Stephen's Day", date: "2026-12-26" },
  { country: "Malta", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Malta", holiday: "Feast of St Paul's Shipwreck", date: "2026-02-10" },
  { country: "Malta", holiday: "Feast of St Joseph", date: "2026-03-19" },
  { country: "Malta", holiday: "Freedom Day", date: "2026-03-31" },
  { country: "Malta", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Malta", holiday: "Workers' Day", date: "2026-05-01" },
  { country: "Malta", holiday: "Sette Giugno", date: "2026-06-07" },
  { country: "Malta", holiday: "Feast of St Peter and St Paul", date: "2026-06-29" },
  { country: "Malta", holiday: "Feast of the Assumption Our Lady (Santa Marija)", date: "2026-08-15" },
  { country: "Malta", holiday: "Victory Day", date: "2026-09-08" },
  { country: "Malta", holiday: "Independence Day", date: "2026-09-21" },
  { country: "Malta", holiday: "Immaculate Conception", date: "2026-12-08" },
  { country: "Malta", holiday: "Republic Day", date: "2026-12-13" },
  { country: "Malta", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Netherlands", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Netherlands", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Netherlands", holiday: "Eastern Monday", date: "2026-04-06" },
  { country: "Netherlands", holiday: "King’s day", date: "2026-04-27" },
  { country: "Netherlands", holiday: "Liberation Day", date: "2026-05-05" },
  { country: "Netherlands", holiday: "Ascension Day", date: "2026-05-14" },
  { country: "Netherlands", holiday: "Pentecost Monday", date: "2026-05-25" },
  { country: "Netherlands", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Netherlands", holiday: "Boxing Day", date: "2026-12-26" },
  { country: "Poland", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Poland", holiday: "Epiphany", date: "2026-01-06" },
  { country: "Poland", holiday: "Easter Sunday", date: "2026-04-05" },
  { country: "Poland", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Poland", holiday: "Worker's Day", date: "2026-05-01" },
  { country: "Poland", holiday: "May 3rd Constitution Day", date: "2026-05-03" },
  { country: "Poland", holiday: "Pentecost Day", date: "2026-05-24" },
  { country: "Poland", holiday: "Corpus Christi Day", date: "2026-06-04" },
  { country: "Poland", holiday: "Assumption Day", date: "2026-08-15" },
  { country: "Poland", holiday: "All Saints Day", date: "2026-11-01" },
  { country: "Poland", holiday: "Independence Day", date: "2026-11-11" },
  { country: "Poland", holiday: "Christmas Eve' Day", date: "2026-12-24" },
  { country: "Poland", holiday: "Christmas", date: "2026-12-25" },
  { country: "Poland", holiday: "Christmas", date: "2026-12-26" },
  { country: "Portugal", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Portugal", holiday: "Carnival", date: "2026-02-17" },
  { country: "Portugal", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Portugal", holiday: "Easter Sunday", date: "2026-04-05" },
  { country: "Portugal", holiday: "Liberation Day", date: "2026-04-25" },
  { country: "Portugal", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Portugal", holiday: "Corpus Christi", date: "2026-06-04" },
  { country: "Portugal", holiday: "Portugal's Day", date: "2026-06-10" },
  { country: "Portugal", holiday: "Saint Antonio's Day", date: "2026-06-13" },
  { country: "Portugal", holiday: "Assumption Day", date: "2026-08-15" },
  { country: "Portugal", holiday: "Proclamation of the Republic Day", date: "2026-10-05" },
  { country: "Portugal", holiday: "All Saint's Day", date: "2026-11-01" },
  { country: "Portugal", holiday: "Independence Restoration Day", date: "2026-12-01" },
  { country: "Portugal", holiday: "Immaculate Conception Day", date: "2026-12-08" },
  { country: "Portugal", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Romania", holiday: "New Year's Day", date: "2026-02-12" },
  { country: "Romania", holiday: "Day after New Year's Day", date: "2026-01-02" },
  { country: "Romania", holiday: "Epiphany/Theophany", date: "2026-01-06" },
  { country: "Romania", holiday: "The Sobor of the Holy Prophet Jonh the Baptize", date: "2026-01-07" },
  { country: "Romania", holiday: "Unification Day", date: "2026-01-24" },
  { country: "Romania", holiday: "World Health Day", date: "2026-04-07" },
  { country: "Romania", holiday: "Orthodox Good Friday of Easter", date: "2026-04-10" },
  { country: "Romania", holiday: "Orthodox Easter Day", date: "2026-04-12" },
  { country: "Romania", holiday: "Orthodox Easter Monday", date: "2026-04-13" },
  { country: "Romania", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Romania", holiday: "Orthodox Pentecost", date: "2026-05-31" },
  { country: "Romania", holiday: "Orthodox Pentecost Monday/Children's Day", date: "2026-06-01" },
  { country: "Romania", holiday: "Saint Mary's Day", date: "2026-08-15" },
  { country: "Romania", holiday: "Saint Andrew's Day", date: "2026-11-30" },
  { country: "Romania", holiday: "Romania’s National Day", date: "2026-12-01" },
  { country: "Romania", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Romania", holiday: "Second day of Christmas", date: "2026-12-26" },
  { country: "Slovakia", holiday: "The day of the establishment of the Slovak Republic", date: "2026-01-01" },
  { country: "Slovakia", holiday: "Epiphany", date: "2026-01-06" },
  { country: "Slovakia", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Slovakia", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Slovakia", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Slovakia", holiday: "Day of Victory over Fascism", date: "2026-05-08" },
  { country: "Slovakia", holiday: "St/ Cyril and St/ Methodius Day", date: "2026-07-05" },
  { country: "Slovakia", holiday: "Slovak National Uprising Day", date: "2026-08-29" },
  { country: "Slovakia", holiday: "Day of the Virgin Mary of the Seven Sorrows", date: "2026-09-15" },
  { country: "Slovakia", holiday: "All Saints Day", date: "2026-11-01" },
  { country: "Slovakia", holiday: "Day of the Fight for Freedom and Democracy", date: "2026-11-17" },
  { country: "Slovakia", holiday: "Christmas Eve", date: "2026-12-24" },
  { country: "Slovakia", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Slovakia", holiday: "Boxing Day/St. Stephen’s Day", date: "2026-12-26" },
  { country: "Slovenia", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Slovenia", holiday: "New Year's Day", date: "2026-01-02" },
  { country: "Slovenia", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Slovenia", holiday: "Labour Day", date: "2026-05-01" },
  { country: "Slovenia", holiday: "National Day", date: "2026-06-25" },
  { country: "Slovenia", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Spain", holiday: "New Year", date: "2026-01-01" },
  { country: "Spain", holiday: "Epiphany Eve", date: "2026-01-06" },
  { country: "Spain", holiday: "St Joseph Day", date: "2026-03-19" },
  { country: "Spain", holiday: "Holy Thursday", date: "2026-04-02" },
  { country: "Spain", holiday: "Holy Friday", date: "2026-04-03" },
  { country: "Spain", holiday: "Labor Day", date: "2026-05-01" },
  { country: "Spain", holiday: "2nd of May Holiday", date: "2026-05-02" },
  { country: "Spain", holiday: "St Isidore's Day", date: "2026-05-15" },
  { country: "Spain", holiday: "St James Day", date: "2026-07-25" },
  { country: "Spain", holiday: "Assumption Day", date: "2026-08-15" },
  { country: "Spain", holiday: "National Day of Spain", date: "2026-10-12" },
  { country: "Spain", holiday: "All Saints' Day", date: "2026-11-02" },
  { country: "Spain", holiday: "Our Lady of the Almudena", date: "2026-11-09" },
  { country: "Spain", holiday: "Constitution Day", date: "2026-12-07" },
  { country: "Spain", holiday: "Immaculate Conception Day", date: "2026-12-08" },
  { country: "Spain", holiday: "Christmas Eve", date: "2026-12-24" },
  { country: "Spain", holiday: "Christmas", date: "2026-12-25" },
  { country: "Spain", holiday: "New Year's Eve", date: "2026-12-31" },
  { country: "Sweden", holiday: "New Year's Day", date: "2026-01-01" },
  { country: "Sweden", holiday: "Epiphany", date: "2026-01-06" },
  { country: "Sweden", holiday: "Good Friday", date: "2026-04-03" },
  { country: "Sweden", holiday: "Easter Monday", date: "2026-04-06" },
  { country: "Sweden", holiday: "May-01", date: "2026-05-01" },
  { country: "Sweden", holiday: "Ascension Day", date: "2026-05-14" },
  { country: "Sweden", holiday: "Midsummer", date: "2026-06-19" },
  { country: "Sweden", holiday: "Christmas Eve", date: "2026-12-24" },
  { country: "Sweden", holiday: "Christmas Day", date: "2026-12-25" },
  { country: "Sweden", holiday: "Boxing Day", date: "2026-12-26" },
  { country: "Sweden", holiday: "New Years' Eve", date: "2026-12-31" }

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
    const url = `https://mcgdcvj-8bxvjrmps6j-r1cp-gk8.rest.marketingcloudapis.com/data/v1/customobjectdata/key/A7774E8B-EFEF-41BB-AC68-210B6C586367/rowset?$filter=Country eq '${encodeURIComponent(country)}'`;

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
  const todayDate = now.toFormat("yyyy-MM-dd");

  /* ---------------Weekend cehck ----------------------*/
  
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

  /* ---------DND check --------------------------------*/

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
 
      console.log("Processing country:", country);
 
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







