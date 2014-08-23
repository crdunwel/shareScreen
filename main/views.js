var env, passport;
var models = require('./models.js');
var Sequelize = require('sequelize');
var async = require("async");




/**
 * Primary rendering function
 *
 * @param response  Object  Function passed from callback
 * @param pageName  String  Name of page to render
 * @param kwargs    Object  Optional arguments for template as javascript object
 */
function render(response, pageName, kwargs)
{
    console.log('Rendering ' + pageName);
    var start = Date.now();
    kwargs = kwargs == 'undefined' ? {}:kwargs;
    response.render('./'+pageName+'/'+pageName+'.html', kwargs);
    console.log('Page rendered in ' + ((Date.now()-start)/1000) + " seconds");
}

function ajaxRender(response, pageName, kwargs)
{
    kwargs = kwargs == 'undefined' ? {}:kwargs;
    var bodyTemplate = env.getTemplate('./'+pageName+'/'+pageName+'-body.html');
    return bodyTemplate.render(kwargs);
}

// Object to map pages to output.
module.exports =
{
    setEnvironment: function(environment)
    {
        env = environment;
    },

    setPassport: function(pp)
    {
        passport = pp;
    },

    renderTemplate: function(template,kwargs)
    {
        kwargs = kwargs === undefined ? {}:kwargs;
        return env.getTemplate(template).render(kwargs);
    },

    loginGET: function(request, response)
    {
        render(response,'login');
    },

    loginPOST: function(request, response, next)
    {
        if (!request.body.username || !request.body.password )
        {
            render(response, 'login', {'error':"Please enter a username and password"});
        }
        else
        {
            passport.authenticate('local', function(err, user, info)
            {
                if (user)
                {
                    request.logIn(user, function(err)
                    {
                        if (err) { return next(err) }
                        if (request.session.lastpath) { return response.redirect(request.session.lastpath) }
                        return response.redirect('/frontPage')
                    });
                }
                else { render(response,'login',{'error':info}) }
            })(request, response);
        }
    },

    frontPage: function(request, response)
    {
        async.auto({
            emoticons: function(callback)
            {
                models.Emoticon.findAll().success(function(emoticons)
                {
                    callback(null,emoticons);

                });
            },
            images: function(callback)
            {
                models.Image.findAll().success(function(images)
                {
                    callback(null,images);
                });
            },
            messages: function(callback)
            {
                models.Message.findAll().success(function(messages)
                {
                    callback(null,messages);
                });
            },
            setUsers: ['messages', function(callback, results)
            {
                async.each(results.messages, function(msg,done)
                {
                    msg.getUser().success(function(user)
                    {
                        msg.user = user; done();
                    });
                },
                function(err)
                {
                    callback(null,results.messages);
                });
            }],
            render: ['emoticons','images','messages','setUsers', function(callback, results)
            {
                render(response,'frontPage',
                    {images:results.images,
                     messages:results.messages,
                     emoticons:results.emoticons,
                     receiver:request.user
                    });
            }]
        });

    },

    techPage: function(request, response)
    {
        render(response, 'frontPage');
    },

    clientPage: function (request, response)
    {
        render(response, 'frontPage');
    }

};

// AUXILLARY FUNCTIONS

/**
 * This is a reverse hash map lookup function
 *
 * @param fn
 * @return {*}
 */
function name(fn) { for (var o in module.exports) { if (fn===module.exports[o]) {return o} }}

/**
 * Merges two javascript objects into one
 *
 * @return {Object}
 */
function objectMerge()
{
    var out = {};
    if(!arguments.length) { return out; }
    for(var i=0; i<arguments.length; i++)
    {
        for(var key in arguments[i])
        {
            out[key] = arguments[i][key];
        }
    }
    return out;
}