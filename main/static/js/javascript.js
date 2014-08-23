$(document).ready(function()
{
    ///////////////
    // VARIABLES //
    ///////////////

    // SOCKET

    var hostname = window.location.hostname;
    var socket = io.connect('https://' + hostname, {'secure':true});

    // JQUERY SELECTORS

    var $mainDiv = $('div#main-div');
    var $imgDiv = $('div#imgSharing-div');

    var $chatDiv = $("div#chat-div");
    var $chatWrapper = $("div#chat-wrapper");
    var $chatMsgContainer = $("div#chat-message-container");
    var $chatCtrlPanel = $('div#chat-control-panel');

    var $switch_div = $('div.switch-div');
    var $window = $(window);
    var $document = $(document);
    var $left_switch_div_img = $('#left-switch-div').children('img');
    var $right_switch_div_img = $('#right-switch-div').children('img');
    var $profile_dialog = $('#profile-dialog');
    var $emoticon_dialog = $('#emoticon-dialog');
    var $change_user_info = $('#change-user-info');
    var $set_user_emoticons = $('#set-user-emoticons');
    var $nickName_input = $('#nickName-input');
    var $avatar_input = $('#avatar-input');
    var $nickName_display = $('#nickName-display');
    var $chat_top_dashboard = $('#chat-top-dashboard');
    var $dash_avatar = $('#dash-avatar');
    var $recCanvas = $('#recCanvas');
    var $webcam = $("#webcam");
    var $create_new_emoticon = $("a#create-new-emoticon");

    var $drawCanvas = $('canvas#drawCanvas');

    $(document).mousemove(function(event)
    {
        var toReturn = false;
        $('.dragImage').each(function(index,value)
        {

            var elemWidth = $(value).width();
            var elemHeight = $(value).height();
            var elemPosition = $(value).offset();
            var elemPosition2 = {};
            elemPosition2.top = elemPosition.top + elemHeight;
            elemPosition2.left = elemPosition.left + elemWidth;
            if ((event.pageX > elemPosition.left && event.pageX < elemPosition2.left) && (event.pageY > elemPosition.top && event.pageY < elemPosition2.top))
            {
                toReturn = true;
            }
        });

        if (toReturn) { $drawCanvas.css("pointer-events","none") }
        else { $drawCanvas.css("pointer-events","auto") }
    });

    paper.install(window);
    paper.setup('drawCanvas');
    paper.view.viewSize = [$window.width(),$window.height()];

    var path;
    var theirPath;
    var tool = new paper.Tool();

    tool.onMouseDown = function(event)
    {
        path = new Path();
        path.strokeColor = 'black';
        path.add(event.point);
        socket.emit('drawCanvas',['path',event.point])

    };

    tool.onMouseDrag = function(event)
    {
        if (path)
        {
            path.add(event.point);
            socket.emit('drawCanvas',[event.point])
        }
    };

    // STATE VARIABLES
    var screen = {'state':0,'stateID_list':['imgSharing-div','chat-div']};
                 // SET INITIAL STATE
                 (function()
                 {
                     for (var i=0; i<screen.stateID_list.length; i++)
                     {
                         if ($('#' + screen.stateID_list[i]).css('display')=='block')
                         {
                            screen.state = i; break;
                         }
                     }
                 }());
    var shiftHeld = false;

    //////////////////////
    // HELPER FUNCTIONS //
    //////////////////////

    /**
     * This is a simple function that applies draggable with options that allows communication
     *
     * @param selector  jQuery selector object
     */
    function makeImgDraggable(selector)
    {
        function sendData($this,event,save)
        {
            var pos = $this.position();
            socket.emit('updateImg',{'imgID':$this.attr('id'),'xPos':pos.left,'yPos':pos.top,'saveData':save});
        }
        selector.draggable({cursor: "move",
            stop: function(event){ sendData($(this),event,true); },
            drag: function(event){ sendData($(this),event,false); }
        });
    }

    $('.chat-msg-text').each(function(index,value)
    {
        $(value).html($(value).html().linkify());
    });

    function humanizeMessages()
    {
        var basetime = humanize.time();

        $('.timestamp').each(function(index,value)
        {
            if (!$(this).data('date')) { $(this).data('date',$(this).text()); }
            $(this).text(humanize.relativeTime(Date.parse($(this).data('date'))/1000, basetime));
        });
    }

    /**
     * This is a simple function that converts a url, (x,y) coordinates, and id string into html for an image
     *
     * @param url           relative path for url location on server
     * @param x             x position
     * @param y             y position
     * @param id            the id for the image
     * @param className     the class for the image
     * @return {String}     <img> html
     */
    function makeImgHTML(url,x,y,id,className)
    {
        return '<img src="' + url + '" id="' + id + '" class="' + className + '" style="position:absolute;top:' + y + 'px;left:' + x + 'px"/>'
    }


    /**
     * This function switches the current screen
     *
     * @param dir_code  -1 for left, 1 for right
     */
    function changeScreens(dir_code)
    {
        var dir_hide, dir_show;
        var lastState = screen.state;
        screen.state += dir_code;

        // set transition direction
        if (dir_code == -1) { dir_hide = 'right'; dir_show = 'left'; }
        else { dir_hide = 'left'; dir_show = 'right'; }

        // wrap shift in screen ID list
        var len = screen.stateID_list.length;
        if (screen.state < 0) { screen.state = len-1; }
        else if (screen.state >= len) { screen.state = 0; }

        var $lastState = $('#' + screen.stateID_list[lastState]);

        /*
        if ($lastState.attr('id') == "chat-div")
        {
            // clear and update CKEditor
            CKEDITOR.instances['chateditor'].updateElement();
            CKEDITOR.instances['chateditor'].destroy();
        }
        */

        // do transition animations
        $lastState.hide('slide',{'direction':dir_hide});
        setTimeout(function()
        {
            var $stateDiv = $('#' + screen.stateID_list[screen.state]);

            $stateDiv.show('slide',{'direction':dir_show,'complete':function(){

                if ($stateDiv.attr('id') == 'chat-div')
                {
                    //initCKEditor();
                }

                if ($stateDiv.attr('id') == 'webcam-div')
                {
                    //console.log('what');
                    //initWebcam();

                }


            }});



        },1000);
    }


    /**
     * Resizes the chat area dynamically when window size changes.
     */
    function reSizeMessages()
    {
        var topmargin = parseInt($chatWrapper.css("margin-top").replace('px',''));
        var botmargin = parseInt($chatWrapper.css("margin-bottom").replace('px',''));
        $chatMsgContainer.height($window.height()-$chatCtrlPanel.height()-$chat_top_dashboard.height()-topmargin-botmargin);
    }

    function reSizeWebcam()
    {
        $webcam.attr('height',$window.height());$webcam.attr('width',$window.height()*1.3333);
        $recCanvas.attr('height',$window.height());$recCanvas.attr('width',$window.height()*1.3333);
        $recCanvas.parent().width($recCanvas.attr("width"));
    }


    function submitEmoticons()
    {
        $(".emoticon-img").each(function(index,value)
        {
            var file = $(value)[0].files[0];
            var text = $(value).prev().val(); text = $('<div>').text(text).html();
            if (file && text != "")
            {
                var reader = new FileReader();
                reader.onload = function(evt)
                {
                    socket.emit('emoticon', {'img':evt.target.result,'text':text}, function(data)
                    {
                        if ($(value).next().is('img')) { $(value).next().attr('src',data); }
                        else { $("<img src='" + data + "' />").insertAfter($(value)); $(value).hide(); }
                    });
                };
                reader.readAsDataURL(file);
            }
        });

        $emoticon_dialog.dialog('close');
    }




    /**
     * Handles submitting user's nickname and avatar to the server.
     */
    function submitUserInfo()
    {
        // handles setting alias and send to server
        if ($nickName_input.val() != "")
        {
            socket.emit('alias',$nickName_input.val(),function(data)
            {
                $nickName_display.text(data);
            });
        }

        // handles sending user image to server
        var file = $avatar_input[0].files[0];
        if (file)
        {
            var reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function(evt)
            {
                socket.emit('avatar', evt.target.result, function(data)
                {
                    $dash_avatar.attr('src',data);
                });
            };
        }

        // close dialog after seeing user info and focus text area to start chatting immediately
        $profile_dialog.dialog('close');
    }

    function bindEmoticonImg()
    {
        $('.create-emoticon-ele img').each(function(index,value)
        {
            if (!($(value).hasClass("bound-img")))
            {
                $(value).click(function(event)
                {
                    $(value).prev().trigger('click');
                });
                $(value).addClass("bound-img");
            }
        });

        $(".emoticon-img").each(function(index,value)
        {
            if (!($(value).hasClass("bound-fileinput")))
            {
                $(value).change(function(event)
                {
                    var $this = $(value);
                    var reader = new FileReader();
                    reader.onload = function(evt)
                    {
                        $this.next().attr('src',evt.target.result);
                    };
                    reader.readAsDataURL($this[0].files[0]);
                });
                $(value).addClass("bound-fileinput");
            }

        });
    }

    ///////////////////
    // SOCKET EVENTS //
    ///////////////////

    socket.on('connect', function ()
    {
        // Event to run when first connected to server
        socket.emit('connected', true, function (data)
        {

            // $nickName_display.text(data['alias']);
            // $dash_avatar.attr("src",data['avatar_url']);
        });

        socket.on('uploadImg', function(data)
        {
            var $img = $(makeImgHTML(data['fileURL'],data['xPos'],data['yPos'],'img.'+data['id'],"dragImage"));
            makeImgDraggable($img);
            $imgDiv.append($img);
        });

        socket.on('updateImg', function(data)
        {
            $('#img\\.'+data.id).css({top:data.yPos + 'px',left:data.xPos + 'px'});
        });


        socket.on('updateMouse', function(data)
        {
            if (!($('#mouse\\.'+data.id).length))
            {
                var $img = makeImgHTML('/static/images/mouse_point.png',data.xPos,data.yPos,'mouse.'+data.id);
                $imgDiv.append($img);
            }
            $('#mouse\\.'+data.id).css({top:data.yPos + 'px',left:data.xPos + 'px'});
        });


        socket.on('chatMsg', function(data)
        {
            var $html = $(data['text']); $html.hide();

            /*
            if (data['socketID'] != socketID)
            {
                $html.children('.chat-avatar').eq(0).css("float","right");
                var $timestamp = $html.children('.chat-text').eq(0)
                                      .children('.timestamp-div').eq(0)
                                      .children('.timestamp').detach();
                $timestamp.insertBefore( $html.children('.chat-text').eq(0)
                    .children('.timestamp-div').eq(0)
                    .children('.alias').eq(0));

                $html.children('.chat-text').eq(0)
                    .children('.timestamp-div').css("text-align",'right');

                $html.children('.chat-text').eq(0).children(".chat-msg-text").eq(0).css("text-align","right");
            }*/

            $("#chat-message-container").append($html);
            $html.fadeIn();

            // linkify and humanize messages
            humanizeMessages();
            var $chatText = $html.children('.chat-text').eq(0).children('.chat-msg-text').eq(0);
            $chatText.html($chatText.html().linkify());

            // scroll to bottom of chat
            $chatMsgContainer.animate({scrollTop: $chatMsgContainer[0].scrollHeight}, 500);
        });

        socket.on("drawCanvas", function(data)
        {
            console.log(data);
            for (var i=0,len=data.length; i<len; i++)
            {
                if (data[i] == "path")
                {
                    theirPath = new paper.Path();
                    theirPath.strokeColor = 'black';
                }
                else
                {
                    theirPath.add(new paper.Point(data[i][1],data[i][2]));
                }
            }
        });



        /*
        // Event to run when receiving chat message from server
        socket.on('message', function(data)
        {
            insertHTMLMessages(data);
            humanizeMessages();
            $msg_content_div.animate({scrollTop: $msg_content_div.prop("scrollHeight")}, 500);
        });

        // Event to run when receiving membership change from server
        socket.on('membershipChanged', function(memberHTML)
        {
            $('#users-in-room-div').html(memberHTML);
        });

        // Event to run when receiving typing indication from server
        socket.on('typing', function(data)a
        {
            var obj = JSON.parse(data);
            var $isTyping = $('#' + obj['uid']);
            if (obj['isTyping']) { $isTyping.fadeIn(); }
            else { $isTyping.fadeOut(); }
        });
        */
    });

    //////////////////////
    // INTERFACE EVENTS //
    //////////////////////

    bindEmoticonImg();

    $mainDiv.height($window.height());
    $window.resize(function(event)
    {
        $mainDiv.height($window.height());
        reSizeMessages();
        reSizeWebcam();
    });


    // $window.mousemove(function(event) { socket.emit('updateMouse',{'xPos':event.pageX,'yPos':event.pageY}); });

    $switch_div.hover(function(event){ $(this).children('img').css('opacity',1); },
                      function(event){ $(this).children('img').css('opacity',0.7); });

    $switch_div.click(function(event)
    {
        if ($(this).attr('id')=="left-switch-div") { changeScreens(-1); }
        else { changeScreens(1); }
    });

    $document.keydown(function(event)
    {
        if (event.keyCode == 37)
        {
            $left_switch_div_img.css("opacity",1);
            changeScreens(-1);
            setTimeout(function() { $left_switch_div_img.css("opacity",0.7); },350);
        }
        if (event.keyCode == 39)
        {
            $right_switch_div_img.css("opacity",1);
            changeScreens(1);
            setTimeout(function() { $right_switch_div_img.css("opacity",0.7); },350);
        }
    });

    $create_new_emoticon.click(function(event)
    {
        var $newEle = $('.create-emoticon-ele').last().clone();
        var num = parseInt($newEle.children('span').eq(0).text().replace('.',''))+1;
        $newEle.children('span').eq(0).text(num+'.');
        $newEle.children('img').eq(0).attr('src','/static/images/clickbrowse.png');
        $newEle.children('input[type="text"]').eq(0).val('');
        $newEle.insertBefore('#create-emoticon-div');
        $newEle.children('img').eq(0).removeClass();
        $newEle.children('input[type="file"]').eq(0).removeClass('bound-fileinput');
        bindEmoticonImg();
    });

    ///////////////////////////////
    // INITIALIZE USER INTERFACE //
    ///////////////////////////////

    humanizeMessages();
    setInterval(humanizeMessages,3000);

    function initWebcam()
    {
        navigator.getMedia = ( navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia);

        navigator.getMedia({video:true, audio:false}, success, error);

        function success(stream)
        {
            document.getElementById('webcam').src = window.URL.createObjectURL(stream)
        }

        function error(stream)
        {
            // TODO
        }

        var video = document.getElementById('webcam');
        var canvas = document.createElement('canvas');
        var context = canvas.getContext("2d");
        canvas.width =  320;
        canvas.height = 240;
        var c = document.getElementById('recCanvas');
        var ctx = c.getContext("2d");
        var img = new Image();
        img.onload = function()
        {
            ctx.drawImage(img,0,0, c.width, c.height);
        };

        setInterval(function()
        {
            context.drawImage(video,0,0,320,240);
            //socket.emit('webcam',canvas.toDataURL("image/jpeg"));
        },67);
    }



    function initCKEditor() { CKEDITOR.replace('chateditor',{'height':'125px'}); }

    reSizeMessages();
    reSizeWebcam();
    makeImgDraggable($('img.dragImage'));
    $chatMsgContainer.animate({scrollTop: $chatMsgContainer[0].scrollHeight}, 500);
    //initCKEditor();


    $("#chatinput").keydown(function(e)
    {
        if (event.keyCode == 16) { shiftHeld = true }
        if (event.keyCode == 13 && !shiftHeld) { event.preventDefault() }

    });

    $("#chatinput").keyup(function(event)
    {
        if (event.keyCode == 16) { shiftHeld = false }
        if (event.keyCode == 13 && $(this).val() !='' && !shiftHeld)
        {
            socket.emit("chatMsg",'<p>' + $(this).val() + '</p>');
            $(this).val('');
        }
    });

    $("#chatinput").click(function(event)
    {
        $chatMsgContainer.animate({scrollTop: $chatMsgContainer[0].scrollHeight}, 500);
    });

    /*
    CKEDITOR.config.toolbar = [
        ['Styles','Format','Font','FontSize','TextColor',
            'BGColor','Bold','Italic','Underline',
            'NumberedList','BulletedList','Table']
    ];

    CKEDITOR.on('instanceReady',function()
    {
        var editor = CKEDITOR.instances['chateditor'];
        var editable = editor.editable();
        var _this =  $($('.cke_wysiwyg_frame').contents()[0]).find('body');

        function bindEvents()
        {
            editable.attachListener(editor.document, 'keydown', function(event)
            {
                var keyCode = event.data.$.keyCode;
                if (keyCode == 16) { shiftHeld = true; }
            });

            editable.attachListener(editor.document, 'keyup', function(event)
            {
                var style, i, len;
                var keyCode = event.data.$.keyCode;

                if (keyCode == 16) { shiftHeld = false; }

                if (keyCode == 13
                    && !shiftHeld
                    && _this.children().last().is('p')
                    && !_this.children().slice(-2).is('ul')
                    && !_this.children().slice(-2).is('ol'))
                {

                    // TODO figure out better way than temp storage
                    // delete empty html nodes
                    var toDelete = [];
                    _this.children().each(function(index,value)
                    {
                        var ele = _this.children().eq(index);
                        if (ele.text().trim() == "") { toDelete.push(ele) }
                    });
                    for (i=0,len=toDelete.length;i<len;i++) { toDelete[i].remove(); }

                    socket.emit("chatMsg",_this.html());

                    // clear editable area
                    toDelete = [];
                    _this.children().each(function(index,value)
                    {
                        toDelete.push(_this.children().eq(index));
                    });
                    for (i=0,len=toDelete.length;i<len;i++) { toDelete[i].remove(); }

                    //console.log(style);
                    //CKEDITOR.instances['chateditor'].setData(style);

                }
            });
        }

        // CKEditor's setData method clears DOM events in the iframe.  This is how you combat it.
        editor.on('contentDom',function(){ bindEvents() });
        bindEvents();

    });

    $('#chat-submit').click(function(event)
    {
        socket.emit("chatMsg",$($('.cke_wysiwyg_frame').contents()[0].body).html());
        $($('.cke_wysiwyg_frame').contents()[0].body).contents().remove();
    });
     */


    /**
     * Open dialog when user clicks on "Change your info"
     */
    $change_user_info.click(function(event) { $profile_dialog.dialog('open') });

    /**
     * Dialog for setting user info.
     */
    $profile_dialog.dialog({
        minWidth:325,
        modal: true,
        resizable: false,
        buttons:
        {
            Ok: function()
            {
                submitUserInfo();
            }
        },
        open:function()
        {
            $(".ui-dialog-titlebar-close").hide();
        }
    });

    $set_user_emoticons.click(function(event){  $emoticon_dialog.dialog('open') });

    $emoticon_dialog.dialog({
        minWidth:450,
        maxHeight:500,
        modal:true,
        resizable:false,
        autoOpen:false,
        buttons:
        {
            Ok: function()
            {

                submitEmoticons();
            }
        },
        open:function()
        {
            $(".ui-dialog-titlebar-close").hide();
        }
    });




    /////////////////////
    // SET UP DROPZONE //
    /////////////////////

    new Dropzone("div#main-div", { url: "/action/post", clickable:false});
    Dropzone.prototype.uploadFile = function (file)
    {
        $('div.dz-preview').remove();   // hackishly remove Dropzone's div
        var _this = this;
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(evt)
        {
            _this.emit("sending", file);
            socket.emit('uploadImg', {'imgData':evt.target.result,'x':file.position.x,'y':file.position.y}, function(data)
            {
                return _this.finished(file, data, evt);
            })
        };
    };


});