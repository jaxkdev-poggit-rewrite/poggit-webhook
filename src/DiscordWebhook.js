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

function sendWebhook(type, content){
    const axios = require("axios");
    const config = require("../config.json");
    return new Promise(function(resolve, reject) {
        axios.post(config.discord[type], {
            'content': content
        }).then(r => {
            if (r.status !== 204) {
                console.error("Failed to deliver webhook(" + type + "): " + r.status + " - " + r.statusText);
                reject(r);
            } else {
                resolve();
            }
        }).catch(e => {
            console.error("Failed to deliver webhook(" + type + "): " + e.response.status + " - " + e.response.statusText);
            reject(e.response);
        });
    })
}

module.exports = {sendWebhook};