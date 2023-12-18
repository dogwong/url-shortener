// imports
require("dotenv").config();
const express = require("express");
const serverTiming = require('server-timing');
const { Sequelize, DataTypes, Model } = require("sequelize");
const fs = require("fs");
const validUrl = require("valid-url");
const geoip = require("geoip-lite");
const isbot = require("isbot");

// variables
/** @type {import("sequelize").Sequelize} */
let sequelize;
/** @type {Object.<string, import("sequelize").ModelCtor<Model<any, any>>>} */
let Models = {};

const app = express();
app.use(serverTiming());
const router = express.Router();

const PORT = process.env.PORT || 5000;

async function init () {
  process.env.NODE_ENV = process.env.NODE_ENV || "development";
  console.log(`env = ${process.env.NODE_ENV}`);

  // apply docker secret
  if (!process.env["DB_PASSWORD"] && fs.existsSync(process.env["DB_PASSWORD_FILE"])) {
    process.env["DB_PASSWORD"] = fs.readFileSync(process.env["DB_PASSWORD_FILE"]);
    console.log("file applied");
  }

  // check env variables
  function nullCheck(...args) {
    args.map(arg => {
      if (!process.env[arg])
        throw new Error(`Missing env variable: ${arg}`);
    });
  }
  // pre-launch env variable check
  nullCheck("DB_ADDR", "DB_DATABASE", "DB_USER", "DB_PASSWORD");

  if (process.env.NODE_ENV == "development")
    console.log(`DB_ADDR = ${process.env["DB_ADDR"]}, DB = ${process.env["DB_DATABASE"]}, user = ${process.env["DB_USER"]}, pw = ${process.env["DB_PASSWORD"]}`);

  console.log(`home page = ${process.env.HOMEPAGE || "(not set)"}`);

  // connect to database
  try {
    sequelize = new Sequelize(process.env["DB_DATABASE"], process.env["DB_USER"], process.env["DB_PASSWORD"], {
      host: process.env["DB_ADDR"],
      port: 3306,
      dialect: 'mariadb',
      logging: (process.env.NODE_ENV && process.env.NODE_ENV == "development") ? console.log : false,
      dialectOptions: {
        supportBigNumbers: true,
        bigNumberStrings: true,
        autoJsonMap: false,
      }
    });
  } catch (err) {
    console.error("DB error", err);
  }
  
  let _model = require("./models/models.js")(sequelize, DataTypes);
  if (process.env.NODE_ENV == "development") {
    console.log("Models sync...");
    for (const key in _model) {
      if (Object.hasOwnProperty.call(_model, key)) {
        /** @type {ModelCtor<Model<any, any>>} */
        const element = _model[key];
        Models[key] = element;
        console.log("DB syncing " + key + "...");
        
        await element.sync({ alter: true });
      }
    }
    console.log("Models synced");
  }

  app.listen(PORT, () => console.log(`server started, listening port ${PORT}`));

}
init();

// routes
app.use('/',
  router.get("/:code", async (req, res) => {
    res.startTime("process", "request processing");
    try {
      console.log("GET " + req.params.code);
      console.log(req.headers);
      
      const shortUrl = req.params.code;

      // simple check
      if (shortUrl.length > 40 || (new TextEncoder().encode(shortUrl)).length > 20) {
        console.log("too long");
        res.endTime("process");
        return res.status(404).send("URL not found");
      }

      // query database
      res.startTime("query", "query");
      let row = await Models.Url.findOne({
        attributes: ["id", "longUrl"],
        where: {
          shortUrl: shortUrl,
          deleted: false,
        }
      });
      res.endTime("query");
      console.log("findOne = ", row);
      if (!row) {
        res.endTime("process");
        return res.status(404).send("URL not found");
      }
      
      if (process.env.NODE_ENV != "development" || shortUrl == "healthcheck") {
        res.redirect(row.longUrl);
      }
      
      if (shortUrl == "healthcheck") {
        return;
      }
      
      res.startTime("record", "record");
      row.increment({ click: 1 }).catch((err) => {
        console.error(`failed to increment for ${shortUrl}`, err);
      });
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
      
      const isBot = isbot(req.get("user-agent"));
      Models.Engagement.create({
        shortUrl: shortUrl,
        ip: ip,
        country: req.headers["cf-ipcountry"] || geoip.lookup(ip)?.country,
        referer: req.headers["referer"],
        userAgent: req.headers["user-agent"],
        isBot: isBot,
        secChUa: req.headers["sec-ch-ua"],
        secChUaMobile: req.headers["sec-ch-ua-mobile"],
        secChUaPlatform: req.headers["sec-ch-ua-platform"],
      }).catch((err) => {
        console.error(`failed to log engagement for ${shortUrl}`, err);
      });
      res.endTime("record", "record");

      if (process.env.NODE_ENV == "development") {
        res.redirect(row.longUrl);
      }

      // return res.send(shortUrl + "<br>length = " + (new TextEncoder().encode(shortUrl)).length);
      
      
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        res.endTime("process");
        res.status(500).send("Error");
      }
    }
  }),
  router.get("/", async (req, res) => {
    if (process.env.HOMEPAGE) {
      res.redirect(process.env.HOMEPAGE);
    } else {
      res.send("");
    }
  })
);

process.on("exit",() => {
  console.log("process.exit() method is fired")
})
