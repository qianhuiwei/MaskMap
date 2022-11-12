let data = [];
let filteredData = [];
let map;
let markerMap = new Map();

/*------------------*/
/* Load the page    */
/*------------------*/

/* Function that makes an AJAX request to access pharmacy data from an API.
   Once successfully get the data, 
   show a list of data and a map marked with corresponding data.
*/
function getData() {
    let xhr = new XMLHttpRequest();
    xhr.open("get", "https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json", true);
    xhr.send();
    showLoader();
    showDefaultMap();
    xhr.onload = function () {
        let response = JSON.parse(xhr.responseText).features;
        collectData(response);
        showList(data);
        showMap();
    }
}

// Function that collects data we need from response of the API request
function collectData(response) {
    for (let dataItem of response) {
        let obj = {};
        obj.id = dataItem.properties.id;
        obj.name = dataItem.properties.name;
        obj.phone = dataItem.properties.phone;
        obj.address = dataItem.properties.address;
        obj.cord = [dataItem.geometry.coordinates[1], dataItem.geometry.coordinates[0]];
        obj.note = dataItem.properties.note == "-" ? "" : dataItem.properties.note;
        obj.maskAdult = dataItem.properties.mask_adult;
        obj.maskChild = dataItem.properties.mask_child;
        data.push(obj);
    }
    /* this line of code is just for showing better UI when the page is loaded, 
    should be removed
    */
    data.shift();
}

// Function that shows loader while requesting data
function showLoader() {
    let list = document.querySelector(".list")
    list.innerHTML = "載入資料中，請稍候";
    list.classList.add("list-error");
}

/* Function that shows error messaage when no data to show 
*/
function showErrorMessage() {
    let list = document.querySelector(".list")
    list.innerHTML = "沒有找到相符的資料";
    list.classList.add("list-error");
}

// Function that shows the default map 
function showDefaultMap() {
    if (!map) {
        map = L.map('map').setView([25.0399991, 121.509762], 10);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    } else {
        map.setView([25.0399991, 121.509762], 10);
    }
}

/*------------------*/
/* Display the list */
/*------------------*/

// Function that shows a list of pharmacy on the page based on input data
function showList(data) {
    if (data.length == 0) {
        showErrorMessage();
        return;
    }
    let list = document.querySelector(".list");
    list.classList.remove("list-error");
    let str = "";
    for (let dataItem of data) {
        str += `<li class="list-item" data-id=${dataItem.id} data-long=${dataItem.cord[1]} data-lat=${dataItem.cord[0]}>
            <h2 class="title">${dataItem.name}</h2>
            <p>${dataItem.address}</p>
            <p>${formateTel(dataItem.phone)}</p>
            <p>${dataItem.note}</p>
            <div class="mask-container">
                <p class="mask ${getBgColor(dataItem.maskAdult)}">成人口罩<span>${dataItem.maskAdult}</span></p>
                <p class="mask ${getBgColor(dataItem.maskChild)}">兒童口罩<span>${dataItem.maskChild}</span></p>
            </div>
        </li>`;;
    }
    list.innerHTML = str;
}

// Function that returns a background color based on the input mask number
function getBgColor(maskNum) {
    let bgColor = "";
    if (maskNum >= 200) {
        bgColor = "bg-primary";
    } else if (maskNum == 0) {
        bgColor = "bg-gray";
    } else {
        bgColor = "bg-light";
    }
    return bgColor;
}

/*------------------*/
/* Display the map  */
/*------------------*/

/* Function that shows a map on the page
   The map will have markers and popup info for each pharmacy.
*/
function showMap() {
    if (data.length == 0) {
        showDefaultMap();
        return;
    }
    // load the map and set defualt center & zoom
    map.setView(data[0].cord, 18);
    // add marker group layer
    let markerGroup = new L.MarkerClusterGroup().addTo(map);

    // add markers
    for (let dataItem of data) {
        let maskNum = dataItem.maskAdult + dataItem.maskChild;
        let marker = L.marker(dataItem.cord, { icon: getMarkerIcon(maskNum) }).bindPopup(createPopup(dataItem));
        markerMap.set(dataItem.id, marker); // store each marker's id in a map data structure
        markerGroup.addLayer(marker);
    }
    map.addLayer(markerGroup);
    // open popup for thee first item in the list
    markerMap.get(data[0].id).openPopup();
}

/* Function that returns a marker icon with background color. 
   The bg color will differ based on the input mask number.
 */
function getMarkerIcon(maskNum) {
    // get icon background color
    let iconBg = "";
    if (maskNum == 0) {
        iconBg = "grey";
    } else if (maskNum < 1000) {
        iconBg = "red";
    } else {
        iconBg = "blue";
    }
    // create marker icon object based on background color
    return new L.Icon({
        iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconBg}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
}

// Function that creates a map's marker popup with info from the input data
function createPopup(dataItem) {
    let str = "";
    str += `<div class="popup">
            <h2 class="title">${dataItem.name}</h2>
            <p>${dataItem.address}</p>
            <p>${formateTel(dataItem.phone)}</p>
            <p>${dataItem.note}</p>
            <div class="mask-container">
                <p class="mask ${getBgColor(dataItem.maskAdult)}">成人口罩<span>${dataItem.maskAdult}</span></p>
                <p class="mask ${getBgColor(dataItem.maskChild)}">兒童口罩<span>${dataItem.maskChild}</span></p>
            </div>
        </div>`;
    return str;
}

/*----------------------*/
/* User events handling */
/*----------------------*/

// Function that binds event listeners needed in this project
function bindEventListeners() {
    document.querySelector(".input").addEventListener("keydown", search);
    document.querySelector(".list").addEventListener("click", showPopup);
}

/* Function that gets a list of data that matches the target input, 
   updates the list and map based on the search result.
*/
function search(e) {
    if (e.code == "Enter") {
        filterData(e.target.value);
        showList(filteredData);
        if (filteredData.length == 0) {
            showDefaultMap();
        } else {
            updateMap(filteredData[0].cord, filteredData[0].id);
        }
    }
}

// Function that opens the target's marker popup 
function showPopup(e) {
    let target = e.target.nodeName;
    if (target == "LI") {
        let dataset = e.target.dataset;
        updateMap([dataset.lat, dataset.long], dataset.id);
    }
}

// Function that gets a list of data that matches the input keyword
function filterData(keyword) {
    filteredData = [];
    for (let dataItem of data) {
        if (dataItem.name.includes(keyword) || dataItem.address.includes(keyword)) {
            filteredData.push(dataItem);
        }
    }
}

/* Function that resets the center of the map based on the input coordinates
   and opens its marker popup
*/
function updateMap(center, markerId) {
    map.setView(center, 18);
    markerMap.get(markerId).openPopup();
}

/*------------------*/
/* Date Info        */
/*------------------*/

// Function that gets current date info
function getInfo() {
    const dayName = ["日", "一", "二", "三", "四", "五", "六"];
    let day = new Date().getDay();
    let idEnd = day % 2 == 0 ? "2,4,6,8,0" : "1,3,5,7,9";
    document.querySelector(".day").innerHTML = `星期${dayName[day]}`;
    document.querySelector(".date").innerHTML = `${formateDate()}`;
    document.querySelector(".id span").innerHTML = idEnd;
}

/*------------------*/
/* Formaters        */
/*------------------*/

// Function function that formates the date info to meet the design specs
function formateDate() {
    let now = new Date();
    let month = now.getMonth() + 1;
    let date = now.getDate();
    let dateStr = date < 10 ? "0" : "";
    let monStr = month < 10 ? "0" : "";

    let result = `${now.getFullYear()}-${monStr + month}-${dateStr + date}`;
    return result;
}

// Function function that formates the tel number to meet the design specs
function formateTel(tel) {
    let cityCode = tel.substring(1, 3);
    let s1;
    let s2;
    if (cityCode == "02" || cityCode == "04") {
        s1 = tel.substring(4, 8);
        s2 = tel.substring(8);
    } else {
        s1 = tel.substring(4, 7);
        s2 = tel.substring(7);
    }
    return `${cityCode} ${s1} ${s2}`;
}

/*------------------*/
/* Init function    */
/*------------------*/
function init() {
    getData();
    getInfo();
    bindEventListeners();
}

init();