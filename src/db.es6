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

let initializeDatabaseTables = () => {
    // Create internal user table, do not confuse with slack users!
    // We will use this to allow certain users to be admins for this bot
    // and configure it during runtime via the slack interface.
    // All admins have super powers and can do everything and anything.
    // If you want more fine-grained control you could introduce user groups, permissions, etc.
    db.run("CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY AUTOINCREMENT, userid VARCHAR(255), name VARCHAR(255), email VARCHAR(255))");
    db.run("CREATE TABLE IF NOT EXISTS fact (id INTEGER PRIMARY KEY AUTOINCREMENT, fact TEXT)");
};

db.serialize(() => {
    initializeDatabaseTables();
});


let dbGetFacts = () => {
    let p = new Promise((resolve, reject) => {
        console.log("getFacts");
        db.all("SELECT * FROM fact ORDER BY id", [], (err, rows) => {
            if (err) {
                console.error("DB SELECT error!", err);
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
    return p;
};

let dbAddFact = (fact) => {
    console.log("addFact");
    let p = new Promise((resolve, reject) => {
        // NOTE(dkg): have to use ES5 syntax for callback, because ES6 fat arrow functions
        //            have their own way with 'this', which doesn't work with the sqlite
        //            nicely in this case.
        // see details here https://github.com/mapbox/node-sqlite3/issues/560
        db.run("INSERT INTO fact (fact) VALUES (?) ", fact.trim(), function(err) {
            if (err) {
                console.error("DB INSERT error!", err);
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
    return p;
};

let dbUpdateFact = (id, fact) => {
    console.log("updateFact");
    let p = new Promise((resolve, reject) => {
        db.run("UPDATE fact SET fact = $fact WHERE id = $id", {
            $id: id,
            $fact: fact
        }, function(err) {
            if (err) {
                console.error("DB UPDATE error!", err);
                reject(err);
            } else {
                resolve(this);    
            }
        });
    });
    return p;
};


export { db, dbGetFacts, dbAddFact, dbUpdateFact };
