// src/game/Player.ts
import Deck from './Deck';
import Card from './Card';

export default class Player {
    public hand: Card[] = [];
    public score: number = 0;

    constructor(public name: string, public isAi: boolean = false) {}

    draw(deck: Deck, n: number) {
        const drawnCards = deck.drawMany(n);
        this.hand.push(...drawnCards);
    }

    swapCard(indexInHand: number, newCard: Card) {
        if (indexInHand < 0 || indexInHand >= this.hand.length) {
            console.error(`[Player.ts] ERROR: Invalid index ${indexInHand} for swap.`);
            return;
        }
        this.hand[indexInHand] = newCard;
    }

    /**
     * ✅ NEW: Finds and removes all cards of a specific rank from the hand.
     * @param rank The rank to find and discard.
     * @returns An array of the discarded cards.
     */
    discardRank(rank: typeof Card.RANKS[number]): Card[] {
        const cardsToDiscard = this.hand.filter(card => card.rank === rank);
        this.hand = this.hand.filter(card => card.rank !== rank);
        return cardsToDiscard;
    }

    computeRoundScore(): number {
        let totalScore = this.hand.reduce((acc, card) => acc + card.pointValue, 0);
        const hasBlackQueen = this.hand.some(c => c.rank === 'Q' && (c.suit === 'spades' || c.suit === 'clubs'));
        if (hasBlackQueen) {
            totalScore += 50;
        }
        return totalScore;
    }
}