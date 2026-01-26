import assert from "node:assert/strict";
import { test } from "node:test";
import { getDefaultDirection, getNextBusinessDay, formatTime, formatDelay, weatherCodeToDescription, getRouteConfig, STATIONS, } from "./commute-dashboard.js";
test("getDefaultDirection returns toLondon before noon on weekdays", () => {
    // Monday 9am
    const mondayMorning = new Date("2025-01-06T09:00:00");
    assert.equal(getDefaultDirection(mondayMorning), "toLondon");
    // Friday 11am
    const fridayMorning = new Date("2025-01-10T11:00:00");
    assert.equal(getDefaultDirection(fridayMorning), "toLondon");
});
test("getDefaultDirection returns toHome after noon on weekdays", () => {
    // Monday 2pm
    const mondayAfternoon = new Date("2025-01-06T14:00:00");
    assert.equal(getDefaultDirection(mondayAfternoon), "toHome");
    // Wednesday 6pm
    const wednesdayEvening = new Date("2025-01-08T18:00:00");
    assert.equal(getDefaultDirection(wednesdayEvening), "toHome");
});
test("getDefaultDirection returns toLondon on weekends", () => {
    // Saturday morning
    const saturdayMorning = new Date("2025-01-04T09:00:00");
    assert.equal(getDefaultDirection(saturdayMorning), "toLondon");
    // Sunday evening
    const sundayEvening = new Date("2025-01-05T18:00:00");
    assert.equal(getDefaultDirection(sundayEvening), "toLondon");
});
test("getNextBusinessDay skips weekends", () => {
    // Friday -> Monday
    const friday = new Date("2025-01-10");
    const afterFriday = getNextBusinessDay(friday);
    assert.equal(afterFriday.getDay(), 1); // Monday
    // Thursday -> Friday
    const thursday = new Date("2025-01-09");
    const afterThursday = getNextBusinessDay(thursday);
    assert.equal(afterThursday.getDay(), 5); // Friday
});
test("getNextBusinessDay handles Saturday correctly", () => {
    // Saturday -> Monday
    const saturday = new Date("2025-01-11");
    const afterSaturday = getNextBusinessDay(saturday);
    assert.equal(afterSaturday.getDay(), 1); // Monday
});
test("formatTime converts Date to HH:MM format", () => {
    const date = new Date("2025-01-10T14:30:00");
    assert.equal(formatTime(date), "14:30");
    const morning = new Date("2025-01-10T08:05:00");
    assert.equal(formatTime(morning), "08:05");
});
test("formatDelay returns correct strings", () => {
    assert.equal(formatDelay(0), "On time");
    assert.equal(formatDelay(null), "On time");
    assert.equal(formatDelay(undefined), "On time");
    assert.equal(formatDelay(5), "5 min late");
    assert.equal(formatDelay(-2), "2 min early");
});
test("weatherCodeToDescription returns correct descriptions", () => {
    assert.equal(weatherCodeToDescription(0), "Clear sky");
    assert.equal(weatherCodeToDescription(3), "Overcast");
    assert.equal(weatherCodeToDescription(63), "Rain");
    assert.equal(weatherCodeToDescription(95), "Thunderstorm");
    assert.equal(weatherCodeToDescription(999), "Unknown");
});
test("getRouteConfig returns correct config for toLondon", () => {
    const config = getRouteConfig("toLondon");
    assert.equal(config.rail.from, STATIONS.rail.harpenden);
    assert.equal(config.rail.to, STATIONS.rail.stPancras);
    assert.equal(config.tube.station, STATIONS.tube.kingsCross);
    assert.equal(config.railLabel, "Harpenden to St Pancras");
});
test("getRouteConfig returns correct config for toHome", () => {
    const config = getRouteConfig("toHome");
    assert.equal(config.rail.from, STATIONS.rail.stPancras);
    assert.equal(config.rail.to, STATIONS.rail.harpenden);
    assert.equal(config.tube.station, STATIONS.tube.piccadillyCircus);
    assert.equal(config.railLabel, "St Pancras to Harpenden");
});
//# sourceMappingURL=commute-dashboard.test.js.map