// Tool exports
export { tavilySearchTool, stockSearchTool, travelSearchTool, searchTavily } from './tavily.js';
export { newsHeadlinesTool, newsSearchTool, fetchTopHeadlines, searchNews } from './newsapi.js';
export { flightSearchTool, hotelSearchTool, searchFlights, searchHotels } from './amadeus.js';

// Tool collections for agents
import { tavilySearchTool, stockSearchTool, travelSearchTool } from './tavily.js';
import { newsHeadlinesTool, newsSearchTool } from './newsapi.js';
import { flightSearchTool, hotelSearchTool } from './amadeus.js';

// Travel agent tools
export const travelTools = [
    flightSearchTool,
    hotelSearchTool,
    travelSearchTool,
];

// News agent tools
export const newsTools = [
    newsHeadlinesTool,
    newsSearchTool,
    tavilySearchTool,
];

// Stock agent tools
export const stockTools = [
    stockSearchTool,
    tavilySearchTool,
];

// Meta agent tools (general search)
export const metaTools = [
    tavilySearchTool,
];

// All tools
export const allTools = [
    tavilySearchTool,
    stockSearchTool,
    travelSearchTool,
    newsHeadlinesTool,
    newsSearchTool,
    flightSearchTool,
    hotelSearchTool,
];
