const path              = require('path');
const BASE_DIR          = path.dirname(require.main.filename);
const utils             = require(BASE_DIR + '/Utils');
const msg               = require(BASE_DIR + '/Messages');
const model             = require(BASE_DIR + '/models/CompareTopic');
const modelInfo         = require(BASE_DIR + '/models/case/Info');

class CompareTopicController {

    static async getTopicList(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "CompareTopic", "subAction": "getTopicList", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": {"caseId":"JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1", "folderId":"rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq", "dateFrom": "2010-01-01", "dateUntil": "2022-01-31", "offset": 0, "limit": 5, "search": "ma"} }'
        
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["caseId", "folderId", "offset", "limit"];
        let content = [];

        utils.checkParameter(req, res, required, function() {
            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) {
                    model.getTopicList(req.body, resInfo, function(resCompare) {
                        if (resCompare && resCompare.length > 0) {
                            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                            content = resCompare[0].word;
                            response["message"] = "Get topic list success";
                        } else {
                            response["message"] = "Failed get topic";
                        }

                        response["content"] = content;
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Social media account not valid, please check your account.";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getSummary(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "CompareTopic", "subAction": "getSummary", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": {"caseId":"JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1", "folderId":"rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq", "dateFrom": "2010-01-01", "dateUntil": "2022-01-31", "topic": "indonesia"} }'
        
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["caseId", "folderId", "dateFrom", "dateUntil", "topic"];
        let content = {};

        utils.checkParameter(req, res, required, function() {
            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) {
                    model.getSummary(req.body, resInfo, function(resCompare) {
                        if (resCompare && resCompare.length > 0) {
                            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                            content = resCompare[0];
                            response["message"] = "Get summary success";
                        } else {
                            response["message"] = "Failed get summary";
                        }

                        response["content"] = content;
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Social media account not valid, please check your account.";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getTopAccount(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "CompareTopic", "subAction": "getTopAccount", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": {"caseId":"JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1", "folderId":"rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq", "dateFrom": "2010-01-01", "dateUntil": "2022-01-31", "topic": "indonesia", "limit": 5} }'
        
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["caseId", "folderId", "dateFrom", "dateUntil", "topic", "limit"];
        let content = [];

        utils.checkParameter(req, res, required, function() {
            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) {
                    model.getTopAccount(req.body, resInfo, function(resCompare) {
                        if (resCompare && resCompare.length > 0) {
                            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                            content = resCompare;
                            response["message"] = "Get top account success";
                        } else {
                            response["message"] = "Failed get top account";
                        }

                        response["content"] = content;
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Social media account not valid, please check your account.";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getWordCloud(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "CompareTopic", "subAction": "getWordCloud", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": {"caseId":"JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1", "folderId":"rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq", "dateFrom": "2010-01-01", "dateUntil": "2022-01-31", "topic": "indonesia", "limit": 100, "type": 1} }'
        
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["caseId", "folderId", "dateFrom", "dateUntil", "topic", "limit", "type"];
        let content = [];

        utils.checkParameter(req, res, required, function() {
            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) {
                    model.getWordCloud(req.body, resInfo, function(resCompare) {
                        response = utils.duplicateObject(msg.SUCCESS_RESPONSE);
                        if (resCompare && resCompare.length > 0) {
                            content = resCompare;
                            response["message"] = "Get word cloud success";
                        } else {
                            response["message"] = "word cloud data not available";
                        }

                        response["content"] = content;
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Social media account not valid, please check your account.";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static async getTimeFrame(req, res) {
        // curl -k http://localhost:30356/api -X POST -H "Content-Type: application/json" --data-raw '{ "action": "CompareTopic", "subAction": "getTimeFrame", "username": "ukin", "userAgent": "Sample user agent", "clientIp": "127.0.0.1", "params": {"caseId":"JcRbTgVtOWWVrWzwBLJDYwfxPQMfDCu1", "folderId":"rFCtKxuYZRQmxCLcpEp5Uv3wi4E3E4Mq", "dateFrom": "2010-01-01", "dateUntil": "2022-01-31", "topic": "indonesia"} }'
        
        let response = utils.duplicateObject(msg.ERR_RESPONSE);
        let required = ["caseId", "folderId", "dateFrom", "dateUntil", "topic"];
        let content = {
            "categories": [],
            "forecast": false,
            "series": [
                {"name": "Post Count", "data": []},
                {"name": "Interaction Count", "data": []},
                {"name": "Engagement Rate Count", "data": []},
            ]
        };

        utils.checkParameter(req, res, required, function() {
            modelInfo.caseTargetMember(req.body, function(resInfo) {
                if (resInfo && resInfo.length > 0) {
                    model.getTimeFrame(req.body, resInfo, function(resCompare) {
                        if (resCompare && resCompare.length > 0) {
                            response = utils.duplicateObject(msg.SUCCESS_RESPONSE);

                            content["categories"] = resCompare[0].date;
                            content["series"][0]["data"] = resCompare[0].postCount;
                            content["series"][1]["data"] = resCompare[0].interaction;
                            content["series"][2]["data"] = resCompare[0].engagement;

                            response["message"] = "Get time frame success";
                        } else {
                            response["message"] = "Failed time frame cloud";
                        }

                        response["content"] = content;
                        utils.setResponse(req, res, response);
                    });
                } else {
                    response["message"] = "Social media account not valid, please check your account.";
                    utils.setResponse(req, res, response);
                }
            });
        });
    }

    static checkSource(source) {
        if (source === "twitter") return require(BASE_DIR + '/models/account/twitter/Analytic');
        if (source === "instagram") return require(BASE_DIR + '/models/account/instagram/Analytic'); 
        return false;
    }
}

module.exports = CompareTopicController;