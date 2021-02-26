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

import logger from "../Logger";
import {generateHash} from "../Utils";
import {getConnection} from "../MySql";
import config from "../../config.json";
import pullRequestHandler from "./PullRequest";
import pushHandler from "./Push";
import repositoryHandler from "./Repository";
import {Request} from "express";
import Response from "../../types/Response";

/**
 * POST /github/:webhookKey
 */
export default async function(req: Request, res: Response){
	const event = req.header("X-GitHub-Event");
	const x_sig = req.header("X-Hub-Signature");
	const webhookKey = req.params["webhookKey"];
	const webhookId = req.header("X-GitHub-Hook-ID");
	if(x_sig === undefined || event === undefined || webhookId === undefined || webhookKey === undefined){
		res.status(400).send("Missing required parameters/headers.");
		return;
	}

	res.locals.webhookKey = webhookKey;
	res.locals.webhookId = webhookId;
	res.locals.mysql = await getConnection();

	if(!(/^[0-9a-f]{16}$/i.test(webhookKey))){
		logger.error(`[${res.locals.id}] Invalid webhook key '${webhookKey}'`);
		res.status(403).send("Invalid webhook key.");
		return;
	}

	let [algo, sig] = x_sig.split("=");
	if(algo !== "sha1") logger.warn(`[${res.locals.id}] ${x_sig} Is not using sha1`);

	let expected_hash = generateHash(config.poggit.hookSecret+webhookKey, JSON.stringify(req.body), algo);

	if(expected_hash !== sig){
		logger.error(`[${res.locals.id}] Incorrect signature '${sig}'`);
		res.status(403).send("Incorrect signature.");
		return;
	}

	let rows = await res.locals.mysql.query("SELECT repoId FROM repos WHERE webhookKey = ?", [Buffer.from(webhookKey, "hex")]);
	if(rows === undefined) return; //Errored out.

	// noinspection JSUnresolvedVariable
	if(rows.length === 0 ){
		logger.warn(`[${res.locals.id}] No repo found for webhook key '${webhookKey}'`);
		res.status(403).send("No repo found with this webhook key.");
		return;
	}
	// noinspection JSUnresolvedVariable
	if(rows.length > 1){
		logger.error(`[${res.locals.id}] the 1 / 1.845E+19 probability that the same webhookKey is generated came true!`);
		res.status(403).send("the 1 / 1.845E+19 probability that the same webhookKey is generated came true!");
		return;
	}

	if(rows[0]["repoId"] !== req.body["repository"]["id"]){
		logger.warn(`[${res.locals.id}] Repo id (${req.body["repository"]["id"]}) given and repo id (${rows[0]["repoId"]}) expected does not match.`);
		res.status(403).send("Repository ID's does not match.");
		return;
	}

	logger.debug(`[${res.locals.id}] Received valid github event '${event}'`);

	switch(event){
		case "ping":
			res.status(200).send("Pong");
			break;
		case "push":
			await pushHandler(req, res);
			break;
		case "pull_request":
			await pullRequestHandler(req, res);
			break;
		case "repository":
			await repositoryHandler(req, res);
			break;
		default:
			logger.warn(`[${res.locals.id}] Unsupported github event '${event}'.`)
			res.status(400).send(`Unsupported event: ${event}`);
			break;
	}
}
