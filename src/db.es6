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

// TODO(dkg): each command class/instance should take care of their table on their own
//            same for selects, updates, inserts, etc.
let initDbTables = () => {
    // Create internal user table, do not confuse with slack users!
    // We will use this to allow certain users to be admins for this bot
    // and configure it during runtime via the slack interface.
    // All admins have super powers and can do everything and anything.
    // If you want more fine-grained control you could introduce user groups, permissions, etc.
    db.run("CREATE TABLE IF NOT EXISTS user (id INTEGER PRIMARY KEY AUTOINCREMENT, userid VARCHAR(255), name VARCHAR(255), email VARCHAR(255))");
    db.run("CREATE TABLE IF NOT EXISTS fact (id INTEGER PRIMARY KEY AUTOINCREMENT, fact TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY AUTOINCREMENT, userid VARCHAR(255))");
    db.run("CREATE TABLE IF NOT EXISTS karma (id INTEGER PRIMARY KEY AUTOINCREMENT, userid VARCHAR(255), karma INTEGER DEFAULT 0, reason TEXT)");
};


let initializeDatabaseTables = () => {
    db.serialize(() => {
        initDbTables();
    });
};


let sqlSelect = async (sql) => {

    let p = new Promise((resolve, reject) => {        
        db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });

    return p;
};

let sqlInsert = async (table, fieldsToUse, valuesToInsert) => {
    let fields = [].concat(fieldsToUse);
    let values = [].concat(valuesToInsert);

    // console.log("db fields", fields);
    // console.log("db values", values);

    let p = new Promise((resolve, reject) => {

        let vs = values.length === 1 ? "?" : "?, ".repeat(values.length);
        // console.log("testing", vs);

        let pos = vs.lastIndexOf("?,");

        vs = pos > -1 ? vs.substr(0, pos+1) : vs;

        let sql = `INSERT INTO ${table} (${fields.join(", ")}) VALUES (${vs}) `;

        // console.log("vs", vs);
        console.log("sql", sql);
        
        // NOTE(dkg): have to use ES5 syntax for callback, because ES6 fat arrow functions
        //            have their own way with 'this', which doesn't work with the sqlite
        //            nicely in this case.
        // see details here https://github.com/mapbox/node-sqlite3/issues/560
        db.run(sql, values, function(err) {
            if (err) {
                console.error("DB INSERT error!", err);
                reject(err);
            } else {
                resolve(this);
            }
        });
    });

    let stmt = await p;

    return stmt;
};

let sqlUpdate = async (table, id, fieldsToUse, valuesToInsert) => {
    let fields = [].concat(fieldsToUse);
    let values = [].concat(valuesToInsert);
    let sql = `UPDATE ${table} SET `;
    let options = { $id: id };

    for (let i = 0; i < fields.length; i++) {
        let [ field, value ] = [ fields[i], values[i] ];        
        let set = `${field} = $${field}`;

        sql += set;

        if (i < fields.length - 1) {
            sql += ",";
        }

        options[`$${field}`] = value;
    }
    sql += ` WHERE id = $id`;

    console.log("sql", sql);

    let p = new Promise((resolve, reject) => {
        db.run(sql, options, function(err) {
            if (err) {
                console.error("DB UPDATE error!", err);
                reject(err);
            } else {
                resolve(this);    
            }
        });
    });

    let stmt = await p;

    return stmt;
};

// TODO(dkg): this and sqlUpdate look quite similar, maybe merge them?!
let sqlDelete = async (table, fieldsToUse, valuesForWhere) => {
    let fields = [].concat(fieldsToUse);
    let values = [].concat(valuesForWhere);
    let sql = `DELETE FROM ${table} WHERE `;
    let options = {};

    for (let i = 0; i < fields.length; i++) {
        let [ field, value ] = [ fields[i], values[i] ];        
        let set = `${field} = $${field}`;

        sql += set;

        if (i < fields.length - 1) {
            sql += ",";
        }

        options[`$${field}`] = value;
    }

    console.log("sql", sql, options);

    let p = new Promise((resolve, reject) => {        
        db.run(sql, options, (err, rows) => {
            if (err) {
                console.error("DB DELETE error!", err);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });

    let stmt = await p;

    return stmt;
};

export {
    db,
    initializeDatabaseTables,
    sqlSelect,
    sqlInsert,
    sqlUpdate,
    sqlDelete
};
