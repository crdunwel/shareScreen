var Sequelize = require("sequelize");
var _ = require('underscore');
var bcrypt = require('bcrypt');

// instantiate global sequelize object
var sequelize = new Sequelize('database', null, null,
    {
        //host:'localhost',
        //dialect: 'mysql'
        /*
        // the sql dialect of the database
        dialect: 'mysql',
        // the storage engine for sqlite - default ':memory:'
        //storage: './temp.db:'
        storage:'./temp.db'
        */
        dialect: 'sqlite',
        storage: './temp.db'
    });


////////////////////////
// DEFINE MODELS HERE //
////////////////////////


var Entity = sequelize.define('Entity',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true },
        xPos: Sequelize.INTEGER,
        yPos: Sequelize.INTEGER
    }

);

var Image = sequelize.define('Image',
    Sequelize.Utils._.extend(_.clone(Entity.rawAttributes),
    {
        url: Sequelize.STRING,      // url for client
        fsloc: Sequelize.STRING,    // location on file system
        layer: Sequelize.INTEGER
    })
);

var User = sequelize.define("User",
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true },
        username: Sequelize.STRING,
        first_name: Sequelize.STRING,
        middle_name: Sequelize.STRING,
        last_name: Sequelize.STRING,
        alias: Sequelize.STRING,
        avatar_url: Sequelize.STRING,
        salt: { type: Sequelize.STRING, required: false },
        hash: { type: Sequelize.STRING, required: false }
    },
    {
        instanceMethods:
        {
            setPassword: function (password, callback)
            {
                var that = this;
                bcrypt.genSalt(10, function(err, salt)
                {
                    bcrypt.hash(password, salt, function(err, hash)
                    {
                        that.hash = hash; that.salt = salt; that.save();
                        if (!(callback === undefined)) { callback(that) }
                    });
                });
            },
            verifyPassword: function (password, callback)
            {
                bcrypt.compare(password, this.hash, callback);
            }
        },

        classMethods:
        {
            authenticate: function(username, password, callback)
            {
                User.find({ where: {'username':username} }).success(function(user)
                {
                    if (!user)
                    {
                        return callback(null, false, "User credentials do not match")
                    }
                    user.verifyPassword(password, function(err, passwordCorrect)
                    {
                        if (err) { return callback(err) }
                        if (!passwordCorrect) { return callback(null, false, "User credentials do not match") }
                        return callback(null, user);
                    });
                }).error(function(error)
                {


                });
            }
        }
    }
);

var Message = sequelize.define("Message",
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true },
        text: Sequelize.STRING
    },
    {
        instanceMethods:
        {


        }
    }
);

var Emoticon = sequelize.define("Emoticon",
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true },
        user_id: Sequelize.STRING,
        text: Sequelize.STRING,
        media_link: Sequelize.STRING
    }
);


Message.belongsTo(User);
User.hasMany(Message);

/*

var Volume = sequelize.define('Volume',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true },
        dir: Sequelize.INTEGER
    },
    {
        timestamps: false
    }).belongsTo(Location);

var Speaker = sequelize.define('Speaker',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true },
        volumeUp: Sequelize.INTEGER,
        volumeDown: Sequelize.INTEGER,
        latitude: Sequelize.FLOAT,
        longitude: Sequelize.FLOAT
    },
    {
        timestamps: false
    });

var Fire = sequelize.define('Fire',
    {
        id: { type: Sequelize.INTEGER, autoIncrement: true },
        needsFed: Sequelize.INTEGER,
        latitude: Sequelize.FLOAT,
        longitude: Sequelize.FLOAT
    },
    {
        timestamps: false
    });


// export for use in other modules



*/

function syncDatabase(objects, type)
{
    if (!process.argv[2])
    {
        var i, j, obj, attr;

        for (i=0; i<objects.length;i++)
        {
            obj = {};
            for (j=0; j<objects[i].attributes.length; j++)
            {
                attr = objects[i].attributes[j];
                obj[attr] = objects[i][attr];
            }
            type.create(obj)
        }
    }
}


Message.findAll().success(function(messages)
{
    Emoticon.findAll().success(function(emoticons)
    {
        sequelize.sync({force: true}).success(function()
        {
            syncDatabase(messages,Message);
            syncDatabase(emoticons,Emoticon);

            User.create({username:"clay",alias:"Clayton",avatar_url:'/media/avatars/doggy.jpg'}).success(function(user)
            {
                user.setPassword("texers");
            });

            User.create({username:"gabby",alias:"Gabby",avatar_url:'/media/avatars/doggy.jpg'}).success(function(user)
            {
                user.setPassword("secretpw");
            });
        });

    }).error(function(err)
    {
        sequelize.sync({force: true});
    });

}).error(function(err)
{
    sequelize.sync({force: true});
});





exports.Entity = Entity;
exports.Image = Image;
exports.Message = Message;
exports.User = User;
exports.Emoticon = Emoticon;