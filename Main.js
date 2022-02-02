require('dotenv').config();

const fs          = require('fs');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const logger        = require(BASE_DIR + '/Logger');
const config        = require(BASE_DIR + '/Config');
const server        = require(BASE_DIR + '/Server');
const mongo         = require(BASE_DIR + '/libraries/MongoDriver');

if (process.env.ENVIRONMENT === "PRODUCTION") {
    process.on('uncaughtException', function (exception) {
        logger.error(__filename, exception);
    });
}

if (config.DB.length) {
    connectToDatabase(0, [], function(arrDB) {
        runningStartUp();
    });
} else {
    runningStartUp();
}

function connectToDatabase(index, dbConnected, cb) {
    let dbList = config.DB;

    if (index < dbList.length) {
        let DB = dbList[index];

        if (DB.DRIVER === "mongo" || DB.DRIVER === "mongodb") {
            mongo.createConnection(DB.CONNECTION, DB.NAME, function(db) {
                if (db) {
                    dbConnected.push(DB.NAME);
                    logger.debug(__filename, "Connect to database "+ DB.NAME +" successfully", "", "", "");
                } else {
                    logger.error(__filename, "Cannot connect to database "+ DB.NAME);
                }
                connectToDatabase((index + 1), dbConnected, function(arrDB) {
                    cb(arrDB);
                });
            });
        } else {
            connectToDatabase((index + 1), dbConnected, function(arrDB) {
                cb(arrDB);
            });
        }
    } else {
        cb(dbConnected);
    }
}

function runningStartUp() {
    server.start();
}