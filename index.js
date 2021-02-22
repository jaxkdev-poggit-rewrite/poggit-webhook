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

const express = require("express");
const app = express();

process.on("uncaughtException", err => {
    console.error("There was an uncaught error", err);
    process.exit(1);
})

// noinspection JSUnusedLocalSymbols
function errorHandler(err, req, res, next){
    console.error("["+req.id+"] Internal server error: ",err.stack);

    res.status(500);
    res.send("Internal Server Error");
}

app.use(function(req, res, next){
    //Add some data to request for logging purposes.
    const crypto = require("crypto");
    req.id = crypto.randomBytes(12).toString("hex");
    req.ip = req.headers["x-forwarded-for"] || req.ip;

    res.setHeader("X-Poggit-Request-ID", req.id);
    res.removeHeader("X-Powered-By");
    console.log("Request ("+req.url+") received from ("+req.ip+"), RequestID: "+req.id);
    next();
})

app.get("/", function(req, res){
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.send("Request ID: "+req.id);
});

// noinspection JSCheckFunctionSignatures
app.use(errorHandler);

app.listen(80, () => {
    console.log("Server running on port 80");
});
