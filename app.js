var app = angular.module("trenchesApp", ["ngRoute", "firebase"]);
app.config(['$routeProvider', function ($routeProvider) {
	$routeProvider
		.when('/', { templateUrl: 'boards.html', controller: 'BoardListCtrl' })
		.when('/board/:boardId', { templateUrl: 'board.html', controller: 'BoardCtrl' })
		//.when('/q/:qId', { templateUrl: 'question.html', controller: QuestionCtrl })
		.otherwise({ redirectTo: '/' });
}]);
app.controller("TrenchesCtrl", function($scope, $firebase, $firebaseSimpleLogin) {
	var ref = new Firebase("https://trenches.firebaseio.com/");
	// create an AngularFire reference to the data
	var sync = $firebase(ref);
	// download the data into a local object and turn it into a three-way binding
	sync.$asObject().$bindTo($scope, 'data');

	$scope.auth = $firebaseSimpleLogin(ref); // TODO: store the simpleLogin in a service
});
app.controller('BoardListCtrl', function BoardListCtrl($scope, $rootScope, $firebase) {
	$rootScope.title = 'Trenches';
	var ref = new Firebase("https://trenches.firebaseio.com/boards");
	var sync = $firebase(ref);
	$scope.boards = sync.$asArray();
});
app.controller('BoardCtrl', function($scope, $rootScope, $firebase, $routeParams) {
	var ref = new Firebase("https://trenches.firebaseio.com/boards/"+$routeParams.boardId);
	
	var settings = $firebase(ref.child('settings')).$asObject();
	settings.$bindTo($scope, 'settings').then(function () {
		$scope.states = settings.states.split(',');
		$rootScope.title = settings.title + ' - Trenches';
	});
	var cards = $firebase(ref.child('cards')).$asArray();
	$scope.cards = cards;
	cards.$loaded(function(data) {
		$scope.cardsByState = [];
		$scope.states.forEach(function(state) {
			$scope.cardsByState[state] = [];
			cards.forEach(function (card) {
				if (card.state == state) {
					$scope.cardsByState[state].push(card);
				}
			});
		});		
	});
});

// some non-angular helpers

function addSampleCards() {
	var ref = new Firebase("https://trenches.firebaseio.com/boards");
	ref.once('child_added', function(boardsnap) {
		var board = boardsnap.ref();
		var cards = board.child('cards');
		cards.push({ title: 'First card', state: 'new', created_at: Firebase.ServerValue.TIMESTAMP });
		setTimeout(function() {
			cards.push({ title: 'Second card', state: 'working', created_at: Firebase.ServerValue.TIMESTAMP });
		}, 5000);
		setTimeout(function() {
			cards.push({ title: 'Third card', state: 'done', created_at: Firebase.ServerValue.TIMESTAMP });
		}, 2500);
	});
}