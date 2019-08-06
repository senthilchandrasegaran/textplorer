/***********************************************************************
 * Textplorer: a framework to aid the Grounded Theory Method in
 * Qualitative Text Analysis
 * Code by Senthil Chandrasegaran & Karthik Badam
 **********************************************************************/

/**
 * Module dependencies.
 */

var express = require('express');
// new middleware packages installed instead of using those in express
// var favicon = require('serve-favicon')
var morgan = require('morgan')
var bodyParser = require('body-parser')
var methodOverride = require('method-override')
var cookieParser = require('cookie-parser')
var session = require('express-session')
var serveStatic = require('serve-static')
var errorHandler = require('errorhandler')
// end middleware packages
// var routes = require('./routes');
// var user = require('./routes/user');
var http = require('http');
var path = require('path');
var ejs = require('ejs');
var url = require('url');
var resumable = require('resumable');
var jwt = require('express-jwt');
var app = express();
var fs = require('fs');
// exec = require('child_process').exec,
// util = require('util'),
// admZip = require('adm-zip');
// var pythonShell = require('python-shell');
let {PythonShell} = require('python-shell')

// all environments
app.set('port', process.env.PORT || 8000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
// app.use(favicon());         // previously express.favicon()
app.use(morgan('dev'));     // previously express.logger('dev')
app.use(bodyParser.json())  // previously express.json()
app.use(bodyParser.urlencoded(
    {extended: false}))     // previously express.urlencoded())
app.use(methodOverride());  // previously express.methodOverride()
app.use(cookieParser('your secret here'));  // previously express.cookieParser()
// app.use(session());                         // previously express.session()
app.use(session({
    secret: 'your secret here',
    // name: cookie_name,
    // store: sessionStore, // connect-mongo session store
    proxy: true,
    resave: true,
    saveUninitialized: true
}));

// app.use(app.router);
// app.use(express.static(path.join(__dirname, 'public')));
app.use(serveStatic(path.join(__dirname, 'public')));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded(
//     {extended: false}))  // previously express.urlencoded())
app.engine('html', require('ejs').renderFile);

/* uploaded files */
var Files = {};

// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());  // previously express.errorHandler()
}
// variables for transcript:
var inputtrans = {id: 'inputtrans'};
var infoContent = {id: 'infoContent'};
var outputtrans = {id: 'outputtrans', target: ''};
var outputInfoContent = {id: 'outputInfoContent', target: ''};

var userlog = {id: 'userlog'};
var clicklog = {id: 'clicklog'};

/* listen */
var httpserver = http.createServer(app);
httpserver.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});


/***************** UPLOADING DATA TO THE SERVER**********************/
// The following function launches the index.html page where the user
// uploads the data
// See views/index.html for the corresponding html file
app.get('/', function(req, res) {
    // this '/' refers to '/index.html'
    // note changing it to app.get('/index.html'... will require the
    // user to include 'index.html' in the web address.
    res.render('index.html', {
        inputtrans: inputtrans,
        outputtrans: outputtrans,
        infoContent: infoContent,
        outputInfoContent: outputInfoContent,
        /*
         * TO ADD NEW DATASET:
         * Copy the block of code below,
         * Uncomment it,
         * Then rename all occurrences of 'newData' to a meaningful name.
         */
        /*
           newDataSeries: newDataSeries,
           newDataSeriesOutput: newDataSeriesOutput,
        */
    });
});
/****************END UPLOADING DATA TO THE SERVER**********************/

/****************HANDLE UPLOADED DATA : HOST URL***********************/
// The next few functions handle the uploaded data and create URLs for
// the client-side code to access them.

app.post('/transcript_file', function(req, res) {
    var transcriptParams = req.body;
    outputtrans.target = transcriptParams.transcript;
    // this sets the above defined variables
    res.end();
});

app.get('/receive_transcript_file', function(req, res) {
    res.writeHead(200);
    res.write(outputtrans.target);
    res.end()
});

/**********END OF HANDLING UPLOADED DATA : HOST URL********************/

/************************DATA ON CLIENT PAGE***************************/
// This function handles the main.html file, which is the VizScribe
// interface. See views/main.html for the corresponding file
app.get('/main', function(req, res) {
    res.render('main.html', {
        inputtrans: inputtrans,
        outputtrans: outputtrans,
        outputInfoContent: outputInfoContent,
    });
});
/**********************END OF DATA ON CLIENT PAGE**********************/

// LOGGING USER ACTIVITY (FOR USER STUDIES)
// records a log of user activity
app.post('/userlog', function(req, res) {
    fs.writeFile(
        'public/userlog/userlog.csv', String(req.body.data), function(err) {
            if (err) throw err;
            console.log('userlog.csv was written');
            // res.send(200);
            res.status(200);
        });
});

app.post('/clicklog', function(req, res) {
    // write user log file as text
    fs.writeFile(
        'public/clicklog/clicklog.csv', String(req.body.data), function(err) {
            if (err) throw err;
            console.log('clicklog.csv was written');
            // res.send(200);
            res.status(200);
        });
});


// EXPERIMENTAL: USE PYTHON NLP FOR SERVER-SIDE TEXT PROCESSING
var options = {
    mode: 'text',
    pythonPath: '/usr/local/bin/python3',
    pythonOptions: ['-u'],
    scriptPath: './public/pythonscripts/',
    // args:  outputtrans.target,
};

app.post('/infoContent', function(req, res) {
    // invoke this just once, and send all the data over to the client.
    // This will make the code more responsive.
    // var infoContentParams = req.body;
    var pyShell = new PythonShell('infoContent.py', options)
    // pyShell.send(req.body.data);
    // send the transcript text to the python shell
    pyShell.send(outputtrans.target);
    pyShell.on('message', function(message) {
        infoContentDict = message
        console.log(infoContentDict)
        res.status(200).send({data: infoContentDict});
        // res.send(200, {data: infoContentDict});
        // outputInfoContent.target = infoContentParams.infoContent;
    });
    pyShell.end(function(err) {
        if (err) throw err;
    });
});

