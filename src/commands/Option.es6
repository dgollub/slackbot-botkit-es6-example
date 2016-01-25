//
// Option
// An option for a command. A "sub command" if you will.
//

class Option {

    constructor(command, option, regex, parameters=null, onCallback=null, helpOptionText=null, needsAdmin=false) {
        this.command = command;
        this.option = [].concat(option);
        this.regex = [].concat(regex);
        this.parameters = !!parameters ? [] : [].concat(parameters);
        this.onCallback = onCallback || null;
        this.helpOptionText = helpOptionText || "No help available. :-(";
        this.needsAdmin = !!needsAdmin;

        // sanity checks
        if (this.option.length != this.regex.length) {
            let msg = `Error in command option ${this.command}:
            options and regular expressions for the listening parameter need to be the same in number.`;
            throw Error(msg);
        }

        if (typeof this.onCallback != "function") {
            let msg = `Error in command option ${this.command} ${this.option}:
            no callback function defined. Please do so.`;
            throw Error(msg);
        }
    }

    getOptionsAndRegexes() {
        let [ options, regexes ] = [ this.option, this.regex ];
        let [ ol, rel ] = [ options.length, regexes.length ];

        // this should not happen ... but we all know how that goes ... famous last words, Murphy, etc.
        if (ol != rel) {
            throw Error(`Command Option ${command}: RegEx pattern and options numbers do not match.`);
        }

        return [options, regexes];
    }

    getListenToPatterns() {
        let command = this.command;
        let commands = [];

        let [ options, regexes ] = this.getOptionsAndRegexes();

        for (let i = 0; i < regexes.length; i++) {
            let [ option, regex ] = [ options[i], regexes[i] ];

            let cmd = option.length === 0 ? `^${command}${regex}` : `^${command} ${regex}`;
            commands.push(cmd);
        }

        return commands;
    }

    getReadableCommands() {
        let command = this.command;
        let commands = [];

        let [ options, _ ] = this.getOptionsAndRegexes();

        for (let i = 0; i < options.length; i++) {
            let option = options[i];
            let cmd = `${command} ${option}`;
            commands.push(cmd);
        }

        return commands;
    }

    helpText() {
        let needsAdmin = this.needsAdmin ? "*" : "";
        let params = this.parameters.length > 0 ? " " + this.parameters.join(" ") : "";
        let options = this.option.join("|");
        // TODO(dkg): clean up the formatting here to make it look nicer
        // maybe like this [|abc|cde] instead of "|abc|cde"???
        // if (options.substr(0, 1) === "|") {
        //     options = options.substr(1);
        // }
        let help = `${this.command} ${options}${params}\n\t${needsAdmin}${this.helpOptionText}`;
        return help;
    }
}

export { Option as default };
