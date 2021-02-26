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

import {Request} from "express";
import Response from "../../types/Response";
import logger from "../Logger";

export default async function(req: Request, res: Response){
	const action = req.body["action"];

	logger.info(`[${res.locals.id}] Handling pull_request action '${action}' for '${req.body["repository"]["full_name"]}#${req.body["number"]}'`);

	if(!["opened", "synchronize"].includes(action)){
		res.status(200).send("Action '" + action + "' is not used.");
		return;
	}

	//TODO.

	res.status(200).end();
}
