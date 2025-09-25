// src/game/Deck.ts

// ✅ SIMPLIFIED IMPORT: We only need to import the Card class itself.
import Card from './Card';

export default class Deck {
    private cards: Card[] = [];

    constructor() {
        this.buildDeck();
    }

    private buildDeck() {
        this.cards = [];
        // ✅ USAGE: We now iterate over the static properties of the Card class.
        // This is much cleaner and avoids potential import/export errors.
        for (const suit of Card.SUITS) {
            for (const rank of Card.RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle(): void {
        // Fisher-Yates shuffle algorithm
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    draw(): Card | undefined {
        return this.cards.pop();
    }

    drawMany(n: number): Card[] {
        const drawn: Card[] = [];
        for (let i = 0; i < n && this.size() > 0; i++) {
            drawn.push(this.draw()!);
        }
        return drawn;
    }

    size(): number {
        return this.cards.length;
    }
}