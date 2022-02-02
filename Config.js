/*
|--------------------------------------------------------------------------
| Application Configuration
|--------------------------------------------------------------------------
*/

exports.APP_SSL             = false;
exports.APP_PORT            = 30356;

exports.APP_NAME            = "VERITAS Analytics";
exports.APP_DESCRIPTION     = "";
exports.APP_AUTHOR          = "";
exports.APP_LOGO            = "";
exports.APP_ICON            = "";
exports.APP_ID              = exports.APP_NAME.split(" ").join("_") + "_" + exports.APP_PORT;

/*
|--------------------------------------------------------------------------
| Database Configuration
|--------------------------------------------------------------------------
*/

exports.APP_DAYOFWEEK_MONGO = {
	"1" : "Sunday", 
	"2" : "Monday", 
	"3" : "Tuesday", 
	"4" : "Wednesday", 
	"5" : "Thursday", 
	"6" : "Friday", 
	"7" : "Saturday"
};

exports.DB = [{
    "DRIVER": process.env.DB_DRIVER,
    "CONNECTION": process.env.DB_CONNECTION,
    "NAME": process.env.DB_NAME,
}, {
    "DRIVER": process.env.DB_DRIVER_IG,
    "CONNECTION": process.env.DB_CONNECTION_IG,
    "NAME": process.env.DB_NAME_IG,
}, {
    "DRIVER": process.env.DB_DRIVER_TW,
    "CONNECTION": process.env.DB_CONNECTION_TW,
    "NAME": process.env.DB_NAME_TW,
}];

/*
|--------------------------------------------------------------------------
| API Configuration
|--------------------------------------------------------------------------
*/

exports.API_IG = {
    API_SSL      : true,
    API_HOST     : process.env.API_IG_HOST,
    API_PORT     : process.env.API_IG_PORT,
    API_PATH     : process.env.API_IG_PATH,
    API_USERNAME : process.env.API_IG_USERNAME,
    API_PASSWORD : process.env.API_IG_PASSWORD,
    API_METHOD   : "POST",
    API_TIMEOUT  : 600000   
}

exports.API_TW = {
    API_SSL      : false,
    API_HOST     : process.env.API_TW_HOST,
    API_PORT     : process.env.API_TW_PORT,
    API_PATH     : process.env.API_TW_PATH,
    API_USERNAME : process.env.API_TW_USERNAME,
    API_PASSWORD : process.env.API_TW_PASSWORD,
    API_METHOD   : "POST",
    API_TIMEOUT  : 600000
}

exports.API_AI = {
    API_SSL      : true,
    API_HOST     : process.env.API_AI_HOST,
    API_PORT     : process.env.API_AI_PORT,
    API_PATH     : process.env.API_AI_PATH,
    API_USERNAME : process.env.API_AI_USERNAME,
    API_PASSWORD : process.env.API_AI_PASSWORD,
    API_METHOD   : "POST",
    API_TIMEOUT  : 600000
}

exports.TELEGRAM_ALERT = {
	API_SSL 		   : false,
    API_HOST           : process.env.API_TELEGRAM_HOST,
    API_PORT           : process.env.API_TELEGRAM_PORT,
    API_METHOD		   : "POST",
};