var // IMPORTS
cookie = require('cookie'),
connect = require('connect'),
models = require('./models.js'),
easyimg = require('easyimage'),
gm = require('gm'),
fs = require("fs"),
randomString = require('./helpers.js').randomString,
uploadImage = require('./helpers.js').uploadImage,
UPLOAD_AVATAR_PATH = require('./locals.js').UPLOAD_AVATAR_PATH,
views = require('./views.js'),
async = require('async'),
check = require('validator').check,
sanitize = require('validator').sanitize;

module.exports = function(io)
{
    // io.set('log level',1);

    /*
    // Authorize web socket from session id cookie of client
    io.set('authorization', function (handshakeData, accept)
    {

        if (handshakeData.headers.cookie)
        {
            handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
            handshakeData.sessionID = connect.utils.parseSignedCookie(handshakeData.cookie['express.sid'], 'secret');

            console.log(handshakeData.sessionID);
            if (handshakeData.cookie['express.sid'] == handshakeData.sessionID)
            {
                return accept('Cookie is invalid.', false);
            }
        }
        else
        {
            return accept('No cookie transmitted.', false);
        }

        console.log("Session cookie accepted");
        return accept(null, true);
    });
    */

    io.sockets.on('connection', function (client)
    {
        client.on('connected', function (data, sendToClient)
        {
            console.log('user connected');

            client.user = client.handshake.user;
            if (client.user.alias == null)
            {
                client.user.alias = "Anonymous";
            }
            if (client.user.avatar_url == null)
            {
                client.user.avatar_url = "/media/avatars/doggy.jpg";
            }
            client.user.save().success(function()
            {
                sendToClient({socketID:client.id, alias:client.user.alias, avatar_url:client.user.avatar_url});
            });
        });

        client.on("drawCanvas", function(data,sendToClient)
        {
            client.broadcast.emit("drawCanvas",data);
        });

        /*
        client.on('webcam', function(data, sendToClient)
        {
            console.log((data.length/1.33) / 1000 + " kilobytes");
            client.broadcast.emit('webcam', data);
        });
        */

        client.on('avatar', function(data, sendToClient)
        {
            var fileLoc = uploadImage(data, UPLOAD_AVATAR_PATH);
            easyimg.resize({src:fileLoc, dst:fileLoc, width:50, height:50}, function(err, stdout, stderr)
            {
                client.user.updateAttributes({avatar_url:fileLoc.toURL()}).success(function()
                {
                    sendToClient(client.user.avatar_url)
                });
            });
        });

        client.on('emoticon', function(data, sendToClient)
        {
            var fileLoc = uploadImage(data['img']);

            models.Emoticon.find({ where: { text: data['text'] } }).success(function(emoticon)
            {
                easyimg.info(fileLoc, function(err, stdout, stderr)
                {
                    if (stdout.width > 150)
                    {
                        easyimg.resize({src:fileLoc, dst:fileLoc, width:150}, function(err, stdout, stderr)
                        {
                            if (emoticon)
                            {
                                emoticon.updateAttributes({media_link:fileLoc.toURL()}).success(function()
                                {
                                    sendToClient(fileLoc.toURL());
                                });
                            }
                            else
                            {
                                models.Emoticon.create({text:data['text'],user_id:client.user.id,media_link:fileLoc.toURL()}).success(function(emoticon)
                                {
                                    sendToClient(fileLoc.toURL());
                                });
                            }
                        });
                    }
                    else
                    {
                        models.Emoticon.create({text:data['text'],user_id:client.user.id,media_link:fileLoc.toURL()}).success(function(emoticon)
                        {
                            sendToClient(fileLoc.toURL());
                        });
                    }
                });
            });
        });

        client.on('alias', function(data, sendToClient)
        {
            if (data == "Server"){ data = "Not_Server" }
            client.user.updateAttributes({alias:data}).success(function()
            {
                sendToClient(client.user.alias);
            });
        });

        client.on('chatMsg', function(data, sendToClient)
        {
            data = sanitize(data).xss().replaceAll("[removed]","");
            var start = Date.now();
            async.auto(
            {
               message: function(callback)
               {
                   var msg = models.Message.build({text:data});
                   models.Emoticon.findAll().success(function(emoticons)
                   {
                       for (var i=0,len=emoticons.length;i<len;i++)
                       {
                           msg.text = (msg.text).replaceAll(emoticons[i].text, "<img src='" + emoticons[i].media_link + "' />");
                       }
                       msg.user = client.user;
                       callback(null, msg);
                       msg.setUser(client.user);
                   });
               },

               finish: ['message', function(callback, results)
               {
                   io.sockets.clients().forEach(function (socket)
                   {
                       var html = views.renderTemplate('frontPage/snippets/chat-msg.html',{msg:results.message, receiver:socket.user});
                       socket.emit('chatMsg',{text:html});
                   });


               }]

            });
        });

        /*
        client.on("updateMouse", function(data, sendToClient)
        {
            client.broadcast.emit('updateMouse', {'id':client.id,'xPos':data['xPos'],'yPos':data['yPos']});
        });
        */

        /**
         * Updates the position of an image on the screen
         */
        client.on('updateImg', function(data, sendToClient)
        {
            // extract data from json
            var xPos = data['xPos'];
            var yPos = data['yPos'];
            var imgID = data['imgID'].split('.')[1];

            // save data when user stops dragging otherwise just update the position for other clients
            if (data['saveData'])
            {
                models.Image.find({ where: { id: imgID } }).success(function(image)
                {
                    image.updateAttributes({xPos:xPos,yPos:yPos}).success(function()
                    {
                        client.broadcast.emit('updateImg', image);
                    });
                });
            }
            else
            {
                client.broadcast.emit('updateImg', {'id':imgID,'xPos':xPos,'yPos':yPos});
            }
        });

        client.on('uploadImg', function(data, toClient)
        {
            // extract data from json
            var xPos = data['x'];
            var yPos = data['y'];
            var imgData = data['imgData'];

            var fileLoc = uploadImage(imgData);
            var fileURL = fileLoc.toURL();

            // save reference of image to database
            models.Image.create({xPos:xPos,yPos:yPos,url:fileURL,fsloc:fileLoc}).success(function(imageObj)
            {
                var obj = {'fileURL':fileURL,'id':imageObj.id,'xPos':xPos,'yPos':yPos};
                // send url of image file to client and the id of the image in the database
                toClient(obj);
                io.sockets.emit('uploadImg', obj);
            });


            /*
            // resize image file
            easyimg.resize({src:fileLoc, dst:fileLoc, width:32, height:32}, function(err, stdout, stderr)
            {


                //client.userImg = '/' + fileLoc;
                //broadcastMembership(getRoomNameFrom(client));
            });
            */
        });
    });
};