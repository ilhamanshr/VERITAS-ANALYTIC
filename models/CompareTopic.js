const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const dbName        = process.env.DB_NAME;

class CompareAccountModel {

    static async getTopicList(bodyReq, data, cb) {
        let agg = [];

        let filter = {}

        if ("dateFrom" in bodyReq.params && "dateUntil" in  bodyReq.params) {
            filter["dateCreate"] = {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            }
        }

        filter["$or"] = this.matchTarget(data);
        
        agg.push({
            "$match": filter
        });

        agg.push({
            "$lookup" : { 
                "from" : "rawdata_keywordExtraction", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "keywordExtraction"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$keywordExtraction",
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$keywordExtraction.keywords",
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$keywordExtraction.keywords",
            }
        });

        agg.push({
            "$sort": {
                "_id": 1
            }
        });

        if("search" in bodyReq.params){
            agg.push({ 
                "$match" : { 
                    "_id" : {$regex: new RegExp('.*' + bodyReq.params.search + '.*', 'i')}
                }
            });
        }

        agg.push({
            "$skip": bodyReq.params.offset
        });

        agg.push({
            "$limit": parseInt(bodyReq.params.limit)
        });

        agg.push({ 
            "$group" : { 
                "_id" : null,
                "word": {"$push": "$_id"}
            }
        });

        mongo.getAggregateData(dbName, "rawdata", agg, function(result) {
            cb(result);
        });
    }

    static async getSummary(bodyReq, data, cb) {
        let agg = this.matchTopic(bodyReq, data);

        agg.push({ 
            "$group" : { 
                "_id" : null,
                "totalPost": {"$sum": "$totalPost"},
                "totalAccount": {"$sum": 1},
                "radicalism": {"$sum": "$radicalism"},
                "hateful": {"$sum": "$hateful"},
                "lgbt": {"$sum": "$lgbt"},
                "porn": {"$sum": "$porn"},
                "terrorism": {"$sum": "$terrorism"},
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : 0
            }
        });

        mongo.getAggregateData(dbName, "rawdata", agg, function(result) {
            cb(result);
        });
    }

    static async getTopAccount(bodyReq, data, cb) {
        let agg = this.matchTopic(bodyReq, data);

        agg.push({ 
            "$sort" : { 
                "totalPost": -1
            }
        });

        agg.push({ 
            "$limit" : parseInt(bodyReq.params.limit)
        });

        agg.push({
            "$lookup" : { 
                "from" : "analyzer", 
                "let": {"userId": "$_id.userId", "source": "$_id.source"},
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
                "_id": 0,
                "userId": "$_id.userId",
                "source": "$_id.source",
                "username": "$profile.username",
                "name": "$profile.name",
                "profilePic": "$profile.profilePic",
                "isPrivate": "$profile.isPrivate",
                "isVerified": "$profile.isVerified",
                "totalPost": "$totalPost",
                "radicalism" : "$radicalism",
                "hateful" : "$hateful",
                "porn" : "$porn",
                "lgbt" : "$lgbt",
                "terrorism" : "$terrorism",
            }
        });

        mongo.getAggregateData(dbName, "rawdata", agg, function(result) {
            cb(result);
        });
    }

    static async getWordCloud(bodyReq, data, cb) {
        let agg = this.matchTopic(bodyReq, data);
        let type = parseInt(bodyReq.params.type) === 1 ? "unigram": (parseInt(bodyReq.params.type) === 2 ? "bigram": "trigram");

        agg.splice(-3);

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
            "$match" : { 
                "word": {"$ne": bodyReq.params.topic.toLowerCase()}
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
                "$limit" : parseInt(bodyReq.params.limit)
            }
        );

        mongo.getAggregateData(dbName, "rawdata", agg, function(result) {
            cb(result);
        });
    }

    static async getTimeFrame(bodyReq, data, cb) {
        let agg = this.matchTopic(bodyReq, data);

        agg.splice(-3);

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

    static matchTopic (bodyReq, data) {
        let agg = [];

        let filter = {}

        if ("dateFrom" in bodyReq.params && "dateUntil" in  bodyReq.params) {
            filter["dateCreate"] = {
                "$gte": moment(bodyReq.params.dateFrom).utc(true).toDate(),
                "$lte": moment(bodyReq.params.dateUntil).utc(true).toDate()
            }
        }

        filter["$or"] = this.matchTarget(data);
        
        agg.push({
            "$match": filter
        });

        agg.push({
            "$lookup" : { 
                "from" : "rawdata_keywordExtraction", 
                "localField" : "_id", 
                "foreignField" : "foreignId", 
                "as" : "keywordExtraction"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$keywordExtraction",
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$keywordExtraction.keywords",
            }
        });

        agg.push({ 
            "$match" : { 
                "keywordExtraction.keywords": bodyReq.params.topic.toLowerCase()
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$media",
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$_id",
                "userId": {"$first": "$userId"},
                "source": {"$first": "$source"},
                "radicalismText": {"$sum":{"$cond":[{"$eq":["$predict.radicalism", 1]},1,0]}},
                "hatefulText": {"$sum":{"$cond":[{"$eq":["$predict.hateful", 1]},1,0]}},
                "lgbtText": {"$sum":{"$cond":[{"$eq":["$predict.lgbt", 1]},1,0]}},
                "pornText": {"$sum":{"$cond":[{"$eq":["$predict.porn", 1]},1,0]}},
                "radicalismImage": {"$sum":{"$cond":[{"$eq":["$media.predict.radicalism", 1]},1,0]}},
                "hatefulImage": {"$sum":{"$cond":[{"$eq":["$media.predict.hateful", 1]},1,0]}},
                "lgbtImage": {"$sum":{"$cond":[{"$eq":["$media.predict.lgbt", 1]},1,0]}},
                "pornImage": {"$sum":{"$cond":[{"$eq":["$media.predict.porn", 1]},1,0]}},
                "terrorismImage": {"$sum":{"$cond":[{"$eq":["$media.predict.terrorism", 1]},1,0]}},
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : {
                    "userId": "$userId",
                    "source": "$source",
                },
                "totalPost": {"$sum": 1},
                "radicalism": {"$sum":{"$cond":[{"$or": [{"$gte":["$radicalismText", 1]}, {"$gte":["$radicalismImage", 1]}]},1,0]}},
                "hateful": {"$sum":{"$cond":[{"$or": [{"$gte":["$hatefulText", 1]}, {"$gte":["$hatefulImage", 1]}]},1,0]}},
                "lgbt": {"$sum":{"$cond":[{"$or": [{"$gte":["$lgbtText", 1]}, {"$gte":["$lgbtImage", 1]}]},1,0]}},
                "porn": {"$sum":{"$cond":[{"$or": [{"$gte":["$pornText", 1]}, {"$gte":["$pornImage", 1]}]},1,0]}},
                "terrorism": {"$sum":{"$cond":[{"$gte":["$terrorismImage", 1]},1,0]}},
            }
        });

        return agg;
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
     
}

module.exports = CompareAccountModel;