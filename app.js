var app = angular.module("trenchesApp", ["ngRoute", "firebase"]);
app.constant('FBURL', "https://trenches.firebaseio.com/");
app.config(['$routeProvider', function ($routeProvider) {
	$routeProvider
		.when('/', { templateUrl: 'boards.html', controller: 'BoardListCtrl' })
		.when('/board/:boardId', { templateUrl: 'board.html', controller: 'BoardCtrl' })
		.when('/board/:boardId/card/:cardId', { templateUrl: 'card.html', controller: 'CardCtrl' })
		.otherwise({ redirectTo: '/' });
}]);
app.factory('$firebaseAuth', function($firebase, $firebaseSimpleLogin, FBURL) {
	return $firebaseSimpleLogin(new Firebase(FBURL));
});
app.controller("TrenchesCtrl", function($scope, FBURL, $firebase, $firebaseAuth) {
	var ref = new Firebase(FBURL);
	// create an AngularFire reference to the data
	var sync = $firebase(ref);
	// download the data into a local object and turn it into a three-way binding
	sync.$asObject().$bindTo($scope, 'data');

	$scope.auth = $firebaseAuth; // TODO: store the simpleLogin in a service
});
app.controller('BoardListCtrl', function BoardListCtrl($scope, $rootScope, FBURL, $firebase) {
	$rootScope.title = 'Trenches';
	var ref = new Firebase(FBURL+"boards");
	var sync = $firebase(ref);
	$scope.boards = sync.$asArray();
});
app.controller('BoardCtrl', function($scope, $rootScope, FBURL, $firebase, $firebaseAuth, $routeParams) {
	var ref = new Firebase(FBURL+"boards/"+$routeParams.boardId);
	
	$scope.boardId = $routeParams.boardId;
	var settings = $firebase(ref.child('settings')).$asObject();
	settings.$bindTo($scope, 'settings').then(function () {
		$scope.states = settings.states.split(',');
		$rootScope.title = settings.title + ' - Trenches';
	});
	var cards = $firebase(ref.child('cards')).$asArray();
	$scope.cards = cards;
	$scope.auth = $firebaseAuth;
	$scope.updateCard = function(id, update) {
		$firebaseAuth.$getCurrentUser().then(function(user) {
			update.owned_by = user.username;
			var sync = $firebase(ref.child('cards').child(id));
			sync.$update(update);
		});
	}
});
app.controller('CardCtrl', function($scope, $rootScope, FBURL, $firebase, $routeParams) {
	var ref = new Firebase(FBURL+"boards/"+$routeParams.boardId+'/cards/'+$routeParams.cardId);

	$scope.boardId = $routeParams.boardId;
	$scope.board = $firebase(new Firebase(FBURL+"boards/"+$routeParams.boardId+'/settings')).$asObject();
	var card = $firebase(ref).$asObject();
	card.$bindTo($scope, 'card').then(function() {
		$rootScope.title = card.title + ' - Trenches';
	});
});

// Custom directive for handling drag-and-drop

var isIE9 = (navigator.appVersion.indexOf('MSIE 9.0') >= 0);

app.directive('draggable', function($document) {
	return function(scope, element, attr) {
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


// Custom directive for handling inline editing (from https://docs.angularjs.org/api/ng/type/ngModel.NgModelController)

//angular.module('customControl', ['ngSanitize']).
app.directive('contenteditable', ['$sce', function($sce) {
    return {
      restrict: 'A', // only activate on element attribute
      require: '?ngModel', // get a hold of NgModelController
      link: function(scope, element, attrs, ngModel) {
      	console.log('link');
        if(!ngModel) return; // do nothing if no ng-model

        // Specify how UI should be updated
        ngModel.$render = function() {
          element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
        };

        // Listen for change events to enable binding
        element.on('blur keyup change', function() {
          scope.$apply(read);
        });
        read(); // initialize

        // Write data to the model
        function read() {
          var html = element.html();
          // When we clear the content editable the browser leaves a <br> behind
          // If strip-br attribute is provided then we strip this out
          if( attrs.stripBr && html == '<br>' ) {
            html = '';
          }
          ngModel.$setViewValue(html);
        }
      }
    };
  }]);

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