module.exports = function(env)
{
    env.addFilter('getUser', function(msg)
    {
        msg.getUser().success(function(user)
        {
            return user.alias;
        });
    });
};