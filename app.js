// handy snippets for the JavaScript console:
// 	angular.element(document.body).scope()
// 	angular.element(document.body).injector().get('board')
var app = angular.module("trenchesApp", ["ngRoute", "firebase"]);
app.constant('FBURL', "https://trenches.firebaseio.com/");
app.config(['$routeProvider', function ($routeProvider) {
	$routeProvider
		.when('/', { templateUrl: 'boards.html', controller: 'BoardListController' })
		.when('/board/:boardId', { templateUrl: 'board.html', controller: 'BoardController' })
		.when('/board/:boardId/card/:cardId', { templateUrl: 'card.html', controller: 'CardController' })
		.when('/board/:boardId/admin', { templateUrl: 'admin.html', controller: 'AdminController' })
		.otherwise({ redirectTo: '/' });
}]);
app.factory('Auth', function(FBURL, $firebaseAuth) {
	return $firebaseAuth(new Firebase(FBURL));
});
app.factory('board', function($firebase, Auth, FBURL, $routeParams) {
	var ref = new Firebase(FBURL+"boards/"+$routeParams.boardId);	
	var settings = $firebase(ref.child('settings')).$asObject();
	var cards = $firebase(ref.child('cards')).$asArray();	
	var states = $firebase(ref.child('states')).$asArray();
	var users = $firebase(ref.child('users')).$asArray();
	function updateCard(id, update) {
		Auth.$requireAuth().then(function(user) {
			//console.log(user);
			update.owned_by = user[user.provider].username;
			var sync = $firebase(ref.child('cards').child(id));
			sync.$update(update);
		});
	};
	function addCard(state, callback) {
		Auth.$requireAuth().then(function(user) {
			var card = { title: 'Card '+(cards.length+1), created_by: user[user.provider].username, created_at: Firebase.ServerValue.TIMESTAMP, state: state.$value };
			cards.$add(card).then(function(added) {
				if (callback) callback(added);
			});
		});
	};
	function removeCard(id) {
		return cards.$remove(cards.$getRecord(id));
	};
	return {
		ref: ref,
		id: $routeParams.boardId,
		settings: settings,
		states: states,
		cards: cards,
		users: users,
		updateCard: updateCard,
		addCard: addCard,
		removeCard: removeCard
	}
});
app.controller("TrenchesController", function TrenchesController($scope, FBURL, $firebase, Auth, $timeout) {
	$scope.auth = Auth;
	$scope.user = Auth.$getAuth();
	$scope.auth.$onAuth(function(authData) {
		// user logged on or off -> update scope
		$timeout(function() {
			$scope.auth = Auth;
			$scope.user = Auth.$getAuth();
		});
	});
});
app.controller('BoardListController', function BoardListController($scope, $rootScope, FBURL, $firebase) {
	$rootScope.title = 'Trenches';
	var ref = new Firebase(FBURL+"boards");
	var sync = $firebase(ref);
	$scope.boards = sync.$asArray();
});
app.controller('BoardController', function BoardController($scope, $rootScope, FBURL, $firebase, Auth, $location, $routeParams, board) {
	$scope.boardId = board.id;
	$scope.states = board.states;
	board.settings.$bindTo($scope, 'settings').then(function () {
		$rootScope.title = board.settings.title + ' - Trenches';
	});
	$scope.cards = board.cards;
	$scope.auth = Auth; // TODO: figure out why this and next line are needed, since they should already be inherited from the scope of TrenchesController
	$scope.user = Auth.$getAuth();
	$scope.updateCard = board.updateCard;
	Auth.$requireAuth().then(function(user) {
		$scope.me = $firebase(board.ref.child('users/'+user.uid)).$asObject();
	});
	$scope.addCard = function(state) {
		board.addCard(state, function(card) {
			$location.path('/board/'+$scope.boardId+'/card/'+card.key());
		});
	};
});
app.controller('CardController', function CardController($scope, $rootScope, FBURL, $firebase, $location, $routeParams, board) {
	var ref = new Firebase(FBURL+"boards/"+$routeParams.boardId+'/cards/'+$routeParams.cardId);

	$scope.boardId = $routeParams.boardId;
	$scope.board = board.settings;

	var card = $firebase(ref).$asObject();
	card.$bindTo($scope, 'card').then(function() {
		$rootScope.title = card.title + ' - Trenches';
	});

	$scope.removeCard = function() {
		if (confirm("Are you sure you want to delete '"+card.title+"'?")) {
			board.removeCard($routeParams.cardId).then(function() {
				$location.path('/board/'+$scope.boardId);				
			}, function (error) {
				alert(error);
			});
		}
	};
});
app.controller('AdminController', function AdminController($scope, $rootScope, board) {
	$scope.board = board;
});

// Custom directive for handling drag-and-drop

var isIE9 = (navigator.appVersion.indexOf('MSIE 9.0') >= 0);

app.directive('draggable', function($document) {
	return function(scope, element, attr) {
		if (!scope.user) return;
		element.attr('draggable', 'true');
		if (isIE9) {
			element.prepend("<a class='draghandle' draggable='true' id='"+scope.card.$id+"' href='#'><i class='fa fa-arrows'></i></a>");
		}
		element.bind('dragstart touchstart', function(e) {
			e.dataTransfer.setData('text', scope.card.$id)
		});
	}
});
app.directive('droparea', function() {
	return function(scope, element, attr, ctrl) {
		element.bind('dragover', function(e) {
			e.preventDefault();
		});
		element.bind('drop touchend', function(e) {
			var id = e.dataTransfer.getData("text");
			var state = e.target.getAttribute('state');
			if (id && state) {
				scope.updateCard(id, { state: state, owned_by: 'auth.user.username' });
			} 
			if (e.stopPropagation) e.stopPropagation();
			if (e.preventDefault) e.preventDefault();
			return false;
		});
	}
});
