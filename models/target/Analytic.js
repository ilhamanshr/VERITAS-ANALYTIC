const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const utils         = require(BASE_DIR + '/Utils');
const dbName        = process.env.DB_NAME;

class AnalyticModel {
    static async getTimeFrame(bodyReq, data, cb) {
        let agg = [];

        let filter = {
            "dateCreate": {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            }
        }

        filter["$or"] = this.matchTarget(data);

        filter = this.advanceFilter(bodyReq, filter);

        agg.push({
            "$match": filter
        });

        agg.push({
            "$group": {
                "_id" : { 
                    "$dateToString" : { 
                        "format" : "%Y-%m-%d", 
                        "date" : "$dateCreate"
                    }
                }, 
                "postCount" : {"$sum" : 1},
                "interaction" : {"$sum" : "$totalInteraction"},
                "engagement" : {"$sum" : "$totalInteraction"},
            }
        });

        agg.push({
            "$project": {
                "_id": 0,
                "date": "$_id",
                "postCount" : 1,
                "interaction" : 1,
                "engagement" : {"$divide" : [ "$interaction", "$postCount"]},
            }
        });

        agg.push({
            "$sort": {
                "date": 1
            }
        });

        agg.push({
            "$group": {
                "_id": null,
                "date": {"$push": "$date"},
                "postCount" : {"$push": "$postCount"},
                "interaction" : {"$push": "$interaction"},
                "engagement" : {"$push": "$engagement"},
            }
        });

        mongo.getAggregateData(dbName, "rawdata", agg, function(result) {
            cb(result);
        });
    }

    static async getContentDistribution(bodyReq, data, cb) {
        let agg = [];

        let filter = {
            "dateCreate": {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            }
        }

        filter["$or"] = this.matchTarget(data);

        filter = this.advanceFilter(bodyReq, filter);

        agg.push({
            "$match": filter
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$media",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({
            "$group": {
                "_id" : "$_id", 
                "dateCreate": {"$first": "$dateCreate"},
                "positive" : {"$sum":{"$cond":[{"$and":[{"$ne":["$predict.hateful",1]},{"$ne":["$predict.porn", 1]},{"$ne":["$predict.radicalism", 1]},{"$ne":["$media.predict.hateful", 1]},{"$ne":["$media.predict.porn",1]},{"$ne":["$media.predict.radicalism",1]},{"$ne":["$media.predict.terrorism",1]},{"$ne":["$media.predict.lgbt",1]}]},1,0]}}, 
                "negative" : {"$sum":{"$cond":[{"$or":[{"$eq":["$predict.hateful",1]},{"$eq":["$predict.porn",1]},{"$eq":["$predict.radicalism",1]},{"$gte":["$media.predict.hateful",1]},{"$gte":["$media.predict.porn",1]},{"$gte":["$media.predict.radicalism",1]},{"$gte":["$media.predict.terrorism",1]},{"$gte":["$media.predict.lgbt",1]}]},-1,0]}}, 
            }
        });

        agg.push({
            "$group": {
                "_id" : { 
                    "$dateToString" : { 
                        "format" : "%Y-%m-%d", 
                        "date" : "$dateCreate"
                    }
                }, 
                "positive" : {"$sum": {"$cond":[{"$gt":["$positive", 0]}, 1, 0]}},
                "negative" : {"$sum": {"$cond":[{"$lt":["$negative", 0]}, -1, 0]}},
                "count" : {"$sum" : 1}
            }
        });

        agg.push({
            "$project": {
                "_id": 0,
                "date": "$_id",
                "positive" : 1,
                "negative" : 1,
                "count" : 1,
            }
        });

        agg.push({
            "$sort": {
                "date": 1
            }
        });

        agg.push({
            "$group": {
                "_id": null,
                "date": {"$push": "$date"},
                "positive" : {"$push": "$positive"},
                "negative" : {"$push": "$negative"},
                "count" : {"$push": "$count"},
            }
        });

        mongo.getAggregateData(dbName, "rawdata", agg, function(result) {
            cb(result);
        });
    }

    static async getFriendBaseAnalysis(bodyReq, data, cb) {
        let agg = [];

        let filter = {};

        if ("dateFrom" in bodyReq.params && "dateUntil" in bodyReq.params) {
            filter["dateCreate"] = {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            }
        }

        filter["$and"] = [
            {"$or": this.matchTarget(data)},
            {"$or": [
                {"predict.hateful": 1},
                {"predict.porn": 1},
                {"predict.radicalism": 1},
                {"predict.lgbt": 1},
                {"media": {"$elemMatch": {"predict.hateful": 1}}},
                {"media": {"$elemMatch": {"predict.porn": 1}}},
                {"media": {"$elemMatch": {"predict.radicalism": 1}}},
                {"media": {"$elemMatch": {"predict.lgbt": 1}}},
                {"media": {"$elemMatch": {"predict.terrorism": 1}}},
            ]}
        ];

        filter = this.advanceFilter(bodyReq, filter);

        agg.push({
            "$match": filter
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$media",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({
            "$group": {
                "_id": "$_id",
                "postId": { "$first": "$postId" },
                "userId": { "$first": "$userId" },
                "username": { "$first": "$username" },
                "source": { "$first": "$source" },
                "radicalismText" : {"$sum" : "$predict.radicalism"}, 
                "hatefulText" : {"$sum" : "$predict.hateful"}, 
                "pornText" : {"$sum" : "$predict.porn"},
                "lgbtText" : {"$sum" : "$predict.lgbt"}, 
                "hatefulImage" : {"$sum" : "$media.predict.hateful"}, 
                "pornImage" : {"$sum" : "$media.predict.porn"}, 
                "radicalismImage" : {"$sum" : "$media.predict.radicalism"}, 
                "terrorismImage" : {"$sum" : "media.predict.terrorism"},
                "lgbtImage" : {"$sum" : "media.predict.lgbt"}
            }
        });

        agg.push({
            "$lookup" : { 
                "from" : "rawdata_like", 
                "localField" : "_id", 
                "foreignField" : "postId", 
                "as" : "like"
            }
        });

        agg.push({
            "$lookup" : { 
                "from" : "rawdata_comment", 
                "localField" : "_id", 
                "foreignField" : "postId", 
                "as" : "comment"
            }
        });

        agg.push({
            "$lookup" : { 
                "from" : "rawdata_favorite", 
                "localField" : "_id", 
                "foreignField" : "postId", 
                "as" : "favorite"
            }
        });

        agg.push({
            "$lookup" : { 
                "from" : "rawdata_retweet", 
                "localField" : "_id", 
                "foreignField" : "postId", 
                "as" : "retweet"
            }
        });

        agg.push({
            "$lookup" : { 
                "from" : "rawdata_quote", 
                "localField" : "_id", 
                "foreignField" : "inQuoteId", 
                "as" : "quote"
            }
        });

        agg.push({
            "$lookup" : { 
                "from" : "rawdata_reply", 
                "localField" : "_id", 
                "foreignField" : "inReplyId", 
                "as" : "reply"
            }
        });
        
        agg.push({
            "$lookup" : { 
                "from" : "analyzer", 
                "let": {"userId": "$userId", "source": "$source"},
                "pipeline" : [
                    {"$match" : {"$expr" : { "$and" : [{"$eq" : ["$userId", "$$userId"]},{"$eq" : ["$source", "$$source"]},{"$eq" : ["$status", 1]}]}}}, 
                    {"$limit": 1}
                ], 
                "as" : "profile"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$profile",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$project" : { 
                "postId": 1,
                "userId": 1,
                "username": "$profile.username",
                "name": "$profile.name",
                "profilePic": "$profile.profilePic",
                "isPrivate": "$profile.isPrivate",
                "isVerified": "$profile.isVerified",
                "source": 1,
                "radicalism" : {"$cond" : [{"$or": [{"$gte": ["$radicalismText", 1]}, {"$gte": ["$radicalismImage", 1]}]}, 1, 0]}, 
                "hateful" : {"$cond" : [{"$or": [{"$gte": ["$hatefulText", 1]},{"$gte": ["$hatefulImage", 1]}]}, 1, 0]}, 
                "porn" : {"$cond" : [{"$or": [{"$gte": ["$pornText", 1]},{"$gte": ["$pornImage", 1]}]}, 1, 0]}, 
                "terorism" : {"$cond": [{"$gte": ["$terrorismImage", 1]}, 1, 0]},
                "lgbt" : { "$cond" : [{"$or": [{"$gte": ["$lgbtText", 1]},{"$gte": ["$lgbtImage", 1]}]}, 1, 0]}, 
                "interactions" : { 
                    "$concatArrays" : [
                        "$like", 
                        "$comment", 
                        "$favorite", 
                        "$quote", 
                        "$reply",
                        "$retweet",
                    ]
                }
            }
        });

        agg.push({
            "$unwind": {
                "path": "$interactions"
            }
        });
        
        if ("source" in bodyReq.params) { 
            agg.push({
                "$match": {
                    "source": bodyReq.params.source
                }
            });
        }

        agg.push({
            "$project": {
                "_id": 0,
                "source" : 1,
                "userId" : 1,
                "username" : 1,
                "name" : 1,
                "profilePic" : 1,
                "isPrivate" : 1,
                "isVerified" : 1,
                "friendUserId" : {"$cond": [{ '$ifNull': ['$interactions.userId', false]}, "$interactions.userId", {"$cond": [{ '$ifNull': ['$interactions.owner.id', false]}, "$interactions.owner.id", "$interactions.profilePic"]}]},
                "friendUsername" : {"$cond": [{ '$ifNull': ['$interactions.username', false]}, "$interactions.username", "$interactions.owner.username"]},
                "friendName" : {"$cond": [{ '$ifNull': ['$interactions.fullName', false]}, "$interactions.fullName", ""]},
                "friendProfilePic" : {"$cond": [{ '$ifNull': ['$interactions.profilePic', false]}, "$interactions.profilePic", "$interactions.owner.profilePic"]},
                "friendIsVerified" : {"$cond": [{ '$ifNull': ['$interactions.isVerified', true]}, "$interactions.owner.IsVerified", "$interactions.isVerified"]},
                "friendIsPrivate" : {"$cond": [{ '$ifNull': ['$interactions.isPrivate', true]}, false, "$interactions.isPrivate"]},
                "interactions": 1,
                "radicalism" : 1, 
                "hateful" : 1, 
                "porn" : 1, 
                "terorism" : 1, 
                "lgbt" : 1, 
            }
        });

        agg.push({
            "$group": {
                "_id" : { 
                    "source" : "$source",
                    "userId" : "$userId",
                    "friendUsername" : "$friendUsername",
                }, 
                "source" : {"$first" : "$source"},
                "userId" : {"$first" : "$userId"},
                "username" : {"$first" : "$username"},
                "name" : {"$first" : "$name"},
                "profilePic" : {"$first" : "$profilePic"},
                "isPrivate" : {"$first" : "$isPrivate"},
                "isVerified" : {"$first" : "$isVerified"},
                "friendUserId" : {"$first" : "$friendUserId"},
                "friendUsername" : {"$first" : "$friendUsername"},
                "friendName" : {"$first" : "$friendName"},
                "friendProfilePic" : {"$first" : "$friendProfilePic"},
                "friendIsVerified" : {"$first" : "$friendIsVerified"},
                "friendIsPrivate" : {"$first" : "$friendIsPrivate"},
                "like": {"$sum": {"$cond": [{ '$ifNull': ['$interactions.likeId', false]}, 1, 0]}},
                "comment": {"$sum": {"$cond": [{ '$ifNull': ['$interactions.commentId', false]}, 1, 0]}},
                "favorite": {"$sum": {"$cond": [{ '$ifNull': ['$interactions.favoriteId', false]}, 1, 0]}},
                "retweet": {"$sum": {"$cond": [{ '$ifNull': ['$interactions.retweetId', false]}, 1, 0]}},
                "quote": {"$sum": {"$cond": [{ '$ifNull': ['$interactions.inQuoteId', false]}, 1, 0]}},
                "reply": {"$sum": {"$cond": [{ '$ifNull': ['$interactions.inReplyId', false]}, 1, 0]}},
                "total": {"$sum": 1},
                "Radicalism" : { 
                    "$sum" : "$radicalism"
                }, 
                "Hateful" : { 
                    "$sum" : "$hateful"
                }, 
                "Porn" : { 
                    "$sum" : "$porn"
                }, 
                "Terrorism" : { 
                    "$sum" : "$terorism"
                }, 
                "LGBT" : { 
                    "$sum" : "$lgbt"
                }, 
            }         
        });

        agg.push({
            "$project": {
                "_id": 0,
            }
        });

        agg.push({
            "$match": {
                "$expr": {"$ne": ["$userId", "$friendUserId"] } 
            }
        });

        agg.push({
            "$sort": { 
                "total": -1 
            }
        });

        mongo.getAggregateData(dbName, "rawdata", agg, function(result) {
            cb(result);
        });
    }

    static async getWordBase(bodyReq, data, cb) {
        let agg = [];
        let type = parseInt(bodyReq.params.type) === 1 ? "unigram": (parseInt(bodyReq.params.type) === 2 ? "bigram": "trigram");

        let filter = {
            "dateCreate": {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            }
        }

        filter["$or"] = this.matchTarget(data);

        filter = this.advanceFilter(bodyReq, filter);

        agg.push({
            "$match": filter
        });

        agg.push({
            "$lookup" : { 
                "from" : "rawdata_ngram", 
                "let": {"id": "$_id"},
                "pipeline" : [
                    {"$match" : {"$expr" : {"$eq" : ["$_id", "$$id"]}}}, 
                    {"$project": {"ngram": "$" + type}}
                ], 
                "as" : "ngram"
            }
        });

        agg.push({
            "$project": {
                "word": {"$arrayElemAt": ["$ngram.ngram", 0]}
            }
        });

        agg.push({
            "$unwind": {
                "path": "$word"
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

        if("filter" in bodyReq.params){
            let matchNerPos = [];

            if("ner" in bodyReq.params.filter){
                agg.push({ 
                    "$lookup" : { 
                        "from" : "rawdata_namedEntityRecognition", 
                        "let" : { 
                            "id" : "$_id", 
                            "word" : "$wordExtract"
                        }, 
                        "pipeline" : [
                            { 
                                "$match" : { 
                                    "$expr" : { "$eq" : ["$foreignId", "$$id"]
                                    }
                                }
                            }, 
                            { 
                                "$project" : { 
                                    "_id" : 0, 
                                    "B-PER" : { "$cond" : { "if" : { "$in" : ["$$word", "$NamedEntityRecognition.B-PER"]}, "then" : 1, "else" : 0}}, 
                                    "I-PER" : { "$cond" : { "if" : { "$in" : ["$$word", "$NamedEntityRecognition.I-PER"]}, "then" : 1, "else" : 0}}, 
                                    "B-ORG" : { "$cond" : { "if" : { "$in" : ["$$word", "$NamedEntityRecognition.B-ORG"]}, "then" : 1, "else" : 0}}, 
                                    "I-ORG" : { "$cond" : { "if" : { "$in" : ["$$word", "$NamedEntityRecognition.I-ORG"]}, "then" : 1, "else" : 0}}, 
                                    "B-LOC" : { "$cond" : { "if" : { "$in" : ["$$word", "$NamedEntityRecognition.B-LOC"]}, "then" : 1, "else" : 0}}, 
                                    "I-LOC" : { "$cond" : { "if" : { "$in" : ["$$word", "$NamedEntityRecognition.I-LOC"]}, "then" : 1, "else" : 0}}, 
                                    "B-DAT" : { "$cond" : { "if" : { "$in" : ["$$word", "$NamedEntityRecognition.B-DAT"]}, "then" : 1, "else" : 0}}, 
                                    "I-DAT" : { "$cond" : { "if" : { "$in" : ["$$word", "$NamedEntityRecognition.I-DAT"]}, "then" : 1, "else" : 0}}, 
                                    "B-TIM" : { "$cond" : { "if" : { "$in" : ["$$word", "$NamedEntityRecognition.B-TIM"]}, "then" : 1, "else" : 0}}, 
                                    "I-TIM" : { "$cond" : { "if" : { "$in" : ["$$word", "$NamedEntityRecognition.I-TIM"]}, "then" : 1, "else" : 0}}
                                }
                            }
                        ], 
                        "as" : "namedEntityRecognition"
                    }
                });
                
                if(bodyReq.params.filter.ner.indexOf("person") > -1){
                    matchNerPos.push({"namedEntityRecognition": {"$elemMatch": {"B-PER": 1}}});
                    matchNerPos.push({"namedEntityRecognition": {"$elemMatch": {"I-PER": 1}}});
                } 

                if(bodyReq.params.filter.ner.indexOf("organization") > -1){
                    matchNerPos.push({"namedEntityRecognition": {"$elemMatch": {"B-ORG": 1}}});
                    matchNerPos.push({"namedEntityRecognition": {"$elemMatch": {"I-ORG": 1}}});
                }

                if(bodyReq.params.filter.ner.indexOf("location") > -1){
                    matchNerPos.push({"namedEntityRecognition": {"$elemMatch": {"B-LOC": 1}}});
                    matchNerPos.push({"namedEntityRecognition": {"$elemMatch": {"I-LOC": 1}}});
                }

                if(bodyReq.params.filter.ner.indexOf("date") > -1){
                    matchNerPos.push({"namedEntityRecognition": {"$elemMatch": {"B-DAT": 1}}});
                    matchNerPos.push({"namedEntityRecognition": {"$elemMatch": {"I-DAT": 1}}});
                }

                if(bodyReq.params.filter.ner.indexOf("time") > -1){
                    matchNerPos.push({"namedEntityRecognition": {"$elemMatch": {"B-TIM": 1}}});
                    matchNerPos.push({"namedEntityRecognition": {"$elemMatch": {"I-TIM": 1}}});
                }
            } 
            
            if("postag" in bodyReq.params.filter){
                agg.push({ 
                    "$lookup" : { 
                        "from" : "rawdata_posTagging", 
                        "let" : { 
                            "id" : "$_id", 
                            "word" : "$wordExtract"
                        }, 
                        "pipeline" : [
                            {
                                "$match" : { 
                                    "$expr" : { "$eq" : ["$foreignId", "$$id"]}
                                }
                            }, 
                            {
                                "$project" : { 
                                    "_id" : 0, 
                                    "NOUN" : {"$cond" : { "if" : { "$in" : ["$$word", "$PosTagging.NOUN"]}, "then" : 1, "else" : 0}}, 
                                    "ADV" : {"$cond" : { "if" : { "$in" : ["$$word", "$PosTagging.ADV"]}, "then" : 1, "else" : 0}}, 
                                    "VERB" : { "$cond" : { "if" : { "$in" : ["$$word", "$PosTagging.VERB"]}, "then" : 1, "else" : 0}}
                                }
                            }
                        ], 
                        "as" : "posTagging"
                    }
                }); 

                if(bodyReq.params.filter.postag.indexOf("verb") >= 0){
                    matchNerPos.push({"posTagging": {"$elemMatch": {"VERB": 1}}});
                } 
    
                if(bodyReq.params.filter.postag.indexOf("adverb") >= 0){
                    matchNerPos.push({"posTagging": {"$elemMatch": {"ADV": 1}}});
                }
    
                if(bodyReq.params.filter.postag.indexOf("noun") >= 0){
                    matchNerPos.push({"posTagging": {"$elemMatch": {"NOUN": 1}}});
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
                "_id" : {"word": "$word", "id": "$_id"}
            }
        });

        agg.push({
            "$group": {
                "_id" : "$_id.word", 
                "weight" : {"$sum" : 1.0},
            }
        });

        agg.push({
            "$project": {
                "_id" : 0, 
                "name" : "$_id",
                "weight" : 1,
            }
        });

        agg.push({ 
            "$sort" : { 
                "weight" : -1.0
            }
        });

        agg.push(
            { 
                "$limit" : bodyReq.params.limit
            }
        );
        
        mongo.getAggregateData(dbName, "rawdata", agg, function(result) {
            cb(result);
        });
    }

    static async getFaceAnalytic(bodyReq, data, cb) {
        let agg = [];

        let filter = {
            "userId": {
                "$in": this.matchTargetUserId(data)
            }
        }

        agg.push({
            "$match": filter
        });
        mongo.getAggregateData(dbName, "rawdata_faceAnalytic", agg, function(count) {

            agg.push({
                "$match": {
                    "age": { "$ne": null },
                    "gender": { "$ne": null },
                    "dominantEmotion": { "$ne": null },
                    "dominantRace": { "$ne": null }
                }
            });

            agg.push({ 
                "$project": {
                    "_id": 0,
                    "filename": "$_id",
                    "age": "$age",
                    "dominantEmotion": "$dominantEmotion",
                    "dominantRace": "$dominantRace",
                    "gender": "$gender",
                    "source": "$source",
                    "userId": "$userId",

                }
            });

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

            mongo.getAggregateData(dbName, "rawdata_faceAnalytic", agg, function(result) {
                cb({"result": result, "count": count.length});
            });
        });
    }

    static async getFaceCluster(bodyReq, data, cb) {
        let agg = [];

        let filter = {
            "_id": {
                "$in": this.matchTargetUserId(data)
            }
        }

        agg.push({
            "$match": filter
        });

        agg.push({
            "$lookup" : { 
                "from" : "analyzer", 
                "let": {"userId": "$_id"},
                "pipeline" : [
                    {"$match" : {"$expr" : { "$and" : [{"$eq" : ["$userId", "$$userId"]},{"$eq" : ["$status", 1]}]}}}, 
                    {"$limit": 1}
                ], 
                "as" : "profile"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$profile",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({
            "$project": {
                "_id": 0,
                "userId": "$_id",
                "username": "$profile.username",
                "name": "$profile.name",
                "profilePic": "$profile.profilePic",
                "isPrivate": "$profile.isPrivate",
                "isVerified": "$profile.isVerified",
                "source": "$profile.source",
                "cluster": "$cluster",
            }
        });

        mongo.getAggregateData(dbName, "rawdata_faceCluster", agg, function(result) {
            cb(result);
        });
    }

    static async getTendenciesAnalysis(bodyReq, data, cb){
        let agg = [];
        let filter = {};

        filter["$or"] = this.matchTarget(data);

        agg.push({
            "$match": filter
        });

        // { 
        //     "$match" : { 
        //         "$and" : [
        //             { 
        //                 "$or" : [
        //                     { 
        //                         "$and" : [
        //                             { 
        //                                 "userId" : "329504750"
        //                             }, 
        //                             { 
        //                                 "source" : "instagram"
        //                             }
        //                         ]
        //                     }, 
        //                     { 
        //                         "$and" : [
        //                             { 
        //                                 "userId" : "71537099"
        //                             }, 
        //                             { 
        //                                 "source" : "twitter"
        //                             }
        //                         ]
        //                     }
        //                 ]
        //             }
        //         ]
        //     }
        // }, 
        agg.push({ 
            "$lookup" : { 
                "from" : "rawdata_comment", 
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
                                            "$postId", 
                                            "$$id"
                                        ]
                                    }, 
                                    { 
                                        "$or" : [
                                            { 
                                                "$eq" : [
                                                    "$predict.hateful", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.porn", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.radicalism", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.lgbt", 
                                                    1.0
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$group" : { 
                            "_id" : "$postId", 
                            "radicalism" : { 
                                "$sum" : "$predict.radicalism"
                            }, 
                            "hateful" : { 
                                "$sum" : "$predict.hateful"
                            }, 
                            "porn" : { 
                                "$sum" : "$predict.porn"
                            }, 
                            "lgbt" : { 
                                "$sum" : "$predict.lgbt"
                            }
                        }
                    }
                ], 
                "as" : "rawdata_comment"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "rawdata_subComment", 
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
                                            "$postId", 
                                            "$$id"
                                        ]
                                    }, 
                                    { 
                                        "$or" : [
                                            { 
                                                "$eq" : [
                                                    "$predict.hateful", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.porn", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.radicalism", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.lgbt", 
                                                    1.0
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$group" : { 
                            "_id" : "$postId", 
                            "radicalism" : { 
                                "$sum" : "$predict.radicalism"
                            }, 
                            "hateful" : { 
                                "$sum" : "$predict.hateful"
                            }, 
                            "porn" : { 
                                "$sum" : "$predict.porn"
                            }, 
                            "lgbt" : { 
                                "$sum" : "$predict.lgbt"
                            }
                        }
                    }
                ], 
                "as" : "rawdata_subComment"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "rawdata_story", 
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
                                            "$postId", 
                                            "$$id"
                                        ]
                                    }, 
                                    { 
                                        "$or" : [
                                            { 
                                                "$eq" : [
                                                    "$predict.hateful", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.porn", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.radicalism", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.lgbt", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.terrorism", 
                                                    1.0
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$group" : { 
                            "_id" : "$postId", 
                            "radicalism" : { 
                                "$sum" : "$predict.radicalism"
                            }, 
                            "hateful" : { 
                                "$sum" : "$predict.hateful"
                            }, 
                            "porn" : { 
                                "$sum" : "$predict.porn"
                            }, 
                            "lgbt" : { 
                                "$sum" : "$predict.lgbt"
                            }, 
                            "terrorism" : { 
                                "$sum" : "$predict.terrorism"
                            }
                        }
                    }
                ], 
                "as" : "rawdata_story"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "rawdata_quote", 
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
                                            "$inQuoteId", 
                                            "$$id"
                                        ]
                                    }, 
                                    { 
                                        "$or" : [
                                            { 
                                                "$eq" : [
                                                    "$predict.hateful", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.porn", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.radicalism", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.lgbt", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$in" : [
                                                    1.0, 
                                                    "$media.predict.hateful"
                                                ]
                                            }, 
                                            { 
                                                "$in" : [
                                                    1.0, 
                                                    "$media.predict.porn"
                                                ]
                                            }, 
                                            { 
                                                "$in" : [
                                                    1.0, 
                                                    "$media.predict.radicalism"
                                                ]
                                            }, 
                                            { 
                                                "$in" : [
                                                    1.0, 
                                                    "$media.predict.lgbt"
                                                ]
                                            }, 
                                            { 
                                                "$in" : [
                                                    1.0, 
                                                    "$media.predict.terrorism"
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$unwind" : { 
                            "path" : "$media", 
                            "preserveNullAndEmptyArrays" : true
                        }
                    }, 
                    { 
                        "$group" : { 
                            "_id" : "$inQuoteId", 
                            "radicalism" : { 
                                "$sum" : "$predict.radicalism"
                            }, 
                            "hateful" : { 
                                "$sum" : "$predict.hateful"
                            }, 
                            "porn" : { 
                                "$sum" : "$predict.porn"
                            }, 
                            "lgbt" : { 
                                "$sum" : "$predict.lgbt"
                            }, 
                            "imgRadicalism" : { 
                                "$sum" : "$media.predict.radicalism"
                            }, 
                            "imgHateful" : { 
                                "$sum" : "$media.predict.hateful"
                            }, 
                            "imgPorn" : { 
                                "$sum" : "$media.predict.porn"
                            }, 
                            "imgLgbt" : { 
                                "$sum" : "$media.predict.lgbt"
                            }, 
                            "imgTerrorism" : { 
                                "$sum" : "$media.predict.terrorism"
                            }
                        }
                    }
                ], 
                "as" : "rawdata_quote"
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "rawdata_reply", 
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
                                            "$inReplyId", 
                                            "$$id"
                                        ]
                                    }, 
                                    { 
                                        "$or" : [
                                            { 
                                                "$eq" : [
                                                    "$predict.hateful", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.porn", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.radicalism", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$eq" : [
                                                    "$predict.lgbt", 
                                                    1.0
                                                ]
                                            }, 
                                            { 
                                                "$in" : [
                                                    1.0, 
                                                    "$media.predict.hateful"
                                                ]
                                            }, 
                                            { 
                                                "$in" : [
                                                    1.0, 
                                                    "$media.predict.porn"
                                                ]
                                            }, 
                                            { 
                                                "$in" : [
                                                    1.0, 
                                                    "$media.predict.radicalism"
                                                ]
                                            }, 
                                            { 
                                                "$in" : [
                                                    1.0, 
                                                    "$media.predict.lgbt"
                                                ]
                                            }, 
                                            { 
                                                "$in" : [
                                                    1.0, 
                                                    "$media.predict.terrorism"
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }, 
                    { 
                        "$unwind" : { 
                            "path" : "$media", 
                            "preserveNullAndEmptyArrays" : true
                        }
                    }, 
                    { 
                        "$group" : { 
                            "_id" : "$inReplyId", 
                            "radicalism" : { 
                                "$sum" : "$predict.radicalism"
                            }, 
                            "hateful" : { 
                                "$sum" : "$predict.hateful"
                            }, 
                            "porn" : { 
                                "$sum" : "$predict.porn"
                            }, 
                            "lgbt" : { 
                                "$sum" : "$predict.lgbt"
                            }, 
                            "imgRadicalism" : { 
                                "$sum" : "$media.predict.radicalism"
                            }, 
                            "imgHateful" : { 
                                "$sum" : "$media.predict.hateful"
                            }, 
                            "imgPorn" : { 
                                "$sum" : "$media.predict.porn"
                            }, 
                            "imgLgbt" : { 
                                "$sum" : "$media.predict.lgbt"
                            }, 
                            "imgTerrorism" : { 
                                "$sum" : "$media.predict.terrorism"
                            }
                        }
                    }
                ], 
                "as" : "rawdata_reply"
            }
        });

        mongo.getAggregateData(dbName, "rawdata", agg, function(result) {
            cb(result);
        });
    }

    static matchTargetUserId(data) {
        let result = [];

        data.forEach(element => {result.push(element.id)});

        return result;
    }

    static matchTarget (data) {
        let result = [];

        data.forEach(element => {
            let obj = {};

            obj["$and"] = [
                {"userId": element.id},
                {"source": element.source},
            ];

            result.push(obj);
        });
        
        return result;
    }

    static advanceFilter (bodyReq, filter) {
        if ("categories" in bodyReq.params && bodyReq.params.categories.length > 0) {

            let length = 0;

            if (!filter.hasOwnProperty("$and")) {
                filter["$and"] = [{"$or": []}];
            } else {
                length = filter["$and"].length                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              ;
                filter["$and"].push({"$or": []});
            }

            if(bodyReq.params.categories.indexOf("radicalism") > -1) {
                filter["$and"][length]["$or"].push({"predict.radicalism": 1});    
                filter["$and"][length]["$or"].push({"media": {"$elemMatch": {"predict.radicalism": 1}}});  
            }

            if(bodyReq.params.categories.indexOf("hateful") > -1) {
                filter["$and"][length]["$or"].push({"predict.hateful": 1});      
                filter["$and"][length]["$or"].push({"media": {"$elemMatch": {"predict.hateful": 1}}});
            }

            if(bodyReq.params.categories.indexOf("porn") > -1) {
                filter["$and"][length]["$or"].push({"predict.porn": 1});
                filter["$and"][length]["$or"].push({"media": {"$elemMatch": {"predict.porn": 1}}});
            }

            if(bodyReq.params.categories.indexOf("terrorism") > -1) {
                filter["$and"][length]["$or"].push({"media": {"$elemMatch": {"predict.terrorism": 1}}});
            }

            if(bodyReq.params.categories.indexOf("lgbt") > -1) {
                filter["$and"][length]["$or"].push({"predict.lgbt": 1});  
                filter["$and"][length]["$or"].push({"media": {"$elemMatch": {"predict.lgbt": 1}}});
            }
            
        }

        return filter;
    }

}

module.exports = AnalyticModel;