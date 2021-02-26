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

/*Wraps the redis functions with promises to allow await in async functions (requests)
import util from "util";
import redis from "redis";
import config from "../config.json";

const client = redis.createClient(config.redis);

export default function(){
	return {
		set(key, value){
			return util.promisify(client.set).call(client, key, value);
		},
		get(key){
			return util.promisify(client.get).call(client, key);
		},
		rpush(key: string|number, ...data: (string|number)[]){
			// @ts-ignore
			return util.promisify(client.rpush).call(client, key, ...data);
		},
		getRawClient(){
			return client;
		},
		isConnected(){
			return client.connected;
		},
		close(){
			return util.promisify(client.quit).call(client)
		}
	};
}*/
