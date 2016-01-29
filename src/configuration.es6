//
// some configuration parameters for our bot - globally available to all classes/functions that need them
//

// read environment parameters
if (!process.env.superadminpassword) {
    console.warn("Warning: 'superadminpassword' environment variable not defined. Using default super admin password.");    
}

const config = {
    slackbotapitoken: process.env.slackbotapitoken || null,
    superadminpassword: process.env.superadminpassword || "friend",
    karma: {
        listenList: [
            {
                name: "positive",
                factor: 1,
                points: "random",
                reason: "using a good word",
                feedback: false,
                // TODO(dkg): maybe have a different factor or points for each regex here? 
                //            and the ones defined above are the defaults for this "group"?
                listenTo: [
                    /(yay\!|good god|this is such bullshit|this is bullshit)/gi,
                    /(Praise the lord|back on the menu|meatballs)/gi,
                    /(lord|god|jesus|jesus christ|jesus h\. christ|buddha)/gi,
                    /(onsen|daft punk|queen|rupaul|ru paul|wife|ru paul slap)/gi,
                    /(mcfly|marty|bttf|doc brown|einstein|kupernikus)/gi,
                    /(count duckula|gummy bears|inspector gadget|looney tunes)/gi,
                    /(tiny toons|looney toons|tiny tunes|batman)/gi,
                    /(love you|love is all around|love fool|snoop lion|snoop dog)/gi,
                    /(love love love|love is everything)/gi,
                    /(I am sorry|I am so(.*) sorry|bodyslam)/gi,
                    /(hulk hogan|hulkamania)/gi,
                ],
            }, 
            {
                name: "negative",
                factor: -1,
                points: "random",
                reason: "using a bad word",
                feedback: false,
                listenTo: [
                    /(shit|damn|asshole|biff|nazi|sexist)/gi,
                    /(weeaboo|wtf|wth|piss off|fuck off)/gi,
                    /(synergy|win|fail|performance)/gi,
                    /(.*)lol\W/gi,
                ],
            },
            {
                name: "naughty",
                factor: 0,
                points: -20,
                reason: "using a bad word",
                feedback: false,
                listenTo: [
                    /(fuck|cum guzzling whore|ball tickler)/gi,
                    /(assfucker|cunt|thundercunt|fucker|cum bucket|whore|gangbang)/gi,
                    /(my junk|your junk|salty balls|balllicker|ball licker)/gi,
                ],
            }, 
            {
                name: "job",
                factor: -15,
                points: "factor",
                reason: "using a job related word",
                feedback: false,
                listenTo: [
                    /(let\'s have a meeting|when will it be done|what is the timeframe)/gi,
                    /(estimate|project|client|customer|timeframe|timeline)/gi,
                    /(when is the deadline|waste time|on the call|a call)/gi,
                    /(what are you doing|what are you working on)/gi,
                    /(do you have time|can you help me)/gi,
                    /(important|urgent|report|downturn|kpi)/gi,
                    /(marketing|sale|actionable|positive thinking)/gi,
                ] 
            }, 
        ]
    }
};

export { config as default };
