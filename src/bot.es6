//
// Our core logic for our bot is here.
// 

// import { formatUptime } from './utils.es6';

if (!Array.prototype.findIndex) {
    // console.warn("Array does not support findIndex method.");
    throw new Error("Array does not support findIndex method.");
};

class Bot {

    constructor(controller, slackInfo) {
        this.controller = controller;
        this.slackInfo = slackInfo;

        // this is annoying boilerplate
        this.onUserChange = this.onUserChange.bind(this);
        this.onTeamJoin = this.onTeamJoin.bind(this);
        this.updateCacheUserInfo  = this.updateCacheUserInfo.bind(this);

        // listen to team_join and user_change events to make sure you update your cached user list

        controller.on('team_join', this.onTeamJoin)
        controller.on('user_change', this.onUserChange); 
    }

    onTeamJoin(bot, message) {
        this.updateCacheUserInfo(message.user);
    }
    onUserChange(bot, message) {
        this.updateCacheUserInfo(message.user);
    }
    updateCacheUserInfo(user) {
        console.log("Need to add or update cached info for user ", user.id);

        let users = this.getListOfUsers();
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

    getListOfUsers() {
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
                let users = self.getListOfUsers();
                let foundUser = users.find((u) => u.id === uid);

                // console.log(uid, users.length, foundUser);

                if (foundUser) {
                    user = foundUser;
                }
            }

            controller.storage.users.save(user, (err, id) => {
                if (cb) {
                    cb(user);
                }
            });

        });

    }

}

export { Bot };
