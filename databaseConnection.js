require("dotenv").config();
const { MongoClient } = require("mongodb");

const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;

console.log({
  mongodb_host,
  mongodb_user,
  mongodb_password,
  mongodb_database
});

const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/?retryWrites=true&w=majority`;

const client = new MongoClient(atlasURI);

let db;
async function getDatabase() {
  if (!db) {
    await client.connect();
    db = client.db(process.env.MONGODB_DATABASE);
  }
  return db;
}

const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: false,
    namedPlaceholders: true
};


const mysqlPool = mysql.createPool(dbConfig);

module.exports = { getDatabase, mysqlPool };

