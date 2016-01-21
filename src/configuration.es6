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
};

export { config as default };
