import { renderHeader } from "./shared/header.js";
import * as map from "./modules/map.js";

const PLACE_TYPES = {
  see: "tourist_attraction",
  dining: "restaurant",
  cafe: "cafe",
  bar: "bar",
  hotel: "lodging",
  mall: "shopping_mall",
};
const inputValues = ["destination", "startDate", "endDate", "duration", "guests"];

let types = Object.keys(PLACE_TYPES);

renderHeader();
initializeMap();


/* ******** STATE CONTROLLER ******** */


/* ******** POPULAR ITINERARIES OVERVIEW ******** */
const destination = getInpFromUrl(inputValues[0]);
const place = destination.split(',')[1];
const city = destination.split(',')[0];
console.log('Clicked itinerary link with destination:', destination, city, place);
await displayItineraryInfo(city, place);

async function displayItineraryInfo(city, place){
  let response = await fetch(`/api/locations`);
  let itinerary = await response.json();  
  console.log(itinerary);

  let location = itinerary[place];
  console.log(location);
  let locationsArray = flattenLocations(itinerary);
  let placeData = findByPlaceCity(locationsArray, place, city);
  console.log(placeData);

  const itineraryHtml = `
          <h1>${placeData.place}</h1>
          <img src="${placeData.img}" alt="${placeData.place}">
          <p>${placeData.details}</p>
  `;

  document.querySelector('.itinerary-overview').innerHTML += itineraryHtml;
  }

function flattenLocations(locations){
    let results = [];
    for (let key in locations){
        let location = locations[key];
        for (let place of location){
            results.push(place);
        }
    }
    console.log(results);
    return results;
}

function findByPlaceCity(array, place, city){
    console.log(array, place, city);
    let result = null;
    for (let item of array){
        console.log(item);
        if (item.place === place && item.city.includes(city)) {
            result = item;
            break;
        }
    }
    return result;
}

/* ******** MAP CONTROLLER ******** */
async function initializeMap() {
  const destination = getInpFromUrl(inputValues[0]);
  if (destination) {
    try {
      const { lat, lng } = await map.getLatLngFromAddress(destination);
      const googleMap= await initAndSetupMap({ lat, lng });
      console.log(googleMap.center);
    } catch (error) {
      console.log(error);
      //default location
       const googleMap=await initAndSetupMap({ lat: 61.2181, lng: -149.9003 });
      console.log(googleMap.center);
    }
  } else {
     const googleMap=await initAndSetupMap({ lat: 61.2181, lng: -149.9003 });
    console.log(googleMap.center);
  }
}

async function initAndSetupMap(center) {
  const gmap = await map.initMap(center);
  for (let type of types) {
    const results = await map.nearbySearch(
      gmap.center,
      6000,
      PLACE_TYPES[type],
    );
    if (results) {
      results.forEach((result) => map.savePlace(result, type));
    }
    map.addMarker(type);
    map.createPlaceCard(type);
  }
  map.updatePlaceNumber(types);
  // Attach dragend event listener
  map.attachDragendListener(gmap, getTypes);
  return gmap;
}

//Function to get current types
function getTypes() {
  return types;
}

// Function to get query parameter values by name
function getInpFromUrl(name) {
  return decodeURIComponent(
    new URLSearchParams(window.location.search).get(name),
  );
}
  
/* ******** ITINERARY DETAIL SECTION ******** */
const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const startDate = getInpFromUrl(inputValues[1]);
const endDate = getInpFromUrl(inputValues[2]);
const duration = getInpFromUrl(inputValues[3])
const itineraryDetailGrid = document.querySelector(".itinerary-details");

// Display the days
//console.log("Days of the week between start and end date:");
//console.log(allDays);

//Generate itineray dates based on start/end dates
if(startDate & endDate){
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  const allDays = getDaysOfWeek(startDateObj, endDateObj);
  // Assign days of the week as headers
  itineraryDetailGrid.innerHTML = allDays
  .map(
    (day, index) =>
      `<h4 id="${startDateObj.getFullYear()}-${
        startDateObj.getMonth() + 1 < 10
          ? `0${startDateObj.getMonth() + 1}`
          : startDateObj.getMonth() + 1
      }-${
        startDateObj.getDate() + index + 1 < 10
          ? `0${startDateObj.getDate() + index + 1}`
          : startDateObj.getDate() + index + 1
      }">${day}</h4>`,
  )
  .join("");
}

//Generate itineray dates based on duration for home page itineraries
if(duration){
  const days = parseInt(duration, 10);
  for (let i = 0; i < days; i++){
    itineraryDetailGrid.innerHTML += 
    `
    <div class="daily-schedule" id="day${i+1}">
      <h4>Day ${i+1}</h4> 
    </div>
    `;
  }
}

// Get the days of the week
function getDaysOfWeek(startDateObj, endDateObj) {
  const days = [];
  let currentDate = new Date(startDateObj);
  while (currentDate <= endDateObj) {
    // Get the day of the week for the current date
    const dayOfWeek = daysOfWeek[currentDate.getDay()];
    // Add the day to the array
    days.push(dayOfWeek);
    // Increment the date by one day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return days;
}

/* ******** FILTER BUTTONS CONTROLLER ******** */
document
  .querySelector(".place-detail-grid")
  .addEventListener("click", (element) => {
    if (element.target.closest(".filter-buttons")) {
      selectPlaceFilters(element);
    }
    if (element.target.closest("#filter-actions")) {
      applyFilterAction(element);
    }
  });

function selectPlaceFilters(element) {
  const filterLi = element.target.closest(".filter-li");
  if (filterLi) {
    const linkElement = filterLi.querySelector("a");
    if (linkElement) {
      linkElement.classList.toggle("selected");
    }
    console.log(linkElement)
  }
}

function applyFilterAction(element) {
  const applyAction = element.target.closest("#apply-filter");
  const clearAction = element.target.closest("#clear-filter");
  if (!applyAction && !clearAction) return;
  if (clearAction) {
    clearFilter();
  }
  updateType();
  map.clearMarkers();
  types.forEach((type) => map.addMarker(type));
  map.clearAllPlaceCards();
  types.forEach((type) => map.createPlaceCard(type));
  map.updatePlaceNumber(types);
}

function clearFilter() {
  console.log;
  document.querySelectorAll(".selected").forEach((action) => {
    action.classList.remove("selected");
  });
}

function updateType() {
  const selectedElems = Array.from(document.querySelectorAll(".selected"));
  if (selectedElems.length === 0) {
    types = Object.keys(PLACE_TYPES);
  } else {
    types = selectedElems.map((element) => element.parentNode.id);
  }
}

/* ******** CHATBOT REDIRECT ******** */
document.getElementById('assitant-button').addEventListener('click',()=>{
  const destination = getInpFromUrl(inputValues[0]);
  window.location.href=`/chatbot?destination=${encodeURIComponent(destination)}`;
});