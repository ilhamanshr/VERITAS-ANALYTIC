const path      = require('path');
const BASE_DIR  = path.dirname(require.main.filename);
const logger    = require(BASE_DIR + '/Logger');
const msg       = require(BASE_DIR + '/Messages');
const moment    = require('moment');

exports.setResponse = function(req, res, response) {
    logger.info(__filename, JSON.stringify(response), req.id, req.body.clientIp, "Response to client");

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
}

exports.checkParameter = function(req, res, requiredParams, cb) {
    logger.info(__filename, JSON.stringify(req.body), req.id, req.body.clientIp, "Received request from client");

    let obj = req.body.params;
    let result = true;

    Object.keys(obj).forEach(function(v, k) {
        requiredParams.forEach(function(val, key) {
            result = (obj.hasOwnProperty(val)) ? true : false;
        });
    });
    
    if (result) {
        cb();
    } else {
        let response = this.duplicateObject(msg.ERR_BAD_REQUEST);
        logger.info(__filename, JSON.stringify(req.body), req.id, req.body.clientIp, response.message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
    }
}

exports.duplicateObject = function(tmpObject) {
    var resultObj = {};
    for (var key in tmpObject) {
        resultObj[key] = tmpObject[key];
    }
    return resultObj;
}

exports.isJSON = function(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

exports.firstCase = function(string) {
    var separateWord = words.toLowerCase().split(' ');
    for (var i = 0; i < separateWord.length; i++) {
        separateWord[i] = separateWord[i].charAt(0).toUpperCase() +
        separateWord[i].substring(1);
    }
    
    return separateWord.join(' ');
}

exports.secToTime = function(time) {
    let sec_num = parseInt(time, 10);
    let days    = Math.floor(sec_num / 86400);
    let hours   = Math.floor((sec_num - (days * 86400)) / 3600);
    let minutes = Math.floor((sec_num - (days * 86400) - (hours * 3600)) / 60);
    let seconds = sec_num - (days * 86400) - (hours * 3600) - (minutes * 60);

    let format = '';
    format += ((days > 0) ? days + ' days ' : '');
    format += ((hours > 0) ? hours + ' hours ' : '');
    format += ((minutes > 0) ? minutes + ' minutes ' : '');
    format += ((seconds > 0) ? seconds + ' seconds' : '');

    return format;
}

exports.normalizeWordCloud = function(data, cb) {
    let wordCloud = [];
    
    data.forEach(element => {
        let x = element.count - data[data.length-1].count;
        let y = data[0].count - data[data.length-1].count;
        let weight =  x/y;
        if (weight < 0.25){
            weight = 25;
        }
        else if (weight < 0.5){
            weight = 50;
        }
        else if (weight < 0.75){
            weight = 75;
        }
        else {
            weight = 100;
        }
        wordCloud.push({
            "name": element.name,
            "weight": weight,
            "count": element.count
        });
    });

    cb(wordCloud);
}

exports.enumerateDaysBetweenDates = function(startDate, endDate){
    var currDate = moment(startDate).startOf('day');
    var lastDate = moment(endDate).startOf('day');
    var dates = [moment(startDate).startOf('day').format('YYYY-MM-DD')];

    while(currDate.add(1, 'days').diff(lastDate) < 0) {
        dates.push(currDate.format('YYYY-MM-DD'));
    }
    
    return dates;
}

exports.getEngagementRate = function(dataPost, dataInteraction){
    let dataEngagement = [];
    
    for (let index = 0, len = dataInteraction.length; index < len; ++index) {
        let interaction = dataInteraction[index];
        let post = dataPost[index];

        let engagement = 0;

        if(post!=0){
            engagement = interaction / post;
        } 

        dataEngagement.push(parseFloat(engagement.toFixed(2)));
    }

    return dataEngagement;
}

exports.sortArrayObj = function (arr, property) {
    var sortOrder = 1;
    if (property[0] === "-") {
        sortOrder = -1;
        property = property.substr(1);
    }

    return arr.sort(function (a,b) {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
        return result * sortOrder;
    });
}

exports.roundTwoDecimalPlaces = function(num){
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

exports.formatKtp = function(data) {
    let ktp = {
        "nik"           : data.nik,
        "family_id"     : (data.family_id) ? data.family_id : "",
        "family_status" : (data.family_status) ? data.family_status : "",
        "name"          : (data.name) ? data.name : "",
        "birth_place"   : (data.birth_place) ? data.birth_place : "",
        "birth_date"    : (data.birth_date) ? data.birth_date : "",
        "gender"        : (data.gender) ? data.gender : "",
        "religion"      : (data.religion) ? data.religion : "",
        "marital_status": (data.marital_status) ? data.marital_status : "",
        "education"     : (data.education) ? data.education : "",
        "occupation"    : (data.occupation) ? data.occupation : "",
        "mothers_name"  : (data.mothers_name) ? data.mothers_name : "",
        "fathers_name"  : (data.mothers_name) ? data.fathers_name : "",
        "address"       : "",
        "detailKk"      : data.detailKk
    }

    ktp.address += (data.address) ? data.address : '';
    ktp.address += (data.address_rt) ? ", RT " + data.address_rt : '';
    ktp.address += (data.address_rw) ? " RW " + data.address_rw : '';
    ktp.address += (data.address_urban_village) ? " " + data.address_urban_village : '';
    ktp.address += (data.address_sub_district) ? ", " + data.address_sub_district : '';
    ktp.address += (data.address_district) ? ", " + data.address_district : '';
    ktp.address += (data.address_province) ? ", " + data.address_province : '';
    ktp.address += (data.address_zipcode) ? " " + data.address_zipcode : '';

    return ktp;
}