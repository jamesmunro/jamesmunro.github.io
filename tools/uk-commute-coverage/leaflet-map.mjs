
export class LeafletMap {
  constructor(containerId, logger = console) {
    this.containerId = containerId;
    this.logger = logger;
    this.map = null;
  }

  initMap() {
    // Check if the container exists
    const mapContainer = document.getElementById(this.containerId);
    if (!mapContainer) {
      this.logger.error(`Map container with id ${this.containerId} not found.`);
      return;
    }
    
    // Clear the container in case it was already initialized
    mapContainer.innerHTML = '';

    // Initialize the map
    this.map = L.map(this.containerId).setView([54.5, -3.4359], 5); // Default view over the UK

    // Add a tile layer from OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);
  }

  drawRoute(coordinates) {
    if (!this.map) {
        this.initMap();
    }
    if (!this.map) {
      this.logger.error("Map is not initialized. Cannot draw route.");
      return;
    }

    // The coordinates from OpenRouteService are [longitude, latitude],
    // Leaflet expects [latitude, longitude].
    const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

    // Create a polyline from the lat-lngs and add it to the map
    const polyline = L.polyline(latLngs, { color: 'blue' }).addTo(this.map);

    // Fit the map to the bounds of the route
    this.map.fitBounds(polyline.getBounds());

    // Add markers for start and end points
    if (latLngs.length > 0) {
        L.marker(latLngs[0]).addTo(this.map).bindPopup('Start');
        L.marker(latLngs[latLngs.length - 1]).addTo(this.map).bindPopup('End');
    }
  }
}
