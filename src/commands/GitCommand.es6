//
// GitCommand
//

import config                       from '../configuration.es6';
import BaseCommand                  from './BaseCommand.es6';
import Option                       from './Option.es6';

import { _ }                        from 'lodash';
import { Promise }                  from 'bluebird';
import { getAdminList }             from './AdminCommand.es6';

import { getUserFromList, getUserName, privateMsgToUser } from '../utils.es6';

const git  = require("nodegit");  // http://www.nodegit.org/
const path = require('path');
const fs   = require('fs');
const exec = require('child_process').exec;

const COMMAND = "git";
const BRIEF_DESCRIPTION = `allows you to display the git repository information for this bot`;
const SUPERUSER_PWD = config.superadminpassword;

let repositoryPath = path.join(path.dirname(fs.realpathSync(__filename)), '../../');

let getCurrentBranch = async () => {

    let repo = await git.Repository.open(repositoryPath);
    let branch = await repo.getCurrentBranch();

    return branch;    
};

let getCurrentCommit = async () => {

    let repo = await git.Repository.open(repositoryPath);
    let branch = await repo.getCurrentBranch();
    let commit = await repo.getBranchCommit(branch);

    return commit;
}

let getGitCommitInfo = async () => {
      
    console.log("Repository Path", repositoryPath);

    let commit = await getCurrentCommit();

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
        this.onGitUpdateBot = this.onGitUpdateBot.bind(this);

        this.isAdmin = this.isAdmin.bind(this);

        const options = [
            new Option(COMMAND, ["", "info"], ["$", "info$"], "", this.onGetGitCommitInfo, BRIEF_DESCRIPTION),
            new Option(COMMAND, ["update", "upgrade"], ["update$", "upgrade$"], "", this.onGitUpdateBot, "Run `git pull origin current-branch` and then restarts itself.", true)
        ];

        this.setupOptions(options);
    }

    async onGitUpdateBot(bot, message) {
        console.log("onGitUpdateBot");

        let fnExecuteGitCommands = async (conversation) => {

            try {

                conversation.say("Trying to run git pull origin to update code base to lastet commit. This may take a while.");

                let repo = await git.Repository.open(repositoryPath);
                let branch = await repo.getCurrentBranch();
                let commit = await repo.getBranchCommit(branch);
                let sha = commit.sha();

                let branchName = branch.shorthand();

                console.log("commit, branch", commit.sha(), branchName);

                let cmd = `git pull origin ${branchName}`;

                const child = exec(cmd, {
                    cwd: repositoryPath
                }, (error, stdout, stderr) => {
                    console.log("stdout", stdout);
                    console.warn("stderr", stderr);
                    if (error) {
                        // ooppppss
                        console.error("errors", error);
                        let msg = `${error}\n${stdout}\n${stderr}`
                        conversation.say("Hmm, looks like something went wrong.\n\n${msg}");

                    } else if (stdout.toLowerCase().includes("already up-to-date")) {
                        // already up to date
                        conversation.say(`We are already up to date.\nSHA: ${sha}`);

                    } else {
                        // restart ourself
                        
                        conversation.say("Updated from origin. Restart is not implement yet, so you have to do this manually.");

                        // TODO(dkg): Figure out how to restart ourselves ... maybe add a git hook
                        //            that restarts the bot after N seconds?!

                        // let cmd = `sleep 2 && nohup npm start &`;
                        // exec({
                        //     cwd: repositoryPath
                        // });

                        // setTimeout(() => {
                        //     process.exit();
                        // }, 1000);
                    }

                    conversation.next();
                });

            } catch(err) {
                conversation.say("Ooppps. Something went wrong. Sorry.\n" + err.message);
                conversation.next();
            }
            
        };

        const self = this;

        bot.startPrivateConversation(message, (err, conversation) => {
            conversation.ask("Password, please.", (message, conversation) => {
                let pwd = self.getCommandArguments(message, self.onGitUpdateBot);
                if (pwd === SUPERUSER_PWD) {
                    fnExecuteGitCommands(conversation);
                } else {
                    conversation.say("You are not worthy!");
                    conversation.next();
                }
            }); // conversation.ask(pwd pls)
        }); // startPrivateConversation
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
