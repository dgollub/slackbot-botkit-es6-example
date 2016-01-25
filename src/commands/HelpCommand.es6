//
// HelpCommand
//

import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';

import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';

import { privateMsgToUser }         from '../utils.es6';


const COMMAND = "help";
const BRIEF_DESCRIPTION = `displays available commands or help for a specific command`;


class HelpCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("HelpCommand");

        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes);

        this.onHelp = this.onHelp.bind(this);

        const options = [
            new Option(this.name, ["", "info", "?"], ["", "info$", "\\?"], "", this.onHelp, BRIEF_DESCRIPTION)
        ];

        this.setupOptions(options);
    }

    helpText() {
        return this.helpShortDescription();
    }

    onHelp(bot, message) {
        console.log("onHelp");

        let commands = this.manager.commands || [];
        let helpForCommand = this.getCommandArguments(message, this.onHelp);
        let reply = [];

        let fnFormatCommandHelp = (cmd, useFullDescription=false, alt="") => {
            if (!cmd) return alt;
            let msg = "";
            try {
                msg = useFullDescription ? cmd.helpText() : cmd.helpShortDescription();
            } catch(err) {
                console.error(`${cmd.name} error: ${err.message}`);
                msg = `Command '${cmd.name}' has no help available. :-(`;
            }
            return msg;
        };

        if (helpForCommand !== null && helpForCommand.length > 0) {
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
