/**
 * Google Maps integration module
 * Handles map initialization, route display, and tile overlays
 */
export class GoogleMap {
    containerId;
    logger;
    map;
    directionsRenderer;
    renderers;
    overlays;
    constructor(containerId, logger = console) {
        this.containerId = containerId;
        this.logger = logger;
        this.map = null;
        this.directionsRenderer = null;
        this.renderers = [];
        this.overlays = [];
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
        this.clearDirections();
    }
    /**
     * Clear all directions renderers
     */
    clearDirections() {
        if (this.renderers) {
            this.renderers.forEach(r => r.setMap(null));
        }
        this.renderers = [];
        this.directionsRenderer = null;
    }
    /**
     * Add a tile overlay to the map
     * @param url - URL of the tile image
     * @param bounds - {south, west, north, east}
     * @param opacity - Opacity of the overlay (0-1)
     */
    addTileOverlay(url, bounds, opacity = 0.5) {
        if (!this.map)
            return;
        if (!bounds || isNaN(bounds.north) || isNaN(bounds.south) || isNaN(bounds.east) || isNaN(bounds.west)) {
            this.logger.error("Invalid bounds provided to addTileOverlay:", bounds);
            return;
        }
        const imageBounds = {
            north: bounds.north,
            south: bounds.south,
            east: bounds.east,
            west: bounds.west,
        };
        const overlay = new google.maps.GroundOverlay(url, imageBounds, {
            map: this.map,
            opacity: opacity,
            clickable: false
        });
        this.overlays.push(overlay);
        return overlay;
    }
    /**
     * Clear all overlays from the map
     */
    clearOverlays() {
        this.overlays.forEach(overlay => overlay.setMap(null));
        this.overlays = [];
    }
    /**
     * Draw a route on the map
     * @param coordinates - Array of [longitude, latitude] pairs
     */
    drawRoute(coordinates) {
        this.logger.log("drawRoute called with", coordinates?.length, "coordinates");
        if (!this.map) {
            this.logger.error("Map is not initialized. Cannot draw route.");
            return;
        }
        if (!coordinates || !Array.isArray(coordinates) || coordinates.length === 0) {
            this.logger.warn("No coordinates provided to drawRoute.");
            return;
        }
        // Convert coordinates to Google LatLng objects, filtering out invalid ones
        const path = coordinates
            .map((coord, idx) => {
            if (!Array.isArray(coord) || coord.length < 2) {
                this.logger.warn(`Invalid coordinate format at index ${idx}:`, coord);
                return null;
            }
            const lat = Number(coord[1]);
            const lng = Number(coord[0]);
            if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) {
                this.logger.warn(`Invalid coordinate values at index ${idx}: lat=${coord[1]}, lng=${coord[0]}`);
                return null;
            }
            return { lat, lng };
        })
            .filter((p) => p !== null);
        if (path.length === 0) {
            this.logger.error("No valid coordinates to draw route.");
            return;
        }
        this.logger.log("Drawing polyline with", path.length, "valid points");
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
        if (!bounds.isEmpty()) {
            this.map.fitBounds(bounds);
        }
        // Add markers for start and end points with extra safety
        if (path.length > 0) {
            const startPos = path[0];
            const endPos = path[path.length - 1];
            this.logger.log("Adding markers at", startPos, "and", endPos);
            try {
                // Extra validation before marker creation
                if (startPos && typeof startPos.lat === 'number' && typeof startPos.lng === 'number' &&
                    !isNaN(startPos.lat) && !isNaN(startPos.lng) && isFinite(startPos.lat) && isFinite(startPos.lng)) {
                    new google.maps.Marker({
                        position: startPos,
                        map: this.map,
                        title: 'Start'
                    });
                }
                else {
                    this.logger.warn("Invalid start position for marker:", startPos);
                }
                if (endPos && typeof endPos.lat === 'number' && typeof endPos.lng === 'number' &&
                    !isNaN(endPos.lat) && !isNaN(endPos.lng) && isFinite(endPos.lat) && isFinite(endPos.lng)) {
                    new google.maps.Marker({
                        position: endPos,
                        map: this.map,
                        title: 'End'
                    });
                }
                else {
                    this.logger.warn("Invalid end position for marker:", endPos);
                }
            }
            catch (e) {
                this.logger.error("Failed to add start/end markers:", e);
            }
        }
    }
    /**
     * Show all routes from a directions result
     */
    setDirections(directionsResult) {
        this.logger.log("setDirections called");
        if (!this.map)
            return;
        this.clearDirections();
        if (!directionsResult || !directionsResult.routes || directionsResult.routes.length === 0) {
            this.logger.warn("No valid routes in directionsResult.");
            return;
        }
        // Validate that routes have valid start/end locations before creating renderers
        const firstRoute = directionsResult.routes[0];
        if (firstRoute && firstRoute.legs && firstRoute.legs[0]) {
            const leg = firstRoute.legs[0];
            const startLoc = leg.start_location;
            const endLoc = leg.end_location;
            const getLatLng = (loc) => {
                if (!loc)
                    return { lat: NaN, lng: NaN };
                const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
                const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
                return { lat, lng };
            };
            const start = getLatLng(startLoc);
            const end = getLatLng(endLoc);
            if (isNaN(start.lat) || isNaN(start.lng) || isNaN(end.lat) || isNaN(end.lng) ||
                !isFinite(start.lat) || !isFinite(start.lng) || !isFinite(end.lat) || !isFinite(end.lng)) {
                this.logger.error("DirectionsResult has invalid start/end locations:", { start, end });
                // Fall back to drawRoute without markers
                if (firstRoute.overview_path) {
                    const coords = firstRoute.overview_path
                        .map(p => {
                        const lat = typeof p.lat === 'function' ? p.lat() : p.lat;
                        const lng = typeof p.lng === 'function' ? p.lng() : p.lng;
                        return (isNaN(lat) || isNaN(lng)) ? null : [lng, lat];
                    })
                        .filter((c) => c !== null);
                    if (coords.length > 0) {
                        this.drawRoute(coords);
                    }
                }
                return;
            }
        }
        // Create a renderer for each route
        try {
            this.renderers = directionsResult.routes.map((route, index) => {
                const renderer = new google.maps.DirectionsRenderer({
                    map: this.map,
                    directions: directionsResult,
                    routeIndex: index,
                    suppressMarkers: index > 0,
                    preserveViewport: index > 0,
                    polylineOptions: {
                        strokeColor: index === 0 ? '#4285F4' : '#999999',
                        strokeOpacity: index === 0 ? 0.9 : 0.5,
                        strokeWeight: index === 0 ? 6 : 4,
                        zIndex: index === 0 ? 100 : 1
                    }
                });
                if (index === 0) {
                    this.directionsRenderer = renderer;
                }
                return renderer;
            });
        }
        catch (e) {
            this.logger.error("Error creating DirectionsRenderer:", e);
            // If DirectionsRenderer fails, try to fall back to drawRoute for the first route
            if (directionsResult.routes[0] && directionsResult.routes[0].overview_path) {
                this.logger.log("Falling back to drawRoute due to DirectionsRenderer error");
                const coords = directionsResult.routes[0].overview_path
                    .map(p => {
                    const lat = typeof p.lat === 'function' ? p.lat() : p.lat;
                    const lng = typeof p.lng === 'function' ? p.lng() : p.lng;
                    return (isNaN(lat) || isNaN(lng)) ? null : [lng, lat];
                })
                    .filter((c) => c !== null);
                if (coords.length > 0) {
                    this.drawRoute(coords);
                }
            }
            return;
        }
        // Fit bounds to all routes
        const bounds = new google.maps.LatLngBounds();
        let hasPoints = false;
        directionsResult.routes.forEach(route => {
            if (route.overview_path) {
                route.overview_path.forEach(point => {
                    if (point) {
                        let lat, lng;
                        if (typeof point.lat === 'function') {
                            lat = point.lat();
                            lng = point.lng();
                        }
                        else {
                            lat = point.lat;
                            lng = point.lng;
                        }
                        if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
                            bounds.extend({ lat, lng });
                            hasPoints = true;
                        }
                    }
                });
            }
        });
        if (hasPoints && !bounds.isEmpty()) {
            this.map.fitBounds(bounds);
        }
    }
    /**
     * Select a specific route by index
     */
    selectRoute(index) {
        this.renderers.forEach((renderer, i) => {
            const isSelected = i === index;
            renderer.setOptions({
                suppressMarkers: !isSelected,
                polylineOptions: {
                    strokeColor: isSelected ? '#4285F4' : '#999999',
                    strokeOpacity: isSelected ? 0.9 : 0.5,
                    strokeWeight: isSelected ? 6 : 4,
                    zIndex: isSelected ? 100 : 1
                }
            });
            if (isSelected) {
                this.directionsRenderer = renderer;
            }
        });
    }
    /**
     * Listen for directions changes (e.g. when user selects an alternative route)
     * @param callback - Function called with the new directions result
     */
    onDirectionsChanged(callback) {
        // For multiple renderers, we usually don't have 'directions_changed'
        // unless draggable is true. We'll handle selection via our own UI.
    }
}
//# sourceMappingURL=google-map.js.map