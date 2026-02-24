import type {
  Restaurant,
  LunchMenu,
  WeeklyLunchMenu,
  Departure,
  Camera,
  CameraDetail,
} from "@/api/types";
import { format, addDays, startOfWeek, getISOWeek } from "date-fns";

const today = new Date();
const todayStr = format(today, "yyyy-MM-dd");
const weekStr = `${format(today, "yyyy")}-W${String(getISOWeek(today)).padStart(2, "0")}`;
const now = new Date().toISOString();

export const restaurants: Restaurant[] = [
  { id: "1", name: "Kårrestaurangen", websiteUrl: "https://kar.chalmers.se", tags: ["vegetarisk", "kött"] },
  { id: "2", name: "Lindholmen Street Food", websiteUrl: "https://lindholmenstreetfood.se", tags: ["vegansk", "kött"] },
  { id: "3", name: "Miillo", websiteUrl: "https://miillo.se", tags: ["fisk", "kött"] },
  { id: "4", name: "Kooperativet", websiteUrl: "https://kooperativet.se", tags: ["vegetarisk", "vegansk"] },
  { id: "5", name: "Ocean", websiteUrl: "https://restaurangocean.se", tags: ["fisk"] },
  { id: "6", name: "Benne Pasta Bar", websiteUrl: "https://bennepastabar.se", tags: ["vegetarisk", "kött"] },
  { id: "7", name: "Hey Stansen", websiteUrl: "https://heystansen.se", tags: ["vegetarisk", "kött"] },
  { id: "8", name: "Ciao Lindholmen", websiteUrl: "https://www.ciao.se", tags: ["vegetarisk", "kött"] },
  { id: "9", name: "Birger Bar & Matsal", websiteUrl: "https://birgerbar.se", tags: ["fisk", "kött"] },
  { id: "10", name: "L's Kitchen", websiteUrl: "https://lskitchen.se", tags: ["vegetarisk", "kött"] },
  { id: "11", name: "Tai", websiteUrl: "https://www.facebook.com/TaiLindholmen", tags: ["vegetarisk", "kött"] },
  { id: "12", name: "Tandoori Masala", websiteUrl: "https://tandoorimasala.se", tags: ["vegetarisk", "kött"] },
  { id: "13", name: "Jinx Food Truck", websiteUrl: "https://jinxfoodtruck.se", tags: ["kött"] },
  { id: "14", name: "Subway Lindholmen", websiteUrl: "https://subway.se", tags: ["vegetarisk", "kött"] },
  { id: "15", name: "Poke & Bowl", websiteUrl: "https://pokebowl.se", tags: ["fisk", "vegansk"] },
];

export const lunchMenus: LunchMenu[] = [
  {
    restaurantId: "1", restaurantName: "Kårrestaurangen", websiteUrl: "https://kar.chalmers.se", date: todayStr,
    dishes: [
      { name: "Stekt kycklingfilé med rostad potatis och bearnaisesås", tags: ["kött"] },
      { name: "Vegetarisk lasagne med grönsaksfyllning", tags: ["vegetarisk"] },
      { name: "Pannbiff med gräddsås, lingon och kokt potatis", tags: ["kött"] },
    ],
    sourceUrl: "https://kar.chalmers.se/lunch", updatedAt: now,
  },
  {
    restaurantId: "2", restaurantName: "Lindholmen Street Food", websiteUrl: "https://lindholmenstreetfood.se", date: todayStr,
    dishes: [
      { name: "Pulled pork bowl med coleslaw och majskolv", tags: ["kött"] },
      { name: "Vegansk tikka masala med ris", tags: ["vegansk"] },
    ],
    sourceUrl: "https://lindholmenstreetfood.se/meny", updatedAt: now,
  },
  {
    restaurantId: "3", restaurantName: "Miillo", websiteUrl: "https://miillo.se", date: todayStr,
    dishes: [
      { name: "Pasta med räkor, vitlök och chili", tags: ["fisk"] },
      { name: "Grillad entrecôte med pommes frites", tags: ["kött"] },
    ],
    sourceUrl: "https://miillo.se/lunch", updatedAt: now,
  },
  {
    restaurantId: "4", restaurantName: "Kooperativet", websiteUrl: "https://kooperativet.se", date: todayStr,
    dishes: [
      { name: "Halloumiburgare med sötpotatispommes", tags: ["vegetarisk"] },
      { name: "Vegansk poke bowl med tofu och edamame", tags: ["vegansk"] },
    ],
    sourceUrl: "https://kooperativet.se/meny", updatedAt: now,
  },
  {
    restaurantId: "5", restaurantName: "Ocean", websiteUrl: "https://restaurangocean.se", date: todayStr,
    dishes: [
      { name: "Stekt torskfilé med äggsås och kokt potatis", tags: ["fisk"] },
      { name: "Laxpudding med dill- och citronsås", tags: ["fisk"] },
    ],
    sourceUrl: "https://restaurangocean.se/lunch", updatedAt: now,
  },
  {
    restaurantId: "6", restaurantName: "Benne Pasta Bar", websiteUrl: "https://bennepastabar.se", date: todayStr,
    dishes: [
      { name: "Tagliatelle med svamp och tryffelolja", tags: ["vegetarisk"] },
      { name: "Spaghetti carbonara", tags: ["kött"] },
    ],
    sourceUrl: "https://bennepastabar.se/meny", updatedAt: now,
  },
  {
    restaurantId: "7", restaurantName: "Hey Stansen", websiteUrl: "https://heystansen.se", date: todayStr,
    dishes: [
      { name: "Fish & chips med remoulad", tags: ["fisk"] },
      { name: "BBQ-burger med cheddar och coleslaw", tags: ["kött"] },
      { name: "Grönsakswrap med hummus", tags: ["vegetarisk"] },
    ],
    sourceUrl: "https://heystansen.se/lunch", updatedAt: now,
  },
  {
    restaurantId: "8", restaurantName: "Ciao Lindholmen", websiteUrl: "https://www.ciao.se", date: todayStr,
    dishes: [
      { name: "Pizza Margherita", tags: ["vegetarisk"] },
      { name: "Pizza med skinka och svamp", tags: ["kött"] },
    ],
    sourceUrl: "https://www.ciao.se/meny", updatedAt: now,
  },
  {
    restaurantId: "9", restaurantName: "Birger Bar & Matsal", websiteUrl: "https://birgerbar.se", date: todayStr,
    dishes: [
      { name: "Grillad lax med citronrisotto", tags: ["fisk"] },
      { name: "Entrecôte med rödvinssky och gratäng", tags: ["kött"] },
    ],
    sourceUrl: "https://birgerbar.se/lunch", updatedAt: now,
  },
  {
    restaurantId: "10", restaurantName: "L's Kitchen", websiteUrl: "https://lskitchen.se", date: todayStr,
    dishes: [
      { name: "Bibimbap med kyckling och grönsaker", tags: ["kött"] },
      { name: "Vegetarisk bibimbap med tofu", tags: ["vegetarisk"] },
    ],
    sourceUrl: "https://lskitchen.se/lunch", updatedAt: now,
  },
  {
    restaurantId: "11", restaurantName: "Tai", websiteUrl: "https://www.facebook.com/TaiLindholmen", date: todayStr,
    dishes: [
      { name: "Pad Thai med kyckling", tags: ["kött"] },
      { name: "Grön curry med tofu och ris", tags: ["vegetarisk"] },
    ],
    sourceUrl: "https://www.facebook.com/TaiLindholmen", updatedAt: now,
  },
  {
    restaurantId: "12", restaurantName: "Tandoori Masala", websiteUrl: "https://tandoorimasala.se", date: todayStr,
    dishes: [
      { name: "Chicken tikka masala med naanbröd", tags: ["kött"] },
      { name: "Palak paneer med ris", tags: ["vegetarisk"] },
    ],
    sourceUrl: "https://tandoorimasala.se/meny", updatedAt: now,
  },
  {
    restaurantId: "13", restaurantName: "Jinx Food Truck", websiteUrl: "https://jinxfoodtruck.se", date: todayStr,
    dishes: [
      { name: "Smash burger med picklad lök och tryffelmajonnäs", tags: ["kött"] },
    ],
    sourceUrl: "https://jinxfoodtruck.se", updatedAt: now,
  },
  {
    restaurantId: "14", restaurantName: "Subway Lindholmen", websiteUrl: "https://subway.se", date: todayStr,
    dishes: [
      { name: "Sub of the Day – Italian B.M.T.", tags: ["kött"] },
      { name: "Veggie Delite", tags: ["vegetarisk"] },
    ],
    sourceUrl: "https://subway.se", updatedAt: now,
  },
  {
    restaurantId: "15", restaurantName: "Poke & Bowl", websiteUrl: "https://pokebowl.se", date: todayStr,
    dishes: [
      { name: "Laxpoke med avokado och edamame", tags: ["fisk"] },
      { name: "Vegansk poke med mango och tofu", tags: ["vegansk"] },
    ],
    sourceUrl: "https://pokebowl.se/meny", updatedAt: now,
  },
];

const dayNames = ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag"];

function buildWeek(menu: LunchMenu): WeeklyLunchMenu {
  const mondayOfWeek = startOfWeek(today, { weekStartsOn: 1 });
  return {
    restaurantId: menu.restaurantId,
    restaurantName: menu.restaurantName,
    websiteUrl: menu.websiteUrl,
    week: weekStr,
    days: dayNames.map((dayName, i) => ({
      date: format(addDays(mondayOfWeek, i), "yyyy-MM-dd"),
      dayName,
      dishes: menu.dishes,
    })),
    sourceUrl: menu.sourceUrl,
    updatedAt: now,
  };
}

export const weeklyMenus: WeeklyLunchMenu[] = lunchMenus.map(buildWeek);

export const departures: Departure[] = [
  { id: "d1", line: "286", destination: "Stenpiren", scheduledTime: "12:05", estimatedTime: "12:05", delayMinutes: 0, isRealtime: true, transportType: "Färja" },
  { id: "d2", line: "286", destination: "Stenpiren", scheduledTime: "12:25", estimatedTime: "12:27", delayMinutes: 2, isRealtime: true, transportType: "Färja" },
  { id: "d3", line: "286", destination: "Stenpiren", scheduledTime: "12:45", delayMinutes: 0, isRealtime: false, transportType: "Färja" },
  { id: "d4", line: "6", destination: "Kortedala", scheduledTime: "12:08", estimatedTime: "12:08", delayMinutes: 0, isRealtime: true, transportType: "Spårvagn" },
  { id: "d5", line: "6", destination: "Länsmansgården", scheduledTime: "12:14", estimatedTime: "12:16", delayMinutes: 2, isRealtime: true, transportType: "Spårvagn" },
  { id: "d6", line: "6", destination: "Kortedala", scheduledTime: "12:22", delayMinutes: 0, isRealtime: false, transportType: "Spårvagn" },
  { id: "d7", line: "16", destination: "Eriksberg", scheduledTime: "12:03", estimatedTime: "12:05", delayMinutes: 2, isRealtime: true, transportType: "Buss" },
  { id: "d8", line: "16", destination: "Eketrägatan", scheduledTime: "12:10", estimatedTime: "12:10", delayMinutes: 0, isRealtime: true, transportType: "Buss" },
  { id: "d9", line: "55", destination: "Nordstan", scheduledTime: "12:18", delayMinutes: 0, isRealtime: false, transportType: "Buss" },
  { id: "d10", line: "55", destination: "Lindholmen", scheduledTime: "12:35", delayMinutes: 0, isRealtime: false, transportType: "Buss" },
];

export const cameras: Camera[] = [
  { id: "c1", name: "Älvsborgsbron", location: "Göteborg", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=Älvsborgsbron", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=Älvsborgsbron", updatedAt: now },
  { id: "c2", name: "Göta älvbron", location: "Göteborg", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=Göta+älvbron", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=Göta+älvbron", updatedAt: now },
  { id: "c3", name: "Tingstadstunneln Norr", location: "Göteborg", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=Tingstadstunneln+N", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=Tingstadstunneln+Norr", updatedAt: now },
  { id: "c4", name: "Tingstadstunneln Söder", location: "Göteborg", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=Tingstadstunneln+S", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=Tingstadstunneln+Söder", updatedAt: now },
  { id: "c5", name: "Lundbyleden", location: "Göteborg", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=Lundbyleden", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=Lundbyleden", updatedAt: now },
  { id: "c6", name: "Oscarsleden", location: "Göteborg", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=Oscarsleden", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=Oscarsleden", updatedAt: now },
  { id: "c7", name: "Hisingsbron", location: "Göteborg", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=Hisingsbron", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=Hisingsbron", updatedAt: now },
  { id: "c8", name: "E6 Kungsbacka Norr", location: "Kungsbacka", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=E6+Kungsbacka+N", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=E6+Kungsbacka+Norr", updatedAt: now },
  { id: "c9", name: "E6 Kungsbacka Söder", location: "Kungsbacka", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=E6+Kungsbacka+S", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=E6+Kungsbacka+Söder", updatedAt: now },
  { id: "c10", name: "E6/E20 Bäckebol", location: "Göteborg", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=E6+Bäckebol", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=E6/E20+Bäckebol", updatedAt: now },
  { id: "c11", name: "Marieholmsförbindelsen", location: "Göteborg", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=Marieholmsf.", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=Marieholmsförbindelsen", updatedAt: now },
  { id: "c12", name: "Götatunneln", location: "Göteborg", thumbnailUrl: "https://placehold.co/400x300/1a1a2e/e0e0e0?text=Götatunneln", fullImageUrl: "https://placehold.co/1280x960/1a1a2e/e0e0e0?text=Götatunneln", updatedAt: now },
];

export const cameraDetails: Record<string, CameraDetail> = Object.fromEntries(
  cameras.map((c) => [
    c.id,
    { ...c, description: `Trafikamera vid ${c.name}, ${c.location}.` },
  ])
);
