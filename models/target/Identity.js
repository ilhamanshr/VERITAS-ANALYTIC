const moment        = require('moment');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const mongo 	    = require(BASE_DIR + '/libraries/MongoDriver');
const utils         = require(BASE_DIR + '/Utils');
const dbName        = process.env.DB_NAME;

class IndentityModel {
    static async getNikList(reqBody, cb){
        let agg = [];
        
        agg.push({ 
            "$match" : { 
                "targetId" : reqBody.params.targetId
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "msisdn_to_nik", 
                "localField" : "msisdn", 
                "foreignField" : "msisdn", 
                "as" : "dataNik"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$dataNik", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$dataNik.nik"
            }
        });

        mongo.getAggregateData(dbName, "target_msisdn", agg, function(result) {
            cb(result);
        });
    }

    static async getIdentityDetail(reqBody, cb){
        let agg = [];

        agg.push({ 
            "$match" : { 
                "targetId" : reqBody.params.targetId
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "msisdn_to_nik", 
                "localField" : "msisdn", 
                "foreignField" : "msisdn", 
                "as" : "dataNik"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$dataNik", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$lookup" : { 
                "from" : "nik_detail", 
                "let" : { 
                    "id" : reqBody.params.nik
                }, 
                "pipeline" : [
                    { 
                        "$match" : { 
                            "$expr" : { 
                                "$eq" : [
                                    "$nik", 
                                    "$$id"
                                ]
                            }
                        }
                    }, 
                    { 
                        "$lookup" : { 
                            "from" : "kk_detail", 
                            "let" : { 
                                "id" : "$family_id"
                            }, 
                            "pipeline" : [
                                { 
                                    "$match" : { 
                                        "$expr" : { 
                                            "$eq" : [
                                                "$NO_KK", 
                                                "$$id"
                                            ]
                                        }
                                    }
                                }
                            ], 
                            "as" : "detailKk"
                        }
                    }
                ], 
                "as" : "detailIdentity"
            }
        });

        agg.push({ 
            "$unwind" : { 
                "path" : "$detailIdentity", 
                "preserveNullAndEmptyArrays" : true
            }
        });

        agg.push({ 
            "$group" : { 
                "_id" : "$detailIdentity._id", 
                "family_id" : { 
                    "$first" : "$detailIdentity.family_id"
                }, 
                "name" : { 
                    "$first" : "$detailIdentity.name"
                }, 
                "birth_place" : { 
                    "$first" : "$detailIdentity.birth_place"
                }, 
                "birth_date" : { 
                    "$first" : "$detailIdentity.birth_date"
                }, 
                "gender" : { 
                    "$first" : "$detailIdentity.gender"
                }, 
                "religion" : { 
                    "$first" : "$detailIdentity.religion"
                }, 
                "marital_status" : { 
                    "$first" : "$detailIdentity.marital_status"
                }, 
                "family_status" : { 
                    "$first" : "$detailIdentity.family_status"
                }, 
                "education" : { 
                    "$first" : "$detailIdentity.education"
                }, 
                "occupation" : { 
                    "$first" : "$detailIdentity.occupation"
                }, 
                "mothers_name" : { 
                    "$first" : "$detailIdentity.mothers_name"
                }, 
                "fathers_name" : { 
                    "$first" : "$detailIdentity.fathers_name"
                }, 
                "address" : { 
                    "$first" : "$detailIdentity.address"
                }, 
                "address_rt" : { 
                    "$first" : "$detailIdentity.address_rt"
                }, 
                "address_rw" : { 
                    "$first" : "$detailIdentity.address_rw"
                }, 
                "address_zipcode" : { 
                    "$first" : "$detailIdentity.address_zipcode"
                }, 
                "address_province" : { 
                    "$first" : "$detailIdentity.address_province"
                }, 
                "address_district" : { 
                    "$first" : "$detailIdentity.address_district"
                }, 
                "address_sub_district" : { 
                    "$first" : "$detailIdentity.address_sub_district"
                }, 
                "address_urban_village" : { 
                    "$first" : "$detailIdentity.address_urban_village"
                }, 
                "photo" : { 
                    "$first" : "$detailIdentity.photo"
                }, 
                "detailKk" : { 
                    "$first" : "$detailIdentity.detailKk"
                }
            }
        });

        mongo.getAggregateData(dbName, "target_msisdn", agg, function(result) {
            cb(result);
        });
    }
}

module.exports = IndentityModel;