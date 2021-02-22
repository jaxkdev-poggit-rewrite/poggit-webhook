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

console.log("Loading logger...");
const logger = require("./Logger");

logger.info("Loading config...");
//Caches so restart required for changes to take affect.
const config = require("../config.json");

logger.info("Loading server handlers...");
const express = require("express");
const app = express();

//Add some data to request for logging purposes before any handlers.
app.use(function(req, res, next){
    const utils = require("./Utils");
    req.id = "WS-"+utils.generateId(10);
    req.ip = req.headers["x-forwarded-for"] || req.ip;

    res.setHeader("X-Poggit-Webhook-Request-ID", req.id);
    res.removeHeader("X-Powered-By");
    logger.info("Request ("+req.url+") received from ("+req.ip+"), RequestID: "+req.id);
    next();
})

/**
 * GET /
 * poggit-webhook doesnt actually provide ANY UI for users its sole purpose is to receive events from github webhooks.
 */
app.get("/", function(req, res){
    res.status(200);
    res.send("200 - OK");
});

/**
 * POST /github/webhook_id
 */
app.post("/github/:webhookId", function(req, res){
    res.status(200);
    res.send("Testing purpose 200.");
    console.log(req.path);
    console.log(req.params);
    console.log(req.query);
})

// Other paths here.

/**
 * ALL *
 * 404 handler.
 */
app.all("*", function(req, res){
    res.status(404)
    res.end();
})

// noinspection JSCheckFunctionSignatures
app.use(expressErrorHandler);

const server = app.listen(config.port, () => {
    logger.info("Server running on port "+config.port);
});

// Process error handler (below listener so we can close server and let it gracefully exit.)
process.on("uncaughtException", function(err){
    logger.error("Uncaught exception occurred: "+err.stack);

    const discord = require("./DiscordWebhook");
    discord.sendWebhook('error', "[Internal]\n```" + err.stack.substr(0, 1960) + "```")

    server.close();
    process.exitCode = 1;
}.bind(server))

// Handle errors that occur during handling of requests:
// noinspection JSUnusedLocalSymbols (Must have 4 arguments for express to know its a error handler.)
function expressErrorHandler(err, req, res, next){
    if(req.id === undefined) req.id = "N/A - Internal";
    logger.error("["+req.id+"]",err);

    //Discord
    const discord = require("./DiscordWebhook");
    // noinspection JSIgnoredPromiseFromCall  (No need to block res, response from discord has no impact on response.)
    discord.sendWebhook('error', "[" + req.id + "]\n```" + err.stack.substr(0, 1960) + "```");

    res.status(500);
    res.send("Internal Server Error, Request ID: "+req.id);
}

logger.info("Setup complete, Server should start shortly.");

module.exports = {};