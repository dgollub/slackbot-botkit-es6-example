//
// GitCommand
//

import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';

import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';
import { getAdminList }             from './AdminCommand.es6';

import { privateMsgToUser }         from '../utils.es6';


let git  = require("nodegit");  // http://www.nodegit.org/
let path = require('path');
let fs   = require('fs');


const COMMAND = "git";
const BRIEF_DESCRIPTION = `allows you to display the git repository information for this bot`;


let getGitCommitInfo = async () => {
    let repositoryPath = path.join(path.dirname(fs.realpathSync(__filename)), '../../');

    console.log("Repository Path", repositoryPath);

    // let getMostRecentCommit = (repository) => {
    //     return repository.getBranchCommit("master");
    // };
    // let getCommitMessage = (commit) => {
    //     console.log("commit", commit);
    //     return commit.message();
    // };

    let repo = await git.Repository.open(repositoryPath);
    let branch = await repo.getCurrentBranch();
    let commit = await repo.getBranchCommit(branch);
    let message = commit.message();
    let author = commit.author();
    let date = commit.date();
    let sha = commit.sha();
    // let id = commit.id();

    let msg = `
        git commit information
        ----------------------
        SHA: ${sha}
        Branch: ${branch.shorthand()}
        Author: ${author}
        Date: ${date.toString()}
        Message:
        ${message}
    `;

    console.log("git commit message", msg);

    return msg;
};


class GitCommand extends BaseCommand {

    constructor(manager, listenToTypes) {
        console.log("GitCommand");

        super(COMMAND, BRIEF_DESCRIPTION, manager, listenToTypes);

        this.onGetGitCommitInfo = this.onGetGitCommitInfo.bind(this);

        this.isAdmin = this.isAdmin.bind(this);

        const options = [
            new Option(this.name, ["", "info"], ["$", "info$"], "", this.onGetGitCommitInfo, BRIEF_DESCRIPTION)            
        ];

        this.setupOptions(options);
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
