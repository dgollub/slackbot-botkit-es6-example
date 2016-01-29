//
// CommandManager
// Our core logic for our bot is here.
// Manage all our available commands.
// 

import { _ }                from 'lodash';
import { db }               from './db.es6';
import AdminCommand         from './commands/AdminCommand.es6';
import FactCommand          from './commands/FactCommand.es6';
import GitCommand           from './commands/GitCommand.es6';
import HelpCommand          from './commands/HelpCommand.es6';
import KarmaCommand         from './commands/KarmaCommand.es6';
import RandomNumberCommand  from './commands/RandomNumberCommand.es6';
import UptimeCommand        from './commands/UptimeCommand.es6';
import CatchAllCommand      from './commands/CatchAllCommand.es6';

import {
    LISTEN_TO_DIRECT_MESSAGE,
    LISTEN_TO_OTHERS,
    LISTEN_TO_ALL_BUT_AMBIENT,
    LISTEN_TO_BOTNAME,
    LISTEN_TO_ALL
} from './constants.es6';


// TODO(dkg): add a catch all command that catches all direct messages that are not actively handled by
//            an assigned/specialized command and return a message ala "sorry, command unknown - try again"
//            message (or use fuzzy logic to suggest a more sutable command)
class CommandManager {

    constructor(controller, slackInfo) {
        this.controller = controller;
        this.slackInfo = slackInfo;

        // this is annoying boilerplate
        this.onUserChange = this.onUserChange.bind(this);
        this.onTeamJoin = this.onTeamJoin.bind(this);
        this.updateCacheUserInfo  = this.updateCacheUserInfo.bind(this);

        // listen to team_join and user_change events to make sure you update your cached user list
        this.controller.on('team_join', this.onTeamJoin);
        this.controller.on('user_change', this.onUserChange);

        this.commands = [];
        this.commands.push(new AdminCommand(this, LISTEN_TO_ALL_BUT_AMBIENT));
        this.commands.push(new FactCommand(this, LISTEN_TO_ALL_BUT_AMBIENT));
        this.commands.push(new GitCommand(this, LISTEN_TO_BOTNAME));
        this.commands.push(new RandomNumberCommand(this, LISTEN_TO_ALL_BUT_AMBIENT));
        this.commands.push(new HelpCommand(this, LISTEN_TO_ALL_BUT_AMBIENT));
        this.commands.push(new KarmaCommand(this, LISTEN_TO_ALL));
        this.commands.push(new UptimeCommand(this, LISTEN_TO_BOTNAME));

        // This must be the last command to add in order for it to work!
        this.commands.push(new CatchAllCommand(this, LISTEN_TO_BOTNAME));
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


export { CommandManager as default };
