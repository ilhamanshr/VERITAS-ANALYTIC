const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const utils         = require(BASE_DIR + '/Utils');
const dbName        = process.env.DB_NAME_IG;

class AnalyticModel {

    static async getProfileInfo(bodyReq, cb){
        let agg = [];

        agg.push({ 
            "$match" : { 
                "_id" : bodyReq.params.userId,
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : 0.0, 
                "userId" : "$_id", 
                "biography" : 1.0, 
                "externalUrl" : 1.0, 
                "followerCount" : 1.0, 
                "followingCount" : 1.0, 
                "fullName" : 1.0, 
                "isBusinessAccount" : 1.0, 
                "isPrivate" : 1.0, 
                "isProfessionalAccount" : 1.0, 
                "isVerified" : 1.0, 
                "postCount" : 1.0, 
                "profilePic" : 1.0, 
                "username" : 1.0, 
                "source" : "instagram", 
            }
        });

        mongo.getAggregateData(dbName, "contacts", agg, function(result) {

            agg = [
                { 
                    "$match" : { 
                        "ownerId" : bodyReq.params.userId
                    }
                }, 
                { 
                    "$sort" : { 
                        "timestamp" : 1.0
                    }
                }, 
                { 
                    "$group" : { 
                        "_id" : null, 
                        "dateFrom" : { 
                            "$first" : "$timestamp"
                        }, 
                        "dateUntil" : { 
                            "$last" : "$timestamp"
                        }
                    }
                }
            ]

            mongo.getAggregateData(dbName, "targetPost", agg, function(resultDate){
                let objRes = {};

                if(result && result.length){
                    objRes = result[0];
                    if(resultDate && resultDate.length){
                        objRes["dateFrom"] = resultDate[0].dateFrom;
                        objRes["dateUntil"] = resultDate[0].dateUntil;
                    }
                }
            
                cb(objRes);
            })
        });
    }

    static async getAllDataPieChartMonitoring(bodyReq, cb){
        let filter = {
            "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
            "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
        };

        let agg = [];

        agg.push({ 
            "$match" : { 
                "targetId": bodyReq.params.userId,
                "timestamp": filter
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "localField" : "postId", 
                "foreignField" : "postId", 
                "as" : "dataContent"
            }
        });
            
        agg.push({ 
            "$unwind" : { 
                "path" : "$dataContent", 
                "preserveNullAndEmptyArrays" : true
            }
        });
            
        agg.push({ 
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "dataContent._id", 
                "foreignField" : "foreignId", 
                "as" : "classificationImage"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({
            "$group" : { 
                "_id" : "$postId", 
                "timestamp": {"$first": "$timestamp"},
                "caption": {"$first": "$caption"},
                "classificationText": {"$first": "$classificationText"},
                "imageHate": {"$sum": {"$ifNull": ["$classificationImage.hateful", 0]}},
                "imagePorn": {"$sum": {"$ifNull": ["$classificationImage.porn", 0]}},
                "imageRadicalism": {"$sum": {"$ifNull": ["$classificationImage.radicalism", 0]}},
                "imageTerrorism": {"$sum": {"$ifNull": ["$classificationImage.terrorism", 0]}},
                "imageLgbt": {"$sum": {"$ifNull": ["$classificationImage.lgbt", 0]}},
            }
        });
            
        agg.push({ 
            "$group" : { 
                "_id" : null, 
                "hateful" : {"$sum":{"$cond":[{"$or":[{"$eq":["$classificationText.hateful",1]},{"$gte":["$imageHate",1]}]},1,0]}},
                "porn" : {"$sum":{"$cond":[{"$or":[{"$eq":["$classificationText.porn",1]},{"$gte":["$imagePorn",1]}]},1,0]}},
                "radicalism" : {"$sum":{"$cond":[{"$or":[{"$eq":["$classificationText.radicalism",1]},{"$gte":["$imageRadicalism",1]}]},1,0]}},
                "lgbt" : {"$sum":{"$cond":[{"$or":[{"$eq":["$classificationText.lgbt",1]},{"$gte":["$imageLgbt",1]}]},1,0]}},
                "terrorism" : {"$sum":{"$cond":[{"$or":[{"$gte":["$imageTerrorism",1]}]},1,0]}},
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {            
            cb(result);
        });
    }

    static async getAllDataPieChartIncreaseMonitoring(bodyReq, cb){
        let filter = {
            "$gte": moment(bodyReq.params.dateUntil).utc(true).toDate(),
            "$lte": moment(bodyReq.params.dateCurrent).utc(true).toDate()
        };

        let agg = [];

        agg.push({ 
            "$match" : { 
                "targetId": bodyReq.params.userId,
                "timestamp": filter
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "localField" : "postId", 
                "foreignField" : "postId", 
                "as" : "dataContent"
            }
        });
            
        agg.push({ 
            "$unwind" : { 
                "path" : "$dataContent", 
                "preserveNullAndEmptyArrays" : true
            }
        });
            
        agg.push({ 
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "dataContent._id", 
                "foreignField" : "foreignId", 
                "as" : "classificationImage"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({
            "$group" : { 
                "_id" : "$postId", 
                "timestamp": {"$first": "$timestamp"},
                "caption": {"$first": "$caption"},
                "classificationText": {"$first": "$classificationText"},
                "imageHate": {"$sum": {"$ifNull": ["$classificationImage.hateful", 0]}},
                "imagePorn": {"$sum": {"$ifNull": ["$classificationImage.porn", 0]}},
                "imageRadicalism": {"$sum": {"$ifNull": ["$classificationImage.radicalism", 0]}},
                "imageTerrorism": {"$sum": {"$ifNull": ["$classificationImage.terrorism", 0]}},
                "imageLgbt": {"$sum": {"$ifNull": ["$classificationImage.lgbt", 0]}},
            }
        });
            
        agg.push({ 
            "$group" : { 
                "_id" : null, 
                "hateful" : {"$sum":{"$cond":[{"$or":[{"$eq":["$classificationText.hateful",1]},{"$gte":["$imageHate",1]}]},1,0]}},
                "porn" : {"$sum":{"$cond":[{"$or":[{"$eq":["$classificationText.porn",1]},{"$gte":["$imagePorn",1]}]},1,0]}},
                "radicalism" : {"$sum":{"$cond":[{"$or":[{"$eq":["$classificationText.radicalism",1]},{"$gte":["$imageRadicalism",1]}]},1,0]}},
                "lgbt" : {"$sum":{"$cond":[{"$or":[{"$eq":["$classificationText.lgbt",1]},{"$gte":["$imageLgbt",1]}]},1,0]}},
                "terrorism" : {"$sum":{"$cond":[{"$or":[{"$gte":["$imageTerrorism",1]}]},1,0]}},
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {            
            cb(result);
        });
    }

    static async getLastDataCountMonitoring(bodyReq, cb){
        let filter = {
            "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
            "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
        };

        let agg = [];

        agg.push({ 
            "$match" : { 
                "targetId": bodyReq.params.userId,
                "timestamp": filter
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "localField" : "postId", 
                "foreignField" : "postId", 
                "as" : "dataContent"
            }
        });
            
        agg.push({ 
            "$unwind" : { 
                "path" : "$dataContent", 
                "preserveNullAndEmptyArrays" : true
            }
        });
            
        agg.push({ 
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "dataContent._id", 
                "foreignField" : "foreignId", 
                "as" : "classificationImage"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({
            "$group" : { 
                "_id" : "$postId", 
                "timestamp": {"$first": "$timestamp"},
                "caption": {"$first": "$caption"},
                "classificationText": {"$first": "$classificationText"},
                "imageHate": {"$sum": {"$ifNull": ["$classificationImage.hateful", 0]}},
                "imagePorn": {"$sum": {"$ifNull": ["$classificationImage.porn", 0]}},
                "imageRadicalism": {"$sum": {"$ifNull": ["$classificationImage.radicalism", 0]}},
                "imageTerrorism": {"$sum": {"$ifNull": ["$classificationImage.terrorism", 0]}},
                "imageLgbt": {"$sum": {"$ifNull": ["$classificationImage.lgbt", 0]}},
            }
        });
            
        agg.push({ 
            "$group" : { 
                "_id" : null, 
                "posts" : {
                    "$addToSet": {
                        "caption" : "$caption"
                    }
                },
                "positive" : {"$sum":{"$cond":[{"$and":[{"$ne":["$classificationText.hateful",1]},{"$ne":["$classificationText.porn", 1]},{"$ne":["$classificationText.radicalism", 1]},{"$eq":["$imageHate", 0]},{"$eq":["$imagePorn",0]},{"$eq":["$imageRadicalism",0]},{"$eq":["$imageTerrorism",0]},{"$eq":["$imageLgbt",0]}]},1,0]}}, 
                "negative" : {"$sum":{"$cond":[{"$or":[{"$eq":["$classificationText.hateful",1]},{"$eq":["$classificationText.porn",1]},{"$eq":["$classificationText.radicalism",1]},{"$gte":["$imageHate",1]},{"$gte":["$imagePorn",1]},{"$gte":["$imageRadicalism",1]},{"$gte":["$imageTerrorism",1]},{"$gte":["$imageLgbt",1]}]}, 1,0]}}, 
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });
    }

    static async getCurrentDataMonitoring(bodyReq, cb){
        let filter = {
            "$gte": moment(bodyReq.params.dateUntil).utc(true).toDate(),
            "$lte": moment(bodyReq.params.dateCurrent).utc(true).toDate()
        };

        let agg = [];

        agg.push({ 
            "$match" : { 
                "targetId": bodyReq.params.userId,
                "timestamp": filter
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "localField" : "postId", 
                "foreignField" : "postId", 
                "as" : "dataContent"
            }
        });
            
        agg.push({ 
            "$unwind" : { 
                "path" : "$dataContent", 
                "preserveNullAndEmptyArrays" : true
            }
        });
            
        agg.push({ 
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "dataContent._id", 
                "foreignField" : "foreignId", 
                "as" : "classificationImage"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({
            "$group" : { 
                "_id" : "$postId", 
                "timestamp": {"$first": "$timestamp"},
                "caption": {"$first": "$caption"},
                "classificationText": {"$first": "$classificationText"},
                "imageHate": {"$sum": {"$ifNull": ["$classificationImage.hateful", 0]}},
                "imagePorn": {"$sum": {"$ifNull": ["$classificationImage.porn", 0]}},
                "imageRadicalism": {"$sum": {"$ifNull": ["$classificationImage.radicalism", 0]}},
                "imageTerrorism": {"$sum": {"$ifNull": ["$classificationImage.terrorism", 0]}},
                "imageLgbt": {"$sum": {"$ifNull": ["$classificationImage.lgbt", 0]}},
            }
        });
            
        agg.push({ 
            "$group" : { 
                "_id" : null, 
                "posts" : {
                    "$addToSet": {
                        "caption" : "$caption"
                    }
                },
                "positive" : {"$sum":{"$cond":[{"$and":[{"$ne":["$classificationText.hateful",1]},{"$ne":["$classificationText.porn", 1]},{"$ne":["$classificationText.radicalism", 1]},{"$eq":["$imageHate", 0]},{"$eq":["$imagePorn",0]},{"$eq":["$imageRadicalism",0]},{"$eq":["$imageTerrorism",0]},{"$eq":["$imageLgbt",0]}]},1,0]}}, 
                "negative" : {"$sum":{"$cond":[{"$or":[{"$eq":["$classificationText.hateful",1]},{"$eq":["$classificationText.porn",1]},{"$eq":["$classificationText.radicalism",1]},{"$gte":["$imageHate",1]},{"$gte":["$imagePorn",1]},{"$gte":["$imageRadicalism",1]},{"$gte":["$imageTerrorism",1]},{"$gte":["$imageLgbt",1]}]}, 1,0]}}, 
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });
    }

    static async getAllPredictCount(bodyReq, cb){
        let options = {};
        let labels = ["Radicalism", "Hateful", "Porn", "Terrorism", "LGBT"];
        let series = [];

        let countRad = 0;
        let countHat = 0;
        let countPorn = 0;
        let countTerrorism = 0;
        let countLgbt = 0;

        let filter = {
            "ownerId" : bodyReq.params.userId,
            // "created_at" : { 
            //     "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
            //     "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            // }
        };

        let agg = [];

        agg.push({ 
            "$match" : filter
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$timestamp", 
                "id" : { 
                    "$first" : "$_id"
                }, 
                "caption" : { 
                    "$first" : "$caption"
                }, 
                "likeCount" : { 
                    "$first" : "$likeCount"
                }, 
                "userId" : { 
                    "$first" : "$ownerId"
                }, 
                "postId" : { 
                    "$first" : "$postId"
                }, 
                "targetId" : { 
                    "$first" : "$targetId"
                }, 
                "timestamp" : { 
                    "$first" : "$timestamp"
                }, 
                "type" : { 
                    "$first" : "$type"
                }
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetComment", 
                "let" : { 
                    "id" : "$id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$postId", 
                                            "$$id"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 1.0, 
                            "postId" : 1.0, 
                            "content" : 1.0, 
                            "timestamp" : 1.0
                        }
                    }
                ], 
                "as" : "countComment"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "id", 
                "foreignField" : "foreignId", 
                "as" : "predict"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$predict", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "let" : { 
                    "postId" : "$postId"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$eq" : [
                                    "$postId", 
                                    "$$postId"
                                ]
                            }
                        }
                    }, 
                    { 
                        "$lookup" : { 
                            "from" : "classificationImage", 
                            "let" : { 
                                "id" : "$_id"
                            }, 
                            "pipeline" : [
                                { 
                                    "$match" : { 
                                        "$expr" : { 
                                            "$eq" : [
                                                "$foreignId", 
                                                "$$id"
                                            ]
                                        }
                                    }
                                }
                            ], 
                            "as" : "classificationImage"
                        }
                    }, 
                    { 
                        "$unwind" : { 
                            "path" : "$classificationImage", 
                            "preserveNullAndEmptyArrays" : true
                        }
                    }, 
                    { 
                        "$project" : { 
                            "mediaId" : "$_id",
                            "postId" : 1.0,  
                            "type" : 1.0, 
                            "tags" : 1.0, 
                            "content" : 1.0, 
                            "timestamp": 1.0,
                            "predict" : {
                                "hateful" : "$classificationImage.hateful", 
                                "porn" : "$classificationImage.porn", 
                                "radicalism" : "$classificationImage.radicalism", 
                                "terrorism" : "$classificationImage.terrorism",
                                "lgbt" : "$classificationImage.lgbt"
                            }
                        }
                    }
                ], 
                "as" : "media"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$media", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({
            "$group":{
                "_id" : "$_id",
                "radicalText": {"$sum": { "$cond" : [{"$eq": ["$predict.radicalism", 1]}, 1,0]}},
                "radicalImg": {"$sum": { "$cond" : [{"$eq": ["$media.predict.radicalism", 1]}, 1,0]}},
                "propagandaText": {"$sum": { "$cond" : [{ '$eq': ['$predict.propaganda', 1]}, 1,0]}},
                "hatefulText": {"$sum": { "$cond" : [{"$eq": ["$predict.hateful", 1]}, 1,0]}},
                "hatefulImg": {"$sum": { "$cond" : [{"$eq": ["$media.predict.hateful", 1]}, 1,0]}},
                "sentiment": {"$sum": { "$cond" : [{'$eq': ['$predict.sentiment', -1]}, 1,0]}},
                "pornText": {"$sum": { "$cond" : [{"$or": [{"$eq": ["$predict.porn", 1]},{ "$eq" : ["$predict.resultClassification.porn.result", "sexy"]}]}, 1, 0]}},
                "pornImg": {"$sum": { "$cond" : [{"$or": [{"$eq": ["$media.predict.porn", 1]},{ "$eq" : ["$media.predict.resultClassification.porn.result", "sexy"]}]}, 1, 0]}},
                "lgbtText": {"$sum": { "$cond" : [{"$eq": ["$predict.lgbt", 1]}, 1, 0]}},
                "lgbtImg": {"$sum": { "$cond" : [{"$eq": ["$media.predict.lgbt", 1]}, 1, 0]}},
                "terrorism": {"$sum": {"$cond": [{"$eq": ["$media.predict.terrorism", 1]}, 1,0]}}
            }
        });

        agg.push({
            "$group":{
                "_id" : "$_id",
                "radical": {"$sum": { "$cond" : [{"$or": [{"$gt": ["$radicalText", 0]},{"$gt": ["$radicalImg", 0]},{ '$gt': ['$propagandaText', 0]}]}, 1,0]}},
                "hateful": {"$sum": { "$cond" : [{"$or": [{"$gt": ["$hatefulText", 0]},{"$gt": ["$hatefulImg", 0]},{ '$gt': ['$sentiment', 0]}]}, 1, 0]}},
                "porn": {"$sum": { "$cond" : [{"$or": [{"$gt": ["$pornText", 0]},{"$gt": ["$pornImg", 0]}]}, 1, 0]}},
                "lgbt": {"$sum": { "$cond" : [{"$or": [{"$gt": ["$lgbtText", 0]},{"$gt": ["$lgbtImg", 0]}]}, 1, 0]}},
                "terrorism": {"$sum": {"$cond": [{"$gt": ["$terrorism", 0]}, 1,0]}}
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : null, 
                "countRad" : { 
                    "$sum" : "$radical"
                }, 
                "countHate" : { 
                    "$sum" : "$hateful"
                }, 
                "countPorn" : { 
                    "$sum" : "$porn"
                },
                "countTerorist" : { 
                    "$sum" : "$terrorism"
                },
                "countLgbt" : { 
                    "$sum" : "$lgbt"
                }
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result){
            
            if(result && result.length > 0){
                countRad += result[0]["countRad"];
                countHat += result[0]["countHate"];
                countPorn += result[0]["countPorn"];
                countTerrorism += result[0]["countTerorist"];
                countLgbt += result[0]["countLgbt"];

                let obj = {
                    "name" : "Predict Count",
                    "data" : [countRad, countHat, countPorn, countTerrorism, countLgbt]
                };

                series.push(obj);
                options["series"] = series;
                options["categories"] = labels;
                cb(options);
            } else{
                let obj = {
                    "name" : "Predict Count",
                    "data" : [countRad, countHat, countPorn, countTerrorism, countLgbt]
                };

                series.push(obj);
                options["series"] = series;
                options["categories"] = labels;
                cb(options);
            }
        });
    }

    static async getPostCountByDate(bodyReq, cb){
        let filter = {
            "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
            "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
        };

        let agg = [];

        agg.push({ 
            "$match" : { 
                "ownerId" : bodyReq.params.userId,
                "timestamp" : filter
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "let" : {"id" : "$postId"}, 
                "pipeline" : [{"$match":{"$expr":{"$and":[{"$eq":["$postId","$$id"]}]}}},{"$lookup":{"from":"classificationImage","let":{"id":"$_id"},"pipeline":[{"$match":{"$expr":{"$eq":["$foreignId","$$id"]}}}],"as":"classificationImage"}},{"$unwind":{"path":"$classificationImage"}},{"$replaceRoot":{"newRoot":"$classificationImage"}}], 
                "as" : "classificationImage"
            }
        });

          
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays" : true
            }
        });

        let and = [];
        if ("categories" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.categories.length > 0){
                if(bodyReq.params.categories.length == 5){
                } else{
                    let filterMatch = {};
                    bodyReq.params.categories.forEach((element) => {
                        if (element == "lgbt"){
                            
                        } else if (element != "terrorism"){
                            filterMatch = { "$or": [{}, {}] };
                            filterMatch["$or"][0]["classificationText."+ element] = 1;
                            filterMatch["$or"][1]["classificationImage."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["classificationImage."+ element] = 1;
                        }
                        or.push(filterMatch);
                    });
                    and.push({"$or":or});
                }
            }
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){
                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({"caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$nor":or});
            }
        }

        if (and.length > 0) {
            agg.push({
                "$match" : {
                    "$and": and
                }
            });    
        }

        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "_id":"$_id",
                    "timestamp": { 
                        "$dateToString" : { 
                            "format" : "%Y-%m-%d", 
                            "date" : "$timestamp"
                        }
                    }
                }
            }
        });

        agg.push({
            "$group" : {
                "_id" : "$_id.timestamp",
                "count": {
                    "$sum" : 1
                }
            }
        });

        agg.push({ 
            "$sort" : { 
                "_id" : 1.0
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });
    }

    static async getInteractionCountByDate(bodyReq, cb){
        let filter = {
            "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
            "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
        };

        let agg = [];
            
        agg.push({ 
            "$match" : { 
                "ownerId" : bodyReq.params.userId,
                "timestamp" : filter
            }
        });
        
        agg.push({ 
            "$lookup" : { 
                "from" : "targetLike", 
                "localField" : "_id", 
                "foreignField" : "postId", 
                "as" : "dataLike"
            }
        });
        
        agg.push({ 
            "$lookup" : { 
                "from" : "targetComment", 
                "localField" : "_id", 
                "foreignField" : "postId", 
                "as" : "dataComment"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "let" : {"id" : "$postId"}, 
                "pipeline" : [{"$match":{"$expr":{"$and":[{"$eq":["$postId","$$id"]}]}}},{"$lookup":{"from":"classificationImage","let":{"id":"$_id"},"pipeline":[{"$match":{"$expr":{"$eq":["$foreignId","$$id"]}}}],"as":"classificationImage"}},{"$unwind":{"path":"$classificationImage"}},{"$replaceRoot":{"newRoot":"$classificationImage"}}], 
                "as" : "classificationImage"
            }
        });

          
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays" : true
            }
        });

        let and = [];
        if ("categories" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.categories.length > 0){
                if(bodyReq.params.categories.length == 5){
                } else{
                    let filterMatch = {};
                    bodyReq.params.categories.forEach((element) => {
                        if (element == "lgbt"){
                            
                        } else if (element != "terrorism"){
                            filterMatch = { "$or": [{}, {}] };
                            filterMatch["$or"][0]["classificationText."+ element] = 1;
                            filterMatch["$or"][1]["classificationImage."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["classificationImage."+ element] = 1;
                        }
                        or.push(filterMatch);
                    });
                    and.push({"$or":or});
                }
            }
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){

                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({"caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$nor":or});
            }
        }

        if (and.length > 0) {
            agg.push({
                "$match" : {
                    "$and": and
                }
            });    
        }

         
        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "$dateToString" : { 
                        "format" : "%Y-%m-%d", 
                        "date" : "$timestamp"
                    }
                }, 
                "countLike" : {"$first" : "$dataLike"},
                "countComment" : {"$first" : "$dataComment"}
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : 0.0, 
                "timestamp" : "$_id",
                "countLike" : { 
                    "$size" : "$countLike"
                }, 
                "countComment" : { 
                    "$size" : "$countComment"
                }
            }
        });

        agg.push({ 
            "$sort" : { 
                "timestamp" : 1.0
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });
    }

    static async getPostCountByDayHourHeatMap(bodyReq, cb){
        let filter = {
            "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
            "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
        };

        let agg = [];

        agg.push({ 
            "$match" : { 
                "ownerId" : bodyReq.params.userId,
                "timestamp" : filter
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "let" : {"id" : "$postId"}, 
                "pipeline" : [{"$match":{"$expr":{"$and":[{"$eq":["$postId","$$id"]}]}}},{"$lookup":{"from":"classificationImage","let":{"id":"$_id"},"pipeline":[{"$match":{"$expr":{"$eq":["$foreignId","$$id"]}}}],"as":"classificationImage"}},{"$unwind":{"path":"$classificationImage"}},{"$replaceRoot":{"newRoot":"$classificationImage"}}], 
                "as" : "classificationImage"
            }
        });

          
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays" : true
            }
        });

        let and = [];
        if ("categories" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.categories.length > 0){
                if(bodyReq.params.categories.length == 5){
                } else{
                    let filterMatch = {};
                    bodyReq.params.categories.forEach((element) => {
                        if (element == "lgbt"){
                            
                        } else if (element != "terrorism"){
                            filterMatch = { "$or": [{}, {}] };
                            filterMatch["$or"][0]["classificationText."+ element] = 1;
                            filterMatch["$or"][1]["classificationImage."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["classificationImage."+ element] = 1;
                        }
                        or.push(filterMatch);
                    });
                    and.push({"$or":or});
                }
            }
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){
                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({"caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$nor":or});
            }
        }

        if (and.length > 0) {
            agg.push({
                "$match" : {
                    "$and": and
                }
            });    
        }
        
        agg.push({
            "$group": {
                "_id": {
                    "dtm" : '$timestamp',
                    "pid" : '$_id',
                    "day" : { '$dayOfWeek': '$timestamp' },
                    'hour': { '$hour': '$timestamp' }                    
                }
            }
        });

        agg.push({
            "$group": {
                    "_id" : {
                        "day" : "$_id.day",
                        "hour" : "$_id.hour",
                    },
                    "cnt" : {'$sum' : 1}
            }            	
        })

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });
    }

    static async getPostCountByDayHour(bodyReq, cb){
        let filter = {
            "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
            "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
        };

        let agg = [];

        agg.push({ 
            "$match" : { 
                "ownerId" : bodyReq.params.userId,
                "timestamp" : filter
            }
        });

        // //
        // agg.push({ 
        //     "$lookup" : { 
        //         "from" : "classificationText", 
        //         "localField" : "_id", 
        //         "foreignField" : "foreignId", 
        //         "as" : "classificationText"
        //     }
        // });

        // agg.push({ 
        //     "$unwind" : { 
        //         "path" : "$classificationText",
        //         "preserveNullAndEmptyArrays" : true
        //     }
        // });

        // agg.push({ 
        //     "$lookup" : { 
        //         "from" : "targetPostContent", 
        //         "let" : {"id" : "$postId"}, 
        //         "pipeline" : [{"$match":{"$expr":{"$and":[{"$eq":["$postId","$$id"]}]}}},{"$lookup":{"from":"classificationImage","let":{"id":"$_id"},"pipeline":[{"$match":{"$expr":{"$eq":["$foreignId","$$id"]}}}],"as":"classificationImage"}},{"$unwind":{"path":"$classificationImage"}},{"$replaceRoot":{"newRoot":"$classificationImage"}}], 
        //         "as" : "classificationImage"
        //     }
        // });

          
        // agg.push({ 
        //     "$unwind" : { 
        //         "path" : "$classificationImage",
        //         "preserveNullAndEmptyArrays" : true
        //     }
        // });

        // let and = [];
        // if ("categories" in bodyReq.params) {
        //     let or = [];
        //     if(bodyReq.params.categories.length > 0){
        //         if(bodyReq.params.categories.length == 5){
                    
        //         } else{
        //             let filterMatch = {};
        //             bodyReq.params.categories.forEach((element) => {
        //                 if (element == "lgbt"){
                            
        //                 } else if (element != "terrorism"){
        //                     filterMatch = { "$or": [{}, {}] };
        //                     filterMatch["$or"][0]["classificationText."+ element] = 1;
        //                     filterMatch["$or"][1]["classificationImage."+ element] = 1;
        //                 } else {
        //                     filterMatch = {};
        //                     filterMatch["classificationImage."+ element] = 1;
        //                 }
        //                 or.push(filterMatch);
        //             });
        //             and.push({"$or":or});
        //             agg.push({
        //                 "$match" : {
        //                     "$and": and
        //                 }
        //             });
        //         }
        //     }
        // }

        // if ("includeKeywords" in  bodyReq.params) {
        //     let or = [];
        //     if(bodyReq.params.includeKeywords.length > 0){
        //         bodyReq.params.includeKeywords.forEach((element) => {
        //             or.push({ "caption": { $regex: new RegExp('.' + element + '.', 'i') }});
        //         });
        //         and.push({"$or":or});
        //         agg.push({
        //             "$match" : {
        //                 "$and": and
        //             }
        //         });
        //     }
        // }

        // if ("excludeKeywords" in bodyReq.params) {
        //     let or = [];
        //     if(bodyReq.params.excludeKeywords.length > 0){
        //         bodyReq.params.excludeKeywords.forEach((element) => {
        //             or.push({ "caption": { $regex: new RegExp('.' + element + '.', 'i') }});
        //         });
        //         and.push({"$or":or});
        //         agg.push({
        //             "$match" : {
        //                 "$and": and
        //             }
        //         });
        //     }
        // }
        // //
        
        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "timestamp" : "$timestamp", 
                    "day" : { 
                        "$dayOfWeek" : "$timestamp"
                    }, 
                    "hour" : { 
                        "$hour" : "$timestamp"
                    }, 
                    "_id" : "$_id"
                }
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "day" : "$_id.day", 
                    "hour" : "$_id.hour"
                }, 
                "count" : { 
                    "$sum" : 1.0
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "day" : "$_id.day", 
                "hour" : "$_id.hour", 
                "count" : 1.0, 
                "_id" : 0.0
            }
        });

        agg.push({ 
            "$sort" : { 
                "day" : 1.0, 
                "hour" : 1.0
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });
    }

    static async getPostCountByClassification(bodyReq, cb){
        let filter = {
            "ownerId" : bodyReq.params.userId,
            "timestamp" : { 
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            }
        };

        let agg = [];

        agg.push({ 
            "$match" : filter
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "classificationText"
            }
        });
        
        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "let" : {"id" : "$postId"}, 
                "pipeline" : [{"$match":{"$expr":{"$and":[{"$eq":["$postId","$$id"]}]}}},{"$lookup":{"from":"classificationImage","let":{"id":"$_id"},"pipeline":[{"$match":{"$expr":{"$eq":["$foreignId","$$id"]}}}],"as":"classificationImage"}},{"$unwind":{"path":"$classificationImage"}},{"$replaceRoot":{"newRoot":"$classificationImage"}}], 
                "as" : "classificationImage"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText",
                "preserveNullAndEmptyArrays" : true
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays" : true
            }
        });

        let and = [];
        if ("categories" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.categories.length > 0){
                if(bodyReq.params.categories.length == 5){
                } else{
                    let filterMatch = {};
                    bodyReq.params.categories.forEach((element) => {
                        if (element == "lgbt"){
                            
                        } else if (element != "terrorism"){
                            filterMatch = { "$or": [{}, {}] };
                            filterMatch["$or"][0]["classificationText."+ element] = 1;
                            filterMatch["$or"][1]["classificationImage."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["classificationImage."+ element] = 1;
                        }
                        or.push(filterMatch);
                    });
                    and.push({"$or":or});
                }
            }
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){
                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({"caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$nor":or});
            }
        }

        if (and.length > 0) {
            agg.push({
                "$match" : {
                    "$and": and
                }
            });    
        }

        agg.push({
            "$group" : { 
                "_id" : "$postId", 
                "timestamp": {"$first": "$timestamp"},
                "classificationText": {"$first": "$classificationText"},
                "imageHate": {"$sum": {"$ifNull": ["$classificationImage.hateful", 0]}},
                "imagePorn": {"$sum": {"$ifNull": ["$classificationImage.porn", 0]}},
                "imageRadicalism": {"$sum": {"$ifNull": ["$classificationImage.radicalism", 0]}},
                "imageTerrorism": {"$sum": {"$ifNull": ["$classificationImage.terrorism", 0]}},
                "imageLgbt": {"$sum": {"$ifNull": ["$classificationImage.lgbt", 0]}},
            }
        });
        
        agg.push({
            "$group" : { 
                "_id" : {"timestamp" : {"$dateToString" : {"format" : "%Y-%m-%d", "date" : "$timestamp"}}}, 
                "positive" : {"$sum":{"$cond":[{"$and":[{"$ne":["$classificationText.sentiment",-1]},{"$ne":["$classificationText.propaganda",1]},{"$ne":["$classificationText.hateful",1]},{"$ne":["$classificationText.porn",1]},{"$ne":["$classificationText.radicalism",1]},{"$ne":["$classificationText.lgbt",1]},{"$eq":["$imageHate",0]},{"$eq":["$imagePorn",0]},{"$eq":["$imageRadicalism",0]},{"$eq":["$imageTerrorism",0]},{"$eq":["$imageLgbt",0]}]},1,0]}}, 
                "negative" : {"$sum":{"$cond":[{"$or":[{"$eq":["$classificationText.sentiment",-1]},{"$eq":["$classificationText.propaganda",1]},{"$eq":["$classificationText.hateful",1]},{"$eq":["$classificationText.porn",1]},{"$eq":["$classificationText.radicalism",1]},{"$eq":["$classificationText.lgbt",1]},{"$gte":["$imageHate",1]},{"$gte":["$imagePorn",1]},{"$gte":["$imageRadicalism",1]},{"$gte":["$imageTerrorism",1]},{"$gte":["$imageLgbt",1]}]},-1,0]}}, 
                "count" : {"$sum" : 1.0}
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : 0.0, 
                "timestamp" : "$_id.timestamp", 
                "positive" : 1.0, 
                "negative" : 1.0, 
                "count" : 1.0
            }
        });

        agg.push({ 
            "$sort" : { 
                "timestamp" : 1.0
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });
    }

    static async getUsernameCountByClassification(bodyReq, exceptUsername, cb){
        let agg = [];

        agg.push({
            "$match": {
                "ownerId": bodyReq.params.userId,
                "timestamp": {
                    "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                    "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
                }
            }
        });

        agg.push({
            "$project": {
                "_id": 1,
                "dateUpdate": 1,
                "caption": 1,
                "postId": 1
            }
        });

        agg.push({
            "$lookup": {
                "from": "targetPostContent",
                "let": { "id": "$postId" },
                "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$postId", "$$id"]}]}}}],
                "as": "detailImages"
            }
        });

        agg.push({
            "$lookup": {
                "from": "classificationText",
                "let": { "id": "$_id", "dateUpdate": "$dateUpdate" },
                "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$foreignId", "$$id"]}, {"$eq": ["$dateUpdate", "$$dateUpdate"]}, {"$eq": ["$source", "targetPost"]}]}}}],
                "as": "classificationText"
            }
        });

        agg.push({
            "$unwind": {
                "path": "$detailImages"
            }
        });

        agg.push({
            "$lookup": {
                "from": "classificationImage",
                "let": { "id": "$detailImages._id" },
                "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$foreignId", "$$id"]}, {"$eq": ["$source", "targetPostContent"]}]}}}],
                "as": "classificationImage"
            }
        });

        agg.push({
            "$unwind": {
                "path": "$classificationImage",
            }
        });

        agg.push({
            "$unwind": {
                "path": "$classificationText",
            }
        });

        agg.push({
            "$match": {
                "$or": [
                    //{"classificationText.advertisement": {"$eq": 1}},
                    //{"classificationText.hoax": {"$eq": 1}},
                    {"classificationText.hateful": {"$eq": 1}},
                    {"classificationText.porn": {"$eq": 1}},
                    {"classificationText.propaganda": {"$eq": 1}},
                    {"classificationText.radicalism": {"$eq": 1}},
                    {"classificationText.lgbt": {"$eq": 1}},
                    {"classificationText.sentiment": {"$eq": -1}},
                    {"classificationImage.hateful": {"$eq": 1}},
                    {"classificationImage.porn": {"$eq": 1}},
                    {"classificationImage.radicalism": {"$eq": 1}},
                    {"classificationImage.terrorism": {"$eq": 1}},
                    {"classificationImage.lgbt": {"$eq": 1}},
                ]
            }
        });

        let and = [];
        if ("categories" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.categories.length > 0){
                if(bodyReq.params.categories.length == 5){
                } else{
                    let filterMatch = {};
                    bodyReq.params.categories.forEach((element) => {
                        if (element == "lgbt"){
                            
                        } else if (element != "terrorism"){
                            filterMatch = { "$or": [{}, {}] };
                            filterMatch["$or"][0]["classificationText."+ element] = 1;
                            filterMatch["$or"][1]["classificationImage."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["classificationImage."+ element] = 1;
                        }
                        or.push(filterMatch);
                    });
                    and.push({"$or":or});
                }
            }
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){
                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({"caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$nor":or});
            }
        }

        if (and.length > 0) {
            agg.push({
                "$match" : {
                    "$and": and
                }
            });    
        }

        agg.push({
            "$group": {
                "_id": "$_id",
                "postId": { "$first": "$postId" },
                "radicalismText" : { 
                    "$sum" : "$classificationText.radicalism"
                }, 
                "hateText" : { 
                    "$sum" : "$classificationText.hateful"
                }, 
                "pornText" : { 
                    "$sum" : "$classificationText.porn"
                },
                "propagandaText" : { 
                    "$sum" : "$classificationText.propaganda"
                },
                "lgbtText" : { 
                    "$sum" : "$classificationText.lgbt"
                }, 
                "sentimentText" : { 
                    "$first" : "$classificationText.sentiment"
                }, 
                "hateImage" : { 
                    "$sum" : "$classificationImage.hateful"
                }, 
                "pornImage" : { 
                    "$sum" : "$classificationImage.porn"
                }, 
                "radicalismImage" : { 
                    "$sum" : "$classificationImage.radicalism"
                }, 
                "terrorismImage" : { 
                    "$sum" : "classificationImage.terrorism"
                },
                "lgbtImage" : { 
                    "$sum" : "classificationImage.lgbt"
                }
            }
        });

        agg.push({
            "$lookup": {
                "from": "targetLike",
                "let": { "id": "$_id"},
                "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$postId", "$$id"]}]}}}, {"$project": {"_id": 0, "fullName": 1, "isPrivate": 1, "isVerified": 1, "profilePic": 1, "username": 1,  "like": {"$literal": 1}}}],
                "as": "targetLike"
            }
        });
        
        agg.push({
            "$lookup": {
                "from": "targetComment",
                "let": { "id": "$_id"},
                "pipeline": [{
                        "$match": {"$expr": {"$and": [{"$eq": ["$postId", "$$id"]}]}}
                    }, {
                        "$project": {"_id": 0, "fullName": "", "isPrivate": "", "isVerified": "$owner.isVerified", "profilePic": "$owner.profilePic", "username": "$owner.username"}
                    }, {
                        "$lookup": {"from": "contacts", "localField": "username", "foreignField": "username", "as": "contact" }
                    }, {
                        "$project": { "fullName": { "$ifNull": [{"$arrayElemAt": ["$contact.fullName", 0]}, ""]}, "isPrivate": {"$ifNull": [{"$arrayElemAt": ["$contact.isPrivate", 0]}, ""]}, "isVerified": 1, "profilePic": 1, "username": 1, "comment": {"$literal": 1}}
                    }],
                "as": "targetComment"
            }
        });

        agg.push({ 
            "$project" : { 
                "postId": 1,
                "radical" : { 
                    "$cond" : [
                        {
                            "$or": [
                                {"$gte": ["$radicalismText", 1]},
                                // {"$gte": ["$propagandaText", 1]},
                                {"$gte": ["$radicalismImage", 1]}
                            ]
                        },
                        1,
                        0
                    ]
                }, 
                "hateful" : { 
                    "$cond" : [
                        {
                            "$or": [
                                {"$gte": ["$hateText", 1]},
                                // {"$eq": ["$sentimentText", -1]},
                                {"$gte": ["$hateImage", 1]}
                            ]
                        },
                        1, 
                        0
                    ]
                }, 
                "porn" : { 
                    "$cond" : [
                        {
                            "$or": [
                                {"$gte": ["$pornText", 1]},
                                {"$gte": ["$pornImage", 1]}
                            ]
                        },
                        1, 
                        0
                    ]
                }, 
                "terorism" : {
                    "$cond": [
                        {"$gte": ["$terrorismImage", 1]},
                        1,
                        0
                    ]
                },
                "lgbt" : { 
                    "$cond" : [
                        {
                            "$or": [
                                {"$gte": ["$lgbtText", 1]},
                                {"$gte": ["$lgbtImage", 1]}
                            ]
                        },
                        1, 
                        0
                    ]
                }, 
                "interactions" : { 
                    "$concatArrays" : [
                        "$targetLike", 
                        "$targetComment"
                    ]
                }
            }
        });
        
        agg.push({
            "$unwind": {
                "path": "$interactions"
            }
        });
        
        agg.push({
            "$group": {
                "_id": "$interactions.username",
                "fullName": {"$first": "$interactions.fullName"},
                "isPrivate": {"$first": "$interactions.isPrivate"},
                "isVerified": {"$first": "$interactions.isVerified"},
                "profilePic": {"$first": "$interactions.profilePic"},
                "like": {"$sum": '$interactions.like'},/* {"$sum": {"$cond": [{ '$ne': ['$interactions.like', null]}, "$interactions.like", 0]}}, */
                "comment": {"$sum": '$interactions.comment'},/* {"$sum": {"$cond": [{ '$ne': ['$interactions.comment', null]}, "$interactions.comment", 0]}}, */
                "total": {"$sum": 1},
                "radicalCount" : { 
                    "$sum" : "$radical"
                }, 
                "hatefulCount" : { 
                    "$sum" : "$hateful"
                }, 
                "pornCount" : { 
                    "$sum" : "$porn"
                }, 
                "terrorismCount" : { 
                    "$sum" : "$terorism"
                }, 
                "lgbtCount" : { 
                    "$sum" : "$lgbt"
                }, 
            }
        });

        agg.push({
            "$project": {
                "_id": 0,
                "username": "$_id",
                "fullName": 1,
                "isPrivate": 1,
                "isVerified": 1,
                "profilePic": 1,
                "like": 1,
                "comment": 1,
                "total": 1,
                "radicalCount":1,
                "hatefulCount":1,
                "pornCount":1,
                "terrorismCount":1,
                "lgbtCount":1
            }
        });
        
        agg.push({
            "$match": {
                "username": { "$ne": exceptUsername }
            }
        });
        
        agg.push({
            "$sort": { "total": -1 }
        });

        agg.push({
            "$limit": 5
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });
    }

    static async getBetweennessAnalytic(bodyReq, exceptUsername, cb) {
        let agg = [];

        agg.push({
            "$match": {
                "ownerId": bodyReq.params.userId,
                "timestamp": {
                    "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                    "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
                }
            }
        });

        agg.push({
            "$project": {
                "_id": 1,
                "dateUpdate": 1,
                "caption": 1,
                "postId": 1
            }
        });

        agg.push({
            "$lookup": {
                "from": "targetPostContent",
                "let": { "id": "$postId" },
                "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$postId", "$$id"]}]}}}],
                "as": "detailImages"
            }
        });

        agg.push({
            "$lookup": {
                "from": "classificationText",
                "let": { "id": "$_id", "dateUpdate": "$dateUpdate" },
                "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$foreignId", "$$id"]}, {"$eq": ["$dateUpdate", "$$dateUpdate"]}, {"$eq": ["$source", "targetPost"]}]}}}],
                "as": "classificationText"
            }
        });

        agg.push({
            "$unwind": {
                "path": "$detailImages"
            }
        });

        agg.push({
            "$lookup": {
                "from": "classificationImage",
                "let": { "id": "$detailImages._id" },
                "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$foreignId", "$$id"]}, {"$eq": ["$source", "targetPostContent"]}]}}}],
                "as": "classificationImage"
            }
        });

        agg.push({
            "$unwind": {
                "path": "$classificationImage",
            }
        });

        agg.push({
            "$unwind": {
                "path": "$classificationText",
            }
        });

        agg.push({
            "$match": {
                "$or": [
                    //{"classificationText.advertisement": {"$eq": 1}},
                    //{"classificationText.hoax": {"$eq": 1}},
                    {"classificationText.hateful": {"$eq": 1}},
                    {"classificationText.porn": {"$eq": 1}},
                    //{"classificationText.propaganda": {"$eq": 1}},
                    {"classificationText.radicalism": {"$eq": 1}},
                    {"classificationText.lgbt": {"$eq": 1}},
                    //{"classificationText.sentiment": {"$eq": -1}},
                    {"classificationImage.hateful": {"$eq": 1}},
                    {"classificationImage.porn": {"$eq": 1}},
                    {"classificationImage.radicalism": {"$eq": 1}},
                    {"classificationImage.terrorism": {"$eq": 1}},
                    {"classificationImage.lgbt": {"$eq": 1}},
                ]
            }
        });

        let and = [];
        if ("categories" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.categories.length > 0){
                if(bodyReq.params.categories.length == 5){
                } else{
                    let filterMatch = {};
                    bodyReq.params.categories.forEach((element) => {
                        if (element == "lgbt"){
                            
                        } else if (element != "terrorism"){
                            filterMatch = { "$or": [{}, {}] };
                            filterMatch["$or"][0]["classificationText."+ element] = 1;
                            filterMatch["$or"][1]["classificationImage."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["classificationImage."+ element] = 1;
                        }
                        or.push(filterMatch);
                    });
                    and.push({"$or":or});
                }
            }
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){
                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({"caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$nor":or});
            }
        }

        if (and.length > 0) {
            agg.push({
                "$match" : {
                    "$and": and
                }
            });    
        }

        agg.push({
            "$group": {
                "_id": "$_id",
                "postId": { "$first": "$postId" }
            }
        });

        agg.push({
            "$lookup": {
                "from": "targetLike",
                "let": { "id": "$_id"},
                "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$postId", "$$id"]}]}}}, {"$project": {"_id": 0, "fullName": 1, "isPrivate": 1, "isVerified": 1, "profilePic": 1, "username": 1,  "like": {"$literal": 1}}}],
                "as": "targetLike"
            }
        });
        
        agg.push({
            "$lookup": {
                "from": "targetComment",
                "let": { "id": "$_id"},
                "pipeline": [{
                        "$match": {"$expr": {"$and": [{"$eq": ["$postId", "$$id"]}]}}
                    }, {
                        "$project": {"_id": 0, "fullName": "", "isPrivate": "", "isVerified": "$owner.isVerified", "profilePic": "$owner.profilePic", "username": "$owner.username"}
                    }, {
                        "$lookup": {"from": "contacts", "localField": "username", "foreignField": "username", "as": "contact" }
                    }, {
                        "$project": { "fullName": { "$ifNull": [{"$arrayElemAt": ["$contact.fullName", 0]}, ""]}, "isPrivate": {"$ifNull": [{"$arrayElemAt": ["$contact.isPrivate", 0]}, ""]}, "isVerified": 1, "profilePic": 1, "username": 1, "comment": {"$literal": 1}}
                    }],
                "as": "targetComment"
            }
        });
        
        agg.push({
            "$project": {
                "postId": 1,
                "interactions": { "$concatArrays": ["$targetLike", "$targetComment"] }
            }
        });
        
        agg.push({
            "$unwind": {
                "path": "$interactions",
                "preserveNullAndEmptyArrays": true
            }
        });
        
        agg.push({
            "$group": {
                "_id": "$interactions.username",
                "fullName": {"$first": "$interactions.fullName"},
                "isPrivate": {"$first": "$interactions.isPrivate"},
                "isVerified": {"$first": "$interactions.isVerified"},
                "profilePic": {"$first": "$interactions.profilePic"},
                "like": {"$sum": {"$cond": [{ '$ne': ['$interactions.like', null]}, "$interactions.like", 0]}},
                "comment": {"$sum": {"$cond": [{ '$ne': ['$interactions.comment', null]}, "$interactions.comment", 0]}},
                "total": {"$sum": 1}
            }
        });

        agg.push({
            "$project": {
                "_id": 0,
                "username": "$_id",
                "fullName": 1,
                "isPrivate": 1,
                "isVerified": 1,
                "profilePic": 1,
                "like": 1,
                "comment": 1,
                "total": 1
            }
        });
        
        agg.push({
            "$match": {
                "username": { "$ne": exceptUsername }
            }
        });
        
        agg.push({
            "$sort": { "total": -1 }
        });

        agg.push({
            "$limit": 5
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });
    }

    static async getNgramWord(bodyReq, cb) {
        let filter = {
            "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
            "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
        };

        let agg = [];

        agg.push({ 
            "$match" : { 
                "ownerId" : bodyReq.params.userId,
                "timestamp" : filter
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "nGram", 
                "let" : { 
                    "id" : "$_id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$_id", 
                                            "$$id"
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 0.0, 
                            "unigram" : 1.0, 
                            "bigram" : 1.0, 
                            "trigram" : 1.0
                        }
                    }
                ], 
                "as" : "nGram"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$nGram", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationText",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "targetPostContent", 
                "let" : {"id" : "$postId"}, 
                "pipeline" : [{"$match":{"$expr":{"$and":[{"$eq":["$postId","$$id"]}]}}},{"$lookup":{"from":"classificationImage","let":{"id":"$_id"},"pipeline":[{"$match":{"$expr":{"$eq":["$foreignId","$$id"]}}}],"as":"classificationImage"}},{"$unwind":{"path":"$classificationImage"}},{"$replaceRoot":{"newRoot":"$classificationImage"}}], 
                "as" : "classificationImage"
            }
        });

          
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays" : true
            }
        });

        let and = [];
        if ("categories" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.categories.length > 0){
                if(bodyReq.params.categories.length == 5){
                } else{
                    let filterMatch = {};
                    bodyReq.params.categories.forEach((element) => {
                        if (element == "lgbt"){
                            
                        } else if (element != "terrorism"){
                            filterMatch = { "$or": [{}, {}] };
                            filterMatch["$or"][0]["classificationText."+ element] = 1;
                            filterMatch["$or"][1]["classificationImage."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["classificationImage."+ element] = 1;
                        }
                        or.push(filterMatch);
                    });
                    and.push({"$or":or});
                }
            }
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){
                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({"caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "caption": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$nor":or});
            }
        }

        if (and.length > 0) {
            agg.push({
                "$match" : {
                    "$and": and
                }
            });    
        }

        let prj = {};
        if("type" in bodyReq.params){
            if(bodyReq.params.type === "unigram"){
                prj = { 
                    "word" : "$nGram.unigram"
                }
            } else if(bodyReq.params.type === "bigram"){
                prj = { 
                    "word" : "$nGram.bigram"
                }
            } else {
                prj = { 
                    "word" : "$nGram.trigram"
                }
            }
        }

        agg.push({ 
            "$project" : prj
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$word"
            }
        });

        agg.push({ 
            "$project" : {                 
                "word" : 1.0, 
                "wordExtract" : { 
                    "$split" : [
                        "$word", 
                        " "
                    ]
                }
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$wordExtract"
            }
        });
 
        let matchNerPos = [];
        if("filter" in bodyReq.params){
            if("ner" in bodyReq.params.filter){
                agg.push({ 
                    "$lookup" : { 
                        "from" : "namedEntityRecognition", 
                        "let" : { 
                            "id" : "$_id", 
                            "word" : "$wordExtract"
                        }, 
                        "pipeline" : [
                            { 
                                "$match" : { 
                                    "$expr" : { 
                                        "$eq" : [
                                            "$foreignId", 
                                            "$$id"
                                        ]
                                    }
                                }
                            }, 
                            { 
                                "$project" : { 
                                    "_id" : 0.0, 
                                    "B-PER" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$NamedEntityRecognition.B-PER"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }, 
                                    "I-PER" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$NamedEntityRecognition.I-PER"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }, 
                                    "B-ORG" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$NamedEntityRecognition.B-ORG"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }, 
                                    "I-ORG" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$NamedEntityRecognition.I-ORG"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }, 
                                    "B-LOC" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$NamedEntityRecognition.B-LOC"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }, 
                                    "I-LOC" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$NamedEntityRecognition.I-LOC"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }, 
                                    "B-DAT" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$NamedEntityRecognition.B-DAT"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }, 
                                    "I-DAT" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$NamedEntityRecognition.I-DAT"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }, 
                                    "B-TIM" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$NamedEntityRecognition.B-TIM"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }, 
                                    "I-TIM" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$NamedEntityRecognition.I-TIM"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }
                                }
                            }
                        ], 
                        "as" : "namedEntityRecognition"
                    }
                });
                
                if(bodyReq.params.filter.ner.indexOf("person") > -1){
                    matchNerPos.push({"namedEntityRecognition.B-PER": 1});
                    matchNerPos.push({"namedEntityRecognition.I-PER": 1});
                } 

                if(bodyReq.params.filter.ner.indexOf("organization") > -1){
                    matchNerPos.push({"namedEntityRecognition.B-ORG": 1});
                    matchNerPos.push({"namedEntityRecognition.I-ORG": 1});
                }

                if(bodyReq.params.filter.ner.indexOf("location") > -1){
                    matchNerPos.push({"namedEntityRecognition.B-LOC": 1});
                    matchNerPos.push({"namedEntityRecognition.I-LOC": 1});
                }

                if(bodyReq.params.filter.ner.indexOf("date") > -1){
                    matchNerPos.push({"namedEntityRecognition.B-DAT": 1});
                    matchNerPos.push({"namedEntityRecognition.I-DAT": 1});
                }

                if(bodyReq.params.filter.ner.indexOf("time") > -1){
                    matchNerPos.push({"namedEntityRecognition.B-TIM": 1});
                    matchNerPos.push({"namedEntityRecognition.I-TIM": 1});
                }
            } 
            
            if("postag" in bodyReq.params.filter){
                agg.push({ 
                    "$lookup" : { 
                        "from" : "posTagging", 
                        "let" : { 
                            "id" : "$_id", 
                            "word" : "$wordExtract"
                        }, 
                        "pipeline" : [
                            { 
                                "$match" : { 
                                    "$expr" : { 
                                        "$eq" : [
                                            "$foreignId", 
                                            "$$id"
                                        ]
                                    }
                                }
                            }, 
                            { 
                                "$project" : { 
                                    "_id" : 0.0, 
                                    "NOUN" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$posTagging.NOUN"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }, 
                                    "ADV" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$posTagging.ADV"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }, 
                                    "VERB" : { 
                                        "$cond" : { 
                                            "if" : { 
                                                "$in" : [
                                                    "$$word", 
                                                    "$posTagging.VERB"
                                                ]
                                            }, 
                                            "then" : 1.0, 
                                            "else" : 0.0
                                        }
                                    }
                                }
                            }
                        ], 
                        "as" : "posTagging"
                    }
                }); 

                if(bodyReq.params.filter.postag.indexOf("verb") > -1){
                    matchNerPos.push({"posTagging.VERB": 1});
                } 
    
                if(bodyReq.params.filter.postag.indexOf("adverb") > -1){
                    matchNerPos.push({"posTagging.ADV": 1});
                }
    
                if(bodyReq.params.filter.postag.indexOf("noun") > -1){
                    matchNerPos.push({"posTagging.NOUN": 1});
                }
            }
            
            agg.push({
                "$match":{
                    "$or": matchNerPos
                }
            });
        }

        agg.push({ 
            "$group" : { 
                "_id" : {"word": "$word", "id": "$_id"}, 
                "posTagging" : { 
                    "$first" : "$posTagging"
                }, 
                "namedEntityRecognition" : { 
                    "$first" : "$namedEntityRecognition"
                }
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$_id.word", 
                "weight" : { 
                    "$sum" : 1.0
                },
                "posTagging" : { 
                    "$first" : "$posTagging"
                }, 
                "namedEntityRecognition" : { 
                    "$first" : "$namedEntityRecognition"
                }
            }
        });

        agg.push({ 
            "$sort" : { 
                "weight" : -1.0
            }
        });

        if("limit" in bodyReq.params){
            agg.push(
                { 
                    "$limit" : bodyReq.params.limit
                }
            );
        } 

        mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
            cb(result);
        });

    }

    static async getFaceAnalytic(bodyReq, cb) {
        let agg = [];

        agg.push({ 
            "$match": { 
                "type": "GraphImage",
                "ownerId" : bodyReq.params.userId,
                "timestamp" : {
                    "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                    "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
                }
            }
        });

        agg.push({ 
            "$project": {
                "_id": 0,
                "postId": 1,
                "caption": 1,
                "timestamp": 1
            }
        });

        agg.push({ 
            "$sort": {
                "timestamp": -1
            }
        });

        agg.push({ 
            "$lookup": {
                "from": "targetPostContent",
                "let": { "id": "$postId" },
                "pipeline": [{"$match": {"$expr": {"$eq": ["$postId", "$$id"]}}}],
                "as": "detailImage"
            }
        });

        agg.push({ 
            "$unwind": {
                "path": "$detailImage"
            }
        });

        agg.push({ 
            "$lookup": {
                "from": "faceAnalytic",
                "let": { "id": "$detailImage.displayContent" },
                "pipeline": [{"$match": {"$expr": { "$and": [{"$eq": ["$foreignId", "$$id"]}, {"$eq": ["$source", "targetPostContent"]}]}}}],
                "as": "detailFace"
            }
        });

        agg.push({ 
            "$unwind": {
                "path": "$detailFace"
            }
        });

        agg.push({
            "$match": {
                "$and": [{
                    "detailFace.age": { "$ne": null },
                    "detailFace.gender": { "$ne": null },
                    "detailFace.dominantEmotion": { "$ne": null },
                    "detailFace.dominantRace": { "$ne": null }
                }]
            }
        });

        agg.push({ 
            "$project": {
                "filename": "$detailFace._id",
                "age": { "$ifNull": ["$detailFace.age", ""] },
                "dominantEmotion": { "$ifNull": ["$detailFace.dominantEmotion", ""] },
                "dominantRace": { "$ifNull": ["$detailFace.dominantRace", ""] },
                "gender": { "$ifNull": ["$detailFace.gender", ""] }
            }
        });

        mongo.getAggregateData(dbName, "targetPost", agg, function(resultCount) {
            if ("offset" in bodyReq.params) {
                agg.push({ 
                    "$skip" : parseInt(bodyReq.params.offset)
                });
            }

            if ("limit" in bodyReq.params) {
                agg.push({ 
                    "$limit" : parseInt(bodyReq.params.limit)
                });
            }

            mongo.getAggregateData(dbName, "targetPost", agg, function(result) {
                cb(resultCount.length, result);
            });
        });
    }
    
}

module.exports = AnalyticModel;