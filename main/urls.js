var url = require('url');
var views = require('./views.js');

/**
 * This helper function checks if a user is logged in before showing a view
 *
 * @param request
 * @param response
 * @param next
 * @return {*}
 */
function ensureAuthenticated(request, response, next)
{
    request.session.lastpath = url.parse(request.url).pathname;
    if (request.isAuthenticated()) { return next() }
    return response.redirect('/login')
}

/**
 * URL MATCHING
 *
 * @param app   express app passed from server.js
 */
module.exports = function(app)
{
    app.get('/',views.loginGET);
    app.post('/',views.loginPOST);
    app.get('/login',views.loginGET);
    app.post('/login',views.loginPOST);
    app.get('/frontPage',ensureAuthenticated, views.frontPage);
    app.get('/client',ensureAuthenticated, views.clientPage);
};