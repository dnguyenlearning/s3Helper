const AWS = require('aws-sdk');

//config s3 from somewhere
const s3Credentials = {
	'accessKeyId': awsConfig.AWSAccessKeyId,
	'secretAccessKey': awsConfig.AWSSecretKey
};

AWS.config.update(s3Credentials);

const awsS3 = new AWS.S3();

const s3 = require('s3');

var client = s3.createClient({
	s3Options: {
		accessKeyId: awsConfig.AWSAccessKeyId,
		secretAccessKey: awsConfig.AWSSecretKey,
		s3Client: awsS3
		// any other options are passed to new AWS.S3()
		// See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
	}
});


function _getNoProtocolUrl(key, callback) {
	var bucket = awsConfig.AWSBucket;
	awsS3.getSignedUrl('getObject', { Bucket: bucket, Key: key }, function (err, location) {
		if (err) {
			return callback(err);
		}
		location = decodeURI(location).replace(/%2F/g, '/');
		if (process.env.NODE_ENV === 'production') {
			location = location.replace(/\.*s3(-ap-southeast-1)*\.*/, '').replace(/amazonaws/, '').replace(/brand-display/, 'cdn.brand-display');
		} else {
			location = location.replace(/s3-ap-southeast-1/, 's3');
		}
		var noProtocolUrl = location.replace(/.*?:/g, "");
		var noProtocolUrlNoParam = noProtocolUrl.split('?')[0];
		return callback(null, noProtocolUrlNoParam);
	});
}

function _fileUploadHelper(fileOriginalPath, internal_parent_system_id, objectType, widget_id, pathName, fileName, callback) {
	var categoryFolder = _getCategoryFolder(objectType);
	var bucket = awsConfig.AWSBucket;
	var key = "pathSavedFolder";
	var params = {
		localFile: fileOriginalPath,
		s3Params: {
			"Bucket": bucket,
			"Key": key,
			"ACL": "public-read",
			"CacheControl": defaultCacheControl
		}
	};

	var uploader = client.uploadFile(params);
	uploader.on('error', function (err) {
		logHelper.error("Error uploading file to s3", { error: err });
		return callback({ isUploadFileError: true, error: err });
	});

	uploader.on('end', function () {
		_getNoProtocolUrl(key, function (err, noProtocolUrlNoParam) {
			return callback(err, noProtocolUrlNoParam);
		})
	});

}

function getListFiles(path){
	return new Promise(function (resolve, reject) {
		awsS3.listObjects({Bucket: awsConfig.AWSBucket, Prefix: path}, function (err, data) {
			if (data && data.Contents) {
				generateLinkWithNoProtocolUrl(data)
					.then(function(imageList){
						return resolve(imageList);
					})
					.catch(function(err){
						reject(err)
					})
			} else {
				logHelper.error("Failed to list objects for " + from, {
					error: err,
					data: data
				});
				return reject(err)
			}
		});
	})

	function generateLinkWithNoProtocolUrl(data){
		var imageList = [];
		return new Promise(function(resolve, reject){
			async.each(data.Contents, function(each, callback){
				_getNoProtocolUrl(each.Key, function(err, noProtocolURlImage){
					if(err) callback(err);
					imageList.push(noProtocolURlImage)
					callback && callback()
				})
			}, function(err){
				if(err) return reject(err);
				return resolve(imageList);
			})
		})

	}
}

function cloneFiles(from, to){
	return new Promise(function (resolve, reject){
		awsS3.listObjects({Bucket: awsConfig.AWSBucket, Prefix: from}, function (err, data) {
			if (data && data.Contents) {
				async.each(data.Contents, function (file, cb) {
					var params = {
						Bucket: awsConfig.AWSBucket,
						CopySource: awsConfig.AWSBucket + '/' + file.Key,
						Key: file.Key.replace(from, to),
						ACL: 'public-read'
					};
					awsS3.copyObject(params, function (copyErr, copyData) {
						cb(copyErr);
					});
				}, function (err) {
					if (err) {
						logHelper.error("Error copying",err);
						return reject(err);
					}
					else {
						return resolve(data.Contents.length);
					}
				});
			} else {
				logHelper.error("Failed to list objects for " + from, {
					error: err,
					data: data
				});
				return reject(err)
			}
		});
	})
}
