const randomstring  = require('randomstring');
const path          = require('path');
const BASE_DIR      = path.dirname(require.main.filename);
const config        = require(BASE_DIR + '/Config');
const utils         = require(BASE_DIR + '/Utils');
const http          = require(BASE_DIR + '/libraries/HttpHandler');

class ApiAI {

    static async getClassificationImage(base64, cb) {
        let API = utils.duplicateObject(config.API_AI);
        API["API_PATH"] += "/cv/deepImageClassification";
        API["API_USERNAME"] = process.env.API_AI_USERNAME_CV;
        API["API_PASSWORD"] = process.env.API_AI_PASSWORD_CV;

        let params = JSON.stringify({
            "reqID": randomstring.generate(),
            "base64": base64
        });
        
        http.apiRequest("daemon-"+ randomstring.generate(), "daemon", API, params, {}, function(resApi) {
            cb(resApi);
        });
    }

    static async getClassificationText(text, cb) {
        let API = utils.duplicateObject(config.API_AI);
        API["API_PATH"] += "/nlp/deepTextClassification";
        API["API_USERNAME"] = process.env.API_AI_USERNAME_NLP;
        API["API_PASSWORD"] = process.env.API_AI_PASSWORD_NLP;

        let params = JSON.stringify({
            "text": text
        });
        
        http.apiRequest("daemon-"+ randomstring.generate(), "daemon", API, params, {}, function(resApi) {
            cb(resApi);
        });
    }

    static async getNGram(text, cb) {
        let API = utils.duplicateObject(config.API_AI);
        API["API_PATH"] += "/nlp/cleaningText";
        API["API_USERNAME"] = process.env.API_AI_USERNAME_NLP;
        API["API_PASSWORD"] = process.env.API_AI_PASSWORD_NLP;

        let params = JSON.stringify({
            "text": text
        });
        
        http.apiRequest("daemon-"+ randomstring.generate(), "daemon", API, params, {}, function(resApi) {
            cb(resApi);
        });
    }

    static async getPOSTaggingNER(text, cb) {
        let API = utils.duplicateObject(config.API_AI);
        API["API_PATH"] += "/nlp/sequenceLabelling";
        API["API_USERNAME"] = process.env.API_AI_USERNAME_NLP;
        API["API_PASSWORD"] = process.env.API_AI_PASSWORD_NLP;

        let params = JSON.stringify({
            "text": text
        });
        
        http.apiRequest("daemon-"+ randomstring.generate(), "daemon", API, params, {}, function(resApi) {
            cb(resApi);
        });
    }

    static async getKeywordExtraction(text, cb) {
        let API = utils.duplicateObject(config.API_AI);
        API["API_PATH"] += "/nlp/deepKeywordExtraction";
        API["API_USERNAME"] = process.env.API_AI_USERNAME_NLP;
        API["API_PASSWORD"] = process.env.API_AI_PASSWORD_NLP;

        let params = JSON.stringify({
            "text": text
        });
        
        http.apiRequest("daemon-"+ randomstring.generate(), "daemon", API, params, {}, function(resApi) {
            cb(resApi);
        });
    }
    
    static async getForecasting(req, data, cb) {
        let API = utils.duplicateObject(config.API_AI);
        API["API_PATH"] += "/analytics/forecast";
        API["API_USERNAME"] = process.env.API_AI_USERNAME_ANALYTIC;
        API["API_PASSWORD"] = process.env.API_AI_PASSWORD_ANALYTIC;

        let params = JSON.stringify({
            "text": data
        });
        
        http.apiRequest(req.id, req.body.clientIp, API, params, {}, function(resApi) {
            cb(resApi);
        });
    }

}

module.exports = ApiAI;