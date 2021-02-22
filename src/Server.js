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

const express = require("express");
const app = express();
//Caches so restart required for changes to take affect.
const config = require("../config.json");

//Add some data to request for logging purposes before any handlers.
app.use(function(req, res, next){
    const utils = require("./Utils");
    req.id = utils.generateId(12);
    req.ip = req.headers["x-forwarded-for"] || req.ip;

    res.setHeader("X-Poggit-Webhook-Request-ID", req.id);
    res.removeHeader("X-Powered-By");
    console.log("Request ("+req.url+") received from ("+req.ip+"), RequestID: "+req.id);
    next();
})

app.get("/", function(req, res){
    res.status(200);
    res.setHeader("Content-Type", "text/plain");
    res.send("Request ID: "+req.id);
});

app.all("*", function(){
    throw new Error("Test error thrown in handler (this would normally be a 404 but sims a 500 hehehe(unhandled).");
})


// Process error handler:
process.on("uncaughtException", err => {
    console.error("Uncaught exception occurred: "+err.stack);

    const discord = require("./DiscordWebhook");
    discord.sendWebhook('error', "["+req.id + "]\n```" + err.stack.substr(0, 1960) + "```").finally(()=>{
        //Only exit after attempting to log error to discord.
        process.exit(1);
    })
})

// Handle errors that occur during handling of requests:
// noinspection JSUnusedLocalSymbols (Must have 4 arguments for express to know its a error handler.)
function expressErrorHandler(err, req, res, next){
    if(req.id === undefined) req.id = "N/A - Internal";
    console.error("["+req.id+"]",err);

    //Discord
    const discord = require("./DiscordWebhook");
    // noinspection JSIgnoredPromiseFromCall  (No need to block res, response from discord has no impact on response.)
    discord.sendWebhook('error', "[" + req.id + "]\n```" + err.stack.substr(0, 1960) + "```");

    res.status(500);
    res.send("Internal Server Error, Request ID: "+req.id);
}
// noinspection JSCheckFunctionSignatures
app.use(expressErrorHandler);

app.listen(config.port, () => {
    console.log("Server running on port "+config.port);
});