
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Welcome to a Salesforce Bulk API demo with node-salesforce module' })
};