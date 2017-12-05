angular.module('googleMap', ['firebase'])

.controller('bikes', function ($firebase) {

	var myDataRef = new Firebase("https://lthd-aa26b.firebaseio.com/");
	const sync = firebase.database().ref();
	
	return {
		all: function() {
		  return sync.$asArray();
		}
	}
}])