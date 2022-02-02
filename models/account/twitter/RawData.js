const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const utils         = require(BASE_DIR + '/Utils');
const dbName        = process.env.DB_NAME_TW;

class RawDataModel {
    static async getTimeBaseAnalytics(bodyReq, cb){
        let filter = {
            "user_id" : bodyReq.params.userId
        };
        
        if ("date" in bodyReq.params) {
            filter["created_at"] = { 
                "$gte": moment(bodyReq.params.date).utc(true).toDate(),
                "$lte":  moment(bodyReq.params.date).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            }
        } else if ("dateFrom" in bodyReq.params && "dateUntil" in bodyReq.params){
            filter["created_at"] = {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            };
        }

        let agg = [];

        agg.push({ 
            "$match" : filter
        });

        if ("search" in bodyReq.params) {
            filter["$or"] = [
                { "full_text": { $regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i') } },
            ];
        }

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "let" : {"id": "$_id"}, 
                "pipeline" : [
                    {"$match": {"$expr": {"$eq": ["$foreignId", "$$id"]}}},
                    {"$project": {"_id": 0, "advertisement": 1, "hoax": 1, "hateful": 1, "porn": 1, "propaganda": 1, "radicalism": 1, "sentiment": 1, "lgbt":1}}
                ], 
                "as" : "predict"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path":"$predict", 
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
                "text": "$full_text",
                "totalFavorite": "$favorite_count",
                "totalQuote": "$quote_count",
                "totalReply": "$reply_count",
                "totalRetweet": "$retweet_count",
                "totalInteraction": {"$add": ["$favorite_count", "$retweet_count", "$reply_count", "$quote_count"]},
                "userId": "$user_id",
                "postId": "$_id",
                "dateCreate": "$created_at",
                "predict": 1,
                "media": {
                    "$cond":[
                        {"$ifNull": ["$media", false]},
                        {
                            "mediaId": "$media._id",
                            "content": "$media._id",
                            "type": {"$arrayElemAt": [{"$split": ["$media.mime_type", "/"]}, 0]},
                            "predict": {
                                "hateful": "$mediaPredict.hateful",
                                "porn": "$mediaPredict.porn",
                                "radicalism": "$mediaPredict.radicalism",
                                "terrorism": "$mediaPredict.terrorism",
                                "lgbt": "$mediaPredict.lgbt"
                            }
                        },
                        "$$REMOVE"
                    ]
                },
                "dayOfWeek" : {"$dayOfWeek": "$created_at"},
                "hour": {"$hour": "$created_at"},
                "source": "twitter"
            }
        });

        if ("dayOfWeek" in bodyReq.params && "hour" in bodyReq.params) {
            agg.push({
                "$match": {
                    "dayOfWeek" : parseInt(bodyReq.params.dayOfWeek),
                    "hour" : parseInt(bodyReq.params.hour)
                }            	
            });
        }

        agg.push({ 
            "$group" : { 
                "_id" : "$_id",
                "text": {"$first": "$text"},
                "totalFavorite": {"$first": "$totalFavorite"},
                "totalQuote": {"$first": "$totalQuote"},
                "totalReply": {"$first": "$totalReply"},
                "totalRetweet": {"$first": "$totalRetweet"},
                "totalInteraction": {"$first": "$totalInteraction"},
                "userId": {"$first": "$userId"},
                "postId": {"$first": "$postId"},
                "dateCreate": {"$first": "$dateCreate"},
                "predict": {"$first": "$predict"},
                "media": {"$addToSet": "$media"},
                "source": {"$first": "$source"},
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
                            filterMatch["$or"][0]["predict."+ element] = 1;
                            filterMatch["$or"][1]["media.predict."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["media.predict."+ element] = 1;
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
                    or.push({"text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
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

        if ("type" in bodyReq.params) {
            let type = {}
            if (bodyReq.params.type === 0) {
                type["$or"] = [
                    {"predict.sentiment": -1},
                    {"predict.propaganda": 1},
                    {"predict.hateful": 1},
                    {"predict.porn": 1},
                    {"predict.radicalism": 1},
                    {"predict.lgbt": 1},
                    {"media":{"$elemMatch": {"predict.radicalism": 1}}},
                    {"media":{"$elemMatch": {"predict.hateful": 1}}},
                    {"media":{"$elemMatch": {"predict.porn": 1}}},
                    {"media":{"$elemMatch": {"predict.terrorism": 1}}},
                    {"media":{"$elemMatch": {"predict.lgbt": 1}}}
                ]
            } else {
                type["$and"] = [
                    {"predict.sentiment": {"$ne": -1}},
                    {"predict.propaganda": {"$ne": 1}},
                    {"predict.hateful": {"$ne": 1}},
                    {"predict.porn": {"$ne": 1}},
                    {"predict.radicalism": {"$ne": 1}},
                    {"predict.lgbt": {"$ne": 1}},
                    {"$or": [
                        {"media.0": {"$exists": false}},
                        {"$and": [
                            {"media":{"$not": {"$elemMatch": {"predict.radicalism": 1}}}},
                            {"media":{"$not": {"$elemMatch": {"predict.hateful": 1}}}},
                            {"media":{"$not": {"$elemMatch": {"predict.porn": 1}}}},
                            {"media":{"$not": {"$elemMatch": {"predict.terrorism": 1}}}},
                            {"media":{"$not": {"$elemMatch": {"predict.lgbt": 1}}}}
                        ]}
                    ]}
                ]
            }

            agg.push({
                "$match" : type
            }); 
        }

        agg.push({ 
            "$project" : { 
                "_id" : 0,
            }
        });

        mongo.getAggregateData(dbName, "tweet", agg, function(count) {
            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            } else {
                agg.push({ 
                    "$sort" : {"dateCreate": 1}
                });
            }

            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "tweet", agg, function(result) {
                cb(count.length, result);
            });
        });
    }

    static async getWordBaseAnalytics(bodyReq, cb){
        let filter = {
            "user_id" : bodyReq.params.userId
        };

        if ("date" in bodyReq.params) {
            filter["created_at"] = { 
                "$gte": moment(bodyReq.params.date).utc(true).toDate(),
                "$lte":  moment(bodyReq.params.date).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            }
        } else if ("dateFrom" in bodyReq.params && "dateUntil" in bodyReq.params){
            filter["created_at"] = {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            };
        }

        let agg = [];

        agg.push({ 
            "$match" : filter
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "let" : {"id": "$_id"}, 
                "pipeline" : [
                    {"$match": {"$expr": {"$eq": ["$foreignId", "$$id"]}}},
                    {"$project": {"_id": 0, "advertisement": 1, "hoax": 1, "hateful": 1, "porn": 1, "propaganda": 1, "radicalism": 1, "sentiment": 1, "lgbt":1}}
                ], 
                "as" : "predict"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path":"$predict", 
                "preserveNullAndEmptyArrays" : true
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
                                    { "$eq" : ["$_id", "$$id"]}
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

        let prj = {};
        if("type" in bodyReq.params){
            if(bodyReq.params.type === "unigram") prj["word"] = "$nGram.unigram";
            if(bodyReq.params.type === "bigram") prj["word"] = "$nGram.bigram";
            if(bodyReq.params.type === "trigram") prj["word"] = "$nGram.trigram";

            prj["text"] = "$full_text";
            prj["totalFavorite"] = "$favorite_count";
            prj["totalQuote"] = "$quote_count";
            prj["totalReply"] = "$reply_count";
            prj["totalRetweet"] = "$retweet_count";
            prj["totalInteraction"] = {"$add": ["$favorite_count", "$retweet_count", "$reply_count", "$quote_count"]};
            prj["userId"] = "$user_id";
            prj["postId"] = "$_id";
            prj["dateCreate"] = "$created_at";
            prj["predict"] = 1;
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
            "$group" : { 
                "_id" : {"word": "$word", "id": "$_id"}, 
                "text" : {"$first" : "$text"}, 
                "totalFavorite" : {"$first" : "$totalFavorite"},
                "totalQuote" : {"$first" : "$totalQuote"},
                "totalReply" : {"$first" : "$totalReply"},
                "totalRetweet" : {"$first" : "$totalRetweet"},
                "totalInteraction" : {"$first" : "$totalInteraction"},
                "userId" : {"$first" : "$userId"},
                "postId" : {"$first" : "$postId"},
                "dateCreate" : {"$first" : "$dateCreate"},
                "predict" : {"$first" : "$predict"},
            }
        });

        if("word" in bodyReq.params) {
            let word = {};
            if (bodyReq.params.word.length > 1) {
                if (bodyReq.params.type == "bigram") {
                    let regex = bodyReq.params.word.join(" ");
                    word["_id.word"] = {$regex: new RegExp('^' + regex + "$",'i')};
                } else {
                    word = {
                        "$and" : [
                            {"_id.word": {$regex: new RegExp('.*' + bodyReq.params.word[0] + ".*", 'i')}},
                            {"_id.word": {$regex: new RegExp('.*' + bodyReq.params.word[1] + ".*", 'i')}}
                        ]
                    }
                }
            } else {
                word = { 
                    "_id.word": {$regex: new RegExp('^' + bodyReq.params.word[0] + "$",'i')}
                }
            }
 
            agg.push({ 
                "$match" : word
            });
        }

        agg.push({ 
            "$group" : { 
                "_id" : "$_id.id", 
                "text" : {"$first" : "$text"}, 
                "totalFavorite" : {"$first" : "$totalFavorite"},
                "totalQuote" : {"$first" : "$totalQuote"},
                "totalReply" : {"$first" : "$totalReply"},
                "totalRetweet" : {"$first" : "$totalRetweet"},
                "totalInteraction" : {"$first" : "$totalInteraction"},
                "userId" : {"$first" : "$userId"},
                "postId" : {"$first" : "$postId"},
                "dateCreate" : {"$first" : "$dateCreate"},
                "predict" : {"$first" : "$predict"},
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
                "text": 1,
                "totalFavorite": 1,
                "totalQuote": 1,
                "totalReply": 1,
                "totalRetweet": 1,
                "totalInteraction": 1,
                "userId": 1,
                "postId": 1,
                "dateCreate": 1,
                "predict": 1,
                "media": {
                    "$cond":[
                        {"$ifNull": ["$media", false]},
                        {
                            "mediaId": "$media._id",
                            "content": "$media._id",
                            "type": {"$arrayElemAt": [{"$split": ["$media.mime_type", "/"]}, 0]},
                            "predict": {
                                "hateful": "$mediaPredict.hateful",
                                "porn": "$mediaPredict.porn",
                                "radicalism": "$mediaPredict.radicalism",
                                "terrorism": "$mediaPredict.terrorism",
                                "lgbt": "$mediaPredict.lgbt"
                            }
                        },
                        "$$REMOVE"
                    ]
                },
                "source": "twitter"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$_id",
                "text": {"$first": "$text"},
                "totalFavorite": {"$first": "$totalFavorite"},
                "totalQuote": {"$first": "$totalQuote"},
                "totalReply": {"$first": "$totalReply"},
                "totalRetweet": {"$first": "$totalRetweet"},
                "totalInteraction": {"$first": "$totalInteraction"},
                "userId": {"$first": "$userId"},
                "postId": {"$first": "$postId"},
                "dateCreate": {"$first": "$dateCreate"},
                "predict": {"$first": "$predict"},
                "media": {"$addToSet": "$media"},
                "source": {"$first": "$source"},
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
                            filterMatch["$or"][0]["predict."+ element] = 1;
                            filterMatch["$or"][1]["media.predict."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["media.predict."+ element] = 1;
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
                    or.push({"text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
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
                "_id" : 0,
            }
        });

        mongo.getAggregateData(dbName, "tweet", agg, function(count) {

            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            } else {
                agg.push({ 
                    "$sort" : {"dateCreate": 1}
                });
            }

            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "tweet", agg, function(result) {
                cb(count.length, result);
            });
        });
    }

    static async getInteractionBaseAnalytics(bodyReq, cb){
        let filter = {
            "user_id" : bodyReq.params.userId
        };

        if ("date" in bodyReq.params) {
            filter["created_at"] = { 
                "$gte": moment(bodyReq.params.date).utc(true).toDate(),
                "$lte":  moment(bodyReq.params.date).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            }
        } else if ("dateFrom" in bodyReq.params && "dateUntil" in bodyReq.params){
            filter["created_at"] = {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
            };
        }

        let agg = [];

        agg.push({ 
            "$match" : filter
        });
        
        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "let" : {"id": "$_id"}, 
                "pipeline" : [
                    {"$match": {"$expr": {"$eq": ["$foreignId", "$$id"]}}},
                    {"$project": {"_id": 0, "advertisement": 1, "hoax": 1, "hateful": 1, "porn": 1, "propaganda": 1, "radicalism": 1, "sentiment": 1, "lgbt":1}}
                ], 
                "as" : "predict"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path":"$predict", 
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

        let match = [];
        if("category" in bodyReq.params){     
            if(bodyReq.params.category === "Radicalism [T]"){
                match.push({ 
                    "predict.radicalism" : { 
                        "$eq" : 1.0
                    }
                });
                match.push({ 
                    "mediaPredict.radicalism" : { 
                        "$eq" : 1.0
                    }
                });
            } else if(bodyReq.params.category === "Hateful [T]"){
                match.push({ 
                    "predict.hateful" : { 
                        "$eq" : 1.0
                    }
                });
                match.push({ 
                    "mediaPredict.hateful" : { 
                        "$eq" : 1.0
                    }
                });
            } else if(bodyReq.params.category === "Porn [T]"){
                match.push({ 
                    "predict.porn" : { 
                        "$eq" : 1.0
                    }
                });
                match.push({ 
                    "mediaPredict.porn" : { 
                        "$eq" : 1.0
                    }
                });
            } else if(bodyReq.params.category === "Terrorism [T]"){
                match.push({ 
                    "mediaPredict.terrorism" : { 
                        "$eq" : 1.0
                    }
                });
            } else if(bodyReq.params.category === "LGBT [T]"){
                match.push({ 
                    "predict.lgbt" : { 
                        "$eq" : 1.0
                    }
                });
                match.push({ 
                    "mediaPredict.lgbt" : { 
                        "$eq" : 1.0
                    }
                });
            }
        }

        agg.push({
            "$match": {
                "$or": match
            }
        });

        agg.push({ 
            "$project" : {
                "_id": 1,
                "text": "$full_text",
                "last_updated" : 1.0, 
                "in_reply_to_status_id" : 1.0, 
                "quoted_status_id" : 1.0, 
                "retweeted_status_id" : 1.0, 
                "userId": "$user_id",
                "postId": "$_id",
                "dateCreate": "$created_at",
                "predict": 1,
                "media": {
                    "$cond":[
                        {"$ifNull": ["$media", false]},
                        {
                            "mediaId": "$media._id",
                            "content": "$media._id",
                            "type": {"$arrayElemAt": [{"$split": ["$media.mime_type", "/"]}, 0]},
                            "predict": {
                                "hateful": "$mediaPredict.hateful",
                                "porn": "$mediaPredict.porn",
                                "radicalism": "$mediaPredict.radicalism",
                                "terrorism": "$mediaPredict.terrorism",
                                "lgbt": "$mediaPredict.lgbt"
                            }
                        },
                        "$$REMOVE"
                    ]
                },
                "source": "twitter"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$_id",
                "text": {"$first": "$text"},
                "last_updated": {"$first": "$last_updated"},
                "in_reply_to_status_id": {"$first": "$in_reply_to_status_id"},
                "quoted_status_id": {"$first": "$quoted_status_id"},
                "retweeted_status_id": {"$first": "$retweeted_status_id"},
                "userId": {"$first": "$userId"},
                "postId": {"$first": "$postId"},
                "dateCreate": {"$first": "$dateCreate"},
                "predict": {"$first": "$predict"},
                "media": {"$addToSet": "$media"},
                "source": {"$first": "$source"},
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
                            filterMatch["$or"][0]["predict."+ element] = 1;
                            filterMatch["$or"][1]["media.predict."+ element] = 1;
                        } else {
                            filterMatch = {};
                            filterMatch["media.predict."+ element] = 1;
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
                    or.push({"text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
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
                            "_id": 0, "fullName": "$detailProfile.name", "isPrivate": "$detailProfile.protected", "isVerified": "$detailProfile.verified", "profilePic": "$detailProfile.profile_image_url", "username": "$detailProfile.username", "favorite": { "$literal": 1 }
                        }
                    }
                ], 
                "as" : "tweetFavorite"
            }
        });

        agg.push({ 
            "$project" : { 
                "_id":1,
                "userId":1,
                "postId": 1,
                "text": 1,
                "media": 1,
                "dateCreate": 1,
                "predict":1,
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
            "$match" : { 
                "interactions.username" : bodyReq.params.friend
            }
        });

        mongo.getAggregateData(dbName, "tweet", agg, function(count) {
            agg.push({
                "$group": {
                    "_id": null,
                    "posts": {
                        "$addToSet": {
                            "source": "twitter",
                            "postId": "$_id",
                            "dateCreate": "$dateCreate",
                            "userId":bodyReq.params.userId,
                            "text": "$text",
                            "totalReply": {"$sum": '$interactions.reply'},/* {"$sum": {"$cond": [{ '$ne': ['$interactions.like', null]}, "$interactions.like", 0]}}, */
                            "totalRetweet": {"$sum": '$interactions.retweet'},/* {"$sum": {"$cond": [{ '$ne': ['$interactions.comment', null]}, "$interactions.comment", 0]}}, */
                            "totalQuote": {"$sum": '$interactions.quote'},/* {"$add":["$totalLike","$totalComment"]}, */
                            "totalFavorite": {"$sum": '$interactions.favorite'},/*  {"$add":["$totalLike","$totalComment"]}, */
                            "predict":"$predict",
                            "media": {"$ifNull": ["$media", []]},
                        }
                    },
                    "username": {"$first": "$interactions.username"},
                    "fullName": {"$first": "$interactions.fullName"},
                    "isPrivate": {"$first": "$interactions.isPrivate"},
                    "isVerified": {"$first": "$interactions.isVerified"},
                    "profilePic": {"$first": "$interactions.profilePic"},
                }
            });
            
            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            }

            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "tweet", agg, function(result) {
                cb(count.length, result);
            });
        });
    }

    static async getCategoryBaseAnalytics(bodyReq, cb){
        let filter = {
            "user_id" : bodyReq.params.userId
        };

        // if ("date" in bodyReq.params) {
        //     filter["created_at"] = { 
        //         "$gte": moment(bodyReq.params.date).utc(true).toDate(),
        //         "$lte":  moment(bodyReq.params.date).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
        //     }
        // } else if ("dateFrom" in bodyReq.params && "dateUntil" in bodyReq.params){
        //     filter["created_at"] = {
        //         "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
        //         "$lte": moment(bodyReq.params.dateUntil).add(23, 'hours').add(59, 'minutes').add(59, 'seconds').add(999, 'millisecond').utc(true).toDate()
        //     };
        // }

        let agg = [];

        agg.push({ 
            "$match" : filter
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "predict"
            }
        });

        // agg.push({ 
        //     "$lookup" : { 
        //         "from" : "classificationText", 
        //         "let" : { 
        //             "id" : "$_id"
        //         }, 
        //         "pipeline" : [
        //             { 
        //                 "$match" : { 
        //                     "$expr" : { 
        //                         "$eq" : [
        //                             "$foreignId", 
        //                             "$$id"
        //                         ]
        //                     }
        //                 }
        //             }, 
        //             // { 
        //             //     "$project" : { 
        //             //         "_id" : 0.0, 
        //             //         "advertisement" : 1.0, 
        //             //         "hoax" : 1.0, 
        //             //         "hateful" : 1.0, 
        //             //         "porn" : 1.0, 
        //             //         "propaganda" : 1.0, 
        //             //         "radicalism" : 1.0, 
        //             //         "sentiment" : 1.0,
        //             //         "lgbt": 1
        //             //     }
        //             // }
        //         ], 
        //         "as" : "predict"
        //     }
        // });

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

        // agg.push({
        //     "$group":{
        //         "_id":"$_id",
        //         "full_text":{"$first":"$full_text"},
        //         "favorite_count":{"$first":"$favorite_count"},
        //         "quote_count":{"$first":"$quote_count"},
        //         "reply_count":{"$first":"$reply_count"},
        //         "retweet_count":{"$first":"$retweet_count"},
        //         "user_id":{"$first":"$user_id"},
        //         "created_at":{"$first":"$created_at"},
        //         "predict":{"$first":"$predict"},
        //         "media":{"$first":"$mediaPredict"},
        //     }
        // })

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

        if("category" in bodyReq.params){
            let category = {};

            switch(true){    
                case bodyReq.params.category == "Porn":
                    category = { "$or": [{"predict.porn" : 1}, {"predict.resultClassification.porn.result" : "sexy"}, {"media.predict.porn": 1}/* { "media": {"$elemMatch": {"predict.porn": 1}}} */, {"media.predict.resultClassification.porn.result": "sexy"}/* { "media": {"$elemMatch": {"predict.resultClassification.porn.result": "sexy"}}} */]};
                    break;

                case bodyReq.params.category == "Hateful":
                    category = { "$or": [{"predict.hateful" : 1}, { "predict.sentiment" : -1.0}, {"media.predict.hateful": 1}/* { "media": {"$elemMatch": {"predict.hateful": 1}}} */]};
                    break;

                case bodyReq.params.category == "Radicalism":
                    category = { "$or": [{"predict.radicalism" : 1}, {"predict.propaganda" : 1}, {"media.predict.radicalism": 1}/* { "media": {"$elemMatch": {"predict.radicalism": 1} }} */]};
                    break;

                case bodyReq.params.category == "Terrorism":
                    category = {"media.predict.terrorism": 1};/* { "media": {"$elemMatch": { "predict.terrorism" : 1}}} */;
                    break;

                case bodyReq.params.category == "LGBT":
                    category = { "$or": [{"predict.lgbt" : 1}, {"media.predict.lgbt": 1}/* { "media": {"$elemMatch": {"predict.lgbt": 1}}} */]};
                    break;

                default :
                    break;
            }

            agg.push({ 
                "$match" : category
            });
        }

        let and = [];
        if ("categories" in bodyReq.params && bodyReq.params.categories.length > 0 && bodyReq.params.categories.length < 5) {
            let or = [];
            let filterMatch = {};
            bodyReq.params.categories.forEach((element) => {
                if (element == "lgbt"){
                    
                } else if (element != "terrorism"){
                    filterMatch = { "$or": [{}, {}] };
                    filterMatch["$or"][0]["predict."+ element] = 1;
                    filterMatch["$or"][1]["media.predict."+ element] = 1;
                } else {
                    filterMatch = {};
                    filterMatch["media.predict."+ element] = 1;
                }
                or.push(filterMatch);
            });
            and.push({"$or":or});
        }

        if ("includeKeywords" in  bodyReq.params) {
            let or = [];
            if(bodyReq.params.includeKeywords.length > 0){
                bodyReq.params.includeKeywords.forEach((element) => {
                    or.push({"text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
                });
                and.push({"$or":or});
            }
        }
        
        if ("excludeKeywords" in bodyReq.params) {
            let or = [];
            if(bodyReq.params.excludeKeywords.length > 0){
                bodyReq.params.excludeKeywords.forEach((element) => {
                    or.push({ "text": { $regex: new RegExp('.*' + element + '.*', 'i') }});
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
                "text" : { 
                    "$first" : "$text"
                }, 
                "totalFavorite" : { 
                    "$first" : "$totalFavorite"
                }, 
                "totalQuote" : { 
                    "$first" : "$totalQuote"
                }, 
                "totalReply" : { 
                    "$first" : "$totalReply"
                }, 
                "totalRetweet" : { 
                    "$first" : "$totalRetweet"
                }, 
                "totalInteraction" : { 
                    "$first" : "$totalInteraction"
                }, 
                "userId" : { 
                    "$first" : "$userId"
                }, 
                "postId" : { 
                    "$first" : "$postId"
                }, 
                "dateCreate" : { 
                    "$first" : "$dateCreate"
                }, 
                "predict" : { 
                    "$first" : "$predict"
                }, 
                "media" : { 
                    "$push" : "$media"
                }, 
                "source" : { 
                    "$first" : "$source"
                }
            }
        });

        mongo.getAggregateData(dbName, "tweet", agg, function(count) {
            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            } else {
                agg.push({ 
                    "$sort" : {"dateCreate": 1}
                });
            }

            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "tweet", agg, function(result) {
                cb(count.length, result);
            });
        });
    }
    
    static async getPost(bodyReq, cb){
        let filter = {
            "user_id" : bodyReq.params.userId
        };

        let agg = [];

        agg.push({ 
            "$match" : filter
        });

        if ("search" in bodyReq.params) {
            filter["$or"] = [
                { "full_text": { $regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i') } },
            ];
        }

        agg.push({ 
            "$project" : { 
                "id": "$_id",
                "caption": "$full_text",
                "likeCount": "$favorite_count",
                "commentCount": {"$add": ["$retweet_count", "$reply_count", "$quote_count"]},
                "userId": "$user_id",
                "postId": "$_id",
                "targetId": 1,
                "timestamp": "$created_at",
                "type": 1,
                "media": { 
                    "$cond" : [
                        {"$gt" : ["$entities.media", null]}, 
                        "$entities.media", 
                        []
                    ]
                }
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "classificationText", 
                "localField" : "id", 
                "foreignField" : "foreignId", 
                "as" : "classificationText"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path":"$classificationText", 
                "preserveNullAndEmptyArrays" : true
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
                "localField" : "media", 
                "foreignField" : "_id", 
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
            "$project" : {
                "caption": "$caption",
                "likeCount": "$likeCount",
                "commentCount": "$commentCount",
                "userId": "$userId",
                "postId": "$postId",
                "targetId": "$targetId",
                "timestamp": "$timestamp",
                "advertisement": "$classificationText.advertisement",
                "hoax": "$classificationText.hoax",
                "hateful": "$classificationText.hateful",
                "porn": "$classificationText.porn",
                "propaganda": "$classificationText.propaganda",
                "radicalism": "$classificationText.radicalism",
                "sentiment": "$classificationText.sentiment",
                "lgbt": "$classificationText.lgbt",
                "media": {
                    "$cond":[
                        {"$ifNull": ["$media", false]},
                        {
                            "content": "$media._id",
                            "hateful": "$media.hateful",
                            "porn": "$media.porn",
                            "radicalism": "$media.radicalism",
                            "terrorism": "$media.terrorism",
                            "lgbt": "$media.lgbt"
                        },
                        "$$REMOVE"
                    ]
                },
                "dayOfWeek" : {"$dayOfWeek": "$timestamp"},
                "hour": {"$hour": "$timestamp"},
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$_id",
                "text": {"$first": "$caption"},
                "likeCount": {"$first": "$likeCount"},
                "commentCount": {"$first": "$commentCount"},
                "userId": {"$first": "$userId"},
                "postId": {"$first": "$postId"},
                "targetId": {"$first": "$targetId"},
                "timestamp": {"$first": "$timestamp"},
                "advertisement": {"$first": "$advertisement"},
                "hoax": {"$first": "$hoax"},
                "hateful": {"$first": "$hateful"},
                "porn": {"$first": "$porn"},
                "propaganda": {"$first": "$propaganda"},
                "radicalism": {"$first": "$radicalism"},
                "sentiment": {"$first": "$sentiment"},
                "lgbt": {"$first": "$lgbt"},
                "media": {"$push": "$media"},
                "dayOfWeek" : {"$first": "$dayOfWeek"},
                "hour": {"$first": "$hour"},
            }
        });

        if ("dayOfWeek" in bodyReq.params && "hour" in bodyReq.params) {
            agg.push({
                "$match": {
                    "dayOfWeek" : parseInt(bodyReq.params.dayOfWeek),
                    "hour" : parseInt(bodyReq.params.hour)
                }            	
            });
        }

        mongo.getAggregateData(dbName, "tweet", agg, function(count) {

            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            }

            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "tweet", agg, function(result) {
                cb(count.length, result);
            });
        });
    }

    static async getFollowing(bodyReq, cb){
        let filter = {
            "followers" : bodyReq.params.userId
        };

        let agg = [];

        agg.push({ 
            "$match" : filter
        });

        agg.push({
            "$lookup": {    
                "from": "profile",
                "localField": "following",
                "foreignField": "_id",
                "as": "profile"
            }
        });

        agg.push({
            "$unwind": {
                "path": "$profile",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : 0, 
                "dateUpdate" : "$profile.created_at",
                "followerId" : "$profile._id",
                "fullName" : "$profile.name",
                "isVerified" : "$profile.verified",
                "profilePic" : "$profile.profile_image_url",
                "username" : "$profile.username",
            }
        });

        if ("search" in bodyReq.params) {
            agg.push({
                "$match": {
                    "$or" : [
                        { "fullName": { $regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i') } },
                        { "username": { $regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i') } },
                    ] 
                }
            });
        }

        mongo.getAggregateData(dbName, "follow", agg, function(count) {
            
            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            }

            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "follow", agg, function(result) {
                cb(count.length, result);
            });
        });
    }

    static async getFollower(bodyReq, cb){
        let filter = {
            "following" : bodyReq.params.userId
        };

        let agg = [];

        agg.push({ 
            "$match" : filter
        });

        agg.push({
            "$lookup": {    
                "from": "profile",
                "localField": "followers",
                "foreignField": "_id",
                "as": "profile"
            }
        });

        agg.push({
            "$unwind": {
                "path": "$profile",
                "preserveNullAndEmptyArrays": true
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : 0, 
                "dateUpdate" : "$profile.created_at",
                "followerId" : "$profile._id",
                "fullName" : "$profile.name",
                "isVerified" : "$profile.verified",
                "profilePic" : "$profile.profile_image_url",
                "username" : "$profile.username",
            }
        });

        if ("search" in bodyReq.params) {
            agg.push({
                "$match": {
                    "$or" : [
                        { "fullName": { $regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i') } },
                        { "username": { $regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i') } },
                    ] 
                }
            });
        }

        mongo.getAggregateData(dbName, "follow", agg, function(count) {

            if ("sort" in bodyReq.params) {
                agg.push({ 
                    "$sort" : bodyReq.params.sort
                });
            }

            agg.push({ 
                "$skip" : parseInt(bodyReq.params.offset)
            });

            agg.push({ 
                "$limit" : parseInt(bodyReq.params.limit)
            });

            mongo.getAggregateData(dbName, "follow", agg, function(result) {
                cb(count.length, result);
            });
        });
    }
}

module.exports = RawDataModel;