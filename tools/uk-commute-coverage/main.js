import { CoverageAnalyzer } from './coverage-analyzer.js';
// Main application setup
let analyzer;
if (window.location.pathname.includes('uk-commute-coverage')) {
    analyzer = new CoverageAnalyzer();
    analyzer.init();
}
// New route preview functionality
const previewBtn = document.getElementById('preview-btn');
if (previewBtn && analyzer) {
    previewBtn.addEventListener('click', async () => {
        const startPostcode = document.getElementById('start').value.trim().toUpperCase();
        const endPostcode = document.getElementById('end').value.trim().toUpperCase();
        const apiKey = document.getElementById('google-maps-api-key').value.trim();
        const profile = document.getElementById('route-profile').value;
        const errorEl = document.getElementById('error');
        // Basic input check
        if (!startPostcode || !endPostcode || !apiKey) {
            errorEl.textContent = 'Please fill in start postcode, end postcode, and Google Maps API key.';
            errorEl.style.display = 'block';
            return;
        }
        errorEl.style.display = 'none';
        previewBtn.disabled = true;
        previewBtn.textContent = 'Loading Preview...';
        try {
            // getRoute will also load the Google Maps API if not already loaded
            const route = await analyzer.getRoute(startPostcode, endPostcode, apiKey, profile);
            analyzer.currentRouteCoordinates = route.coordinates;
            analyzer.lastRouteResult = route;
            // Initialize the map and draw the route
            analyzer.showElement('preview-container');
            await analyzer.googleMap.initMap();
            analyzer.googleMap.clearOverlays();
            if (route.fullResult) {
                analyzer.googleMap.setDirections(route.fullResult);
                // Populate route options UI
                const optionsContainer = document.getElementById('route-options');
                optionsContainer.innerHTML = '';
                if (route.fullResult.routes.length > 1) {
                    route.fullResult.routes.forEach((r, index) => {
                        const btn = document.createElement('button');
                        btn.type = 'button';
                        btn.className = index === 0 ? 'btn-route active' : 'btn-route';
                        btn.textContent = `Route ${index + 1} (${r.legs[0].distance?.text || ''}, ${r.legs[0].duration?.text || ''})`;
                        btn.style.padding = '0.5rem 1rem';
                        btn.style.fontSize = '0.85rem';
                        btn.style.border = '1px solid var(--border-color)';
                        btn.style.borderRadius = '4px';
                        btn.style.background = index === 0 ? 'var(--link-color)' : 'var(--bg-card)';
                        btn.style.color = index === 0 ? 'var(--bg-card)' : 'var(--text-primary)';
                        btn.style.cursor = 'pointer';
                        btn.addEventListener('click', () => {
                            // Update UI
                            document.querySelectorAll('.btn-route').forEach(b => {
                                b.style.background = 'var(--bg-card)';
                                b.style.color = 'var(--text-primary)';
                            });
                            btn.style.background = 'var(--link-color)';
                            btn.style.color = 'var(--bg-card)';
                            // Update Map
                            analyzer.googleMap.selectRoute(index);
                            // Update Analyzer State
                            const selectedRoute = route.fullResult.routes[index];
                            const newCoordinates = selectedRoute.overview_path
                                .map(latLng => {
                                const lat = latLng.lat();
                                const lng = latLng.lng();
                                return (isNaN(lat) || isNaN(lng)) ? null : [lng, lat];
                            })
                                .filter((c) => c !== null);
                            analyzer.currentRouteCoordinates = newCoordinates;
                            if (analyzer.lastRouteResult) {
                                analyzer.lastRouteResult.coordinates = newCoordinates;
                                if (selectedRoute.legs && selectedRoute.legs[0]) {
                                    analyzer.lastRouteResult.distance = selectedRoute.legs[0].distance?.value || 0;
                                }
                            }
                            // Update tiles if network selected
                            const tileNetwork = document.getElementById('tile-network').value;
                            if (tileNetwork) {
                                analyzer.updateMapTiles(tileNetwork, newCoordinates);
                            }
                        });
                        optionsContainer.appendChild(btn);
                    });
                    document.getElementById('route-options-container').style.display = 'block';
                }
                else {
                    document.getElementById('route-options-container').style.display = 'none';
                }
            }
            else {
                analyzer.googleMap.drawRoute(route.coordinates);
            }
            // Show tiles if a network is selected
            const tileNetwork = document.getElementById('tile-network').value;
            if (tileNetwork) {
                await analyzer.updateMapTiles(tileNetwork, route.coordinates);
            }
        }
        catch (error) {
            errorEl.textContent = `Route preview failed: ${error instanceof Error ? error.message : String(error)}`;
            errorEl.style.display = 'block';
            analyzer.hideElement('preview-container');
        }
        finally {
            previewBtn.disabled = false;
            previewBtn.textContent = 'Preview Route';
        }
    });
}
//# sourceMappingURL=main.js.map