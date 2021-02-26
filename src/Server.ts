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

process.on("unhandledRejection", internalErrorHandler);
process.on("uncaughtException", internalErrorHandler);

import {Request} from "express";
import Response from "../types/Response";
import {logError} from "./DiscordWebhook";
import logger from "./Logger";

//Caches so restart required for changes to take affect.
import config from "../config.json";

logger.info("Connecting to redis.");
const redis = require("./Redis")(config.redis);
redis.getRawClient().on("error", internalErrorHandler);

logger.info("Loading express...");
import express from "express";
import bodyParser from "body-parser";
import {generateId} from "./Utils";
import githubHandler from "./handlers/GithubWebhook";

const app = express();
app.use(bodyParser.json());

//Add some data to request for logging purposes before any handlers.
app.use(function(req: Request, res: Response, next: CallableFunction){
	res.locals.id = "WS-" + generateId(10);

	let ip = req.header("x-forwarded-for");
	if(ip === undefined) ip = req.ip;
	res.locals.ip = ip;

	res.setHeader("X-Poggit-Webhook-Request-ID", res.locals.id);
	res.removeHeader("X-Powered-By");
	logger.debug("[" + res.locals.id + "] '" + req.url + "' received from (" + ip + ")");

	next();
})

/**
 * GET /
 * poggit-webhook doesnt actually provide ANY UI for users its sole purpose is to receive events from github webhooks.
 */
app.get("/", function(req: Request, res: Response){
	res.write("Hello there.");
	res.end();
});

/**
 * POST /github/webhookKey
 * webhookKey (8byte hex)
 */
app.post("/github/:webhookKey", function(req: Request, res: Response){
	githubHandler(req, res).catch((e: Error) => {
		//If the handler is an async function it will not call expressErrorHandler but internal error handler.
		//So wrap the async handlers with a dummy function to catch any rejection errors correctly.
		expressErrorHandler(e, req, res, null);
	})
})

// Other paths here.

/**
 * ALL *
 * 404 handler.
 */
app.all("*", function(req: Request, res: Response){
	res.status(404).send("404 - Not found.");
})

// noinspection JSCheckFunctionSignatures
app.use(expressErrorHandler);

app.listen(config.port, () => {
	logger.info(`Server running on port ${config.port}`);
});

function internalErrorHandler(err: Error){
	if(logger !== undefined){
		logger.error(`Internal error occurred: ${err.stack}`);
	}else{
		console.error("Internal error occurred: ", err.stack);
	}

	process.exit(1);
}

// Handle errors that occur during handling of requests:
// noinspection JSUnusedLocalSymbols (Must have 4 arguments for express to know its a error handler.)
function expressErrorHandler(err: Error, req: Request, res: Response, next: CallableFunction|null){
	if(res.locals.id === undefined) res.locals.id = "No ID";
	logger.error(`[${res.locals.id}] Error occurred while handling request, ${err.stack}`);

	// discord webhooks logs itself. (No need to block res, response from discord has no impact on response.)
	logError(`[${res.locals.id}]\n\`\`\`${(err.stack??err.message).substr(0, 1960)}\`\`\``).then(()=>{
		logger.debug(`[${res.locals.id}] Sent error to discord.`);
	}).catch(()=>{});

	if(!res.headersSent) res.status(500).send(`Internal Server Error, Request ID: ${res.locals.id}`);
}

logger.info("Setup complete, Server should start shortly.");
