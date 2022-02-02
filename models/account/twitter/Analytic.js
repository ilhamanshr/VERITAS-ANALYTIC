const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const utils         = require(BASE_DIR + '/Utils');
const dbName        = process.env.DB_NAME_TW;

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
                "_id" : 0,
                "userId": "$_id",
                "biography" : "$description", 
                "externalUrl" : "$url",
                "followerCount" : "$followers_count", 
                "followingCount" : "$followings_count", 
                "fullName" : "$name", 
                "isBusinessAccount" : null, 
                "isPrivate" : "$protected", 
                "isProfessionalAccount" : null, 
                "isVerified" : "$verified", 
                "postCount" : "$tweet_count", 
                "profilePic" : "$profile_image_url", 
                "username" : "$username",
                "source": "twitter"
            }
        });

        mongo.getAggregateData(dbName, "profile", agg, function(result) {

            agg = [
                { 
                    "$match" : { 
                        "user_id" : bodyReq.params.userId
                    }
                }, 
                { 
                    "$sort" : { 
                        "created_at" : 1.0
                    }
                }, 
                { 
                    "$group" : { 
                        "_id" : null, 
                        "dateFrom" : { 
                            "$first" : "$created_at"
                        }, 
                        "dateUntil" : { 
                            "$last" : "$created_at"
                        }
                    }
                }
            ]

            mongo.getAggregateData(dbName, "tweet", agg, function(resultDate){
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
                "user_id" : bodyReq.params.userId,
                "created_at": filter
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
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({
            "$group" : { 
                "_id" : "$_id", 
                "timestamp": {"$first": "$created_at"},
                "caption": {"$first": "$full_text"},
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

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {            
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
                "user_id" : bodyReq.params.userId,
                "created_at": filter
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
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({
            "$group" : { 
                "_id" : "$_id", 
                "timestamp": {"$first": "$created_at"},
                "caption": {"$first": "$full_text"},
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

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {            
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
                "user_id" : bodyReq.params.userId,
                "created_at": filter
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
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({
            "$group" : { 
                "_id" : "$_id", 
                "timestamp": {"$first": "$created_at"},
                "caption": {"$first": "$full_text"},
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

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
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
                "user_id" : bodyReq.params.userId,
                "created_at": filter
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
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({
            "$group" : { 
                "_id" : "$_id", 
                "timestamp": {"$first": "$created_at"},
                "caption": {"$first": "$full_text"},
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

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
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
                "user_id" : bodyReq.params.userId,
                "created_at" : filter
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
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
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
                    or.push({"full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
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
                    "dtm" : '$created_at',
                    "pid" : '$_id',
                    "day" : { '$dayOfWeek': '$created_at' },
                    'hour': { '$hour': '$created_at' }                    
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

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
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
                "user_id" : bodyReq.params.userId,
                "created_at" : filter
            }
        });
        
        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "created_at" : "$created_at", 
                    "day" : { 
                        "$dayOfWeek" : "$created_at"
                    }, 
                    "hour" : { 
                        "$hour" : "$created_at"
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

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
            cb(result);
        });
    }

    static async getPostCountByClassification(bodyReq, cb){
        let filter = {
            "user_id" : bodyReq.params.userId,
            "created_at" : { 
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
            "$unwind" : { 
                "path" : "$classificationText",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
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
                    or.push({"full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
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
                "_id" : "$_id", 
                "created_at": {"$first": "$created_at"},
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
                "_id" : {"timestamp" : {"$dateToString" : {"format" : "%Y-%m-%d", "date" : "$created_at"}}}, 
                "positive" : {"$sum":{"$cond":[{"$and":[{"$ne":["$classificationText.sentiment",-1]},{"$ne":["$classificationText.propaganda",1]},{"$ne":["$classificationText.hateful",1]},{"$ne":["$classificationText.porn", 1]},{"$ne":["$classificationText.radicalism", 1]},{"$ne":["$classificationText.lgbt", 1]},{"$eq":["$imageHate", 0]},{"$eq":["$imagePorn",0]},{"$eq":["$imageRadicalism",0]},{"$eq":["$imageTerrorism",0]},{"$eq":["$imageLgbt",0]}]},1,0]}}, 
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

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
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
            "user_id" : bodyReq.params.userId,
            // "created_at" : { 
            //     "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
            //     "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            // }
        };

        let agg = [];

        agg.push({ 
            "$match" : filter
        });

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
        //         "preserveNullAndEmptyArrays": true
        //     }
        // });

        // agg.push({ 
        //     "$lookup" : { 
        //         "from" : "media", 
        //         "localField" : "_id", 
        //         "foreignField" : "tweet_id", 
        //         "as" : "media"
        //     }
        // });

        // agg.push({ 
        //     "$unwind" : { 
        //         "path" : "$media", 
        //         "preserveNullAndEmptyArrays" : true
        //     }
        // });

        // agg.push({ 
        //     "$lookup" : { 
        //         "from" : "classificationImage", 
        //         "localField" : "media._id", 
        //         "foreignField" : "_id", 
        //         "as" : "classificationImage"
        //     }
        // });
         
        // agg.push({ 
        //     "$unwind" : { 
        //         "path" : "$classificationImage",
        //         "preserveNullAndEmptyArrays": true
        //     }
        // });

        // agg.push({
        //     "$group":{
        //         "_id" : "$_id",
        //         "classificationText": {"$first": "$classificationText"},
        //         "classificationImage": {"$first": "$classificationImage"}
        //     }
        // });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
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
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "mediaPredict"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$mediaPredict", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$project" : { 
                "text" : "$full_text", 
                "totalFavorite" : "$favorite_count", 
                "totalQuote" : "$quote_count", 
                "totalReply" : "$reply_count", 
                "totalRetweet" : "$retweet_count", 
                "totalInteraction" : { 
                    "$add" : [
                        "$favorite_count", 
                        "$retweet_count", 
                        "$reply_count", 
                        "$quote_count"
                    ]
                }, 
                "userId" : "$user_id", 
                "postId" : "$_id", 
                "dateCreate" : "$created_at", 
                "predict" : 1.0, 
                "media" : { 
                    "$cond" : [
                        { 
                            "$ifNull" : [
                                "$media", 
                                false
                            ]
                        }, 
                        { 
                            "mediaId" : "$media._id", 
                            "content" : "$media._id", 
                            "type" : { 
                                "$arrayElemAt" : [
                                    { 
                                        "$split" : [
                                            "$media.mime_type", 
                                            "/"
                                        ]
                                    }, 
                                    0.0
                                ]
                            }, 
                            "predict" : { 
                                "hateful" : "$mediaPredict.hateful", 
                                "porn" : "$mediaPredict.porn", 
                                "radicalism" : "$mediaPredict.radicalism", 
                                "terrorism" : "$mediaPredict.terrorism",
                                "lgbt" : "$mediaPredict.lgbt",
                                "resultClassification": "$mediaPredict.resultClassification"
                            }
                        }, 
                        "$$REMOVE"
                    ]
                }, 
                "dayOfWeek" : { 
                    "$dayOfWeek" : "$created_at"
                }, 
                "hour" : { 
                    "$hour" : "$created_at"
                }, 
                "source" : "twitter"
            }
        });
        
        // agg.push({ 
        //     "$project" : { 
        //         "_id": 1,
        //         "radical" : { "$cond" : [{"$or": [{"$eq": ["$predict.radicalism", 1]},{"$eq": ["$media.predict.radicalism", 1]},{ '$eq': ['$predict.propaganda', 1]}]}, 1,0]}, 
        //         "hateful" : { "$cond" : [{"$or": [{"$eq": ["$predict.hateful", 1]},{"$eq": ["$media.predict.hateful", 1]},{ '$eq': ['$predict.sentiment', -1]}]}, 1, 0]}, 
        //         "porn" : { "$cond" : [{"$or": [{"$eq": ["$predict.porn", 1]},{"$eq": ["$media.predict.porn", 1]}, { "$eq" : ["$predict.resultClassification.porn.result", "sexy"]},{ "$eq" : ["$media.predict.resultClassification.porn.result", "sexy"]}]}, 1, 0]}, 
        //         "lgbt" : { "$cond" : [{"$or": [{"$eq": ["$predict.lgbt", 1]},{"$eq": ["$media.predict.lgbt", 1]}]}, 1, 0]}, 
        //         "terrorism" : {"$cond": [{"$eq": ["$media.predict.terrorism", 1]}, 1,0]}
        //     }
        // });

        // agg.push({ 
        //     "$project" : { 
        //         "_id": 1,
        //         "radical" : { "$cond" : [{"$or": [{"$eq": ["$classificationText.radicalism", 1]},{"$eq": ["$classificationImage.radicalism", 1]},{ '$eq': ['$classificationText.propaganda', 1]}]}, 1,0]}, 
        //         "hateful" : { "$cond" : [{"$or": [{"$eq": ["$classificationText.hateful", 1]},{"$eq": ["$classificationImage.hateful", 1]},{ '$eq': ['$classificationText.sentiment', -1]}]}, 1, 0]}, 
        //         "porn" : { "$cond" : [{"$or": [{"$eq": ["$classificationText.porn", 1]},{"$eq": ["$classificationImage.porn", 1]}, { "$eq" : ["$classificationText.resultClassification.porn.result", "sexy"]},{ "$eq" : ["$classificationImage.resultClassification.porn.result", "sexy"]}]}, 1, 0]}, 
        //         "lgbt" : { "$cond" : [{"$or": [{"$eq": ["$classificationText.lgbt", 1]},{"$eq": ["$classificationImage.lgbt", 1]}]}, 1, 0]}, 
        //         "terrorism" : {"$cond": [{"$eq": ["$classificationImage.terrorism", 1]}, 1,0]}
        //     }
        // });

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

        mongo.getAggregateData(dbName, "tweet", agg, function(result){
            
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
            "$match" : { 
                "user_id" : bodyReq.params.userId,
                "created_at" : {
                    "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                    "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
                }
            }
        };

        let agg = [];

        agg.push(filter);

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
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
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
                    or.push({"full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
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
                            "date" : "$created_at"
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


        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
            cb(result);
        });
    }

    static async getInteractionCountByDate(bodyReq, cb){
        let filter = {
            "$match" : { 
                "user_id" : bodyReq.params.userId,
                "created_at" : {
                    "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                    "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
                }
            }
        };

        let agg = [];
            
        agg.push(filter);

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
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
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
                    or.push({"full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
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
            "$project" : { 
                "user_id" : 1.0, 
                "in_reply_to_status_id" : 1.0, 
                "quoted_status_id" : 1.0, 
                "retweeted_status_id" : 1.0, 
                "created_at" : 1.0
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "tweet", 
                "let" : { 
                    "id" : "$_id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$eq" : [
                                    "$in_reply_to_status_id", 
                                    "$$id"
                                ]
                            }
                        }
                    }
                ], 
                "as" : "tweetReply"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "retweet", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
                "as" : "tweetRetweet"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "tweet", 
                "let" : { 
                    "id" : "$_id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$eq" : [
                                    "$quoted_status_id", 
                                    "$$id"
                                ]
                            }
                        }
                    }
                ], 
                "as" : "tweetQuote"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "favorites", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
                "as" : "tweetFavorite"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : { 
                    "$dateToString" : { 
                        "format" : "%Y-%m-%d", 
                        "date" : "$created_at"
                    }
                }, 
                "countReply" : { 
                    "$first" : "$tweetReply"
                }, 
                "countRetweet" : { 
                    "$first" : "$tweetRetweet"
                }, 
                "countQuote" : { 
                    "$first" : "$tweetQuote"
                }, 
                "countFavorite" : { 
                    "$first" : "$tweetFavorite"
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : 0.0, 
                "timestamp" : "$_id", 
                "countReply" : { 
                    "$size" : "$countReply"
                }, 
                "countRetweet" : { 
                    "$size" : "$countRetweet"
                }, 
                "countQuote" : { 
                    "$size" : "$countQuote"
                }, 
                "countFavorite" : { 
                    "$size" : "$countFavorite"
                }, 
            }
        });

        agg.push({ 
            "$sort" : { 
                "timestamp" : 1
            }
        });

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
            cb(result);
        });
    }

    static async getUsernameCountByClassification(bodyReq, exceptUsername, cb){
        let filter = {
            "$match" : { 
                "user_id" : bodyReq.params.userId,
                "created_at" : {
                    "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                    "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
                }
            }
        };

        let agg = [];

        agg.push(filter); 
        
        agg.push({ 
            "$project" : { 
                "_id" : 1.0, 
                "full_text": 1.0,
                "created_at" : 1.0, 
                "last_updated" : 1.0, 
                "in_reply_to_status_id" : 1.0, 
                "quoted_status_id" : 1.0, 
                "retweeted_status_id" : 1.0, 
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "let" : { 
                    "id" : "$_id", 
                    "last_updated" : "$last_updated"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$and" : [
                                    { 
                                        "$eq" : [
                                            "$foreignId", 
                                            "$$id"
                                        ]
                                    }, 
                                    { 
                                        "$eq" : [
                                            "$dateUpdate", 
                                            "$$last_updated"
                                        ]
                                    }, 
                                    { 
                                        "$eq" : [
                                            "$source", 
                                            "tweet"
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ], 
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
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
            }
        });
         
        agg.push({ 
            "$match" : { 
                "$or" : [
                    { 
                        "classificationText.hateful" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationText.porn" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationText.radicalism" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationText.lgbt" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationImage.hateful" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationImage.porn" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationImage.radicalism" : { 
                            "$eq" : 1.0
                        }
                    }, 
                    { 
                        "classificationImage.terrorism" : { 
                            "$eq" : 1.0
                        }
                    },
                    { 
                        "classificationImage.lgbt" : { 
                            "$eq" : 1.0
                        }
                    }
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
                    or.push({"full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
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
                "_id" : "$_id", 
                "postId": { "$first": "$_id" },
                "timestamp": { "$first": "$created_at" },
                "in_reply_to_status_id" : { 
                    "$first" : "$in_reply_to_status_id"
                }, 
                "quoted_status_id" : { 
                    "$first" : "$quoted_status_id"
                }, 
                "retweeted_status_id" : { 
                    "$first" : "$retweeted_status_id"
                }, 
                "radicalismText" : { 
                    "$sum" : "$classificationText.radicalism"
                }, 
                "hateText" : { 
                    "$sum" : "$classificationText.hateful"
                }, 
                "pornText" : { 
                    "$sum" : "$classificationText.porn"
                }, 
                "lgbtText" : { 
                    "$sum" : "$classificationText.lgbt"
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
            "$lookup" : { 
                "from" : "tweet", 
                "let" : { 
                    "id" : "$_id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$eq" : [
                                    "$in_reply_to_status_id", 
                                    "$$id"
                                ]
                            }
                        }
                    }, 
                    { 
                        "$lookup" : { 
                            "from" : "profile", 
                            "localField" : "user_id", 
                            "foreignField" : "_id", 
                            "as" : "detailProfile"
                        }
                    }, 
                    { 
                        "$unwind" : { 
                            "path" : "$detailProfile", 
                            "preserveNullAndEmptyArrays" : true
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 0.0, 
                            "fullName" : "$detailProfile.name", 
                            "isPrivate" : "$detailProfile.protected", 
                            "isVerified" : "$detailProfile.verified", 
                            "profilePic" : "$detailProfile.profile_image_url", 
                            "username" : "$detailProfile.username", 
                            "reply" : { 
                                "$literal" : 1.0
                            }
                        }
                    }
                ], 
                "as" : "tweetReply"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "retweet", 
                "let" : { 
                    "id" : "$_id"
                }, 
                "pipeline" : [
                    { "$match": {"$expr": {"$eq": ["$tweet_id", "$$id"]}} },
			        {
			            "$lookup": {    
			                "from": "profile",
			                "localField": "user_id",
			                "foreignField": "_id",
			                "as": "detailProfile"
			            }
			        },
			        {
			            "$unwind": {
			                "path": "$detailProfile",
			                "preserveNullAndEmptyArrays": true
			            }
			        },
			        {
			            "$project": {
			                "_id": 0, "fullName": "$detailProfile.name", "isPrivate": "$detailProfile.protected", "isVerified": "$detailProfile.verified", "profilePic": "$detailProfile.profile_image_url", "username": "$detailProfile.username", "retweet": { "$literal": 1 }
			            }
			        }
                ], 
                "as" : "tweetRetweet"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "tweet", 
                "let" : { 
                    "id" : "$_id"
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$eq" : [
                                    "$quoted_status_id", 
                                    "$$id"
                                ]
                            }
                        }
                    }, 
                    { 
                        "$lookup" : { 
                            "from" : "profile", 
                            "localField" : "user_id", 
                            "foreignField" : "_id", 
                            "as" : "detailProfile"
                        }
                    }, 
                    { 
                        "$unwind" : { 
                            "path" : "$detailProfile", 
                            "preserveNullAndEmptyArrays" : true
                        }
                    }, 
                    { 
                        "$project" : { 
                            "_id" : 0.0, 
                            "fullName" : "$detailProfile.name", 
                            "isPrivate" : "$detailProfile.protected", 
                            "isVerified" : "$detailProfile.verified", 
                            "profilePic" : "$detailProfile.profile_image_url", 
                            "username" : "$detailProfile.username", 
                            "quote" : { 
                                "$literal" : 1.0
                            }
                        }
                    }
                ], 
                "as" : "tweetQuote"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "favorites", 
                "let" : { 
                    "id" : "$_id"
                }, 
                "pipeline" : [
                    { "$match": {"$expr": {"$eq": ["$tweet_id", "$$id"]}} },
                    {
                        "$lookup": {    
                            "from": "profile",
                            "localField": "user_id",
                            "foreignField": "_id",
                            "as": "detailProfile"
                        }
                    },
                    {
                        "$unwind": {
                            "path": "$detailProfile",
                            "preserveNullAndEmptyArrays": true
                        }
                    },
                    {
                        "$project": {
                            "_id": 0, "fullName": "$detailProfile.name", "isPrivate": "$detailProfile.protected", "isVerified": "$detailProfile.verified", "profilePic": "$detailProfile.profile_image_url", "username": "$detailProfile.username", "retweet": { "$literal": 1 }
                        }
                    }
                ], 
                "as" : "tweetFavorite"
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : 1.0, 
                "in_reply_to_status_id" : 1.0, 
                "quoted_status_id" : 1.0, 
                "retweeted_status_id" : 1.0, 
                "tweetReply" : 1.0, 
                "tweetRetweet" : 1.0, 
                "tweetQuote" : 1.0, 
                "tweetFavorite" : 1, 
                "radicalismText" : 1.0, 
                "hateText" : 1.0, 
                "pornText" : 1.0, 
                "lgbtText" : 1.0,
                "hateImage" : 1.0, 
                "pornImage" : 1.0, 
                "radicalismImage" : 1.0, 
                "terrorismImage" : 1.0,
                "lgbtImage" : 1.0
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$_id", 
                "postId": {
                    "$first": "$postId"
                },
                "media":{
                    "$first":"$media"
                },
                "timestamp":{
                    "$first":"$timestamp"
                },
                "text": { 
                    "$first" : "$text"
                }, 
                "radicalismText" : { 
                    "$first" : "$radicalismText"
                }, 
                "hateText" : { 
                    "$first" : "$hateText"
                }, 
                "pornText" : { 
                    "$first" : "$pornText"
                }, 
                "lgbtText" : { 
                    "$first" : "$lgbtText"
                }, 
                "hateImage" : { 
                    "$first" : "$hateImage"
                }, 
                "pornImage" : { 
                    "$first" : "$pornImage"
                }, 
                "radicalismImage" : { 
                    "$first" : "$radicalismImage"
                }, 
                "terrorismImage" : { 
                    "$first" : "$terrorismImage"
                }, 
                "lgbtImage" : { 
                    "$first" : "$lgbtImage"
                }, 
                "tweetReply" : { 
                    "$first" : "$tweetReply"
                }, 
                "tweetRetweet" : { 
                    "$first" : "$tweetRetweet"
                }, 
                "tweetQuote" : { 
                    "$first" : "$tweetQuote"
                }, 
                "tweetFavorite" : { 
                    "$first" : "$tweetFavorite"
                }, 
            }
        });

        agg.push({ 
            "$project" : { 
                "postId": 1,
                "text": 1,
                "media": 1,
                "timestamp": 1,
                "radical" : { 
                    "$cond" : [
                        {
                            "$or": [
                                {"$gte": ["$radicalismText", 1]},
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
                "terrorism" : {
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
                        "$tweetReply", 
                        "$tweetRetweet", 
                        "$tweetQuote", 
                        "$tweetFavorite"
                    ]
                }
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$interactions"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$interactions.username", 
                "fullName" : { 
                    "$first" : "$interactions.fullname"
                }, 
                "isPrivate" : { 
                    "$first" : "$interactions.isPrivate"
                }, 
                "isVerified" : { 
                    "$first" : "$interactions.isVerified"
                }, 
                "profilePic" : { 
                    "$first" : "$interactions.profilePic"
                }, 
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
                    "$sum" : "$terrorism"
                },
                "lgbtCount" : { 
                    "$sum" : "$lgbt"
                }, 
                "reply" : { 
                    "$sum" : { 
                        "$cond" : [
                            { 
                                "$ne" : [
                                    "$interactions.reply", 
                                    null
                                ]
                            }, 
                            "$interactions.reply", 
                            0.0
                        ]
                    }
                }, 
                "retweet" : { 
                    "$sum" : { 
                        "$cond" : [
                            { 
                                "$ne" : [
                                    "$interactions.retweet", 
                                    null
                                ]
                            }, 
                            "$interactions.retweet", 
                            0.0
                        ]
                    }
                }, 
                "quote" : { 
                    "$sum" : { 
                        "$cond" : [
                            { 
                                "$ne" : [
                                    "$interactions.quote", 
                                    null
                                ]
                            }, 
                            "$interactions.quote", 
                            0.0
                        ]
                    }
                }, 
                "favorite" : { 
                    "$sum" : { 
                        "$cond" : [
                            { 
                                "$ne" : [
                                    "$interactions.favorite", 
                                    null
                                ]
                            }, 
                            "$interactions.favorite", 
                            0.0
                        ]
                    }
                }, 
                "total" : { 
                    "$sum" : 1.0
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "username" : "$_id", 
                "radicalCount" : 1.0, 
                "hatefulCount" : 1.0, 
                "pornCount" : 1.0, 
                "terrorismCount" : 1.0, 
                "lgbtCount" : 1.0, 
                "_id" : 0.0
            }
        });

        agg.push({ 
            "$sort" : { 
                "radicalCount" : -1.0, 
                "hatefulCount" : -1.0, 
                "pornCount" : -1.0, 
                "terrorismCount" : -1.0,
                "lgbtCount" : -1.0, 
            }
        });

        agg.push({
            "$match":{
                "username": {
                    "$ne": null
                    }
                } 
        });

        agg.push({
            "$match": {
                "username": { "$ne": exceptUsername }
            }
        });

        if("limit" in bodyReq.params){
            agg.push(
                { 
                    "$limit" : bodyReq.params.limit
                }
            );
        } else{
            agg.push(
                { 
                    "$limit" : 5.0
                }
            );
        }

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
            cb(result);
        });
    }

    static async getBetweennessAnalytic(bodyReq, exceptUsername, cb) {
        let agg = [];

        agg.push({
            "$match": {
                "user_id": bodyReq.params.userId,
                "created_at": {
                    "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                    "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
                }
            }
        });

        agg.push({
            "$project": {
			    "_id": 1,
                "full_text": 1, 
			    "last_updated": 1,
			    "in_reply_to_status_id": 1,
			    "quoted_status_id": 1,
			    "retweeted_status_id": 1
			}
        });

        agg.push({
            "$lookup": {
			    "from": "classificationText",
				"let": { "id": "$_id", "last_updated": "$last_updated" },
			    "pipeline": [{"$match": {"$expr": {"$and": [{"$eq": ["$foreignId", "$$id"]}, {"$eq": ["$dateUpdate", "$$last_updated"]}, {"$eq": ["$source", "tweet"]}]}}}],
			    "as": "classificationText"
			}
        });

        agg.push({
            "$unwind": {
			    "path": "$classificationText",
			    "preserveNullAndEmptyArrays": true
			}
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({
            "$match": {
			    "$or": [
			        {"classificationText.advertisement": {"$eq": 1}},
			        {"classificationText.hoax": {"$eq": 1}},
			        {"classificationText.hateful": {"$eq": 1}},
			        {"classificationText.porn": {"$eq": 1}},
			        {"classificationText.propaganda": {"$eq": 1}},
			        {"classificationText.radicalism": {"$eq": 1}},
			        {"classificationText.sentiment": {"$eq": -1}},
			        {"classificationImage.hateful": {"$eq": 1}},
			        {"classificationImage.porn": {"$eq": 1}},
			        {"classificationImage.radicalism": {"$eq": 1}},
			        {"classificationImage.terrorism": {"$eq": 1}},
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
                    or.push({"full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
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
			    "in_reply_to_status_id": { "$first": "$in_reply_to_status_id" },
			    "quoted_status_id": { "$first": "$quoted_status_id" },
			    "retweeted_status_id": { "$first": "$retweeted_status_id" }
			}
        });

        agg.push({
            "$lookup": {
			    "from": "tweet",
			    "let": { "id": "$_id" },
			    "pipeline": [
			        { "$match": {"$expr": {"$eq": ["$in_reply_to_status_id", "$$id"]}} },
			        {
			            "$lookup": {    
			                "from": "profile",
			                "localField": "user_id",
			                "foreignField": "_id",
			                "as": "detailProfile"
			            }
			        },
			        {
			            "$unwind": {
			                "path": "$detailProfile",
			                "preserveNullAndEmptyArrays": true
			            }
			        },
			        {
			            "$project": {
			                "_id": 0, "fullName": "$detailProfile.name", "isPrivate": "$detailProfile.protected", "isVerified": "$detailProfile.verified", "profilePic": "$detailProfile.profile_image_url", "username": "$detailProfile.username", "reply": { "$literal": 1 }
			            }
			        }
			    ],
			    "as": "tweetReply"
			}
        });
        
        agg.push({
            "$lookup": {
			    "from": "retweet",
			    "let": { "id": "$_id" },
			    "pipeline": [
			        { "$match": {"$expr": {"$eq": ["$tweet_id", "$$id"]}} },
			        {
			            "$lookup": {    
			                "from": "profile",
			                "localField": "user_id",
			                "foreignField": "_id",
			                "as": "detailProfile"
			            }
			        },
			        {
			            "$unwind": {
			                "path": "$detailProfile",
			                "preserveNullAndEmptyArrays": true
			            }
			        },
			        {
			            "$project": {
			                "_id": 0, "fullName": "$detailProfile.name", "isPrivate": "$detailProfile.protected", "isVerified": "$detailProfile.verified", "profilePic": "$detailProfile.profile_image_url", "username": "$detailProfile.username", "retweet": { "$literal": 1 }
			            }
			        }
			    ],
			    "as": "tweetRetweet"
			}
        });
        
        agg.push({
            "$lookup": {
			    "from": "tweet",
			    "let": { "id": "$_id" },
			    "pipeline": [
			        { "$match": {"$expr": {"$eq": ["$quoted_status_id", "$$id"]}} },
			        {
			            "$lookup": {    
			                "from": "profile",
			                "localField": "user_id",
			                "foreignField": "_id",
			                "as": "detailProfile"
			            }
			        },
			        {
			            "$unwind": {
			                "path": "$detailProfile",
			                "preserveNullAndEmptyArrays": true
			            }
			        },
			        {
			            "$project": {
			                "_id": 0, "fullName": "$detailProfile.name", "isPrivate": "$detailProfile.protected", "isVerified": "$detailProfile.verified", "profilePic": "$detailProfile.profile_image_url", "username": "$detailProfile.username", "quote": { "$literal": 1 }
			            }
			        }
			    ],
			    "as": "tweetQuote"
			}
        });
        
        agg.push({
            "$lookup": {
			    "from": "favorites",
			    "let": { "id": "$_id" },
			    "pipeline": [
                    { "$match": {"$expr": {"$eq": ["$tweet_id", "$$id"]}} },
                    {
                        "$lookup": {    
                            "from": "profile",
                            "localField": "user_id",
                            "foreignField": "_id",
                            "as": "detailProfile"
                        }
                    },
                    {
                        "$unwind": {
                            "path": "$detailProfile",
                            "preserveNullAndEmptyArrays": true
                        }
                    },
                    {
                        "$project": {
                            "_id": 0, "fullName": "$detailProfile.name", "isPrivate": "$detailProfile.protected", "isVerified": "$detailProfile.verified", "profilePic": "$detailProfile.profile_image_url", "username": "$detailProfile.username", "retweet": { "$literal": 1 }
                        }
                    }
                ],
			    "as": "tweetFavorite"
			}
        });

        agg.push({
            "$project": {
			    "_id" : 1,
			    "in_reply_to_status_id" : 1,
			    "quoted_status_id" : 1,
			    "retweeted_status_id" : 1,
			    "tweetReply" : 1,
			    "tweetRetweet" : 1,
			    "tweetQuote" : 1,
			    "tweetFavorite": 1
			}
        });
        
        agg.push({
            "$group": {
			    "_id": "$_id",
			    "in_reply_to_status_id" : { "$first": "$in_reply_to_status_id" },
			    "quoted_status_id" : { "$first": "$quoted_status_id" },
			    "retweeted_status_id" : { "$first": "$retweeted_status_id" },
			    "tweetReply" : { "$first": "$tweetReply" },
			    "tweetRetweet" : { "$first": "$tweetRetweet" },
			    "tweetQuote" : { "$first": "$tweetQuote" },
			    "tweetFavorite": { "$first": "$tweetFavorite" }
			}
        });

        agg.push({
            "$project": {
			    "_id": 1,
			    "interactions": { "$concatArrays": ["$tweetReply", "$tweetRetweet", "$tweetQuote", "$tweetFavorite"] }
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
			    "reply": {"$sum": {"$cond": [{ "$ne": ["$interactions.reply", null]}, "$interactions.reply", 0]}},
			    "retweet": {"$sum": {"$cond": [{ "$ne": ["$interactions.retweet", null]}, "$interactions.retweet", 0]}},
			    "quote": {"$sum": {"$cond": [{ "$ne": ["$interactions.quote", null]}, "$interactions.quote", 0]}},
			    "favorite": {"$sum": {"$cond": [{ "$ne": ["$interactions.favorite", null]}, "$interactions.favorite", 0]}},
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
			    "reply": 1,
			    "retweet": 1,
			    "quote": 1,
			    "favorite": 1,
			    "total": 1
			}
        });

        agg.push({
            "$match": {
			    "username": { "$ne": exceptUsername }
			}
        });

        agg.push({
            "$sort": {
			    "total": -1
			}
        });

        agg.push({
            "$limit": 5
        });

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
            cb(result);
        });
    }

    static async getNgramWord(bodyReq, cb) {
        let filter = {
            "$match" : { 
                "user_id" : bodyReq.params.userId,
                "created_at" : {
                    "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                    "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
                }
            }
        };

        let agg = [];

        agg.push(filter); 

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
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
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
            "$lookup" : { 
                "from" : "classificationImage", 
                "localField" : "media._id", 
                "foreignField" : "_id", 
                "as" : "classificationImage"
            }
        });
         
        agg.push({ 
            "$unwind" : { 
                "path" : "$classificationImage",
                "preserveNullAndEmptyArrays": true
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
                    or.push({"full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "full_text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
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
                                                    "$PosTagging.NOUN"
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
                                                    "$PosTagging.ADV"
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
                                                    "$PosTagging.VERB"
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

        mongo.getAggregateData(dbName, "tweet", agg, function(result) {
            cb(result);
        });

    }

    static async getFaceAnalytic(bodyReq, cb) {
        let agg = [];

        agg.push({ 
            "$match": { 
                "user_id" : bodyReq.params.userId,
                "created_at" : {
                    "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                    "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
                }
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "media", 
                "localField" : "_id", 
                "foreignField" : "tweet_id", 
                "as" : "media"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$media"
            }
        });

        agg.push({ 
            "$sort": {
                "created_at": -1
            }
        });

        agg.push({ 
            "$lookup": {
                "from": "faceAnalytic",
                "let": { "id": "$media._id" },
                "pipeline": [{"$match": {"$expr": {"$eq": ["$foreignId", "$$id"]}}}],
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

        mongo.getAggregateData(dbName, "tweet", agg, function(resultCount) {
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

            mongo.getAggregateData(dbName, "tweet", agg, function(result) {
                cb(resultCount.length, result);
            });
        });
    }

}

module.exports = AnalyticModel;