
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index');
};

exports.helloworld = function(req, res){
  res.render('helloworld', {title: 'Hello, World!' });
};
