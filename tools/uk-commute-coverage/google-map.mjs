export class GoogleMap {
  constructor(containerId, logger = console) {
    this.containerId = containerId;
    this.logger = logger;
    this.map = null;
    this.directionsRenderer = null;
  }

  async initMap() {
    // Check if the container exists
    const mapContainer = document.getElementById(this.containerId);
    if (!mapContainer) {
      this.logger.error(`Map container with id ${this.containerId} not found.`);
      return;
    }
    
    // Clear the container in case it was already initialized
    mapContainer.innerHTML = '';

    // Initialize the map
    this.map = new google.maps.Map(mapContainer, {
      center: { lat: 54.5, lng: -3.4359 }, // Default view over the UK
      zoom: 5,
      gestureHandling: 'greedy',
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true
    });

    this.directionsRenderer = new google.maps.DirectionsRenderer({
      map: this.map,
      suppressMarkers: false,
    });
  }

  /**
   * Draw a route on the map
   * @param {Array} coordinates - Array of [longitude, latitude] pairs
   */
  drawRoute(coordinates) {
    if (!this.map) {
      // If map is not initialized, we can't draw. 
      // In this version, initMap should be called before drawRoute.
      this.logger.error("Map is not initialized. Cannot draw route.");
      return;
    }

    // Convert coordinates to Google LatLng objects
    const path = coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));

    const polyline = new google.maps.Polyline({
      path: path,
      geodesic: true,
      strokeColor: '#0000FF',
      strokeOpacity: 1.0,
      strokeWeight: 4,
    });

    polyline.setMap(this.map);

    // Fit the map to the bounds of the route
    const bounds = new google.maps.LatLngBounds();
    path.forEach(point => bounds.extend(point));
    this.map.fitBounds(bounds);

    // Add markers for start and end points
    if (path.length > 0) {
      new google.maps.Marker({
        position: path[0],
        map: this.map,
        title: 'Start'
      });
      new google.maps.Marker({
        position: path[path.length - 1],
        map: this.map,
        title: 'End'
      });
    }
  }

  /**
   * Alternatively, use DirectionsRenderer if we have the full result
   */
  setDirections(directionsResult) {
    if (!this.directionsRenderer) {
      this.initMap();
    }
    this.directionsRenderer.setDirections(directionsResult);
  }
}