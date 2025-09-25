// src/game/Card.ts

export default class Card {
    // ✅ ALTERNATE METHOD: Define SUITS and RANKS as static, readonly properties.
    // This makes them accessible from anywhere via `Card.SUITS` and `Card.RANKS`.
    static readonly SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
    static readonly RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

    // We can still have strong types by deriving them from the arrays above.
    // This removes the need to export and import Suit/Rank types separately.
    public suit: typeof Card.SUITS[number];
    public rank: typeof Card.RANKS[number];

    constructor(suit: typeof Card.SUITS[number], rank: typeof Card.RANKS[number]) {
        this.suit = suit;
        this.rank = rank;
    }

    get pointValue(): number {
        const isBlackSuit = this.suit === 'spades' || this.suit === 'clubs';
        if (isBlackSuit && this.rank === 'K') {
            return 0;
        }
        switch (this.rank) {
            case 'A': return 1;
            case 'K':
            case 'Q':
            case 'J': return 10;
            default: return Number(this.rank);
        }
    }

    toString(): string {
        const suitSymbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
        return `${this.rank}${suitSymbols[this.suit]}`;
    }
}