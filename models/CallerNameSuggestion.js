const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const dbName        = process.env.DB_NAME;

class CallerNameSuggestionModel {

    static async getPeopleKnowThisAccount(bodyReq, cb) {
        let agg = [];

        agg.push({ 
            "$match" : { 
                "msisdn" : { 
                    "$in" : bodyReq.params.msisdns
                }
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$result"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$result.terms", 
                "weight" : { 
                    "$sum" : "$result.freq"
                },
            }
        });

        agg.push({ 
            "$project" : { 
                "_id" : 0, 
                "name" : "$_id",
                "weight" : "$weight",
            }
        });

        agg.push({ 
            "$sort" : { 
                "weight" : -1,
            }
        });

        mongo.getAggregateData(dbName, "caller_name_suggestion", agg, function(result) {
            cb(result);
        });
    };

    static async getPeopleKnowThisAccountOld(bodyReq, cb) {
        let agg = [];

        agg.push({ 
            "$match" : { 
                "msisdn" : { 
                    "$in" : bodyReq.params.msisdns
                }
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$result"
            }
        });

        agg.push({ 
            "$project" : { 
                "term1" : { 
                    "$concat" : [
                        { 
                            "$arrayElemAt" : [
                                { 
                                    "$split" : [
                                        "$result.terms", 
                                        " "
                                    ]
                                }, 
                                0.0
                            ]
                        }, 
                        " ", 
                        { 
                            "$arrayElemAt" : [
                                { 
                                    "$split" : [
                                        "$result.terms", 
                                        " "
                                    ]
                                }, 
                                1.0
                            ]
                        }
                    ]
                }, 
                "term2" : { 
                    "$concat" : [
                        { 
                            "$arrayElemAt" : [
                                { 
                                    "$split" : [
                                        "$result.terms", 
                                        " "
                                    ]
                                }, 
                                1.0
                            ]
                        }, 
                        " ", 
                        { 
                            "$arrayElemAt" : [
                                { 
                                    "$split" : [
                                        "$result.terms", 
                                        " "
                                    ]
                                }, 
                                2.0
                            ]
                        }
                    ]
                }, 
                "_id" : 0.0
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : null, 
                "terms1" : { 
                    "$push" : "$term1"
                }, 
                "terms2" : { 
                    "$push" : "$term2"
                }
            }
        });

        agg.push({ 
            "$project" : { 
                "terms" : { 
                    "$concatArrays" : [
                        "$terms1", 
                        "$terms2"
                    ]
                }, 
                "_id" : 0.0
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$terms"
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$terms", 
                "count" : { 
                    "$sum" : 1.0
                }
            }
        });

        agg.push({
            "$match" : {
                "_id": {
                    "$ne":null
                }
            }
        })

        mongo.getAggregateData(dbName, "caller_name_suggestion", agg, function(result) {
            cb(result);
        });
    }

}

module.exports = CallerNameSuggestionModel;