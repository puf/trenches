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
	$scope.updateCard = function(id, update) {
		var sync = $firebase(ref.child('cards').child(id));
		sync.$update(update);
	}
});


var isIE9 = (navigator.appVersion.indexOf('MSIE 9.0') >= 0);
app.directive('draggable', function($document) {
	return function(scope, element, attr) {
		element.attr('draggable', 'true');
		if (isIE9) {
			element.prepend("<a class='draghandle' draggable='true' id='"+scope.card.$id+"' href='#'><i class='fa fa-arrows'></i></a>");
		}
		element.bind('dragstart', function(e) {
			e.dataTransfer.setData('text', scope.card.$id)
		});
	}
});
app.directive('droparea', function() {
	return function(scope, element, attr, ctrl) {
		element.bind('dragover', function(e) {
			e.preventDefault();
		});
		element.bind('drop', function(e) {
			var id = e.dataTransfer.getData("text");
			var state = e.target.getAttribute('state');
			if (id && state) {
				scope.updateCard(id, { state: state });
			} 
			if (e.stopPropagation) e.stopPropagation();
			if (e.preventDefault) e.preventDefault();
			return false;
		});
	}
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