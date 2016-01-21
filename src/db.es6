//
// SQLite access
// 

import fs       from 'fs';
import path     from 'path';
import Promise  from 'bluebird';

// console.log("require.main.filename", require.main.filename)

let dbPath = path.resolve(path.dirname(require.main.filename), "data");
let dbFile = path.resolve(dbPath, "bot.sqlite");

try {
    fs.accessSync(dbPath, fs.R_OK | fs.W_OK);
} catch(err) {
    console.error(`Could not read from ${dbPath}. Creating it.`);
    fs.mkdirSync(dbPath);
}

console.log("dbFile", dbFile);

let sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database(dbFile); // sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, cb

let initDbTables = () => {
    // Create internal user table, do not confuse with slack users!
    // We will use this to allow certain users to be admins for this bot
    // and configure it during runtime via the slack interface.
    // All admins have super powers and can do everything and anything.
    // If you want more fine-grained control you could introduce user groups, permissions, etc.
    db.run("CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY AUTOINCREMENT, userid VARCHAR(255), name VARCHAR(255), email VARCHAR(255))");
    db.run("CREATE TABLE IF NOT EXISTS fact (id INTEGER PRIMARY KEY AUTOINCREMENT, fact TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY AUTOINCREMENT, userid VARCHAR(255))");
};

let initializeDatabaseTables = () => {
    db.serialize(() => {
        initDbTables();
    });
};


export { db, initializeDatabaseTables };
