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

import axios from "axios";
import logger from "./Logger";
import config from "../config.json";

function sendWebhook(url: string, content: string){
	return new Promise<void>((resolve, reject) => {
		axios.post(url, {
			"content": content
		}).then((r) => {
			if(r.status !== 204){
				logger.error("Failed to deliver webhook: " + r.status + " - " + r.statusText);
				reject(r);
			}else{
				resolve();
			}
		}).catch((e) => {
			logger.error("Failed to deliver webhook: " + e.response.status + " - " + e.response.statusText);
			reject(e.response);
		});
	})
}

export function logError(content: string){
	return sendWebhook(config.discord.error, content);
}
