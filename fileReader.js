const fs = require('fs');
const crypto = require('crypto');
const path = require('path');


function getPathParts(url) {
	if (url.indexOf('?') > -1) url = url.substring(0, url.indexOf('?'));
	var m = url.match(/(.*)[\/\\]([^\/\\]+)\.(\w+)$/);
	return {
		path: m[1],
		file: m[2],
		ext: m[3]
	};
};

function _getFileData(fileOriginalPath, callback){
    fs.readFile(fileOriginalPath, function (err, data) {
        if (err) {
            logHelper.error("Error reading file", {error: err});
            return callback({isUploadFileError: true, error: err})
        } else {
            callback(null, data);
        }
    });
}


function _getFileName(fileOriginalPath, data, isHashed, callback) {
	if(isHashed) {
		var hash = crypto.createHash('md5');
		hash.update(data);
		var hashedFileContent = hash.digest('hex');
		var extension;
		try {
			extension = getPathParts(fileOriginalPath).ext;
		} catch (e) {
			logHelper.error("Fail to extract image extension", {error: e});
			return callback({isFileNameNotFound: true, error: e});
		}
		var hashedFileName = hashedFileContent + "." + extension;
		return callback(null, hashedFileName);
	}else{
		return callback(null, path.basename(fileOriginalPath));
	}
}


