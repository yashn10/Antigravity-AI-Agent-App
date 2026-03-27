import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { env } from '../config/env.js';
// @ts-ignore
import Amadeus from 'amadeus';

// Initialize Amadeus client
const amadeus = new Amadeus({
    clientId: env.AMADEUS_CLIENT_ID,
    clientSecret: env.AMADEUS_CLIENT_SECRET,
});

interface FlightOffer {
    id: string;
    price: {
        total: string;
        currency: string;
    };
    itineraries: Array<{
        duration: string;
        segments: Array<{
            departure: {
                iataCode: string;
                at: string;
            };
            arrival: {
                iataCode: string;
                at: string;
            };
            carrierCode: string;
            number: string;
            duration: string;
            numberOfStops: number;
        }>;
    }>;
}

interface HotelOffer {
    hotel: {
        name: string;
        hotelId: string;
        rating?: string;
        address?: {
            lines?: string[];
            cityName?: string;
        };
    };
    offers?: Array<{
        id: string;
        price?: {
            total?: string;
            currency?: string;
        };
        room?: {
            description?: {
                text?: string;
            };
        };
    }>;
}

// Format duration from ISO 8601
function formatDuration(isoDuration: string): string {
    const match = isoDuration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return isoDuration;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;

    if (hours && minutes) return `${hours}h ${minutes}m`;
    if (hours) return `${hours}h`;
    if (minutes) return `${minutes}m`;
    return isoDuration;
}

// Format datetime
function formatDateTime(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Search for flights
async function searchFlights(
    origin: string,
    destination: string,
    departureDate: string,
    returnDate?: string,
    adults: number = 1,
    maxOffers: number = 5
): Promise<FlightOffer[]> {
    try {
        const params: Record<string, string | number> = {
            originLocationCode: origin.toUpperCase(),
            destinationLocationCode: destination.toUpperCase(),
            departureDate,
            adults,
            max: maxOffers,
            currencyCode: 'USD',
        };

        if (returnDate) {
            params.returnDate = returnDate;
        }

        const response = await amadeus.shopping.flightOffersSearch.get(params);
        return response.data || [];
    } catch (error) {
        console.error('Amadeus flight search error:', error);
        throw error;
    }
}

// Search for hotels
async function searchHotels(
    cityCode: string,
    checkInDate: string,
    checkOutDate: string,
    adults: number = 1,
    maxOffers: number = 5
): Promise<HotelOffer[]> {
    try {
        // First, get hotels in the city
        const hotelsResponse = await amadeus.referenceData.locations.hotels.byCity.get({
            cityCode: cityCode.toUpperCase(),
        });

        if (!hotelsResponse.data || hotelsResponse.data.length === 0) {
            return [];
        }

        // Get hotel IDs (limit to first 10 for API limits)
        const hotelIds = hotelsResponse.data
            .slice(0, 10)
            .map((h: { hotelId: string }) => h.hotelId);

        // Get offers for these hotels
        const offersResponse = await amadeus.shopping.hotelOffersSearch.get({
            hotelIds: hotelIds.join(','),
            checkInDate,
            checkOutDate,
            adults,
            roomQuantity: 1,
        });

        return (offersResponse.data || []).slice(0, maxOffers);
    } catch (error) {
        console.error('Amadeus hotel search error:', error);
        throw error;
    }
}

// Format flight results
function formatFlightResults(flights: FlightOffer[]): string {
    if (flights.length === 0) {
        return 'No flights found for the specified route and dates.';
    }

    return flights
        .map((flight, i) => {
            const outbound = flight.itineraries[0];
            const returnFlight = flight.itineraries[1];

            let result = `**Flight Option ${i + 1}** - $${flight.price.total} ${flight.price.currency}\n`;

            // Outbound
            const outSegments = outbound.segments;
            const outFirst = outSegments[0];
            const outLast = outSegments[outSegments.length - 1];
            result += `✈️ Outbound: ${outFirst.departure.iataCode} → ${outLast.arrival.iataCode}\n`;
            result += `   ${formatDateTime(outFirst.departure.at)} - ${formatDateTime(outLast.arrival.at)}\n`;
            result += `   Duration: ${formatDuration(outbound.duration)} | Stops: ${outSegments.length - 1}\n`;
            result += `   Flights: ${outSegments.map(s => `${s.carrierCode}${s.number}`).join(' → ')}\n`;

            // Return flight if exists
            if (returnFlight) {
                const retSegments = returnFlight.segments;
                const retFirst = retSegments[0];
                const retLast = retSegments[retSegments.length - 1];
                result += `✈️ Return: ${retFirst.departure.iataCode} → ${retLast.arrival.iataCode}\n`;
                result += `   ${formatDateTime(retFirst.departure.at)} - ${formatDateTime(retLast.arrival.at)}\n`;
                result += `   Duration: ${formatDuration(returnFlight.duration)} | Stops: ${retSegments.length - 1}\n`;
            }

            return result;
        })
        .join('\n');
}

// Format hotel results
function formatHotelResults(hotels: HotelOffer[]): string {
    if (hotels.length === 0) {
        return 'No hotels found for the specified location and dates.';
    }

    return hotels
        .map((hotel, i) => {
            const offer = hotel.offers?.[0];
            const price = offer?.price?.total
                ? `$${offer.price.total} ${offer.price.currency || 'USD'}`
                : 'Price on request';
            const rating = hotel.hotel.rating ? `${'⭐'.repeat(parseInt(hotel.hotel.rating))}` : '';

            return `**${i + 1}. ${hotel.hotel.name}** ${rating}
   ${hotel.hotel.address?.cityName || 'Location not specified'}
   ${price}
   ${offer?.room?.description?.text || 'Room details available on booking'}`;
        })
        .join('\n\n');
}

// LangChain tool for flight search
export const flightSearchTool = tool(
    async ({ origin, destination, departureDate, returnDate, travelers }) => {
        try {
            const flights = await searchFlights(
                origin,
                destination,
                departureDate,
                returnDate,
                travelers
            );

            const tripType = returnDate ? 'Round-trip' : 'One-way';
            return `**${tripType} Flight Search: ${origin} → ${destination}**
Departure: ${departureDate}${returnDate ? ` | Return: ${returnDate}` : ''}
Travelers: ${travelers}

${formatFlightResults(flights)}`;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return `Error searching flights: ${errorMessage}. Please verify airport codes are correct (use 3-letter IATA codes like JFK, LAX, LHR).`;
        }
    },
    {
        name: 'search_flights',
        description: 'Search for available flights between two airports. Use 3-letter IATA airport codes.',
        schema: z.object({
            origin: z.string().length(3).describe('Origin airport IATA code (e.g., JFK, LAX)'),
            destination: z.string().length(3).describe('Destination airport IATA code (e.g., CDG, LHR)'),
            departureDate: z.string().describe('Departure date in YYYY-MM-DD format'),
            returnDate: z.string().optional().describe('Return date in YYYY-MM-DD format (for round trips)'),
            travelers: z.number().min(1).max(9).default(1).describe('Number of travelers'),
        }),
    }
);

// LangChain tool for hotel search
export const hotelSearchTool = tool(
    async ({ cityCode, checkInDate, checkOutDate, guests }) => {
        try {
            const hotels = await searchHotels(
                cityCode,
                checkInDate,
                checkOutDate,
                guests
            );

            return `**Hotel Search: ${cityCode}**
Check-in: ${checkInDate} | Check-out: ${checkOutDate}
Guests: ${guests}

${formatHotelResults(hotels)}`;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return `Error searching hotels: ${errorMessage}. Please verify the city code is correct (use 3-letter IATA codes like PAR, LON, NYC).`;
        }
    },
    {
        name: 'search_hotels',
        description: 'Search for available hotels in a city. Use 3-letter IATA city codes.',
        schema: z.object({
            cityCode: z.string().length(3).describe('City IATA code (e.g., PAR, NYC, LON)'),
            checkInDate: z.string().describe('Check-in date in YYYY-MM-DD format'),
            checkOutDate: z.string().describe('Check-out date in YYYY-MM-DD format'),
            guests: z.number().min(1).max(9).default(1).describe('Number of guests'),
        }),
    }
);

export { searchFlights, searchHotels, formatFlightResults, formatHotelResults };
