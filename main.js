mapboxgl.accessToken = 'pk.eyJ1IjoiZGF1ZGk5NyIsImEiOiJjanJtY3B1bjYwZ3F2NGFvOXZ1a29iMmp6In0.9ZdvuGInodgDk7cv-KlujA';
const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/daudi97/ckw6f8mku2b7t15p1d1sd4y93', // style URL
    center: [-77.16294732788364, 38.83166857095776], // starting position [lng, lat]
    zoom: 9.5 // starting zoom
});

let countyNames = [
    "Annandale", 
    "Chantilly", 
    "Fairfax Center", 
    "Herndon", 
    "Merrifield", 
    "Reston", 
    "Richmond Highway - Fort Belvoir", 
    "Springfield - I95", 
    "Tysons, Mclean, Vienna, Great Falls"
];

let hoveredStateId = null;
let currentIndex = 0;
let indicatorItems = document.querySelectorAll(".indicator-item");
let prevButton = document.getElementById("prev-btn");
let nextButton = document.getElementById("next-btn");
let sideSection = document.getElementById("aside-section");
var activeIndicator = document.querySelector(".indicator-item.active");

prevButton.onclick = function(e) {
    e.stopPropagation();
    gotoPrevious();
}

nextButton.onclick = function(e) {
    e.stopPropagation();
    gotoNext();
}

indicatorItems.forEach(indicatorItem => {
    indicatorItem.onclick = function(e) {
        e.stopPropagation();

        activeIndicator.classList.remove("active");

        let { dataset : {target } } = e.target;
        let element = e.target;

        // // get the the item index
        e.target.classList.add("active");
        activeIndicator = e.target;

        // update hoverstateId
        let id = countyNames.indexOf(target);
        currentIndex = id;

        console.log(currentIndex);

        updateHoverId(id);
        updateSideSection(
            getDistrict(id)
        )
    }
});

// map
map.on("load", function(e) {
    map.addSource('districts', {
        type:'geojson',
        data:'business_districts.geojson',
        generateId:true
    });


    map.addLayer({
        id:'district-layer',
        type:'fill',
        source:'districts',
        paint:{
            'fill-color':'#025C8F',
            'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                0.8,
                0.4
            ]
        }
    });

    map.addLayer({
        id:'district-layer-line',
        type:'line',
        source:'districts',
        paint:{
            'line-color':'#025C8F',
            'line-width':2
        }
    });

    map.addLayer({
        'id': 'districts-highlighted',
        'type': 'fill',
        'source': 'districts',
        'paint': {
            'fill-outline-color': '#484896',
            'fill-color': '#025C8F',
            'fill-opacity': 0.75
        },
        'filter': ['in', 'fid', '']
        }
    ); 

    // fairfax-city
    map.addSource('fairfax-city', {
        type:'geojson',
        data:'fairfax_city.geojson'
    });


    map.addLayer({
        id:'city-layer',
        type:'fill',
        source:'fairfax-city',
        paint:{
            'fill-color':'#9D9D9D',
            'fill-opacity':0.4
        }
    });

    // washington-dc
    map.addSource('dc', {
        type:'geojson',
        data:'washington_dc.geojson'
    });


    map.addLayer({
        id:'dc-layer',
        type:'fill',
        source:'dc',
        paint:{
            'fill-color':'#9D9D9D',
            'fill-opacity':0.4
        }
    });


    // labels layer
    map.addSource('label-source', {
        type:'geojson',
        data:labelLayer
    });


    map.addLayer({
        id:'label-layer',
        type:'symbol',
        source:'label-source',
        paint:{
            "text-color":["get", "text-color"],
            "text-halo-color":["get", "halo-color"],
            "text-halo-width":1
        },
        layout:{
            "text-font":[
                'match',
                ['get', 'type'],
                "text-small",
                ["literal", ["Roboto Condensed Regular"]],
                ["literal", ["Roboto Condensed Bold"]]
            ],
            "text-field":["get", "Name"],
            "text-size":["get", "fontSize"],
            "text-justify":"left",
            "text-letter-spacing":0,
            "text-max-width":["get", "max-width"],
            "text-transform":["get", "text-transform"],
            "text-allow-overlap":true,
            "text-line-height":1,
            "text-anchor":["get", "text-anchor"],
        }
    });

    // pins
    pins.forEach(pin => {
        // marker element
        let marker = createMarker(pin);
        let popup = getPopup(pin);

        marker.setPopup(popup).addTo(map);
    });

    // mouse hover events
    map.on("mousemove", "district-layer", function(e) {
        map.getCanvas().style.cursor = "pointer";
        
        if(e.features.length > 0) {
            if(hoveredStateId !== null) {
                map.setFeatureState(
                    { source:'districts', id:hoveredStateId },
                    { hover:false }
                )
            }

            hoveredStateId = e.features[0].id

            map.setFeatureState(
                { source:'districts', id:hoveredStateId },
                { hover:true }
            );

        }

    });


    map.on("mouseleave", "district-layer", function(e) {
        map.getCanvas().style.cursor = "";

        if(hoveredStateId !== null) {
            map.setFeatureState(
                {source:'districts', id:hoveredStateId },
                { hover:false }
            )
        }

        hoveredStateId = null;
    });

    map.on("click", function(e) {
        console.log(e);
    });

    map.on("click", "district-layer", function(e) {
        console.log(e);

        if(e.features.length > 0) {
            let feature = e.features[0];

            // update the side section
            updateSideSection(feature);

            // update the btn-navs
            let id = feature.id;
            currentIndex = id;
            updateActiveNavSection(id);

            map.setFilter('districts-highlighted', ['in', 'fid', id]);
        }
    });

    updateHoverId(0);
    map.setFilter('districts-highlighted', ['in', 'fid', 0]);
});


function createMarker(pin) {
    let markerElement = document.createElement("div");
    markerElement.className = "marker-element";

    markerElement.innerHTML = `<img src="icons/${pin.icon}" />`;
    return new mapboxgl.Marker({element:markerElement})
            .setLngLat([...pin.location])
            
}

function getPopup(pin) {
    let html  = `<div>${pin.name}</div>`
    return new mapboxgl.Popup({focusOnOpen:false})
        .setHTML(html);
}

function updateActiveNavSection(id) {
    // get the
    activeIndicator.classList.remove("active");

    let indicatorItem = indicatorItems[id];
    indicatorItem.classList.add("active");

    activeIndicator = indicatorItem;
}

function updateSideSection(feature) {
    // console.log(feature);

    let asideContent = ` <div class="aside-header">
        <span class="header-title">${feature.properties.Name}</span>
    </div>
    <div class="aside-body">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce quis pharetra enim. Aliquam non ante vel urna placerat dictum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
        Curabitur finibus odio sit amet sem mattis, eget ultricies ante maximus. Vivamus pharetra, massa at dapibus ultricies, odio justo tempus nunc, ut commodo elit nulla in eros.
    </div>
    <div class="aside-footer">
        
    </div>`;

    sideSection.innerHTML = asideContent;
}

function gotoNext() {
    currentIndex += 1;

    if(currentIndex > 8) {
        currentIndex = 0;
    }

    console.log(currentIndex);
    updateHoverId(currentIndex);
    updateActiveNavSection(currentIndex);

    updateSideSection(
        getDistrict(currentIndex)
    )
}  

function gotoPrevious() {
    currentIndex -= 1;

    if(currentIndex < 0) {
        currentIndex = 8;
    }

    console.log(currentIndex);

    updateHoverId(currentIndex);
    updateActiveNavSection(currentIndex);

    updateSideSection(
        getDistrict(currentIndex)
    )
}

function getDistrict(id) {
    let district = businessDistricts.features.find(district => district.properties.fid == id);

    console.log(district);
    return district;
}

function updateHoverId(id) {
    if(hoveredStateId !== null) {
        map.setFeatureState(
            { source:'districts', id:hoveredStateId },
            { hover:false }
        )
    }

    hoveredStateId = id

    map.setFeatureState(
        { source:'districts', id:hoveredStateId },
        { hover:true }
    );
}

var businessDistricts = {
    "type": "FeatureCollection",
    "name": "business_districts",
    "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    "features": [
        { "type": "Feature", "properties": {"fid":0, "Name": "Annandale", "description": null }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -77.2533179, 38.8409669, 0.0 ], [ -77.2570944, 38.8318743, 0.0 ], [ -77.260871, 38.8233156, 0.0 ], [ -77.2649908, 38.8193033, 0.0 ], [ -77.2670508, 38.8134183, 0.0 ], [ -77.2649908, 38.8110106, 0.0 ], [ -77.2200156, 38.8115456, 0.0 ], [ -77.172637, 38.8123482, 0.0 ], [ -77.1705771, 38.8166284, 0.0 ], [ -77.1661139, 38.8168959, 0.0 ], [ -77.1558142, 38.8086029, 0.0 ], [ -77.1424246, 38.8155583, 0.0 ], [ -77.1410513, 38.8187683, 0.0 ], [ -77.1338415, 38.8227806, 0.0 ], [ -77.1352148, 38.8254554, 0.0 ], [ -77.1400214, 38.8267927, 0.0 ], [ -77.1328116, 38.8374905, 0.0 ], [ -77.1249152, 38.8404321, 0.0 ], [ -77.1211386, 38.8412343, 0.0 ], [ -77.1221686, 38.8457801, 0.0 ], [ -77.1074057, 38.8492561, 0.0 ], [ -77.151351, 38.8821362, 0.0 ], [ -77.1510077, 38.8794636, 0.0 ], [ -77.1537543, 38.8767909, 0.0 ], [ -77.1589041, 38.8781272, 0.0 ], [ -77.1709204, 38.882938, 0.0 ], [ -77.1788168, 38.8826707, 0.0 ], [ -77.1898032, 38.8810672, 0.0 ], [ -77.1887732, 38.8770582, 0.0 ], [ -77.1976996, 38.8679702, 0.0 ], [ -77.1891165, 38.8586138, 0.0 ], [ -77.1987295, 38.8554056, 0.0 ], [ -77.2021628, 38.8535341, 0.0 ], [ -77.2028494, 38.8492561, 0.0 ], [ -77.2182989, 38.8543362, 0.0 ], [ -77.2176123, 38.8374905, 0.0 ], [ -77.2200156, 38.8377579, 0.0 ], [ -77.2213889, 38.8436409, 0.0 ], [ -77.2251654, 38.8439083, 0.0 ], [ -77.228942, 38.8420365, 0.0 ], [ -77.2310019, 38.8460475, 0.0 ], [ -77.237525, 38.8479192, 0.0 ], [ -77.2457648, 38.8404321, 0.0 ], [ -77.2533179, 38.8409669, 0.0 ] ] ] } },
        { "type": "Feature", "properties": {"fid":1, "Name": "Chantilly", "description": null }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -77.3938972, 38.892024, 0.0 ], [ -77.3997337, 38.8995057, 0.0 ], [ -77.4086601, 38.9011088, 0.0 ], [ -77.4203331, 38.9101925, 0.0 ], [ -77.4271996, 38.9101925, 0.0 ], [ -77.4296028, 38.905918, 0.0 ], [ -77.4344093, 38.9069866, 0.0 ], [ -77.4352789, 38.901376, 0.0 ], [ -77.4404288, 38.9027119, 0.0 ], [ -77.4411154, 38.8989713, 0.0 ], [ -77.4551916, 38.9051165, 0.0 ], [ -77.453475, 38.916871, 0.0 ], [ -77.4624014, 38.9222133, 0.0 ], [ -77.540679, 38.8455127, 0.0 ], [ -77.5410223, 38.8412343, 0.0 ], [ -77.5327826, 38.8398972, 0.0 ], [ -77.5241995, 38.8388276, 0.0 ], [ -77.5180197, 38.8417691, 0.0 ], [ -77.5090933, 38.8439083, 0.0 ], [ -77.5018835, 38.8401646, 0.0 ], [ -77.4987936, 38.8366882, 0.0 ], [ -77.5018835, 38.8321418, 0.0 ], [ -77.5046301, 38.8294673, 0.0 ], [ -77.498107, 38.8262578, 0.0 ], [ -77.4977637, 38.8235831, 0.0 ], [ -77.5032568, 38.8201058, 0.0 ], [ -77.5015402, 38.8163609, 0.0 ], [ -77.4905539, 38.8139533, 0.0 ], [ -77.4878073, 38.8120807, 0.0 ], [ -77.4888373, 38.8043222, 0.0 ], [ -77.4936438, 38.797098, 0.0 ], [ -77.4830008, 38.7941546, 0.0 ], [ -77.4778509, 38.7987035, 0.0 ], [ -77.4740744, 38.7957601, 0.0 ], [ -77.4644614, 38.7944222, 0.0 ], [ -77.4569083, 38.7944222, 0.0 ], [ -77.453475, 38.800844, 0.0 ], [ -77.4521017, 38.8069976, 0.0 ], [ -77.4479819, 38.8083353, 0.0 ], [ -77.4397421, 38.8029845, 0.0 ], [ -77.4301291, 38.8035196, 0.0 ], [ -77.4242926, 38.8000413, 0.0 ], [ -77.4208594, 38.8088704, 0.0 ], [ -77.4150229, 38.8179659, 0.0 ], [ -77.4143362, 38.8305371, 0.0 ], [ -77.4054098, 38.8305371, 0.0 ], [ -77.4074698, 38.8342813, 0.0 ], [ -77.4057532, 38.8436409, 0.0 ], [ -77.4095297, 38.8444431, 0.0 ], [ -77.4047232, 38.850593, 0.0 ], [ -77.4112463, 38.87786, 0.0 ], [ -77.4040366, 38.8874811, 0.0 ], [ -77.3938972, 38.892024, 0.0 ] ] ] } },
        { "type": "Feature", "properties": {"fid":2, "Name": "Fairfax Center", "description": null }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -77.298196, 38.8742517, 0.0 ], [ -77.2824032, 38.8806663, 0.0 ], [ -77.2817165, 38.8881492, 0.0 ], [ -77.2913296, 38.8953641, 0.0 ], [ -77.3047192, 38.8991049, 0.0 ], [ -77.3057491, 38.9044485, 0.0 ], [ -77.3170788, 38.9079217, 0.0 ], [ -77.3201687, 38.9055172, 0.0 ], [ -77.3232586, 38.9060516, 0.0 ], [ -77.3270351, 38.9210113, 0.0 ], [ -77.3236019, 38.925552, 0.0 ], [ -77.3252327, 38.9272881, 0.0 ], [ -77.3307259, 38.9208777, 0.0 ], [ -77.3547585, 38.9144668, 0.0 ], [ -77.3540718, 38.9099254, 0.0 ], [ -77.3588783, 38.9072538, 0.0 ], [ -77.3629982, 38.9123297, 0.0 ], [ -77.3705513, 38.9072538, 0.0 ], [ -77.3746712, 38.9093911, 0.0 ], [ -77.3829109, 38.8997729, 0.0 ], [ -77.3938972, 38.892024, 0.0 ], [ -77.4040366, 38.8874811, 0.0 ], [ -77.4112463, 38.87786, 0.0 ], [ -77.4047232, 38.850593, 0.0 ], [ -77.4095297, 38.8444431, 0.0 ], [ -77.4057532, 38.8436409, 0.0 ], [ -77.4074698, 38.8342813, 0.0 ], [ -77.4054098, 38.8305371, 0.0 ], [ -77.4143362, 38.8305371, 0.0 ], [ -77.4150229, 38.8179659, 0.0 ], [ -77.4208594, 38.8088704, 0.0 ], [ -77.4242926, 38.8000413, 0.0 ], [ -77.4301291, 38.8035196, 0.0 ], [ -77.4397421, 38.8029845, 0.0 ], [ -77.4479819, 38.8083353, 0.0 ], [ -77.4521017, 38.8069976, 0.0 ], [ -77.4527884, 38.8045898, 0.0 ], [ -77.4490118, 38.8040547, 0.0 ], [ -77.4435187, 38.8019142, 0.0 ], [ -77.4366522, 38.7949574, 0.0 ], [ -77.4328757, 38.7874647, 0.0 ], [ -77.4328757, 38.7789006, 0.0 ], [ -77.4294424, 38.7821122, 0.0 ], [ -77.4201727, 38.7791682, 0.0 ], [ -77.4126196, 38.7738152, 0.0 ], [ -77.4136496, 38.767391, 0.0 ], [ -77.4153662, 38.7604308, 0.0 ], [ -77.4081564, 38.756415, 0.0 ], [ -77.4105597, 38.7521312, 0.0 ], [ -77.4105597, 38.7454373, 0.0 ], [ -77.4071265, 38.7465084, 0.0 ], [ -77.4036932, 38.7475794, 0.0 ], [ -77.4057532, 38.7518635, 0.0 ], [ -77.4023199, 38.7540054, 0.0 ], [ -77.3985434, 38.751328, 0.0 ], [ -77.3951102, 38.7510602, 0.0 ], [ -77.3875571, 38.749186, 0.0 ], [ -77.3889304, 38.744634, 0.0 ], [ -77.3844672, 38.7424918, 0.0 ], [ -77.3758841, 38.737136, 0.0 ], [ -77.3765707, 38.7304406, 0.0 ], [ -77.3793173, 38.726691, 0.0 ], [ -77.377944, 38.7175839, 0.0 ], [ -77.3703909, 38.7124941, 0.0 ], [ -77.3679877, 38.715173, 0.0 ], [ -77.3631811, 38.7186553, 0.0 ], [ -77.3600912, 38.7226733, 0.0 ], [ -77.3590613, 38.7256196, 0.0 ], [ -77.3539114, 38.7261553, 0.0 ], [ -77.3501349, 38.7221376, 0.0 ], [ -77.3412085, 38.7224054, 0.0 ], [ -77.3388052, 38.7197268, 0.0 ], [ -77.3336554, 38.721334, 0.0 ], [ -77.3285056, 38.7191911, 0.0 ], [ -77.3298788, 38.7157087, 0.0 ], [ -77.3305655, 38.7122262, 0.0 ], [ -77.323699, 38.7135656, 0.0 ], [ -77.3185492, 38.7124941, 0.0 ], [ -77.3199225, 38.7084756, 0.0 ], [ -77.3243857, 38.7041889, 0.0 ], [ -77.323699, 38.7020455, 0.0 ], [ -77.3144293, 38.7017776, 0.0 ], [ -77.3120261, 38.7049927, 0.0 ], [ -77.3048163, 38.7090114, 0.0 ], [ -77.2986365, 38.7055285, 0.0 ], [ -77.2958899, 38.7068681, 0.0 ], [ -77.2934866, 38.715173, 0.0 ], [ -77.2897101, 38.7162445, 0.0 ], [ -77.2855902, 38.715173, 0.0 ], [ -77.2763205, 38.7197268, 0.0 ], [ -77.280097, 38.7250839, 0.0 ], [ -77.2790671, 38.7293693, 0.0 ], [ -77.2787238, 38.7355291, 0.0 ], [ -77.2852469, 38.7427595, 0.0 ], [ -77.2749472, 38.756415, 0.0 ], [ -77.2903967, 38.7714062, 0.0 ], [ -77.3116827, 38.7850561, 0.0 ], [ -77.3250723, 38.7877323, 0.0 ], [ -77.3336554, 38.7896055, 0.0 ], [ -77.3374319, 38.7968305, 0.0 ], [ -77.3418951, 38.8011116, 0.0 ], [ -77.3439551, 38.8150233, 0.0 ], [ -77.3480749, 38.8203733, 0.0 ], [ -77.3439551, 38.8217107, 0.0 ], [ -77.3394919, 38.8214432, 0.0 ], [ -77.3394919, 38.8174309, 0.0 ], [ -77.3322821, 38.8139533, 0.0 ], [ -77.3240424, 38.8128832, 0.0 ], [ -77.3216391, 38.8160934, 0.0 ], [ -77.3175192, 38.8275951, 0.0 ], [ -77.3274756, 38.8316069, 0.0 ], [ -77.3212958, 38.8380253, 0.0 ], [ -77.3243857, 38.8441757, 0.0 ], [ -77.3267889, 38.8465823, 0.0 ], [ -77.3305655, 38.8471171, 0.0 ], [ -77.3326254, 38.852732, 0.0 ], [ -77.336402, 38.8535341, 0.0 ], [ -77.3274756, 38.8682375, 0.0 ], [ -77.3113394, 38.8701087, 0.0 ], [ -77.3092795, 38.8658317, 0.0 ], [ -77.3051596, 38.8663664, 0.0 ], [ -77.3055029, 38.8717125, 0.0 ], [ -77.298196, 38.8742517, 0.0 ] ] ] } },
        { "type": "Feature", "properties": {"fid":3, "Name": "Herndon", "description": null }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -77.3744137, 39.0168388, 0.0 ], [ -77.4323494, 38.9494527, 0.0 ], [ -77.4344093, 38.9069866, 0.0 ], [ -77.4296028, 38.905918, 0.0 ], [ -77.4271996, 38.9101925, 0.0 ], [ -77.4203331, 38.9101925, 0.0 ], [ -77.4148399, 38.9056508, 0.0 ], [ -77.4086601, 38.9011088, 0.0 ], [ -77.3997337, 38.8995057, 0.0 ], [ -77.3938972, 38.892024, 0.0 ], [ -77.3829109, 38.8997729, 0.0 ], [ -77.3853142, 38.9048493, 0.0 ], [ -77.3825676, 38.9099254, 0.0 ], [ -77.3884041, 38.9144668, 0.0 ], [ -77.3983604, 38.921679, 0.0 ], [ -77.4072868, 38.9334308, 0.0 ], [ -77.3987038, 38.9393059, 0.0 ], [ -77.391494, 38.9558605, 0.0 ], [ -77.3818809, 38.9505207, 0.0 ], [ -77.3719246, 38.960132, 0.0 ], [ -77.3719246, 38.9670727, 0.0 ], [ -77.3647148, 38.9793507, 0.0 ], [ -77.3664314, 38.9817527, 0.0 ], [ -77.3605949, 38.998831, 0.0 ], [ -77.3571617, 38.998831, 0.0 ], [ -77.358535, 39.0044339, 0.0 ], [ -77.357505, 39.0076354, 0.0 ], [ -77.3744137, 39.0168388, 0.0 ] ] ] } },
        { "type": "Feature", "properties": {"fid":4, "Name": "Merrifield", "description": null }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -77.2700436, 38.8662327, 0.0 ], [ -77.2687674, 38.8583464, 0.0 ], [ -77.2697974, 38.8543362, 0.0 ], [ -77.271514, 38.8492561, 0.0 ], [ -77.269454, 38.8425713, 0.0 ], [ -77.2457648, 38.8404321, 0.0 ], [ -77.2426749, 38.8428387, 0.0 ], [ -77.237525, 38.8479192, 0.0 ], [ -77.2340918, 38.8473844, 0.0 ], [ -77.2310019, 38.8460475, 0.0 ], [ -77.228942, 38.8420365, 0.0 ], [ -77.2251654, 38.8439083, 0.0 ], [ -77.2213889, 38.8436409, 0.0 ], [ -77.2200156, 38.8377579, 0.0 ], [ -77.2176123, 38.8374905, 0.0 ], [ -77.2182989, 38.8447105, 0.0 ], [ -77.2182989, 38.8543362, 0.0 ], [ -77.2028494, 38.8492561, 0.0 ], [ -77.2021628, 38.8535341, 0.0 ], [ -77.1987295, 38.8554056, 0.0 ], [ -77.1891165, 38.8586138, 0.0 ], [ -77.1915198, 38.8618219, 0.0 ], [ -77.1976996, 38.8679702, 0.0 ], [ -77.1946097, 38.8711779, 0.0 ], [ -77.1887732, 38.8770582, 0.0 ], [ -77.1908331, 38.884007, 0.0 ], [ -77.1928931, 38.88855, 0.0 ], [ -77.1924526, 38.8956313, 0.0 ], [ -77.2195751, 38.8836061, 0.0 ], [ -77.2199184, 38.8870803, 0.0 ], [ -77.2384579, 38.8817353, 0.0 ], [ -77.2456676, 38.8806663, 0.0 ], [ -77.2456676, 38.8774591, 0.0 ], [ -77.2501308, 38.8769245, 0.0 ], [ -77.2504742, 38.8731826, 0.0 ], [ -77.2552807, 38.8681039, 0.0 ], [ -77.2700436, 38.8662327, 0.0 ] ] ] } },
        { "type": "Feature", "properties": {"fid":5, "Name": "Reston", "description": null }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -77.3829109, 38.8997729, 0.0 ], [ -77.3746712, 38.9093911, 0.0 ], [ -77.3705513, 38.9072538, 0.0 ], [ -77.3629982, 38.9123297, 0.0 ], [ -77.3588783, 38.9072538, 0.0 ], [ -77.3540718, 38.9099254, 0.0 ], [ -77.3547585, 38.9144668, 0.0 ], [ -77.3423988, 38.9182066, 0.0 ], [ -77.3307259, 38.9208777, 0.0 ], [ -77.3252327, 38.9272881, 0.0 ], [ -77.3236019, 38.925552, 0.0 ], [ -77.3146755, 38.9298253, 0.0 ], [ -77.3071224, 38.9311607, 0.0 ], [ -77.2988827, 38.9362349, 0.0 ], [ -77.3023159, 38.9421098, 0.0 ], [ -77.3009426, 38.9477172, 0.0 ], [ -77.3074657, 38.9487852, 0.0 ], [ -77.3157055, 38.9477172, 0.0 ], [ -77.3163921, 38.9591976, 0.0 ], [ -77.3136456, 38.9674731, 0.0 ], [ -77.3249752, 38.9826867, 0.0 ], [ -77.3239452, 38.9845548, 0.0 ], [ -77.343858, 39.0008321, 0.0 ], [ -77.357505, 39.0076354, 0.0 ], [ -77.358535, 39.0044339, 0.0 ], [ -77.3571617, 38.998831, 0.0 ], [ -77.3605949, 38.998831, 0.0 ], [ -77.3664314, 38.9817527, 0.0 ], [ -77.3647148, 38.9793507, 0.0 ], [ -77.3719246, 38.9670727, 0.0 ], [ -77.3719246, 38.960132, 0.0 ], [ -77.3818809, 38.9505207, 0.0 ], [ -77.391494, 38.9558605, 0.0 ], [ -77.3987038, 38.9393059, 0.0 ], [ -77.4072868, 38.9334308, 0.0 ], [ -77.3983604, 38.921679, 0.0 ], [ -77.3825676, 38.9099254, 0.0 ], [ -77.3853142, 38.9048493, 0.0 ], [ -77.3829109, 38.8997729, 0.0 ] ] ] } },
        { "type": "Feature", "properties": {"fid":6, "Name": "Richmond Highway - Fort Belvoir", "description": null }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -77.1211386, 38.7997737, 0.0 ], [ -77.118392, 38.7976332, 0.0 ], [ -77.1180487, 38.7879999, 0.0 ], [ -77.1153021, 38.7842533, 0.0 ], [ -77.1197653, 38.7802388, 0.0 ], [ -77.1207953, 38.7735475, 0.0 ], [ -77.1156454, 38.7692648, 0.0 ], [ -77.1252585, 38.7657848, 0.0 ], [ -77.1365881, 38.7593599, 0.0 ], [ -77.141738, 38.750257, 0.0 ], [ -77.1489478, 38.7451695, 0.0 ], [ -77.164054, 38.7400817, 0.0 ], [ -77.1633673, 38.7374038, 0.0 ], [ -77.1668005, 38.7344579, 0.0 ], [ -77.1733237, 38.7296372, 0.0 ], [ -77.173667, 38.7256196, 0.0 ], [ -77.1743536, 38.7205304, 0.0 ], [ -77.1698904, 38.7183875, 0.0 ], [ -77.1671439, 38.707136, 0.0 ], [ -77.160964, 38.7033851, 0.0 ], [ -77.1592474, 38.6964187, 0.0 ], [ -77.1540976, 38.6913274, 0.0 ], [ -77.1540976, 38.6878437, 0.0 ], [ -77.1575308, 38.6838238, 0.0 ], [ -77.1544409, 38.6819478, 0.0 ], [ -77.1544409, 38.6787316, 0.0 ], [ -77.1451712, 38.6768555, 0.0 ], [ -77.1444846, 38.6739071, 0.0 ], [ -77.1403647, 38.6736391, 0.0 ], [ -77.1348715, 38.6722989, 0.0 ], [ -77.1256018, 38.6792677, 0.0 ], [ -77.1211386, 38.6875757, 0.0 ], [ -77.1231985, 38.6966867, 0.0 ], [ -77.1269751, 38.7012417, 0.0 ], [ -77.1307516, 38.7047248, 0.0 ], [ -77.1249152, 38.7055285, 0.0 ], [ -77.120452, 38.7004379, 0.0 ], [ -77.1115256, 38.6982944, 0.0 ], [ -77.1084357, 38.6958828, 0.0 ], [ -77.1046591, 38.6977585, 0.0 ], [ -77.099166, 38.6982944, 0.0 ], [ -77.0912695, 38.7031172, 0.0 ], [ -77.0799399, 38.7087435, 0.0 ], [ -77.0806265, 38.7108867, 0.0 ], [ -77.0785666, 38.7130299, 0.0 ], [ -77.0754767, 38.7124941, 0.0 ], [ -77.0713568, 38.7095472, 0.0 ], [ -77.0531607, 38.7098151, 0.0 ], [ -77.0421744, 38.7178517, 0.0 ], [ -77.0411444, 38.7269588, 0.0 ], [ -77.0421744, 38.7408851, 0.0 ], [ -77.0432043, 38.7443662, 0.0 ], [ -77.0469809, 38.7494537, 0.0 ], [ -77.0476675, 38.7585568, 0.0 ], [ -77.0500708, 38.7655172, 0.0 ], [ -77.0490408, 38.7703355, 0.0 ], [ -77.0511008, 38.7770271, 0.0 ], [ -77.055564, 38.7834504, 0.0 ], [ -77.0514441, 38.7898731, 0.0 ], [ -77.0614004, 38.8000413, 0.0 ], [ -77.0761633, 38.8027169, 0.0 ], [ -77.1063757, 38.8056599, 0.0 ], [ -77.1122122, 38.8051248, 0.0 ], [ -77.1225119, 38.8029845, 0.0 ], [ -77.1211386, 38.7997737, 0.0 ] ] ] } },
        { "type": "Feature", "properties": {"fid":7, "Name": "Springfield - I95", "description": null }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -77.3212958, 38.8380253, 0.0 ], [ -77.3274756, 38.8316069, 0.0 ], [ -77.3175192, 38.8275951, 0.0 ], [ -77.3216391, 38.8160934, 0.0 ], [ -77.3240424, 38.8128832, 0.0 ], [ -77.3322821, 38.8139533, 0.0 ], [ -77.3394919, 38.8174309, 0.0 ], [ -77.3394919, 38.8214432, 0.0 ], [ -77.3439551, 38.8217107, 0.0 ], [ -77.3480749, 38.8203733, 0.0 ], [ -77.3439551, 38.8150233, 0.0 ], [ -77.3418951, 38.8011116, 0.0 ], [ -77.3374319, 38.7968305, 0.0 ], [ -77.3336554, 38.7896055, 0.0 ], [ -77.3116827, 38.7850561, 0.0 ], [ -77.2903967, 38.7714062, 0.0 ], [ -77.2749472, 38.756415, 0.0 ], [ -77.2852469, 38.7427595, 0.0 ], [ -77.2787238, 38.7355291, 0.0 ], [ -77.280097, 38.7250839, 0.0 ], [ -77.2763205, 38.7197268, 0.0 ], [ -77.2855902, 38.715173, 0.0 ], [ -77.2897101, 38.7162445, 0.0 ], [ -77.2934866, 38.715173, 0.0 ], [ -77.2958899, 38.7068681, 0.0 ], [ -77.2986365, 38.7055285, 0.0 ], [ -77.2797537, 38.6974905, 0.0 ], [ -77.2680807, 38.6891836, 0.0 ], [ -77.2615576, 38.6883797, 0.0 ], [ -77.2577811, 38.6856998, 0.0 ], [ -77.250228, 38.6741752, 0.0 ], [ -77.2430182, 38.672835, 0.0 ], [ -77.2334051, 38.6621125, 0.0 ], [ -77.2244788, 38.6586274, 0.0 ], [ -77.2104025, 38.6562145, 0.0 ], [ -77.2049094, 38.6580912, 0.0 ], [ -77.1994162, 38.657555, 0.0 ], [ -77.194953, 38.6529972, 0.0 ], [ -77.1966696, 38.6489753, 0.0 ], [ -77.2052527, 38.6387856, 0.0 ], [ -77.2145224, 38.6374448, 0.0 ], [ -77.2114325, 38.6293991, 0.0 ], [ -77.2059393, 38.6261806, 0.0 ], [ -77.2028494, 38.6175972, 0.0 ], [ -77.1904898, 38.6200114, 0.0 ], [ -77.1801901, 38.6226937, 0.0 ], [ -77.1681738, 38.6259124, 0.0 ], [ -77.1589041, 38.637713, 0.0 ], [ -77.1510077, 38.6352994, 0.0 ], [ -77.1427679, 38.6352994, 0.0 ], [ -77.1304083, 38.634763, 0.0 ], [ -77.1338415, 38.6422717, 0.0 ], [ -77.1328116, 38.6452214, 0.0 ], [ -77.1372748, 38.6479028, 0.0 ], [ -77.1369315, 38.6505841, 0.0 ], [ -77.1413946, 38.6521928, 0.0 ], [ -77.1444846, 38.6564826, 0.0 ], [ -77.1496344, 38.657555, 0.0 ], [ -77.1506644, 38.6613083, 0.0 ], [ -77.1492911, 38.6639891, 0.0 ], [ -77.1516943, 38.6666698, 0.0 ], [ -77.1595908, 38.6698865, 0.0 ], [ -77.1650839, 38.6755153, 0.0 ], [ -77.174697, 38.6798037, 0.0 ], [ -77.1771002, 38.6781956, 0.0 ], [ -77.1801901, 38.6806077, 0.0 ], [ -77.1867133, 38.6814118, 0.0 ], [ -77.18534, 38.6843598, 0.0 ], [ -77.1774435, 38.6840918, 0.0 ], [ -77.1668005, 38.6856998, 0.0 ], [ -77.1654272, 38.6832878, 0.0 ], [ -77.163024, 38.6851638, 0.0 ], [ -77.1602774, 38.6905235, 0.0 ], [ -77.1592474, 38.6964187, 0.0 ], [ -77.160964, 38.7033851, 0.0 ], [ -77.1671439, 38.707136, 0.0 ], [ -77.1698904, 38.7183875, 0.0 ], [ -77.1743536, 38.7205304, 0.0 ], [ -77.1733237, 38.7296372, 0.0 ], [ -77.1633673, 38.7374038, 0.0 ], [ -77.164054, 38.7400817, 0.0 ], [ -77.1489478, 38.7451695, 0.0 ], [ -77.141738, 38.750257, 0.0 ], [ -77.1365881, 38.7593599, 0.0 ], [ -77.1252585, 38.7657848, 0.0 ], [ -77.1156454, 38.7692648, 0.0 ], [ -77.1207953, 38.7735475, 0.0 ], [ -77.1197653, 38.7802388, 0.0 ], [ -77.1153021, 38.7842533, 0.0 ], [ -77.1180487, 38.7879999, 0.0 ], [ -77.118392, 38.7976332, 0.0 ], [ -77.1211386, 38.7997737, 0.0 ], [ -77.1225119, 38.8029845, 0.0 ], [ -77.1341849, 38.7997737, 0.0 ], [ -77.1345282, 38.8029845, 0.0 ], [ -77.1379614, 38.8083353, 0.0 ], [ -77.1424246, 38.8155583, 0.0 ], [ -77.1558142, 38.8086029, 0.0 ], [ -77.1661139, 38.8168959, 0.0 ], [ -77.1705771, 38.8166284, 0.0 ], [ -77.172637, 38.8123482, 0.0 ], [ -77.2649908, 38.8110106, 0.0 ], [ -77.2670508, 38.8134183, 0.0 ], [ -77.2649908, 38.8193033, 0.0 ], [ -77.260871, 38.8233156, 0.0 ], [ -77.2533179, 38.8409669, 0.0 ], [ -77.269454, 38.8425713, 0.0 ], [ -77.2804404, 38.8447105, 0.0 ], [ -77.281127, 38.8425713, 0.0 ], [ -77.2886801, 38.8431061, 0.0 ], [ -77.2883368, 38.8388276, 0.0 ], [ -77.2969199, 38.839095, 0.0 ], [ -77.3013831, 38.8401646, 0.0 ], [ -77.3017264, 38.837223, 0.0 ], [ -77.304473, 38.8369556, 0.0 ], [ -77.3051596, 38.8393624, 0.0 ], [ -77.3089362, 38.8377579, 0.0 ], [ -77.3127127, 38.8380253, 0.0 ], [ -77.3212958, 38.8380253, 0.0 ] ] ] } },
        { "type": "Feature", "properties": {"fid":8, "Name": "Tysons, Mclean, Vienna, Great Falls", "description": null }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -77.3744137, 39.0168388, 0.0 ], [ -77.343858, 39.0008321, 0.0 ], [ -77.3369915, 38.994962, 0.0 ], [ -77.3239452, 38.9845548, 0.0 ], [ -77.3249752, 38.9826867, 0.0 ], [ -77.3222286, 38.9784166, 0.0 ], [ -77.3136456, 38.9674731, 0.0 ], [ -77.3163921, 38.9591976, 0.0 ], [ -77.3157055, 38.9477172, 0.0 ], [ -77.3074657, 38.9487852, 0.0 ], [ -77.3009426, 38.9477172, 0.0 ], [ -77.3023159, 38.9421098, 0.0 ], [ -77.2988827, 38.9362349, 0.0 ], [ -77.3071224, 38.9311607, 0.0 ], [ -77.3146755, 38.9298253, 0.0 ], [ -77.3236019, 38.925552, 0.0 ], [ -77.3270351, 38.9210113, 0.0 ], [ -77.3232586, 38.9060516, 0.0 ], [ -77.3201687, 38.9055172, 0.0 ], [ -77.3170788, 38.9079217, 0.0 ], [ -77.3057491, 38.9044485, 0.0 ], [ -77.3047192, 38.8991049, 0.0 ], [ -77.2913296, 38.8953641, 0.0 ], [ -77.2817165, 38.8881492, 0.0 ], [ -77.2824032, 38.8806663, 0.0 ], [ -77.298196, 38.8742517, 0.0 ], [ -77.2985394, 38.8691731, 0.0 ], [ -77.2731335, 38.8675693, 0.0 ], [ -77.2700436, 38.8662327, 0.0 ], [ -77.2552807, 38.8681039, 0.0 ], [ -77.2504742, 38.8731826, 0.0 ], [ -77.2501308, 38.8769245, 0.0 ], [ -77.2456676, 38.8774591, 0.0 ], [ -77.2456676, 38.8806663, 0.0 ], [ -77.2384579, 38.8817353, 0.0 ], [ -77.2199184, 38.8870803, 0.0 ], [ -77.2195751, 38.8836061, 0.0 ], [ -77.1924526, 38.8956313, 0.0 ], [ -77.1873028, 38.900708, 0.0 ], [ -77.1721966, 38.8961657, 0.0 ], [ -77.1210415, 38.9351667, 0.0 ], [ -77.1272213, 38.9415757, 0.0 ], [ -77.1334011, 38.9495862, 0.0 ], [ -77.1536571, 38.9642698, 0.0 ], [ -77.1828396, 38.968007, 0.0 ], [ -77.2082455, 38.9701424, 0.0 ], [ -77.2336514, 38.9770821, 0.0 ], [ -77.2436077, 38.9818861, 0.0 ], [ -77.2549374, 39.0051009, 0.0 ], [ -77.246011, 39.0149715, 0.0 ], [ -77.2477276, 39.0253742, 0.0 ], [ -77.3273785, 39.0600388, 0.0 ], [ -77.3424847, 39.0611051, 0.0 ], [ -77.3744137, 39.0168388, 0.0 ] ] ] } }
    ]
};
