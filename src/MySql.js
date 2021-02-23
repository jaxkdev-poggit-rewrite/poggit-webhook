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

//Wraps the mysql functions with promises to allow await in async functions (requests)
const util = require("util");
const mysql = require("mysql");

module.exports = function(config){
	const connection = mysql.createConnection(config);
	let connected = false;
	return {
		connect(){
			const tmp = util.promisify(connection.connect).call(connection);
			tmp.then(() => {
				connected = true;
			})
			return tmp;
		},
		ping(){
			return util.promisify(connection.ping).call(connection);
		},
		query(sql,args){
			return util.promisify(connection.query).call(connection, sql, args);
		},
		close(){
			connected = false;
			return util.promisify(connection.end).call(connection);
		},
		getRawConnection(){
			return connection;
		},
		isConnected(){
			return connected;
		}
	};
}
