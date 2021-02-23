/*
 *  Copyright 2021 Poggit
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

// Variables used to handle internal errors efficiently.
let server = undefined;
let logger = undefined;
let mysql = undefined;
let redis = undefined;

process.on("unhandledRejection", internalErrorHandler);
process.on("uncaughtException", internalErrorHandler);

console.log("Loading logger...");
logger = require("./Logger");

logger.info("Loading config...");
//Caches so restart required for changes to take affect.
const config = require("../config.json");

logger.info("Connecting to mysql...");
mysql = require("./MySql")(config.mysql);
mysql.getRawConnection().on("error", internalErrorHandler);
mysql.connect().then(() => {
    logger.info("mysql connected successfully.");
});

logger.info("Connecting to redis.");
redis = require("./Redis")(config.redis);
redis.getRawClient().on("error", internalErrorHandler);

logger.info("Loading server handlers...");
const pushHandler = require("./handlers/Push");
const pullRequestHandler = require("./handlers/PullRequest");
const repositoryHandler = require("./handlers/Repository");

const express = require("express");
const bodyParser = require("body-parser");
const utils = require("./Utils");

const app = express();
app.use(bodyParser.json());

//Add some data to request for logging purposes before any handlers.
app.use(function(req, res, next){
    req.id = "WS-" + utils.generateId(10);
    req.mysql = mysql;
    req.redis = redis;

    let ip = req.header("x-forwarded-for");
    if(ip === undefined) ip = req.ip;
    req.realIp = ip;

    res.setHeader("X-Poggit-Webhook-Request-ID", req.id);
    res.removeHeader("X-Powered-By");
    logger.debug("[" + req.id + "] '" + req.url + "' received from (" + req.realIp + ")");

    //Check mysql is connected.
    if(!req.mysql.isConnected() || !req.redis.isConnected()){
        res.status(503).send("Service Unavailable, Request ID: " + req.id);
        return;
    }

    next();
})

/**
 * GET /
 * poggit-webhook doesnt actually provide ANY UI for users its sole purpose is to receive events from github webhooks.
 */
app.get("/", async function(req, res){
    res.status(200).send("Hello there.");
});

/**
 * POST /github/webhookKey
 * webhookKey (8byte hex)
 */
app.post("/github/:webhookKey", async function(req, res){
    req.webhookKey = req.params["webhookKey"];
    req.webhookId = req.header("X-GitHub-Hook-ID");
    const event = req.header("X-GitHub-Event");
    const x_sig = req.header("X-Hub-Signature");
    if(x_sig === undefined || event === undefined || req.webhookId === undefined || req.webhookKey === undefined){
        res.status(400).send("Missing required parameters/headers.");
        return;
    }

    if(!(/^[0-9a-f]{16}$/i.test(req.webhookKey))){
        logger.error("[" + req.id + "] Invalid webhook key '"+req.webhookKey+"'");
        res.status(403).send("Invalid webhook key.");
        return;
    }

    let [algo, sig] = x_sig.split("=");
    if(algo !== "sha1") logger.warning("[" + req.id + "] " + x_sig + " Is not using sha1");

    let expected_hash = utils.generateHash(config.poggit.hookSecret+req.webhookKey, JSON.stringify(req.body), algo);

    if(expected_hash !== sig){
        logger.error("[" + req.id + "] Incorrect signature '" + sig + "'");
        res.status(403).send("Incorrect signature.");
        return;
    }

    let rows = await mysql.query("SELECT repoId FROM repos WHERE webhookKey = ?", [Buffer.from(req.webhookKey, "hex")])
        .catch((e) => {
            expressErrorHandler(e, req, res, null);
        });

    if(rows === undefined) return; //Errored out.

    // noinspection JSUnresolvedVariable
    if(rows.length === 0){
        logger.warn("[" + req.id + "] No repo found for webhook key '" + req.webhookKey + "'");
        res.status(403).send("No repo found with this webhook key.");
        return;
    }
    // noinspection JSUnresolvedVariable
    if(rows.length > 1){
        logger.error("[" + req.id + "] the 1 / 1.845E+19 probability that the same webhookKey is generated came true!");
        res.status(403).send("the 1 / 1.845E+19 probability that the same webhookKey is generated came true!");
        return;
    }

    if(rows[0]["repoId"] !== req.body["repository"]["id"]){
        logger.warn("[" + req.id + "] Repo id (" + req.body["repository"]["id"] + ") given and repo id (" +
            rows[0]["repoId"] + ") expected does not match.");
        res.status(403).send("Repository ID's does not match.");
        return;
    }

    logger.debug("[" + req.id + "] Received valid github event '"+event+"'");

    switch(event){
        case "ping":
            res.status(200).send("Pong");
            break;
        case "push":
            await pushHandler(req, res).catch((e) => {
                expressErrorHandler(e, req, res, null);
            });
            break;
        case "pull_request":
            await pullRequestHandler(req, res).catch((e) => {
                expressErrorHandler(e, req, res, null);
            });
            break;
        case "repository":
            await repositoryHandler(req, res).catch((e) => {
                expressErrorHandler(e, req, res, null);
            });
            break;
        default:
            logger.warn("[" + req.id + "] Unsupported github event.")
            res.status(400).send("Unsupported event: " + event);
            break;
    }
})

// Other paths here.

/**
 * ALL *
 * 404 handler.
 */
app.all("*", function(req, res){
    res.status(404).send("404 - Not found.");
})

// noinspection JSCheckFunctionSignatures
app.use(expressErrorHandler);

server = app.listen(config.port, () => {
    logger.info("Server running on port " + config.port);
});

// Process error handler (below listener so we can close server and let it gracefully exit.)
async function internalErrorHandler(err){
    if(logger !== undefined){
        logger.error("Internal error occurred: " + err.stack);
    }else{
        console.error("Internal error occurred: ", err.stack);
    }

    if(err instanceof Error){
        await require("./DiscordWebhook")
            .sendWebhook("error", "[Internal]\n```" + err.stack.substr(0, 1960) + "```")
            .catch(()=>{});
    }

    if(server !== undefined){
        server.close();
        server = undefined;
    }
    if(mysql !== undefined){
        if(mysql.isConnected()) await mysql.close().catch(() => {});
        mysql = undefined;
    }
    if(redis !== undefined){
        if(redis.isConnected()) await redis.close();
        redis = undefined;
    }
    process.exit(1);
}

// Handle errors that occur during handling of requests:
// noinspection JSUnusedLocalSymbols (Must have 4 arguments for express to know its a error handler.)
function expressErrorHandler(err, req, res, next){
    if(req.id === undefined) req.id = "N/A - Internal";
    logger.error("[" + req.id + "] Error occurred while handling request: "+err.stack);

    //Discord
    const discord = require("./DiscordWebhook");
    // noinspection JSIgnoredPromiseFromCall  (No need to block res, response from discord has no impact on response.)
    discord.sendWebhook("error", "[" + req.id + "]\n```" + err.stack.substr(0, 1960) + "```");

    res.status(500).send("Internal Server Error, Request ID: "+req.id);
}

logger.info("Setup complete, Server should start shortly.");

module.exports = {};