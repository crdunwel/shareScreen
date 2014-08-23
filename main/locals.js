/**
 * This module contains all static variables used within this app.
 * A few important notes:
 *
 * - File paths or URLs MUST have trailing "/"
 *
 * @type {Object}   object containing all static variables in this app's scope
 */

module.exports = {

    APP_PATH: 'main',

    // path to where images are stored on server
    UPLOAD_IMAGE_PATH: 'main/media/images/',

    // path to where avatars are stored on server
    UPLOAD_AVATAR_PATH: 'main/media/avatars/'

};


/**
 * String methods
 */
String.prototype.toURL = function() { return this.replace(module.exports.APP_PATH,''); };

String.prototype.replaceAll = function(str1, str2, ignore)
{
    return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
};