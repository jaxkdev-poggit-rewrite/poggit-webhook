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

const logger = require("winston");
const utils = require("../Utils");
const config = require("../../config.json");
const pullRequestHandler = require("./PullRequest");
const pushHandler = require("./Push");
const repositoryHandler = require("./Repository");

/**
 * POST /github/:webhookKey
 */
module.exports = async function(req, res){
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
	if(algo !== "sha1") logger.warn("[" + req.id + "] " + x_sig + " Is not using sha1");

	let expected_hash = utils.generateHash(config.poggit.hookSecret+req.webhookKey, JSON.stringify(req.body), algo);

	if(expected_hash !== sig){
		logger.error("[" + req.id + "] Incorrect signature '" + sig + "'");
		res.status(403).send("Incorrect signature.");
		return;
	}

	let rows = await req.mysql.query("SELECT repoId FROM repos WHERE webhookKey = ?", [Buffer.from(req.webhookKey, "hex")]);
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
			await pushHandler(req, res);
			break;
		case "pull_request":
			await pullRequestHandler(req, res);
			break;
		case "repository":
			await repositoryHandler(req, res);
			break;
		default:
			logger.warn("[" + req.id + "] Unsupported github event.")
			res.status(400).send("Unsupported event: " + event);
			break;
	}
}
