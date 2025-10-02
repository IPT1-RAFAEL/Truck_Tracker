const socket = io();

// Store all user markers by socket ID
const userMarkers = {};
const userPaths = {};
const userStatuses = {};

let firstGpsUpdateReceived = false;
let firstGpsUpdateSent = false;

let truckId = localStorage.getItem('truckId');

if (!truckId) {
  truckId = prompt("Enter your truck's barangay (e.g., 'Acacia Truck'):");
  localStorage.setItem('truckId', truckId);
}

const map = L.map('map', {
  center: [14.667, 120.967],
  zoom: 15
});

// Remove bounds limit
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);



// Barangay geofences
const barangayCoordinates = {
  "Tugatog": [
    [14.667449, 120.965986], [14.666216, 120.966383], [14.665988, 120.966040], [14.665008, 120.966428],
    [14.664809, 120.966214], [14.664023, 120.966670], [14.663252, 120.967256], [14.662986, 120.966965],
    [14.662171, 120.967583], [14.661695, 120.966961], [14.660724, 120.967661], [14.661495, 120.968633],
    [14.661993, 120.969388], [14.661480, 120.970016], [14.660953, 120.970279], [14.662487, 120.972444],
    [14.662846, 120.972181], [14.663049, 120.972442], [14.662926, 120.972903], [14.664520, 120.972744],
    [14.667162, 120.972561], [14.666428, 120.970429], [14.666855, 120.969847], [14.666429, 120.968604],
    [14.666396, 120.967794], [14.667825, 120.967165]
  ],
  "Acacia": [
    [14.668071, 120.965749], [14.667449, 120.965986], [14.667825, 120.967165], [14.666396, 120.967794],
    [14.666429, 120.968604], [14.666855, 120.969847], [14.666428, 120.970429], [14.667162, 120.972561], 
    [14.670432, 120.972290]
  ],
  "Tinajeros": [
    [14.667972, 120.964049], [14.667887, 120.964860], [14.668071, 120.965749], [14.670432, 120.972290], 
    [14.677715, 120.971895], [14.678770, 120.969644], [14.679010, 120.968854], [14.678903, 120.968223], 
    [14.677966, 120.966727], [14.677305, 120.966309], [14.674017, 120.964780], [14.673719, 120.964359], 
    [14.673714, 120.962970],[14.674023, 120.961546]
  ]
};

const barangayPolygons = {
  "Tugatog": L.polygon(barangayCoordinates.Tugatog, { color: 'blue', fillOpacity: 0.3 }).addTo(map),
  "Acacia": L.polygon(barangayCoordinates.Acacia, { color: 'green', fillOpacity: 0.3 }).addTo(map),
  "Tinajeros": L.polygon(barangayCoordinates.Tinajeros, { color: 'red', fillOpacity: 0.3 }).addTo(map)
};

// Auto-fit map to geofences initially
const allLayers = L.featureGroup(Object.values(barangayPolygons));
map.fitBounds(allLayers.getBounds());

// Truck icon
const truckIcon = L.icon({
  iconUrl: 'truck.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});


// Function to check if a point is inside a polygon
function checkGeofence(lat, lon, geofenceCoords) {
  const point = turf.point([lon, lat]);
  const coords = geofenceCoords.map(c => [c[1], c[0]]);
  if (coords[0][0] !== coords.at(-1)[0] || coords[0][1] !== coords.at(-1)[1]) {
    coords.push(coords[0]);
  }
  const polygon = turf.polygon([coords]);
  return turf.booleanPointInPolygon(point, polygon);
}

// Determine which geofence a user is in
function getGeofenceName(lat, lon) {
  for (const [name, coords] of Object.entries(barangayCoordinates)) {
    if (checkGeofence(lat, lon, coords)) return name;
  }
  return null;
}


// 📍 Real-time GPS update handler
socket.on('gpsUpdate', ({ id, lat, lon }) => {
  if (!lat || !lon || !id) return;

  if (!firstGpsUpdateReceived && id === socket.id) {
    firstGpsUpdateReceived = true;
  }

  // 🛻 Add/update marker
  if (!userMarkers[id]) {
    userMarkers[id] = L.marker([lat, lon], { icon: truckIcon }).addTo(map);
    userMarkers[id].bindPopup(id === socket.id ? '📍 You are here' : `👤 User: ${id}`);
  } else {
    userMarkers[id].setLatLng([lat, lon]);
  }

  // 🛣️ Only track path after first real point
  if (firstGpsUpdateReceived) {
    if (!userPaths[id]) {
      userPaths[id] = L.polyline([[lat, lon]], { color: id === socket.id ? 'blue' : 'gray' }).addTo(map);
    } else {
      userPaths[id].addLatLng([lat, lon]);
    }
  }
  // 🚧 Geofence entry/exit detection
  const currentZone = getGeofenceName(lat, lon);
  const previousZone = userStatuses[id] || null;

  if (currentZone !== previousZone) {
    if (currentZone) {
      console.log(`✅ ${id} entered ${currentZone}`);
    } else if (previousZone) {
      console.log(`⚠️ ${id} exited ${previousZone}`);
    }
    userStatuses[id] = currentZone;
  }

  // Update UI
  if (id === socket.id) {
    document.getElementById('status').textContent =
      currentZone
        ? `✅ You are inside ${currentZone} geofence`
        : '❌ You are outside all geofences';
  }
});

// ✅ Show connection status
socket.on('connect', () => {
  console.log('✅ Connected to server as', socket.id);
});

// ❌ Show disconnection
socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

// 🛰️ Continuously track user’s location
if (navigator.geolocation) {
navigator.geolocation.watchPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    console.log('📍 User location:', latitude, longitude);

    // Send GPS only once initially to prevent sending fallback default location
    if (!firstGpsUpdateSent) {
      firstGpsUpdateSent = true;
      socket.emit('gpsUpdate', {
        id: truckId,
        lat: latitude,
        lon: longitude
      });
    }

    // You can also place your own marker locally here, if needed
    if (!userMarkers[socket.id]) {
      userMarkers[socket.id] = L.marker([latitude, longitude], { icon: truckIcon }).addTo(map);
      userMarkers[socket.id].bindPopup("📍 You are here").openPopup();
    } else {
      userMarkers[socket.id].setLatLng([latitude, longitude]);
    }

    map.setView([latitude, longitude], 16);
  },
    (error) => {
      console.error('❌ Location error:', error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    }
  );
} else {
  console.warn('⚠️ Geolocation not supported in this browser.');
}

socket.emit('registerRole', { role: 'truck', id: truckId });
