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

const crypto = require("crypto");

function generateId(size = 8){
    return crypto.randomBytes(size).toString("hex");
}

function generateHash(key, data, algorithm = "sha1", output = "hex"){
    return crypto.createHmac(algorithm, key).update(Buffer.from(data, "utf-8")).digest(output);
}

module.exports = {generateId, generateHash};