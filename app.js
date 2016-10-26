var builder = require('botbuilder');
var restify = require('restify');
var weatherClient = require('./wunderground');
//var http = require('http');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
server.get('/', restify.serveStatic({
    directory: __dirname,
    default: '/index.html'
}));

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD;
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/
const LuisModelUrl = process.env.LUIS_MODEL_URL || 'https://api.projectoxford.ai/luis/v1/application?id=c413b2ef-382c-45bd-8ff0-f76d60e2a821&subscription-key=3fa570ae50234017b9632b3b7180df43&q=';

// Create LUIS recognizer that points at our model and add it as the root '/' dialog for our Cortana Bot.
//var model = '
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
var intents = new builder.IntentDialog();
bot.dialog('/', [
    function (session, args, next) {
        
        if (!session.userData.name) {
            session.beginDialog('/profile');
        	
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
    	session.send('My name is Mr. Weather-man');
    	session.send('I am a weather bot and I can fetch you weather details of any place around the world...');
    	session.beginDialog('/weather');
    },

    function (session, results) {
    //session.beginDialog('/NextIteration');
    //session.beginDialog('/weather');
    dialog.matches(/^yes/i, [
    function (session, results) {
        builder.Prompts.text(session, "Tell me the next location please..")
    	session.beginDialog('/weather');
    }]),
    dialog.matches(/^no/i, [
    function (session) {
        builder.Prompts.text(session, "Thank You.");
    	session.endDialog();
    }
]);
    }
]);

bot.dialog('/profile', [
    function (session) {
    	builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialogWithResult();
    }
]);

bot.dialog('/weather', dialog);
dialog.matches('builtin.intent.weather.check_weather', [
    (session, args, next) => {
        var locationEntity = builder.EntityRecognizer.findEntity(args.entities, 'builtin.weather.absolute_location');
        if (locationEntity) {
            return next({ response: locationEntity.entity });
        } else {
            builder.Prompts.text(session, 'What location?');
        }
    },
    (session, results) => {
        weatherClient.getCurrentWeather(results.response, (responseString) => {
            session.send(responseString);
        	//session.endDialog();
        	session.send("Would you like to search for another location ??");
        //if (session.userData.name) {
           // session.beginDialog('/NextIteration');
        	
        session.endDialog();
       // }
        });
    },
     /*(session, args, next) =>{
        session.send("NextIteration");
        if (!session.userData.name) {
            session.beginDialog('/NextIteration');
        	
        }}*/
]);

bot.dialog('/NextIteration', intents);
//builder.Prompts.text("Would you like to search for another location ??");
intents.matches(/^yes/i, [
    function (session, results) {
        builder.Prompts.text(session, "Tell me the next location please..")
    	session.replaceDialog('/profile')
    }]),
    intents.matches(/^no/i, [
    function (session) {
        builder.Prompts.text(session, "Thank You.");
    	session.endDialog();
    }
]);

dialog.onDefault(builder.DialogAction.send("Sorry but I couldn't understand you."));
