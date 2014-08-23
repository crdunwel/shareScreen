var UPLOAD_IMAGE_PATH = require('./locals.js').UPLOAD_IMAGE_PATH,
    fs = require("fs");

/**
 * Generate a random string of inputted length
 *
 * @param length        {Integer} for desired {String} length.
 * @return {String}     a {String} with random characters
 */
function randomString(length)
{
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ123456789';
    for (var i=0,result='';i<length;i++) { result += chars.charAt(Math.floor(Math.random()*chars.length)) }
    return result;
}

/**
 * This function takes raw base64Data from HTML5 FileReader and saves it to file on server
 * at path specifided in locals.js
 *
 * @param base64Data    raw base64Data
 * @param location      where to upload file to
 * @return {String}     the file location where image was saved on server
 */
function uploadImage(base64Data, location)
{
    location = location === undefined ? UPLOAD_IMAGE_PATH : location;

    // reject large images
    var bytes =  (base64Data.length / 1.37)/1000;
    console.log("Writing " + bytes + " kilobytes");
    if (bytes > 1000)
    {
        // TODO rejection code
    }
    // get raw base64 imgData without header

    var fileExt = base64Data.substring(base64Data.indexOf("/")+1,base64Data.indexOf(";"));
    console.log(fileExt);

    base64Data = base64Data.replace(/^data:image\/(jpeg|png|gif);base64,/,"");
    // convert base64 imgData into binary imgData
    var binaryData = new Buffer(base64Data, 'base64').toString('binary');
    // construct file location string
    var fileLoc = location + randomString(10) + "." + fileExt;
    // write imgData to image file
    fs.writeFileSync(fileLoc,binaryData,'binary');
    // return file location
    return fileLoc;
}


// export for use in other modules
exports.randomString = randomString;
exports.uploadImage = uploadImage;