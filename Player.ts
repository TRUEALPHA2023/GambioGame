// Player.ts

import Card, { type Rank } from './Card';
import Deck from './Deck';

export default class Player {
    public hand: Card[] = [];
    public score: number = 0;
    public name: string;
    public isAi: boolean;

    constructor(name: string, isAi: boolean = false) {
        this.name = name;
        this.isAi = isAi;
    }

    /**
     * Adds cards drawn from a deck to the player's hand.
     */
    public draw(deck: Deck, count: number = 1): void {
        const newCards = deck.drawMany(count);
        this.hand.push(...newCards);
    }

    /**
     * Swaps a card at a specific index in the hand with a new card.
     */
    public swapCard(indexInHand: number, newCard: Card): Card {
        if (indexInHand < 0 || indexInHand >= this.hand.length) {
            throw new Error(`Invalid index ${indexInHand} for card swap.`);
        }
        const oldCard = this.hand[indexInHand];
        this.hand[indexInHand] = newCard;
        return oldCard;
    }

    /**
     * Finds and removes all cards of a specific rank from the hand.
     * This is used for the discard rule[cite: 8].
     * @param rank The rank to find and discard.
     * @returns An array of the discarded cards.
     */
    public discardRank(rank: Rank): Card[] {
        const cardsToDiscard = this.hand.filter(card => card.rank === rank);
        this.hand = this.hand.filter(card => card.rank !== rank);
        return cardsToDiscard;
    }

    /**
     * Calculates the player's score for the current round based on their hand.
     * Includes the 50-point penalty for holding a Black Queen[cite: 7].
     */
    public computeRoundScore(): number {
        let totalScore = this.hand.reduce((acc, card) => acc + card.pointValue, 0);

        const hasBlackQueen = this.hand.some(c =>
            (c.suit === 'spades' || c.suit === 'clubs') && c.rank === 'Q'
        );

        if (hasBlackQueen) {
            totalScore += 50; // Penalty for Black Queen at round end [cite: 7]
        }

        return totalScore;
    }
}