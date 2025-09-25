// Deck.ts

import Card, { SUITS, RANKS } from './Card';

export default class Deck {
    private cards: Card[] = [];

    constructor() {
        this.buildDeck();
        this.shuffle();
    }

    /**
     * Creates a standard 52-card deck.
     */
    private buildDeck(): void {
        this.cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    /**
     * Shuffles the deck using the Fisher-Yates (aka Knuth) shuffle algorithm.
     * This ensures a random and fair distribution of cards.
     */
    public shuffle(): void {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    /**
     * Draws a single card from the top of the deck.
     * Returns undefined if the deck is empty.
     */
    public draw(): Card | undefined {
        return this.cards.pop();
    }

    /**
     * Draws a specified number of cards from the deck.
     */
    public drawMany(count: number): Card[] {
        const drawnCards: Card[] = [];
        for (let i = 0; i < count; i++) {
            const card = this.draw();
            if (card) {
                drawnCards.push(card);
            }
        }
        return drawnCards;
    }

    /**
     * Returns the number of cards remaining in the deck.
     */
    public size(): number {
        return this.cards.length;
    }
}