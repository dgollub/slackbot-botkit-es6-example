//
// Our core logic for our bot is here.
// 

import { _ }                from 'lodash';
import { db }               from './db.es6';
import AdminCommand         from './commands/AdminCommand.es6';
import FactCommand          from './commands/FactCommand.es6';
import RandomNumberCommand  from './commands/RandomNumberCommand.es6';


const LISTEN_TO_DIRECT_MESSAGE = "direct_message";
const LISTEN_TO_DIRECT_MENTION = "direct_mention";
const LISTEN_TO_MENTION = "mention";
const LISTEN_TO_AMBIENT = "ambient";
const LISTEN_TO_MESSAGES = "message_received";

const LISTEN_TO_OTHERS = [LISTEN_TO_MESSAGES, LISTEN_TO_AMBIENT, LISTEN_TO_MENTION].join(',');
const LISTEN_TO_ALL_BUT_AMBIENT = [LISTEN_TO_DIRECT_MESSAGE, LISTEN_TO_DIRECT_MENTION, LISTEN_TO_MENTION].join(',');
const LISTEN_TO_ALL = [LISTEN_TO_MESSAGES, LISTEN_TO_AMBIENT, LISTEN_TO_DIRECT_MESSAGE, LISTEN_TO_DIRECT_MENTION, LISTEN_TO_MENTION].join(',');


const CMDS_TELL_GIT = ["tell git", "branch", "commit", "show git", "show version", "version"];
const CMDS_HELP = ["^help$", "~?"];

class Bot {

    constructor(controller, slackInfo) {
        this.controller = controller;
        this.slackInfo = slackInfo;

        // this is annoying boilerplate
        this.onUserChange = this.onUserChange.bind(this);
        this.onTeamJoin = this.onTeamJoin.bind(this);
        this.updateCacheUserInfo  = this.updateCacheUserInfo.bind(this);

        this.onShowGitInformation = this.onShowGitInformation.bind(this);
        this.onHelp = this.onHelp.bind(this);

        this.listenTo = this.listenTo.bind(this);

        // listen to team_join and user_change events to make sure you update your cached user list

        this.controller.on('team_join', this.onTeamJoin);
        this.controller.on('user_change', this.onUserChange);

        this.commands = [];
        this.commands.push(new AdminCommand(controller, slackInfo, LISTEN_TO_ALL_BUT_AMBIENT));
        this.commands.push(new FactCommand(controller, slackInfo, LISTEN_TO_ALL_BUT_AMBIENT));
        this.commands.push(new RandomNumberCommand(controller, slackInfo, LISTEN_TO_ALL));

        // TODO(dkg): implement this git command as GitCommand
        this.listenTo(CMDS_TELL_GIT, LISTEN_TO_ALL_BUT_AMBIENT, this.onShowGitInformation);

        this.listenTo(CMDS_HELP, LISTEN_TO_ALL, this.onHelp);
    }

    listenTo(messages, whatToListenTo, callback) {
        console.log(`listenTo(${messages}, ${whatToListenTo}, cb)`);
        let ms = Array.isArray(messages) ? messages : [messages];
        this.controller.hears(ms, whatToListenTo, callback);
    }

    onShowGitInformation(bot, message) {
        console.log("onShowGitInformation");        
    }

    onHelp(bot, message) {
        console.log("onHelp");

        let reply = ["Available commands are:\n"];

        for (let cmd of this.commands) {
            let msg = "";
            try {
                msg = cmd.helpText();
            } catch(err) {
                msg = `Command '${cmd.name}' has no help available. :-(`;
            }
            reply.push(msg);
        }

        bot.reply(message, reply.join("\n\n"));
    }
    
    onTeamJoin(bot, message) {
        this.updateCacheUserInfo(message.user);
    }
    onUserChange(bot, message) {
        this.updateCacheUserInfo(message.user);
    }
    updateCacheUserInfo(user) {
        console.log("Need to add or update cached info for user ", user.id);

        let users = this.getListOfSlackUsers();
        let idx = users.findIndex((u) => u.id === user.id);

        if (idx !== -1) {
            this.slackInfo.users[idx] = user;
        } else {

            if (users.length === 0) {
                this.slackInfo.users = [];
            }
            this.slackInfo.users.push(user);

            controller.storage.users.save(user, (err, id) => {
                if (err) {
                    console.error("Could not add user to internal cache.", err, user);
                }
            });
        }
    }

    getListOfSlackUsers() {
        let info = this.slackInfo || null;
        if (info === null || !Array.isArray(info.users)) {
            console.warn("No slack info set. You need to conect to Slack first before constructing the bot and using this call.");
            return [];
        }
        return info.users;
    }

    loadUserFromMessage(message, cb) {

        let [ controller, info ] = [ this.controller, this.slackInfo ];
        let self = this;

        controller.storage.users.get(message.user, (err, user) => {
        
            if (!user) {

                // console.log(message, message.text, message.user);

                let uid = message.user || "-1doesnotexists";
                let users = self.getListOfSlackUsers();
                let foundUser = users.find((u) => u.id === uid);

                // console.log(uid, users.length, foundUser);

                if (foundUser) {
                    user = foundUser;
                }
            }

            if (user) {
                controller.storage.users.save(user, (err, id) => {
                    if (cb) {
                        cb(user);
                    }
                });
            } else {
                console.warn("Could not find user in message.");
            }

        });

    }

}


export { Bot as default };
