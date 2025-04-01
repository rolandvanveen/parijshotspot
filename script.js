// Initialiseer de kaart
const map = L.map('map').setView([48.8566, 2.3522], 13); // Parijs centrum

// Voeg OpenStreetMap tiles toe
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// DOM elementen
const addMarkerBtn = document.getElementById('addMarker');
const markerForm = document.getElementById('markerForm');
const saveMarkerBtn = document.getElementById('saveMarker');
const cancelMarkerBtn = document.getElementById('cancelMarker');
const markerTypeSelect = document.getElementById('markerType');
const markerWijkInput = document.getElementById('markerWijk');
const markerNameInput = document.getElementById('markerName');
const markerNoteInput = document.getElementById('markerNote');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.querySelector('.close-sidebar');
const sortBySelect = document.getElementById('sortBy');

// Filter checkboxes
const filterCheckboxes = {
    museum: document.getElementById('filterMuseum'),
    restaurant: document.getElementById('filterRestaurant'),
    hotel: document.getElementById('filterHotel'),
    attraction: document.getElementById('filterAttraction'),
    other: document.getElementById('filterOther')
};

// Marker iconen
const icons = {
    museum: L.divIcon({
        className: 'custom-marker museum-marker',
        html: '<div class="marker-icon"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    }),
    restaurant: L.divIcon({
        className: 'custom-marker restaurant-marker',
        html: '<div class="marker-icon"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    }),
    hotel: L.divIcon({
        className: 'custom-marker hotel-marker',
        html: '<div class="marker-icon"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    }),
    attraction: L.divIcon({
        className: 'custom-marker attraction-marker',
        html: '<div class="marker-icon"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    }),
    other: L.divIcon({
        className: 'custom-marker other-marker',
        html: '<div class="marker-icon"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    })
};

let currentMarker = null;
let markers = [];
let markerLayers = new Map(); // Houdt de Leaflet markers bij

// Laad opgeslagen markers
function loadMarkers() {
    const savedMarkers = localStorage.getItem('parisMarkers');
    if (savedMarkers) {
        markers = JSON.parse(savedMarkers);
        // Update bestaande markers met ID's als ze die nog niet hebben
        markers = markers.map(marker => {
            if (!marker.id) {
                return {
                    ...marker,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
                };
            }
            return marker;
        });
        saveMarkers(); // Sla de markers op met de nieuwe ID's
        updateMarkers();
    }
}

// Functie om links te detecteren en klikbaar te maken
function makeLinksClickable(text) {
    // Regex om URLs te detecteren
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
}

// Update markers op basis van filters
function updateMarkers() {
    // Verwijder alle bestaande markers
    markerLayers.forEach(layer => map.removeLayer(layer));
    markerLayers.clear();

    // Voeg gefilterde markers toe
    markers.forEach(markerData => {
        if (filterCheckboxes[markerData.type].checked) {
            const marker = L.marker([markerData.lat, markerData.lng], { 
                icon: icons[markerData.type],
                draggable: true 
            })
            .addTo(map);

            // Maak de popup content met klikbare links
            const popupContent = document.createElement('div');
            popupContent.innerHTML = `
                <strong>${markerData.name}</strong><br>
                Type: ${markerData.type}<br>
                ${makeLinksClickable(markerData.note)}
                <br><br>
                <button class="delete-btn">Verwijder</button>
            `;

            // Voeg click event toe aan de delete button
            const deleteBtn = popupContent.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                deleteMarker(markerData.id);
                marker.closePopup();
            });

            marker.bindPopup(popupContent);

            // Voeg click event toe om sidebar te sluiten
            marker.on('click', closeSidebarOnMarkerClick);

            // Voeg drag event toe
            marker.on('dragstart', () => {
                // Verwijder de marker uit de markerLayers map tijdens het slepen
                markerLayers.delete(markerData.id);
            });

            marker.on('dragend', (e) => {
                const newLatLng = e.target.getLatLng();
                markerData.lat = newLatLng.lat;
                markerData.lng = newLatLng.lng;
                saveMarkers();
                // Voeg de marker weer toe aan de markerLayers map
                markerLayers.set(markerData.id, marker);
            });

            markerLayers.set(markerData.id, marker);
        }
    });

    // Update de marker lijst in de sidebar
    updateMarkerList();
}

// Update de marker lijst in de sidebar
function updateMarkerList() {
    const markerList = document.getElementById('markerList');
    markerList.innerHTML = '';

    // Sorteer markers
    const sortedMarkers = [...markers].sort((a, b) => {
        const sortBy = sortBySelect.value;
        if (sortBy === 'wijk') {
            return a.wijk.localeCompare(b.wijk);
        } else if (sortBy === 'type') {
            return a.type.localeCompare(b.type);
        } else {
            return a.name.localeCompare(b.name);
        }
    });

    sortedMarkers.forEach(markerData => {
        const markerItem = document.createElement('div');
        markerItem.className = 'marker-list-item';
        markerItem.innerHTML = `
            <div class="marker-list-icon ${markerData.type}-marker">
                <div class="marker-icon"></div>
            </div>
            <div class="marker-list-info">
                <span class="marker-wijk">${markerData.wijk}</span>
                <strong>${markerData.name}</strong>
                <span class="marker-type">${markerData.type}</span>
                ${markerData.note ? `<div class="marker-note">${makeLinksClickable(markerData.note)}</div>` : ''}
            </div>
            <button onclick="deleteMarker('${markerData.id}')" class="delete-btn">×</button>
        `;
        markerList.appendChild(markerItem);
    });
}

// Verwijder een marker
function deleteMarker(markerId) {
    if (confirm('Weet je zeker dat je deze marker wilt verwijderen?')) {
        // Verwijder de marker van de kaart
        const marker = markerLayers.get(markerId);
        if (marker) {
            map.removeLayer(marker);
            markerLayers.delete(markerId);
        }
        
        // Verwijder de marker uit de markers array
        markers = markers.filter(m => m.id !== markerId);
        
        // Update de marker lijst direct
        updateMarkerList();
        
        // Sla de markers op
        saveMarkers();
    }
}

// Sla markers op
function saveMarkers() {
    localStorage.setItem('parisMarkers', JSON.stringify(markers));
}

// Event listeners
addMarkerBtn.addEventListener('click', () => {
    markerForm.classList.remove('hidden');
    map.on('mousemove', handleMouseMove);
    map.on('click', handleMapClick);
    // Voeg cursor class toe
    map.getContainer().classList.add('marker-placement-mode');
    // Verwijder eventuele bestaande preview
    const existingPreview = document.querySelector('.marker-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
});

cancelMarkerBtn.addEventListener('click', () => {
    markerForm.classList.add('hidden');
    map.off('mousemove', handleMouseMove);
    map.off('click', handleMapClick);
    // Verwijder cursor class
    map.getContainer().classList.remove('marker-placement-mode');
    if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
    }
    // Verwijder eventuele bestaande preview
    const existingPreview = document.querySelector('.marker-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    markerWijkInput.value = '';
    markerNameInput.value = '';
    markerNoteInput.value = '';
});

saveMarkerBtn.addEventListener('click', () => {
    if (currentMarker && markerNameInput.value && markerWijkInput.value) {
        const markerData = {
            id: Date.now().toString(), // Unieke ID toevoegen
            lat: currentMarker.getLatLng().lat,
            lng: currentMarker.getLatLng().lng,
            wijk: markerWijkInput.value,
            name: markerNameInput.value,
            type: markerTypeSelect.value,
            note: markerNoteInput.value
        };
        
        markers.push(markerData);
        saveMarkers();
        
        // Reset form
        markerForm.classList.add('hidden');
        map.off('mousemove', handleMouseMove);
        map.off('click', handleMapClick);
        // Verwijder cursor class
        map.getContainer().classList.remove('marker-placement-mode');
        currentMarker = null;
        markerWijkInput.value = '';
        markerNameInput.value = '';
        markerNoteInput.value = '';
        
        // Update markers
        updateMarkers();
    }
});

// Voeg filter event listeners toe
Object.values(filterCheckboxes).forEach(checkbox => {
    checkbox.addEventListener('change', updateMarkers);
});

// Voeg sorteer event listener toe
sortBySelect.addEventListener('change', updateMarkerList);

function handleMapClick(e) {
    // Verwijder eventuele bestaande preview
    const existingPreview = document.querySelector('.marker-preview');
    if (existingPreview) {
        existingPreview.remove();
    }

    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    
    currentMarker = L.marker(e.latlng, { 
        icon: icons[markerTypeSelect.value],
        draggable: true 
    }).addTo(map);
}

function handleMouseMove(e) {
    if (!currentMarker) return;
    
    // Verwijder bestaande preview
    const existingPreview = document.querySelector('.marker-preview');
    if (existingPreview) {
        existingPreview.remove();
    }
    
    const preview = document.createElement('div');
    preview.className = `custom-marker ${markerTypeSelect.value}-marker marker-preview`;
    preview.innerHTML = '<div class="marker-icon"></div>';
    
    // Voeg nieuwe preview toe
    document.body.appendChild(preview);
    
    // Update positie
    const point = map.latLngToContainerPoint(e.latlng);
    preview.style.left = point.x + 'px';
    preview.style.top = point.y + 'px';
}

// Mobiele sidebar functionaliteit
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.add('active');
    document.body.style.overflow = 'hidden';
});

closeSidebar.addEventListener('click', () => {
    sidebar.classList.remove('active');
    document.body.style.overflow = '';
});

// Sluit sidebar bij het klikken op een marker
function closeSidebarOnMarkerClick() {
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Voeg touch events toe voor de kaart
map.on('touchstart', (e) => {
    if (currentMarker) {
        const touch = e.touches[0];
        const point = map.containerPointToLatLng([touch.clientX, touch.clientY]);
        handleMapClick({ latlng: point });
    }
});

// Laad markers bij het opstarten
loadMarkers(); 