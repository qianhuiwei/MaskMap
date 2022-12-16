const pharmacies = [];
let filteredPharmacies = [];
let map;
const markerMap = new Map();

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
        showList(pharmacies);
        showMap();
    }
}

// Function that collects data we need from response of the API request
function collectData(response) {
    for (let dataItem of response) {
        let pharmacy = {
            id: dataItem.properties.id,
            name: dataItem.properties.name,
            phone: dataItem.properties.phone,
            address: dataItem.properties.address,
            cord: [dataItem.geometry.coordinates[1], dataItem.geometry.coordinates[0]],
            note: dataItem.properties.note == "-" ? "" : dataItem.properties.note,
            maskAdult: dataItem.properties.mask_adult,
            maskChild: dataItem.properties.mask_child
        };
        pharmacies.push(pharmacy);
    }
    /* this line of code is just for showing better UI when the page is loaded, 
    should be removed
    */
    pharmacies.shift();
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

// Function that shows a list of pharmacies on the page based on input data
function showList(pharmacies) {
    if (pharmacies.length == 0) {
        showErrorMessage();
        return;
    }
    let list = document.querySelector(".list");
    list.classList.remove("list-error");
    let str = "";
    for (let pharmacy of pharmacies) {
        str += `<li class="list-item" data-id=${pharmacy.id} data-long=${pharmacy.cord[1]} data-lat=${pharmacy.cord[0]}>
    <h2 class="title">${pharmacy.name}</h2>
    <p>${pharmacy.address}</p>
        <p>${formatTel(pharmacy.phone)}</p>
            <p>${pharmacy.note}</p>
            <div class="mask-container">
                <p class="mask ${getBgColor(pharmacy.maskAdult)}">成人口罩<span>${pharmacy.maskAdult}</span></p>
                <p class="mask ${getBgColor(pharmacy.maskChild)}">兒童口罩<span>${pharmacy.maskChild}</span></p>
            </div>
        </li>`;
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
    if (pharmacies.length == 0) {
        showDefaultMap();
        return;
    }
    // load the map and set defualt center & zoom
    map.setView(pharmacies[0].cord, 18);
    // add marker group layer
    let markerGroup = new L.MarkerClusterGroup();

    // add markers
    for (let pharmacy of pharmacies) {
        let maskNum = pharmacy.maskAdult + pharmacy.maskChild;
        let marker = L.marker(pharmacy.cord, { icon: getMarkerIcon(maskNum) }).bindPopup(createPopup(pharmacy));
        markerMap.set(pharmacy.id, marker); // store each marker's id in a map data structure
        markerGroup.addLayer(marker);
    }
    map.addLayer(markerGroup);
    // open popup for thee first item in the list
    markerMap.get(pharmacies[0].id).openPopup();
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
function createPopup(pharmacy) {
    let str = "";
    str += `<div class="popup">
            <h2 class="title">${pharmacy.name}</h2>
            <p>${pharmacy.address}</p>
            <p>${formatTel(pharmacy.phone)}</p>
            <p>${pharmacy.note}</p>
            <div class="mask-container">
                <p class="mask ${getBgColor(pharmacy.maskAdult)}">成人口罩<span>${pharmacy.maskAdult}</span></p>
                <p class="mask ${getBgColor(pharmacy.maskChild)}">兒童口罩<span>${pharmacy.maskChild}</span></p>
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

/* Function that gets a list of pharmacies that matches the target input, 
   updates the list and map based on the search result.
*/
function search(e) {
    if (e.code == "Enter") {
        // sanitize user input
        const userInput = sanitize(e.target.value);
        if (userInput === "") {
            alert("請輸入搜尋關鍵字（中文、英文或數字\n請勿輸入標點符號或特殊符號");
            return;
        }
        // clear input field
        e.target.value = ""; 
        // find pharacies that match the searching keyword
        filteredPharmacy(userInput);
        // display searching result and update map
        showList(filteredPharmacies);
        if (filteredPharmacies.length == 0) {
            showDefaultMap();
        } else {
            updateMap(filteredPharmacies[0].cord, filteredPharmacies[0].id);
        }
    }
}

// Function that sanitizes user input for security
function sanitize(input) {
    // remove leading or trailing spaces
    let str = input.trim();
    // only allow numbers, english, chinese and space in between
    if (str.match(/^[a-zA-z0-9\u4E00-\u9FCC\ ]*$/)) {
        return str;
    } else {
        return "";
    }
}

// Function that opens the target's marker popup 
function showPopup(e) {
    let cur = e;
    if (cur.target.nodeName !== "LI") {
        cur = cur.target.parentNode;
        while (cur.nodeName !== "LI") {
            cur = cur.parentNode;
        }   
    } else {
        cur = e.target;
    }
    let dataset = cur.dataset;
    updateMap([dataset.lat, dataset.long], dataset.id);
}

// Function that gets a list of data that matches the input keyword
function filteredPharmacy(keyword) {
    filteredPharmacies = [];
    for (let pharmacy of pharmacies) {
        if (pharmacy.name.includes(keyword) || pharmacy.address.includes(keyword)) {
            filteredPharmacies.push(pharmacy);
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
    document.querySelector(".date").innerHTML = `${formatDate()}`;
    document.querySelector(".id span").innerHTML = idEnd;
}

/*------------------*/
/* Formaters        */
/*------------------*/

// Function function that formats the date info to meet the design specs
function formatDate() {
    let now = new Date();
    let month = now.getMonth() + 1;
    let date = now.getDate();
    let dateStr = date < 10 ? "0" : "";
    let monStr = month < 10 ? "0" : "";

    let result = `${now.getFullYear()}-${monStr + month}-${dateStr + date}`;
    return result;
}

// Function function that formats the tel number to meet the design specs
function formatTel(tel) {
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