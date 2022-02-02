const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const logger        = require(BASE_DIR + '/Logger');
const MongoClient   = require('mongodb').MongoClient;

global.DBConnection = {};

class MongoDriver {
    
    static async createConnection(DB_CONN, DB_NAME, cb) {
        MongoClient.connect(DB_CONN, {
            useNewUrlParser: true,
            useUnifiedTopology : true,
            //reconnectTries: 120,
            //reconnectInterval: 30000
        }, function (errDB, client) {
            if (errDB) {
                cb(null);
            } else {
                global.DBConnection[DB_NAME] = client.db(DB_NAME);
                cb(client.db(DB_NAME));
            }
        });   
    }

    static async getCollections(db, cb) {
        global.DBConnection[db].listCollections().toArray(function(err, collInfos) {
            if (err) {
                cb(false);
            } else {
                cb(collInfos);
            }
        });
    }

    static async createIndexProject(db, collectionName, indexBuild, cb) {
        global.DBConnection[db].collection(collectionName).createIndex(indexBuild, function(err, result) {
            if (err) {
                cb(false);
            } else {
                cb(result);
            }
        });
    }

    static async createProjectCollection(db, collectionName, cb) {
        global.DBConnection[db].createCollection(collectionName, function(errCreate, resCreate) {
            if (errCreate) {
                cb(false);
            } else {
                cb(true);
            }
        });
    }

    static async insertData(db, collectionName, docs, cb) {
        global.DBConnection[db].collection(collectionName).insertOne(docs, function (errInsert, resultInsert) {
            if (errInsert) {
                cb(false);
            } else {
                cb(resultInsert.ops[0]);
            }
        });
    }

    static async insertManyData(db, collectionName, docs, cb) {
        global.DBConnection[db].collection(collectionName).insertMany(docs, function (errInsert, resultInsert) {
            if (errInsert) {
                cb(false);
            } else {
                cb(resultInsert.ops[0]);
            }
        });
    }

    static async updateData(db, collectionName, clause, docs, cb) {
        global.DBConnection[db].collection(collectionName).updateOne(clause, {'$set': docs}, function (errUpdate, resultUpdate) {
            if (errUpdate) {
                cb(false);
            } else {
                cb(true);
            }
        });
    }

    static async updateManyData(db, collectionName, clause, docs, cb) {
        global.DBConnection[db].collection(collectionName).updateMany(clause, {'$set': docs}, function (errUpdate, resultUpdate) {
            if (errUpdate) {
                cb(false);
            } else {
                if (resultUpdate.result.nModified > 0) {
                    cb(true);
                } else {
                    cb(false);
                }
            }
        });
    }
    
    static async upsertData(db, collectionName, clause, docs, cb) { 
        global.DBConnection[db].collection(collectionName).updateOne(clause, {'$set': docs}, {upsert: true}, function (errUpdate, resultUpdate) {
            if (errUpdate) {
                cb(false);
            } else {
                cb(true);
            }
        });   
    }

    static async getDataCount(db, collectionName, filter, cb) {
        global.DBConnection[db].collection(collectionName).find(filter).count(function (err, result) {
            if (err) {
                cb(null);
            } else {
                cb(result);
            }
        });
    }

    static async countDataByFilter(db, collectionName, filter, cb) {
        global.DBConnection[db].collection(collectionName).countDocuments(filter, function (err, result) {
            if (err) {
                cb(false);
            } else {
                cb(result);
            }
        });
    }

    static async searchDataBy(db, collectionName, filter, cb) {
        global.DBConnection[db].collection(collectionName).find(filter).toArray(function (err, result) {
            if (err) {
                cb(false);
            } else {
                cb(result);
            }
        });
    }
    
    static async searchDataByOffsetLimit(db, collectionName, filter, offset, limit, cb) {
        global.DBConnection[db].collection(collectionName).find(filter).limit(limit).skip(offset).toArray(function (err, result) {
            if (err) {
                cb(false);
            } else {
                cb(result);
            }
        });
    }

    static async searchDataByOffsetLimitSort(db, collectionName, filter, sort, offset, limit, cb) {
        if(limit > 0){
            global.DBConnection[db].collection(collectionName).find(filter).limit(limit).skip(offset).sort(sort).toArray(function (err, result) {
                if (err) {
                    cb(false);
                } else {
                    cb(result);
                }
            });
        }else{
            exports.searchDataBySort(db, collectionName, filter, sort, function(result){
                cb(result);
            });
        }
    }

    static async searchDataBySort(db, collectionName, filter, sort, cb) {
        global.DBConnection[db].collection(collectionName).find(filter).sort(sort).toArray(function (err, result) {
            if (err) {
                cb(false);
            } else {
                cb(result);
            }
        });
    }

    static async getAggregateData(db, collectionName, aggData, cb) {
        var opt = {
            "cursor": {},
            "allowDiskUse": true,
            "explain": false
        };
        
        global.DBConnection[db].collection(collectionName).aggregate(aggData, opt).toArray( function (err, result) {
            if (err) {
                logger.error(__filename, err);
                cb(false);
            } else {
                cb(result);
            }
        });
    }

    static async removeData(db, collectionName, clause, cb) {
        global.DBConnection[db].collection(collectionName).deleteMany(clause, function (errRemove, resultRemove) {
            if (errRemove) {
                cb(false);
            } else {
                cb(true);
            }
        });
    }

    static async searchDataByProject(db, collectionName, filter, project, cb) {
        global.DBConnection[db].collection(collectionName).find(filter).project(project).toArray(function (err, result) {
            if (err) {
                cb(false);
            } else {
                cb(result);
            }
        });
    }

    static async searchDataByProjectLimit(db, collectionName, filter, project, limit, cb) {
        global.DBConnection[db].collection(collectionName).find(filter).project(project).limit(limit).toArray(function (err, result) {
            if (err) {
                cb(false);
            } else {
                cb(result);
            }
        });
    }

    static async searchDataByProjectLimitSort(db, collectionName, filter, project, limit, sort, cb) {
        global.DBConnection[db].collection(collectionName).find(filter).project(project).limit(limit).sort(sort).toArray(function (err, result) {
            if (err) {
                cb(false);
            } else {
                cb(result);
            }
        });
    }
}

module.exports = MongoDriver;