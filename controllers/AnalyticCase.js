const path              = require('path');
const BASE_DIR          = path.dirname(require.main.filename);
const utils             = require(BASE_DIR + '/Utils');
const msg               = require(BASE_DIR + '/Messages');
const modelInfo         = require(BASE_DIR + '/models/case/Info');
const modelAnalytic     = require(BASE_DIR + '/models/target/Analytic');
const modelCaseAnalytic = require(BASE_DIR + '/models/case/Analytic');
const modelScoring      = require(BASE_DIR + '/models/Scoring');

class AnalyticCaseController {

    static async getTendenciesCaseAnalytic(req, res){
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticCase", "subAction": "getTendenciesCaseAnalytic", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": {"caseId":"JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1", "folderId":"rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq"} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["caseId", "folderId"];

        utils.checkParameter(req, res, required, function() {

            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) {
                    modelAnalytic.getTendenciesAnalysis(req.body, resInfo, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                        if(resAnalytic && resAnalytic.length > 0){
                            let countRad = 0;
                            let countHateful = 0;
                            let countPorn = 0;
                            let countTerrorism = 0;
                                let countLgbt = 0;

                            //post count
                            resAnalytic.forEach(element => {
                                countRad += element.predict.radicalism
                                countHateful += element.predict.hateful
                                countPorn += element.predict.porn
                                countLgbt += element.predict.lgbt
                                
                                //comment count
                                element.rawdata_comment.forEach(element => {
                                    countRad += element.radicalism
                                    countHateful += element.hateful
                                    countPorn += element.porn
                                    countLgbt += element.lgbt
                                });

                                //sub comment count
                                element.rawdata_subComment.forEach(element => {
                                    countRad += element.radicalism
                                    countHateful += element.hateful
                                    countPorn += element.porn
                                    countLgbt += element.lgbt
                                });

                                //story count
                                element.rawdata_story.forEach(element => {
                                    countRad += element.radicalism
                                    countHateful += element.hateful
                                    countPorn += element.porn
                                    countTerrorism += element.terrorism
                                    countLgbt += element.lgbt
                                });

                                //quote count
                                element.rawdata_quote.forEach(element => {
                                    countRad += element.radicalism
                                    countRad += element.imgRadicalism
                                    countHateful += element.hateful
                                    countHateful += element.imgHateful
                                    countPorn += element.porn
                                    countPorn += element.imgPorn
                                    countTerrorism += element.imgTerrorism
                                    countLgbt += element.lgbt
                                    countLgbt += element.imgLgbt
                                });

                                //reply count
                                element.rawdata_reply.forEach(element => {
                                    countRad += element.radicalism
                                    countRad += element.imgRadicalism
                                    countHateful += element.hateful
                                    countHateful += element.imgHateful
                                    countPorn += element.porn
                                    countPorn += element.imgPorn
                                    countTerrorism += element.imgTerrorism
                                    countLgbt += element.lgbt
                                    countLgbt += element.imgLgbt
                                });
                            });

                            let content = {
                                "series" : [{"name":"Predict Count", "data":[countRad,countHateful,countPorn,countTerrorism,countLgbt]}],
                                "categories": ["Radicalism","Hateful","Porn","Terorism","LGBT"]
                            };

                            response["message"] = "Get data tendencies analytic success";
                            response["content"] = content;
                            
                            utils.setResponse(req, res, response);
                        } else{
                            response["message"] = "Case tendencies analytic not valid";
                            utils.setResponse(req, res, response);
                        }
                    });
                } else {
                    response["message"] = "Case tendencies analytic not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getScoringCaseAnalytic(req, res) {
        //curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticCase", "subAction": "getScoringCaseAnalytic", "username": "admin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "caseId":"JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1", "folderId":"rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq" } }'
        
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["caseId", "folderId"];

        utils.checkParameter(req, res, required, function() {
            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
            
            modelInfo.caseTargetMember(req.body, function(resTarget){
                if(resTarget && resTarget.length > 0){
                    let userId = [];
                    resTarget.forEach(element => {
                        userId.push(element.id);
                    });
                    req.body.params["userId"] = userId;
                    
                    modelScoring.getScoringTarget(req.body, function(result) {
                        response["message"] = (result && Object.keys(result).length > 0) ? "Categorization scoring success" : "Categorization scoring is still in progress";
        
                        if(result){
                            response["content"]["scoring"] = {
                                "Radicalism":result.Radicalism,
                                "Hateful":result.Hateful,
                                "Porn":result.Porn,
                                "Terrorism":result.Terrorism,
                                "LGBT":result.LGBT,
                            };
        
                            response["content"]["tooltip"] = {
                                "Radicalism" : {
                                    "textScoring" : result.RadicalismtextScoring, 
                                    "imgScoring" : result.RadicalismimgScoring, 
                                    "daily" : result.RadicalismdailyPostScoring,
                                    "interaction" : result.RadicalisminteractionScoring
                                }, 
                                "Hateful" : {
                                    "textScoring" : result.HatefultextScoring, 
                                    "imgScoring" : result.HatefulimgScoring, 
                                    "daily" : result.HatefuldailyPostScoring,
                                    "interaction" : result.HatefulinteractionScoring
                                }, 
                                "Porn" : {
                                    "textScoring" : result.PorntextScoring, 
                                    "imgScoring" : result.PornimgScoring, 
                                    "daily" : result.PorndailyPostScoring,
                                    "interaction" : result.PorninteractionScoring
                                }, 
                                "Terrorism" : {
                                    "textScoring" : result.TerrorismtextScoring, 
                                    "imgScoring" : result.TerrorismimgScoring, 
                                    "daily" : result.TerrorismdailyPostScoring,
                                    "interaction" : result.TerrorisminteractionScoring
                                }, 
                                "LGBT" : {
                                    "textScoring" : result.LGBTtextScoring,
                                    "imgScoring" : result.LGBTimgScoring,
                                    "daily" : result.LGBTdailyPostScoring,
                                    "interaction" : result.LGBTinteractionScoring
                                }
                            }

                            response["content"]["reason"] = result.Reason;
                        } else{
                            response["content"] = null;
                        }
                        utils.setResponse(req, res, response);
                    });
                } else{
                    response["content"] = null;
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getTimeFrame(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticCase", "subAction": "getTimeFrame", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "folderId": "rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq", "caseId": "JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1", "dateFrom": "2010-01-01", "dateUntil": "2021-12-31"} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["folderId", "caseId", "dateFrom", "dateUntil"];

        utils.checkParameter(req, res, required, function() {

            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) {
                    modelAnalytic.getTimeFrame(req.body, resInfo, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                        
                        let content = {
                            "categories": [],
                            "forecast": false,
                            "series": [
                                {"name": "Post Count", "data": []},
                                {"name": "Interaction Count", "data": []},
                                {"name": "Engagement Rate Count", "data": []},
                            ]
                        };

                        if (resAnalytic && resAnalytic.length > 0) {
                            content["categories"] = resAnalytic[0].date;
                            content["series"][0]["data"] = resAnalytic[0].postCount;
                            content["series"][1]["data"] = resAnalytic[0].interaction;
                            content["series"][2]["data"] = resAnalytic[0].engagement;
                            response["message"] = "Get data time frame success";
                        } else {
                            response["message"] = "Data time frame not available";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getContentDistribution(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticCase", "subAction": "getContentDistribution", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "folderId": "rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq", "caseId": "JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1",  "dateFrom": "2010-01-01", "dateUntil": "2021-12-31"} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["folderId", "caseId", "dateFrom", "dateUntil"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelAnalytic.getContentDistribution(req.body, resInfo, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                        let content = {
                            "categories": [],
                            "series": [
                                {"name": "Safe Count", "data": []},
                                {"name": "Negative Count", "data": []},
                            ]
                        };

                        if (resAnalytic && resAnalytic.length > 0) {
                            content["categories"] = resAnalytic[0].date;
                            content["series"][0]["data"] = resAnalytic[0].positive;
                            content["series"][1]["data"] = resAnalytic[0].negative;
                            response["message"] = "Get data content distribution success";
                        } else {
                            response["message"] = "Data content distribution not available";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getWordCloud(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticCase", "subAction": "getWordCloud", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "folderId": "rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq", "caseId": "JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1", "dateFrom": "2010-01-01", "dateUntil": "2021-12-31", "type": 1, "limit": 200, "filter": {"postag": ["verb"]}} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["folderId", "caseId", "dateFrom", "dateUntil", "type", "limit"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelAnalytic.getWordBase(req.body, resInfo, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                        let content = []

                        if (resAnalytic && resAnalytic.length > 0) {
                            response["message"] = "Get data word cloud success";
                            content = resAnalytic;
                        } else {
                            response["message"] = "Data word cloud not available";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getWordLink(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticCase", "subAction": "getWordLink", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "folderId": "rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq", "caseId": "JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1", "dateFrom": "2010-01-01", "dateUntil": "2021-12-31", "type": 2, "limit": 15, "filter": {"postag": ["verb"]}} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["folderId", "caseId", "dateFrom", "dateUntil", "type", "limit"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelAnalytic.getWordBase(req.body, resInfo, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                        let content = [
                            {
                                "data": [],
                                "type": 'dependencywheel',
                                "name": 'Total Words'
                            }
                        ];
                        
                        if (resAnalytic && resAnalytic.length > 0) {
                            resAnalytic.forEach(element => {
                                let word = element.name.split(" ");
                                
                                if (req.body.params.type === 2) {
                                    content[0]["data"].push({
                                        "from": word[0],
                                        "to": word[1],
                                        "weight": element.weight,
                                    });
                                } 

                                if (req.body.params.type === 3) {
                                    if (content[0]["data"].length < req.body.params.limit) content[0]["data"].push({"from": word[0], "to": word[1], "weight": element.weight});
                                    if (content[0]["data"].length < req.body.params.limit) content[0]["data"].push({"from": word[0], "to": word[2], "weight": element.weight});
                                }

                            });
                            
                            response["message"] = "Get data word link success";
                        } else {
                            response["message"] = "Data word link not available";
                        }
                        
                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getTargetDistribution(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticCase", "subAction": "getTargetDistribution", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "folderId": "rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq", "caseId": "JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1"} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["folderId", "caseId"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelCaseAnalytic.getCaseScoring(req.body, resInfo, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                        
                        let content = [
                            {
                                "data": []
                            }
                        ]

                        if (resAnalytic && resAnalytic.length > 0) {
                            resAnalytic.forEach(element => {
                                content[0]["data"].push({
                                    "x": parseFloat(element.totalScore.toFixed(2)),
                                    "y": element.totalInteraction,
                                    "z": element.totalPost,
                                    "name": element.targetName,
                                })
                            });
                            response["message"] = "Get data target distribution success";
                        } else {
                            response["message"] = "Data target distribution not available";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getTargetRelation(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "AnalyticCase", "subAction": "getTargetRelation", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": { "folderId": "rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq", "caseId": "JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1", "limit": 10} }'

        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["folderId", "caseId", "limit"];

        utils.checkParameter(req, res, required, function() {
            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) { 
                    modelAnalytic.getFriendBaseAnalysis(req.body, resInfo, function(resAnalytic) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                        let content = [
                            {
                                "data": [],
                                "type": 'dependencywheel',
                                "name": 'Total Interactions'
                            }
                        ]

                        if (resAnalytic && resAnalytic.length > 0) {

                            resAnalytic.forEach(element => {
                                let filteredFrom = [];
                                let filteredTo = [];

                                resInfo.forEach(item => {
                                    if (item.username === element.username && item.source === element.source) {
                                        filteredFrom.push(item);
                                    }
                                });

                                resInfo.forEach(item => {
                                    if (item.username === element.friendUsername && item.source === element.source) {
                                        filteredTo.push(item);
                                    }
                                });

                                if (filteredFrom.length > 0 && filteredTo.length > 0) {
                                    filteredFrom.forEach(itemFrom => {
                                        filteredTo.forEach(itemTo => {
                                            if (itemFrom.targetId !== itemTo.targetId && itemFrom.username !== itemTo.username) {
                                                if (content[0]["data"].length < req.body.params.limit) {
                                                    content[0]["data"].push({
                                                        "from": `${itemFrom.username} [${itemFrom.targetName}]`,
                                                        "to": `${itemTo.username} [${itemTo.targetName}]`,
                                                        "weight": element.total,
                                                        "tooltip": {
                                                            "source": element.source, 
                                                            "like": element.like, 
                                                            "comment": element.comment, 
                                                            "favorite": element.favorite,
                                                            "retweet": element.retweet,
                                                            "quote": element.quote,
                                                            "reply": element.reply,
                                                        }
                                                    });
                                                }
                                            }
                                        });
                                    });
                                }
                            });
                            if (content[0]["data"].length > 0) {
                                response["message"] = "Get data target relation success";
                            } else {
                                response["message"] = "There is no one of target have relation";
                            }
                        } else {
                            response["message"] = "There is no one of target have relation";
                        }

                        response["content"] = content;
                        
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Target social media not valid";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }
}

module.exports = AnalyticCaseController;