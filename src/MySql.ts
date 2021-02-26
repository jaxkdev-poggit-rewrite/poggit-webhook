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
import {Pool, createPool, PoolConnection} from "mysql";
import util from "util";
import MySql from "../types/MySql";
import config from "../config.json";

const pool: Pool = createPool(config.mysql);

export function getConnection(){
	return new Promise<MySql>((resolve, reject) => {
		pool.getConnection((err, con) => {
			if(err){
				reject(err);
			}else{
				resolve(promisifyConnection(con));
			}
		});
	});
}

function promisifyConnection(connection: PoolConnection): MySql{
	const con = connection;
	return {
		ping(){
			return util.promisify(con.ping).call(con);
		},
		query(sql: string, args: (string|number|Buffer)[]): Promise<any[]>{
			// @ts-ignore
			return util.promisify(con.query).call(con, sql, args);
		},
		release(){
			return util.promisify(connection.release).call(con);
		},
		getRawConnection(){
			return con;
		}
	};
}
