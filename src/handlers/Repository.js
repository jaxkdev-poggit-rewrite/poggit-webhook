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

module.exports = async function(req, res){
    const logger = require("winston");
    const action = req.body["action"];

    logger.info("[" + req.id + "] Handling repository action '"+action+"' for repo '"+req.body["repository"]["full_name"]+"'");

    if(action !== "deleted"){
        res.status(200).send("Action '" + action + "' is not used.");
        return;
    }

    //No need to wait for this before sending response.
    req.mysql.query("DELETE repos.* FROM repos WHERE repoId = ?", [req.body["repository"]["id"]]).then(() => {
        logger.info("[" + req.id + "] Repo ("+req.body["repository"]["id"]+") "+req.body["repository"]["full_name"]+" has been deleted.");
    }).catch((e) => {
        logger.error("[" + req.id + "] Repo ("+req.body["repository"]["id"]+") "+req.body["repository"]['full_name']+" has failed to delete.\n"+e.stack);
    });

    res.status(200).end();
}