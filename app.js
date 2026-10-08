require("./utils.js");
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const connectMongo = require("connect-mongo");
const MongoStore = connectMongo.MongoStore || connectMongo.default || connectMongo;

const db_utils = include("database/db_utils");
const db_setup = include("database/create_tables");

const dashboardRouter = include("routes/dashboard");
const authRouter = include("routes/auth");
const contentRouter = include("routes/content");
const publicContentRouter = include("routes/publicContent");


const app = express();
const port = process.env.PORT || 3000;


app.set("view engine", "ejs");
app.set("views", "./views");

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

app.use((req, res, next) => {
    res.locals.loggedIn = !!req.session.userId;
    next();

});

app.locals.expireTime = expireTime;

app.get('/', (req, res) => {
     res.render("index");
});

app.use("/content", contentRouter);
app.use("/dashboard", dashboardRouter);
app.use("/", authRouter);
app.use("/c", publicContentRouter
);

app.use((req, res) => {
    res.status(404).render("404");

});


//Start server
async function startServer() {

  await db_utils.printMySQLVersion();
  const ok = await db_setup.createTables();

   if (!ok) {
    console.log("Table creation failed. Server not started.");
    process.exit(1);
  }

    app.listen(port, () => {
        console.log(`Node application listening on port ${port}`);
    });
}
startServer().catch((err) => console.error("Failed to start server:", err));

