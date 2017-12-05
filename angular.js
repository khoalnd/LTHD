const app = angular.module('googleMap', ['firebase']);
const TYPE_LOCATION = {
  MY_LOCATION: 'MY_LOCATION',
  MOTEL: 'MOTEL',
  HOTEL: 'HOTEL',
};

const TYPE_ERROR = {
  NOT_FOUND: 'NOT_FOUND',
  FORMAT_ERROR: 'FORMAT_ERROR',
}

app.controller('MapController', ['$scope', '$firebase', function ($scope, $firebase) {
  // Khởi tạo state của app
  $scope.locations = [];
  $scope.locationMakers = [];
  $scope.currentLocationMaker = null;
  $scope.activeLocationId = -1;
  $scope.searchValue = '';
  $scope.latLng = {
    lat: '',
    lng: '',
  } 
  $scope.setLatLng = ({lat, lng}) => {
    $scope.latLng.lat = lat;
    $scope.latLng.lng = lng;
  } 
  

  // Dùng geolocation HTML5 để lấy vị trí hiện tại
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      // Dùng reverse geolocaton để search địa điểm hiện tại
      geocodeLatLng({
        lat: coords.latitude,
        lng: coords.longitude,
      }).then((location) => {
        $scope.$apply(() => {
          $scope.setNewCurrentLocation(location);
        });
      }).catch(error => {
        alert('Không thể lấy vị trí hiện tại của bạn');
      });
    });
  } else alert('Không thể lấy vị trí hiện tại của bạn');

   
  // Xử lý sự kiện click vào nút load location
  $scope.loadLocation = () => {
    // Load  địa điểm
	$scope.locations = [];
    //$scope.locations = loadLocations();
	var myDataRef = new Firebase("https://lthd-aa26b.firebaseio.com/");
	myDataRef.on('child_added', function (snapshot){
		var itemp = snapshot.val();
		$scope.locations.push(itemp);
	});
    // Pin marker ứng với mỗi địa điểm vào map
    $scope.locationMakers = createLocationsMakers($scope.locations);
    
  }
  // Xử lý xự kiện click vào location item
  $scope.clickLocation = (location) => {
    $scope.closeAllInfoWindow();
    // Tìm maker tương tứng, và show thông tin bên map
    const locationMaker = $scope.locationMakers.find(
      maker => maker.location.id === location.id);

    if (locationMaker) {
      locationMaker.openInfoWindow();
    }
    $scope.activeLocationId = location.id;
  }

  $scope.closeAllInfoWindow = () => {
    if ($scope.locationMakers) {
      $scope.locationMakers.forEach(maker => {
        maker.closeInfoWindow();
      })
    }
  }
  $scope.setNewCurrentLocation = (location) => {
    if ($scope.currentLocationMaker) {
      $scope.currentLocationMaker.setMap(null);
      $scope.currentLocationMaker.closeInfoWindow();
    }
    $scope.currentLocation = location;
    $scope.setLatLng(location.location);
    $scope.currentLocation.type = TYPE_LOCATION.MY_LOCATION;
    window.map
      .setCenter(new google.maps.LatLng(
        location.location.lat,
        location.location.lng));
        
    $scope.currentLocationMaker = createMaker($scope.currentLocation);
    
  }
  
  $scope.searchLocation = () => {
    const address = $scope.searchValue;
    codeAddress(address).then((location) => {
      // Thay thế location hiện tại với location tìm được
      $scope.$apply(() => {
        $scope.setNewCurrentLocation(location);
      })
      
    }).catch(error => {
       switch(error) {
          case TYPE_ERROR.NOT_FOUND:
            alert('Khó quá tìm không ra, bỏ qua nhé');
            break;
          default:
            alert('Khó quá tìm không ra, bỏ qua nhé'); 
        }
    });
  }
  $scope.searchByCoor = () => {
      const { lat, lng } = $scope.latLng;
      geocodeLatLng({ lat: lat.toString(), lng: lng.toString()})
        .then(location => {
        $scope.$apply(() => {
          $scope.setNewCurrentLocation(location);
        })
      }).catch(error => {
        switch(error) {
          case TYPE_ERROR.FORMAT_ERROR:
            alert('Nhập tọa độ không đúng format nhé');
            break;
          case TYPE_ERROR.NOT_FOUND:
            alert('Khó quá tìm không ra, bỏ qua nhé');
            break;
          default:
            alert('Khó quá tìm không ra, bỏ qua nhé'); 
        }
        if ($scope.currentLocation) {
          $scope.$apply(() => {
            $scope.setLatLng($scope.currentLocation.location);
          });
        }
     })
  }
  
  // Xử lý sự kiện click vào nút chỉ đường locaton item
  $scope.directionLocation = (location) => {
    const { directionsDisplay, directionsService } = window;
    window.directionsDisplay.setMap(null);
    window.directionsDisplay
      .setPanel(document.getElementById('text-directions'));
    window.directionsDisplay.setMap(window.map);
    window.directionsService.route({
      origin: $scope.currentLocation.location, // Điểm đi là vị trí hiện tại
      destination: location.location, // Điểm đến là vị trí đã được click
      travelMode: 'DRIVING',
    }, function(response, status) {
      if (status === 'OK') {
        directionsDisplay.setDirections(response);
      } else {
        window.alert('Directions request failed due to ' + status);
      }
    });
  };
}]);




// Reverse geocoding 1 toạ độ
const geocodeLatLng = ({ lat, lng}) => new Promise((resolve, reject) => {

  var latlng = {lat: parseFloat(lat), lng: parseFloat(lng)};
  if (Number.isNaN(latlng.lat) || Number.isNaN(latlng.lng)) {
    reject(TYPE_ERROR.FORMAT_ERROR);
    return;
  }
  window.geoCoder.geocode({'location': latlng}, function(results, status) {
    if (status === 'OK') {
      if (Array.isArray(results) && results.length > 0) {
        const result = results[0];
        resolve({
          name: result.formatted_address,
          location: {
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
          }
        });
      }
    }
    reject(TYPE_ERROR.NOT_FOUND)
  });
});


// Geocoding 1 địa chỉ
const codeAddress = (address) => new Promise((resolve, reject) => {
  window.geoCoder.geocode({
    address,
  }, (results, status) => {
    // Lấy kết quả đầu tiên
    if (status === 'OK') {
      if (Array.isArray(results) && results.length > 0) {
        const result = results[0];
        resolve({
          name: result.formatted_address,
          location: {
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
          }
        });
      }
    }
    reject(TYPE_ERROR.NOT_FOUND);
  });
});

// Tạo maker từ các location
const createLocationsMakers = locations => {
  const makers = [];
  locations.forEach((location) => {
    const maker = createMaker(location);
    makers.push(maker)
  });
  return makers;
}


// Thêm event cho maker
const addEventForMaker = (maker) => {
  const infoWindow = new google.maps.InfoWindow({
    content: makeContentForMaker(maker.location),
  })
  maker.addListener('click', () => {
    infoWindow.open(maker.getMap(), maker);
  });
  maker.openInfoWindow = () => {
    infoWindow.open(maker.getMap(), maker);
  }
  maker.closeInfoWindow = () => {
    infoWindow.close();
  }
}


const makeContentForMaker = (location) => {
  switch(location.type) {
    case TYPE_LOCATION.MY_LOCATION: 
      return `
        <div class="map-location-container">
          <h4>Vị trí của bạn: ${location.name}</h4>
        </div>
      `;
    default: 
      return `
        <div class="map-location-container">
          <h4>${location.name}</h4>
          <img src="images/${location.image}"></img>
        </div>
      `;
  }
}

const createMaker = location => {
  let maker;
  if(location.status =="on") {
	var status = location.status;
	var latlng = new google.maps.LatLng(parseFloat(location.lat), parseFloat(location.lng));
      maker = new google.maps.Marker({
        position: latlng,
        map: window.map,
        icon: 'images/bike.png'
        
      });
      maker.location = location;
  }
  addEventForMaker(maker)
  return maker
}
