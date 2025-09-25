// Card.ts

// Define the possible suits and ranks for strong typing throughout the project.
export const SUITS = ['spades', 'clubs', 'hearts', 'diamonds'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

// Create types from the constant arrays to enforce valid card values.
export type Suit = typeof SUITS[number];
export type Rank = typeof RANKS[number];

export default class Card {
    public suit: Suit;
    public rank: Rank;
    static SUITS: any;
    static RANKS: any;

    constructor(suit: Suit, rank: Rank) {
        this.suit = suit;
        this.rank = rank;
    }

    /**
     * Calculates the point value of the card according to the game rules.
     * - Black Kings are worth 0 points.
     * - Aces are 1 point.
     * - Number cards are their face value.
     * - Other face cards are 10 points.
     */
    get pointValue(): number {
        const isBlackSuit = this.suit === 'spades' || this.suit === 'clubs';

        if (isBlackSuit && this.rank === 'K') {
            return 0; // Black King is 0 points [cite: 6]
        }

        switch (this.rank) {
            case 'A': return 1;
            case 'K':
            case 'Q':
            case 'J': return 10;
            default: return parseInt(this.rank, 10); // Number cards are their face value [cite: 7]
        }
    }

    /**
     * Determines if the card is a special action card.
     * According to the rules, only the Black Jack and Black Queen have actions.
     */
    isActionCard(): boolean {
        const isBlackSuit = this.suit === 'spades' || this.suit === 'clubs';
        return isBlackSuit && (this.rank === 'J' || this.rank === 'Q');
    }

    /**
     * Returns a simple string representation of the card, e.g., "AS" for Ace of Spades.
     */
    get key(): string {
        return `${this.rank}${this.suit.charAt(0).toUpperCase()}`;
    }
}