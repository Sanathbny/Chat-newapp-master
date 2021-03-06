//	Customization

var appPort = 5000;

// Librairies

var express = require('express'), app = express();
var http = require('http')
  , server = http.createServer(app)
  , io = require('socket.io').listen(server);

const elasticsearch = require('elasticsearch');
var request = require("request");
const esClient = new elasticsearch.Client({
  host: '127.0.0.1:9200',
  log: 'error'
});




var jade = require('jade');
// var io = require('socket.io').listen(app);
var pseudoArray = ['admin']; //block the admin username (you can disable it)

// Views Options

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set("view options", { layout: false });

app.use(express.static(__dirname + '/public'));

// Render and send the main page

app.get('/', function(req, res){
  res.render('home.jade');
});
server.listen(appPort);
// app.listen(appPort);
console.log("Server listening on port " + appPort);

// Handle the socket.io connections

var users = 0; //count the users

io.sockets.on('connection', function (socket) { // First connection
	
	users += 1; // Add 1 to the count
	reloadUsers(); // Send the count to all the users
	socket.on('message', function (data) { // Broadcast the message to all
		if(pseudoSet(socket))
		{
			var transmit = {date : new Date().toISOString(), pseudo : socket.nickname, message : data};
			socket.broadcast.emit('message', transmit);
			console.log(transmit);
			// User Indexed into Elastic Search 
			var user = {
				"name" : transmit.pseudo
			};

			var options = { 
							method: 'PUT',
  							url: 'http://localhost:9200/message/user/'+transmit.pseudo,
						    headers: 
						   			{ 
								     'cache-control': 'no-cache',
								     'content-type': 'application/json' 
								    },
						  	body: user,
						  json: true };

			request(options, function (error, response, body) {
			  if (error) throw new Error(error);

			  console.log(body);
			});

			var message = {
				"user":transmit.pseudo,
				"postDate":transmit.date,
				"body":transmit.message,
				"title":"to be searched"
			};
			
			// Indexing Messages into Elastic Search 
			var counter = 1;
			var options = { 
							method: 'PUT',
  							url: 'http://localhost:9200/message/post/'+counter,
						    headers: 
						   			{ 
								     'cache-control': 'no-cache',
								     'content-type': 'application/json' 
								    },
						  	body: message,
						  json: true };

			request(options, function (error, response, body) {
			  if (error) throw new Error(error);
			  counter = counter+1;
			  console.log(body);
			});



			// var options = { 
			// 				method: 'PUT',
			// 			    url: 'http://localhost:9200/messages',
			// 			    headers: 
			// 			   			{ 
			// 						     'cache-control': 'no-cache',
			// 						     'content-type': 'application/json' 
			// 			   			},
			// 			    body: transmit,
			// 			    json: true 
			// 			  };

			// request(options, function (error, response, body) {
			//   if (error) throw new Error(error);

			//   console.log(body);
			// });








			console.log("user "+ transmit['pseudo'] +" said \""+data+"\"");
		}
				
	});
	socket.on('setPseudo', function (data) { // Assign a name to the user
		if (pseudoArray.indexOf(data) == -1) // Test if the name is already taken
		{
			pseudoArray.push(data);
			socket.nickname = data;
			socket.emit('pseudoStatus', 'ok');
			console.log("user " + data + " connected");
		}
		else
		{
			socket.emit('pseudoStatus', 'error') // Send the error
		}
	});
	socket.on('disconnect', function () { // Disconnection of the client
		users -= 1;
		reloadUsers();
		if (pseudoSet(socket))
		{
			console.log("disconnect...");
			var pseudo;
			pseudo = socket.nickname;
			var index = pseudoArray.indexOf(pseudo);
			pseudo.slice(index - 1, 1);
		}
	});
});

function reloadUsers() { // Send the count of the users to all
	io.sockets.emit('nbUsers', {"nb": users});
}
function pseudoSet(socket) { // Test if the user has a name
	var test;
	if (socket.nickname == null ) test = false;
	else test = true;
	return test;
}
