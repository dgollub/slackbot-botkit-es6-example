//
// HelpCommand
//

import BaseCommand                  from './BaseCommand.es6';
import { db }                       from '../db.es6';
import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';

import { removeCommandFromMessage, privateMsgToUser } from '../utils.es6';


const COMMAND = "help";

// TODO(dkg): implement commands that allow us to update the bot from the git repository
//            and automatically restart it
const CMDS_HELP = [`^${COMMAND}$`, `^${COMMAND}`];



class HelpCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("HelpCommand");

        super(COMMAND, manager);

        this.onHelp = this.onHelp.bind(this);

        this.listenTo(CMDS_HELP, listenToTypes, this.onHelp);
    }

    helpText() {
        return this.helpShortDescription();
    }

    helpShortDescription() {
        return `*${this.name}* displays available commands or help for a specific command.`;
    }

    onHelp(bot, message) {
        console.log("onHelp");

        let commands = this.manager.commands || [];
        let helpForCommand = removeCommandFromMessage(message, CMDS_HELP);
        let reply = [];

        let fnFormatCommandHelp = (cmd, useFullDescription=false, alt="") => {
            if (!cmd) return alt;
            let msg = "";
            try {
                msg = useFullDescription ? cmd.helpText() : cmd.helpShortDescription();
            } catch(err) {
                msg = `Command '${cmd.name}' has no help available. :-(`;
            }
            return msg;
        };

        if (helpForCommand.length > 0) {
            helpForCommand = helpForCommand.toLowerCase();
            
            let cmd = commands.find(c => c.name === helpForCommand);
            let msg = fnFormatCommandHelp(cmd, true, `There is no command *${helpForCommand}* available for this bot.`);
            
            reply.push(msg);

        } else {
            reply.push("Available commands are:\n");

            for (let cmd of commands) {
                let msg = fnFormatCommandHelp(cmd);
                reply.push(msg);
            }
        }

        bot.reply(message, reply.join("\n\n"));
    }

}

export { HelpCommand as default };
