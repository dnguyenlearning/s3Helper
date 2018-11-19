function generateThumbnail(url, imageFilePath, callback){
    var fileName = 'imageLocalFilePath' + "_thumbnail.png";


    DataBaseImageInfos.getInfo(imageFilePath, function(err, imageInfos) {
        captureWidget(err, imageInfos)
            .then(function(noProtocolUrl) {
                //Do something with noProtocolUrl image
                callback && callback(noProtocolUrl);
            })
            .catch(function(err){
                logHelper.error('Error when generating Thumbnail!', err)
            })
    });

    function captureWidget(err, imageInfos) {
        return new Promise(function(resolve, reject){
            if (!err && !_.isEmpty(imageInfos)) {
                var width, height;
                if (imageInfos.dimension) {
                    width = imageInfos.dimension.width;
                    height = imageInfos.dimension.height;
                }

                //return thumnailTempDirectory in local.
                var thumbnailTempDirectiory = pathProvider.temp_thumbnail(templateMode);
                var generatedThumbnailPath = path.join(thumbnailTempDirectiory, fileName);
                var data = {
                    url: url,
                    path: generatedThumbnailPath,
                    options: { waitUntil: 'networkidle2' },
                    dimension: {
                        width: width,
                        height: height
                    }
                };
                generateThumbnail(data)
                    .then(function(){
                        amazonUploadHelper.uploadThumbnail('uploadFilePathOnS3', function(err, noProtocolUrl) {
                            console.log('noProtocolUrl', noProtocolUrl)
                            //when upload done. remove file on local
                            helper.removeFileFolder(generatedThumbnailPath);
                            if (err) {
                                logHelper.error("Error uploading thumbnail", { err: err, path: generatedThumbnailPath });
                                return reject(err);
                            }
                            return resolve(noProtocolUrl);
                        });
                    })
                    .catch(function(err){
                        logHelper.error("Error generating thumbnail", { err: err, path: generatedThumbnailPath });
                        return reject(err);
                    })

            }
        })
    }

    function generateThumbnail({url, path, options, dimension}){
        return new Promise(function(resolve, reject){
            puppeteer.launch({
                args: ['--no-sandbox'],
                timeout: 5000
            })
                .then(function(browser){
                    browser.newPage()
                        .then(function(page){
                            page
                                .goto(url, options)
                                .then(function(){
                                    page
                                        .setViewport({
                                            width: dimension.width || 1000,
                                            height: dimension.height || 1000
                                        })
                                        .then(function(){
                                            page.screenshot({
                                                path: path
                                            })
                                                .then(function(){
                                                    browser.close();
                                                    return resolve(true);
                                                })
                                                .catch(function(err){
                                                    return reject(err);
                                                })
                                        })
                                        .catch(function(err){
                                            return reject(err);
                                        })
                                })
                                .catch(function(err){
                                    return reject(err);
                                })
                        })
                        .catch(function(err){
                            return reject(err);
                        })
                })
                .catch(function(err){
                    return reject(err);
                })
        })

    }


}