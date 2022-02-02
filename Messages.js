exports.SUCCESS_RESPONSE        = { "code": 0, "message": "Success", "content": {} }
exports.SUCCESS_DATA_NOT_FOUND  = { "code": 0, "message": "Data not found", "content": {} }
exports.ERR_RESPONSE            = { "code": -1, "message": "Something error", "content": {} }
exports.ERR_INVALID_ACTION      = { "code": -2, "message": "Invalid action", "content": {} }
exports.ERR_INVALID_SUBACTION   = { "code": -3, "message": "Invalid sub-action", "content": {} }
exports.ERR_BAD_REQUEST         = { "code": 400, "message": "Invalid request parameter", "content": {} }
exports.ERR_UNAUTHORIZED        = { "code": 401, "message": "Your session has expired. please login and try again.", "content": {} }
exports.ERR_FORBIDDEN           = { "code": 403, "message": "Access denied", "content": {} }
exports.ERR_BAD_GATEWAY         = { "code": 502, "message": "Something is wrong on back end", "content": {} }
exports.ERR_GATEWAY_TIMEOUT     = { "code": 504, "message": "Request timeout from back end", "content": {} }

exports.SENTIMENT_BY_KEY        = { "-1": "Negative", "0": "Neutral", "1": "Positive" }
exports.SENTIMENT_BY_NAME       = { "Negative": -1, "Neutral": 0, "Positive": 1 }