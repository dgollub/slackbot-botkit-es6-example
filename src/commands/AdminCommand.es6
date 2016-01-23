//
// AdminCommand
// Very simple admin strucutre: users in the admin group / db table can do everything they want
// and manipulate the bot with the commands available. They don't have their own passwords though.
// Very simple. So if you need more fine grained control or even different permissions for 
// different actions or users, you'll have to change this.
//

import config                       from '../configuration.es6';
import BaseCommand                  from './BaseCommand.es6';

import { db }                       from '../db.es6';
import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';

import { removeCommandFromMessage, getUserFromList, getUserName, privateMsgToUser } from '../utils.es6';

const COMMAND = "admin";

const CMDS_ADD    = [`^${COMMAND} add`];
const CMDS_DELETE = [`^${COMMAND} delete`, `^${COMMAND} remove`, `^${COMMAND} rm`];
const CMDS_LIST   = [`^${COMMAND} list`, `^${COMMAND} help`, `^${COMMAND}$`];

const DB_TABLE = "admin";
const SUPERUSER_PWD = config.superadminpassword;


let dbGetAdmins = () => {
    let p = new Promise((resolve, reject) => {
        console.log("dbGetAdmins");
        db.all(`SELECT * FROM ${DB_TABLE} ORDER BY id`, [], (err, rows) => {
            if (err) {
                console.error("DB SELECT error!", err);
                reject(err);
            } else {
                console.log("admins get from db success");
                resolve(rows);
            }
        });
    });
    return p;
};

let dbAddAdmin = (userId) => {
    console.log("dbAddAdmin", userId);
    let p = new Promise((resolve, reject) => {
        // NOTE(dkg): have to use ES5 syntax for callback, because ES6 fat arrow functions
        //            have their own way with 'this', which doesn't work with the sqlite
        //            nicely in this case.
        // see details here https://github.com/mapbox/node-sqlite3/issues/560
        db.run(`INSERT INTO ${DB_TABLE} (userid) VALUES (?)`, userId.trim(), function(err) {
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

let dbDeleteAdmin = (userId) => {
    console.log("dbDeleteAdmin", userId);
    let p = new Promise((resolve, reject) => {
        db.run(`DELETE FROM ${DB_TABLE} WHERE userid = $userid`, {
            $userid: userId
        }, function(err) {
            if (err) {
                console.error("DB DELETE error!", err);
                reject(err);
            } else {
                resolve(this);    
            }
        });
    });
    return p;
};


class AdminCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("AdminCommand");

        super(COMMAND, manager);

        this.onAddAdmin = this.onAddAdmin.bind(this);
        this.dbDeleteAdmin = this.dbDeleteAdmin.bind(this);
        this.onGetAdminList = this.onGetAdminList.bind(this);
        
        this.listenTo(CMDS_ADD, listenToTypes, this.onAddAdmin);
        this.listenTo(CMDS_DELETE, listenToTypes, this.dbDeleteAdmin);
        this.listenTo(CMDS_LIST, listenToTypes, this.onGetAdminList);
    }

    helpText() {
        return this.helpShortDescription();
    }

    helpShortDescription() {
        return `*${this.name}* allows you to display and promote (or demote) users to (or from) admin status.`;
    }

    onGetAdminList(bot, message) {
        console.log("onGetAdminList");
        
        const slackInfo = this.slackInfo;

        let fnGetAdminListAndReply = async (conversation) => {

            try {
                let admins = await dbGetAdmins();
                let reply = [];

                if (!admins || admins.length === 0) {
                    reply.push("No admins assigned yet.");
                } else {
                    let users = slackInfo.users || [];

                    let msg = "```" + _.reduce(admins, (result, admin) => {
                        let user = users.find(u => u.id === admin.userid);
                        return `${result}\n${user.name}`;
                    }, "") + "```";

                    reply.push(`Known admins:\n${msg}`);
                }

                let msg = reply.join("");

                // reply publicly only
                bot.reply(message, msg);
                
                // conversation.say(msg);
                conversation.next();

            } catch(err) {
                console.log("error?", err);
                conversation.say(`Sorry. An error happend.\nError: ${err.message}`);
                conversation.next();
            }
        }; 

        bot.startPrivateConversation(message, (err, conversation) => {
            conversation.ask("Password, please.", (message, conversation) => {
                let pwd = removeCommandFromMessage(message, CMDS_LIST);
                if (pwd === SUPERUSER_PWD) {
                    fnGetAdminListAndReply(conversation);
                } else {
                    conversation.say("You are off the project!");
                    conversation.next();
                }
            }); // conversation.ask(pwd pls)
        }); // startPrivateConversation

    }

    dbDeleteAdmin(bot, message) {
        console.log("dbDeleteAdmin");

        let possibleUserName = getUserName(removeCommandFromMessage(message, CMDS_DELETE));
        let user = getUserFromList(this.slackInfo.users || [], possibleUserName)

        if (!user) {
            bot.reply(message, `Sorry, could not find a user with the name ${possibleUserName}.`);
            return;
        }

        let fnDeleteAdminUserAndReply = async (user, conversation) => {

            try {
                let admins = await dbGetAdmins();
                let found = admins.find(a => a.userid === user.id);

                if (!found) {
                    conversation.say(`The user ${user.name} is not an admin.`);
                    conversation.next();
                    return;
                }
            } catch(err) {
                console.error(`Could not get the list of admins. :-( Reason: ${err.message}`);
                conversation.say(`The admin list could not be accessed. :-( Reason: ${err.message}`);
                conversation.next();
                return;
            }

            dbDeleteAdmin(user.id)
                .then((stmt) => {
                    privateMsgToUser(bot, user.id, "Your admin powers have been taken away from you.\nYou are not worthy.");
                    conversation.say(`Deleted the user ${user.name} from my admin database.`);
                    conversation.next();
                })
                .catch((err) => {
                    console.log("error?", err);
                    conversation.say(`Sorry. An error happend.\nError: ${err}`);
                    conversation.next();
                });
        }

        bot.startPrivateConversation(message, (err, conversation) => {
            conversation.ask("Password, please.", (message, conversation) => {
                let pwd = removeCommandFromMessage(message, CMDS_LIST);
                if (pwd === SUPERUSER_PWD) {
                    fnDeleteAdminUserAndReply(user, conversation);
                } else {
                    conversation.say("Access denied!");
                    conversation.next();
                }
            }); // conversation.ask(pwd pls)
        }); // startPrivateConversation
    }

    onAddAdmin(bot, message) {
        console.log("onAddAdmin");

        let possibleUserName = getUserName(removeCommandFromMessage(message, CMDS_ADD));
        let user = getUserFromList(this.slackInfo.users || [], possibleUserName)

        if (!user) {
            bot.reply(message, `Sorry, could not find a user with the name ${possibleUserName}.`);
            return;
        }

        let fnAddAdminUserAndReply = async (user, conversation) => {

            try {
                let admins = await dbGetAdmins();
                let found = admins.find(a => a.userid === user.id);

                if (found) {
                    conversation.say(`The user ${user.name} is already an admin.`);
                    conversation.next();
                    return;
                }
            } catch(err) {
                console.error(`Could not get the list of admins. :-( Reason: ${err.message}`);
                conversation.say(`The admin list could not be accessed. :-( Reason: ${err.message}`);
                conversation.next();
                return;
            }

            dbAddAdmin(user.id)
                .then((stmt) => {
                    privateMsgToUser(bot, user.id, "You were added to my admin database as admin.");
                    conversation.say(`Added the user ${user.name} as admin to my database. ID#${stmt.lastID}`);
                    conversation.next();
                })
                .catch((err) => {
                    console.log("error?", err);
                    conversation.say(`Sorry. An error happend.\nError: ${err}`);
                    conversation.next();
                });
        }

        bot.startPrivateConversation(message, (err, conversation) => {
            conversation.ask("Password, please.", (message, conversation) => {
                let pwd = removeCommandFromMessage(message, CMDS_LIST);
                if (pwd === SUPERUSER_PWD) {
                    fnAddAdminUserAndReply(user, conversation);
                } else {
                    conversation.say("Access denied!");
                    conversation.next();
                }
            }); // conversation.ask(pwd pls)
        }); // startPrivateConversation
        
    }

}



export { 
    AdminCommand as default, 
    dbGetAdmins as getAdminList
};
