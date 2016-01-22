//
// GitCommand
//

import BaseCommand                  from './BaseCommand.es6';
import { db }                       from '../db.es6';
import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';
import { getAdminList }             from './AdminCommand.es6';

import { removeCommandFromMessage, privateMsgToUser } from '../utils.es6';

let git  = require("nodegit");
let path = require('path');
let fs   = require('fs');

const CMDS_INFO = ["^git info", "^git$"];


let getGitCommitInfo = async () => {
    let repositoryPath = path.join(path.dirname(fs.realpathSync(__filename)), '../../');

    console.log("Repository Path", repositoryPath);

    let getMostRecentCommit = (repository) => {
        return repository.getBranchCommit("master");
    };
    let getCommitMessage = (commit) => {
        console.log("commit", commit);
        return commit.message();
    };

    let repo = await git.Repository.open(repositoryPath);
    let commit = await getMostRecentCommit(repo);
    let message = getCommitMessage(commit);
    let author = commit.author();
    let date = commit.date();
    let sha = commit.sha();
    // let id = commit.id();

    let msg = `
        SHA: ${sha}
        Author: ${author}
        Date: ${date.toString()}
        Message:
        ${message}
    `;

    console.log("git commit message", msg);

    return msg;
};



class GitCommand extends BaseCommand {

    constructor(controller, slackInfo, listenToTypes) {
        console.log("GitCommand");

        super("Git", controller, slackInfo);

        this.onGetGitCommitInfo = this.onGetGitCommitInfo.bind(this);

        this.isAdmin = this.isAdmin.bind(this);

        this.listenTo(CMDS_INFO, listenToTypes, this.onGetGitCommitInfo);
    }

    helpText() {
        let msg = [];

        msg.push(`*${this.name}* allows you to display the git repository information for this bot.`);
        msg.push("`* requires admin powers`");
        msg.push("```");

        let fnAddHelp = (orgCmds, shortDescription, parameters="", example="") => {
            let cmds = orgCmds.map(c => c.replace(/[^\w\s]/gi, ''));
            let exampleCmd =  example.length > 0 ? `${cmds[0]} ${example}` : "";
            let msg = `${cmds.join("|")} ${parameters}\n\tBrief: ${shortDescription}`;

            return exampleCmd.length > 0 ? `${msg}\n\tExample: ${exampleCmd}` : msg;
        };

        msg.push(fnAddHelp(CMDS_INFO, "Show basic information about this repository."));

        msg.push("```");
        
        return msg.join("\n");
    }

    async onGetGitCommitInfo(bot, message) {
        console.log("onGetGitCommitInfo");

        try {
            let info = await getGitCommitInfo();
            bot.reply(message, info);
        } catch(err) {
            let msg = `Error: could not get the git repository information. Reason: ${err.message}`;
            console.error(msg);
            bot.reply(message, msg);
        }
    }

}

export { GitCommand as default };
