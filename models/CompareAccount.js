const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const dbName        = process.env.DB_NAME;

class CompareAccountModel {

    static async getTimeFrame(bodyReq, cb) {
        let agg = [];

        let filter = {
            "dateCreate": {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            }
        }

        filter["userId"] = {"$in": this.matchAccounts(bodyReq.params.userIds)};

        agg.push({
            "$match": filter
        });

        agg.push({
            "$group": {
                "_id" : { 
                    "userId": "$userId",
                    "date": {"$dateToString" : { 
                        "format" : "%Y-%m-%d", 
                        "date" : "$dateCreate"
                    }}
                }, 
                "postCount" : {"$sum" : 1},
                "interaction" : {"$sum" : "$totalInteraction"},
                "engagement" : {"$sum" : "$totalInteraction"},
            }
        });

        agg.push({
            "$project": {
                "_id": 0,
                "userId": "$_id.userId",
                "date": "$_id.date",
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
                "date": {"$addToSet": "$date"},
                "postCount" : {"$push": {
                    "userId": "$userId",
                    "postCount": "$postCount",
                    "date": "$date",
                }},
            }
        });

        mongo.getAggregateData(dbName, "rawdata", agg, function(result) {
            cb(result);
        });
    }

    static async getWordBase(bodyReq, cb) {
        let agg = [];
        let type = parseInt(bodyReq.params.type) === 1 ? "unigram": (parseInt(bodyReq.params.type) === 2 ? "bigram": "trigram");

        let filter = {
            "dateCreate": {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            }
        }

        filter["userId"] = {"$in": this.matchAccounts(bodyReq.params.userIds)};

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
                "userId": 1,
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
                "userId": 1,                
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

        // agg.push({
        //     "$lookup": { 
        //         "from" : "rawdata_namedEntityRecognition", 
        //         "localField" : "_id", 
        //         "foreignField" : "foreignId", 
        //         "as" : "namedEntityRecognition"
        //     }
        // });

        // agg.push({
        //     "$lookup": { 
        //         "from" : "rawdata_posTagging", 
        //         "localField" : "_id", 
        //         "foreignField" : "foreignId", 
        //         "as" : "posTagging"
        //     }
        // });

        // agg.push({
        //     "$unwind": { 
        //         "path" : "$namedEntityRecognition",
        //         "preserveNullAndEmptyArrays" : true
        //     }
        // });

        // agg.push({
        //     "$unwind": { 
        //         "path" : "$posTagging",
        //         "preserveNullAndEmptyArrays" : true
        //     }
        // })

        // agg.push({
        //     "$project": {
        //         "userId": 1,
        //         "word": 1,
        //         "NOUN" : { "$cond" : [ { "$ifNull" : ["$posTagging", false]}, { "$cond": [ {"$in": ["$wordExtract", "$posTagging.PosTagging.NOUN"]}, 1, 0 ] }, 0 ] }, 
        //         "ADV" : { "$cond" : [ { "$ifNull" : ["$posTagging", false]}, { "$cond": [ {"$in": ["$wordExtract", "$posTagging.PosTagging.ADV"]}, 1, 0 ] }, 0 ] },  
        //         "VERB" : { "$cond" : [ { "$ifNull" : ["$posTagging", false]}, { "$cond": [ {"$in": ["$wordExtract", "$posTagging.PosTagging.VERB"]}, 1, 0 ] }, 0 ] },
        //         "B-PER" : { "$cond" : [ { "$ifNull" : ["$namedEntityRecognition", false]}, { "$cond": [ {"$in": ["$wordExtract", "$namedEntityRecognition.NamedEntityRecognition.B-PER"]}, 1, 0 ] }, 0 ] },
        //         "I-PER" : { "$cond" : [ { "$ifNull" : ["$namedEntityRecognition", false]}, { "$cond": [ {"$in": ["$wordExtract", "$namedEntityRecognition.NamedEntityRecognition.I-PER"]}, 1, 0 ] }, 0 ] },
        //         "B-ORG" : { "$cond" : [ { "$ifNull" : ["$namedEntityRecognition", false]}, { "$cond": [ {"$in": ["$wordExtract", "$namedEntityRecognition.NamedEntityRecognition.B-ORG"]}, 1, 0 ] }, 0 ] },
        //         "I-ORG" : { "$cond" : [ { "$ifNull" : ["$namedEntityRecognition", false]}, { "$cond": [ {"$in": ["$wordExtract", "$namedEntityRecognition.NamedEntityRecognition.I-ORG"]}, 1, 0 ] }, 0 ] },
        //         "B-LOC" : { "$cond" : [ { "$ifNull" : ["$namedEntityRecognition", false]}, { "$cond": [ {"$in": ["$wordExtract", "$namedEntityRecognition.NamedEntityRecognition.B-LOC"]}, 1, 0 ] }, 0 ] },
        //         "I-LOC" : { "$cond" : [ { "$ifNull" : ["$namedEntityRecognition", false]}, { "$cond": [ {"$in": ["$wordExtract", "$namedEntityRecognition.NamedEntityRecognition.I-LOC"]}, 1, 0 ] }, 0 ] },
        //         "B-DAT" : { "$cond" : [ { "$ifNull" : ["$namedEntityRecognition", false]}, { "$cond": [ {"$in": ["$wordExtract", "$namedEntityRecognition.NamedEntityRecognition.B-DAT"]}, 1, 0 ] }, 0 ] },
        //         "I-DAT" : { "$cond" : [ { "$ifNull" : ["$namedEntityRecognition", false]}, { "$cond": [ {"$in": ["$wordExtract", "$namedEntityRecognition.NamedEntityRecognition.I-DAT"]}, 1, 0 ] }, 0 ] },
        //         "B-TIM" : { "$cond" : [ { "$ifNull" : ["$namedEntityRecognition", false]}, { "$cond": [ {"$in": ["$wordExtract", "$namedEntityRecognition.NamedEntityRecognition.B-TIM"]}, 1, 0 ] }, 0 ] },
        //         "I-TIM" : { "$cond" : [ { "$ifNull" : ["$namedEntityRecognition", false]}, { "$cond": [ {"$in": ["$wordExtract", "$namedEntityRecognition.NamedEntityRecognition.I-TIM"]}, 1, 0 ] }, 0 ] },
                
        //     }
        // });

        if("filter" in bodyReq.params){
            if("ner" in bodyReq.params.filter){
                let matchNer = {
                    "$or": []
                };
                
                if(bodyReq.params.filter.ner.indexOf("person") > -1){
                    matchNer["$or"].push({"B-PER" : 1});
                    matchNer["$or"].push({"I-PER" : 1});
                } 

                if(bodyReq.params.filter.ner.indexOf("organization") > -1){
                    matchNer["$or"].push({"B-ORG" : 1});
                    matchNer["$or"].push({"I-ORG" : 1});
                }

                if(bodyReq.params.filter.ner.indexOf("location") > -1){
                    matchNer["$or"].push({"B-LOC" : 1});
                    matchNer["$or"].push({"I-LOC" : 1});
                }

                if(bodyReq.params.filter.ner.indexOf("date") > -1){
                    matchNer["$or"].push({"B-DAT" : 1});
                    matchNer["$or"].push({"I-DAT" : 1});
                }

                if(bodyReq.params.filter.ner.indexOf("time") > -1){
                    matchNer["$or"].push({"B-TIM" : 1});
                    matchNer["$or"].push({"I-TIM" : 1});
                }

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
                            }, 
                            {
                                "$match" : matchNer
                            }
                        ], 
                        "as" : "namedEntityRecognition"
                    }
                });

                agg.push({ 
                    "$unwind" : { 
                        "path" : "$namedEntityRecognition",
                        "preserveNullAndEmptyArrays" : true
                    }
                });
            } 
            
            if("postag" in bodyReq.params.filter){
                let matchPosTag = {
                    "$or": []
                };

                if(bodyReq.params.filter.postag.indexOf("verb") > -1) matchPosTag["$or"].push({"VERB" : 1});
                if(bodyReq.params.filter.postag.indexOf("adverb") > -1) matchPosTag["$or"].push({"ADV" : 1});
                if(bodyReq.params.filter.postag.indexOf("noun") > -1) matchPosTag["$or"].push({"NOUN" : 1});

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
                                    "NOUN" : {"$cond" : { "if" : { "$in" : ["$$word", "$PosTagging.NOUN"]}, "then" : 1, "else" : 0}}, 
                                    "ADV" : {"$cond" : { "if" : { "$in" : ["$$word", "$PosTagging.ADV"]}, "then" : 1, "else" : 0}}, 
                                    "VERB" : { "$cond" : { "if" : { "$in" : ["$$word", "$PosTagging.VERB"]}, "then" : 1, "else" : 0}}
                                }
                            }, 
                            {
                                "$match" : matchPosTag
                            }, 
                            {
                                "$project" : { 
                                    _id: 1
                                }
                            }, 
                        ], 
                        "as" : "posTagging"
                    }
                }); 

                agg.push({ 
                    "$unwind" : { 
                        "path" : "$posTagging",
                        "preserveNullAndEmptyArrays" : true
                    }
                });
            }

            agg.push({ 
                "$match" : { 
                    "$or": [
                        {"namedEntityRecognition": {"$exists": true}},
                        {"posTagging": {"$exists": true}}
                    ]
                }
            });
        }

        agg.push({ 
            "$group" : { 
                "_id" : {"_id": "$_id", "word": "$word"},
                "userId": {"$first": "$userId"}
            }
        });

        agg.push({
            "$group": {
                "_id" : "$_id.word", 
                "userId": {"$addToSet": "$userId"},
                "weight" : {"$sum" : 1},
            }
        });

        agg.push({
            "$project": {
                "_id" : 0, 
                "userId": 1,
                "name" : "$_id",
                "weight" : 1,
            }
        });

        agg.push({ 
            "$sort" : { 
                "weight" : -1
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

    static async getFriendBase(bodyReq, cb) {
        let agg = [];

        let filter = {};

        if ("dateFrom" in bodyReq.params && "dateUntil" in bodyReq.params) {
            filter["dateCreate"] = {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            }
        }

        filter["$and"] = [
            {"userId": {"$in": this.matchAccounts(bodyReq.params.userIds)}},
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

    static matchAccounts (data) {
        let result = [];

        data.forEach(element => {
            element.forEach(item => {result.push(item)});
        });
        
        return result;
    }
}

module.exports = CompareAccountModel;