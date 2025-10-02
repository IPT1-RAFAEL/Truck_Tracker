const socket = io();  // ✅ always call io() and assign it

const userMarkers = {};
const map = L.map('map').setView([14.667, 120.967], 15);

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
    [14.673714, 120.962970], [14.674023, 120.961546]
  ]
};

// Add polygons to map with color
const barangayPolygons = {
  "Tugatog": L.polygon(barangayCoordinates.Tugatog, { color: 'blue', fillOpacity: 0.3 }).addTo(map),
  "Acacia": L.polygon(barangayCoordinates.Acacia, { color: 'green', fillOpacity: 0.3 }).addTo(map),
  "Tinajeros": L.polygon(barangayCoordinates.Tinajeros, { color: 'red', fillOpacity: 0.3 }).addTo(map)
};

// Optional: Fit map to show all polygons
const allBarangays = L.featureGroup(Object.values(barangayPolygons));
map.fitBounds(allBarangays.getBounds());

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Truck icon
const truckIcon = L.icon({
  iconUrl: 'truck.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// ✅ Identify as viewer
socket.emit('registerRole', { role: 'viewer' }); // ✅ Correct usage

// 📡 Listen for truck GPS updates
socket.on('gpsUpdate', ({ id, lat, lon }) => {
  if (!id || !lat || !lon) return;

  if (!userMarkers[id]) {
    userMarkers[id] = L.marker([lat, lon], { icon: truckIcon }).addTo(map);
    userMarkers[id].bindPopup(`🛻 Truck: ${id}`);
  } else {
    userMarkers[id].setLatLng([lat, lon]);
  }
});
