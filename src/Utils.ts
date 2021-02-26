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

import {randomBytes, createHmac, BinaryToTextEncoding} from "crypto";

export function generateId(size: number = 8) {
	return randomBytes(size).toString("hex");
}

export function generateHash(key: string, data: string, algorithm: string = "sha1", output: BinaryToTextEncoding = "hex"){
	return createHmac(algorithm, key).update(Buffer.from(data, "utf-8")).digest(output);
}
