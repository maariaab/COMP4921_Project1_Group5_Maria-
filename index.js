require("./utils.js");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const connectMongo = require("connect-mongo");
const MongoStore = connectMongo.MongoStore || connectMongo.default || connectMongo;

const app = express();
const port = process.env.PORT || 3000;

/** Middleware */
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

const expireTime = 1 * 60 * 60 * 1000; // 1 hour

/* secrets */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;
/* end secrets */

const mongoStore = MongoStore.create({
  //mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}?retryWrites=true&w=majority`,
  mongoUrl: `mongodb+srv://${encodeURIComponent(mongodb_user)}:` + `${encodeURIComponent(mongodb_password)}@` + `${mongodb_host}/${mongodb_database}` + `?retryWrites=true&w=majority`,
  collectionName: "sessions",
  ttl: expireTime / 1000, // seconds
  crypto: { secret: mongodb_session_secret },
});

app.use(
  session({
    secret: node_session_secret,
    store: mongoStore,
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: expireTime,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

app.locals.expireTime = expireTime;

app.get("/", (req, res) => {
    res.send("Hello World!");
});

async function startServer() {
    app.listen(port, () => {
        console.log(`Node application listening on port ${port}`);
    });
}
startServer().catch((err) => console.error("Failed to start server:", err));
