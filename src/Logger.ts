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

import {Logger} from "winston";
import {createLogger, format, transports} from "winston";
const {combine, timestamp, printf, colorize, align} = format;
import path from "path";
import "winston-daily-rotate-file";

const logger: Logger = createLogger({
	transports: [
		new transports.DailyRotateFile({
			filename: path.join(__dirname, "../logs", "%DATE%.log"),
			datePattern: "YYYY-MM-DD",
			zippedArchive: true,
			maxSize: "20m",
			level: "debug"
		}),
		new transports.Console({
			level: "debug",
			format: combine(
				colorize(),
				timestamp(),
				align(),
				printf((info) => {
					const {timestamp, level, message, ...args} = info;
					const ts = timestamp.slice(11, 19);
					return `[${ts} | ${level}]: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ""}`;
				}),
			)
		})
	],
	format: combine(
		timestamp(),
		printf(({level, message, timestamp}) => {
			return `[${timestamp}] ${level}: ${message}`;
		})
	),
});

export default logger;
