var User = require('./models.js').User;
var LocalStrategy = require('passport-local').Strategy;

module.exports = function(passport)
{
    passport.use(new LocalStrategy(
        {
            usernameField: 'username',
            passwordField: 'password'
        },
        function(username, password, done)
        {
            User.authenticate(username,password,done);
        }
    ));

    passport.serializeUser(function(user, done)
    {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done)
    {
        User.find({where: {'id':id}}).success(function(user)
        {
            done(null, user);
        });
    });

};