import Phaser from 'phaser';
import Deck from './Deck';
import Card from './Card';
import Player from './Player';
import gsap from 'gsap';

enum GameState { Dealing, PlayerTurn, WaitingForDiscard, ActionCardPlayed, GambioCalled, RoundOver, GameOver }

export default class TableScene extends Phaser.Scene {
    private deck!: Deck;
    private discardPile: Card[] = [];
    private players: Player[] = [];
    private currentPlayerIndex: number = 0;
    private gameState: GameState = GameState.Dealing;
    private drawnCard: Card | null = null;
    private gambioCaller: Player | null = null;
    private turnsAfterGambio: number = 0;
    private round: number = 1;
    private maxRounds: number = 5;

    // Game Objects
    private playerHandContainers: Phaser.GameObjects.Container[] = [];
    private deckSprite!: Phaser.GameObjects.Image;
    private discardSprite!: Phaser.GameObjects.Image;
    private instructionText!: Phaser.GameObjects.Text;
    private scoreboardText!: Phaser.GameObjects.Text;
    
    public playerCount: number = 2;

    constructor() {
        super({ key: 'TableScene' });
    }

    init(data: { playerCount: number }) {
        this.playerCount = data.playerCount || 2;
    }

    preload() {
        this.load.setPath('assets/cards/');
        Card.SUITS.forEach((suit: string) => {
            Card.RANKS.forEach((rank: string) => this.load.image(new Card(suit as typeof Card.SUITS[number], rank as typeof Card.RANKS[number]).key));
        });
        this.load.image('BACK');
    }

    create() {
        this.cameras.main.setBackgroundColor('#2c3e50');
        this.initializeGame();
    }

    private initializeGame() {
        this.players = Array.from({ length: this.playerCount }, (_, i) => new Player(`Player ${i + 1}`));
        this.scoreboardText = this.add.text(20, 20, '', { font: '22px Arial', color: '#fff', lineSpacing: 10 }).setDepth(100);
        this.startNewRound();
    }

    private startNewRound() {
        this.deck = new Deck();
        this.discardPile = [this.deck.draw()!];
        this.players.forEach(p => p.hand = this.deck.drawMany(4));
        
        this.currentPlayerIndex = (this.round - 1) % this.playerCount;
        this.gameState = GameState.Dealing;
        this.gambioCaller = null;
        
        this.drawSceneLayout();
        this.dealAnimation().then(() => {
            this.gameState = GameState.PlayerTurn;
            this.updateUI();
        });
    }

    private drawSceneLayout() {
        this.children.removeAll(); // Clear scene for new round
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        // Re-add scoreboard since it's a scene object
        this.scoreboardText = this.add.text(30, 30, '', { font: '22px Arial', color: '#fff', lineSpacing: 10 }).setDepth(100);

        this.deckSprite = this.add.image(centerX - 150, centerY, 'BACK').setScale(0.8).setInteractive();
        this.deckSprite.on('pointerdown', this.onDeckClick, this);

        const playerPositions = [
            { x: centerX, y: this.cameras.main.height - 150 }, // Bottom
            { x: centerX, y: 150 }, // Top
            { x: 200, y: centerY }, // Left
            { x: this.cameras.main.width - 200, y: centerY } // Right
        ];

        this.players.forEach((player, index) => {
            const pos = playerPositions[index];
            this.playerHandContainers[index] = this.add.container(pos.x, pos.y);
            const nameText = this.add.text(pos.x, index < 2 ? (pos.y + (index === 0 ? -120 : 120)) : pos.y - 120, player.name, { font: '24px Arial', color: '#fff' }).setOrigin(0.5);
        });

        const gambioBtn = this.add.text(centerX, centerY + 200, 'Call Gambio', { font: '22px Arial', backgroundColor: '#ffd700', color: '#000', padding: {x: 10, y: 5}}).setOrigin(0.5).setInteractive();
        gambioBtn.on('pointerdown', this.onGambioCall, this);

        this.instructionText = this.add.text(centerX, this.cameras.main.height - 50, '', { font: '24px Arial', color: '#fff' }).setOrigin(0.5);
    }
    
    private updateUI() {
        this.updatePlayerHands();
        this.updateDiscardPile();
        this.updateInstructionText();
        this.updateScoreboard();
    }
    
    private updatePlayerHands() {
        const playerOrder = Array.from({ length: this.playerCount }, (_, i) => (this.currentPlayerIndex + i) % this.playerCount);

        playerOrder.forEach((playerIndex, screenPosition) => {
            const player = this.players[playerIndex];
            const container = this.playerHandContainers[screenPosition];
            container.removeAll(true);

            const isCurrent = screenPosition === 0;
            const handWidth = (player.hand.length - 1) * 60;
            const startX = -handWidth / 2;

            player.hand.forEach((card, cardIndex) => {
                const cardKey = isCurrent ? card.key : 'BACK';
                const cardSprite = this.add.image(startX + cardIndex * 130, 0, cardKey).setScale(0.7).setInteractive();
                cardSprite.setData({ cardIndex });
                
                if (isCurrent) {
                    cardSprite.on('pointerdown', () => this.onHandCardClick(cardSprite));
                    gsap.fromTo(cardSprite, { y: -20 }, { y: 0, duration: 0.5 });
                }
                container.add(cardSprite);
            });
        });
    }

    private updateDiscardPile() {
        if (this.discardSprite) this.discardSprite.destroy();
        const topCard = this.discardPile[this.discardPile.length - 1];
        if (topCard) {
            const { width, height } = this.cameras.main;
            this.discardSprite = this.add.image(width / 2 + 150, height / 2, topCard.key).setScale(0.8).setInteractive();
            this.discardSprite.on('pointerdown', this.onDiscardClick, this);
        }
    }

    private updateInstructionText() {
        let text = '';
        const currentPlayerName = this.players[this.currentPlayerIndex].name;
        switch(this.gameState) {
            case GameState.PlayerTurn: text = `${currentPlayerName}, your turn. Draw a card.`; break;
            case GameState.WaitingForDiscard: text = `${currentPlayerName}, select a card from your hand to replace.`; break;
            case GameState.GambioCalled: text = `Gambio called! ${currentPlayerName}'s final turn.`; break;
            case GameState.RoundOver: text = "Round over! Calculating scores..."; break;
        }
        this.instructionText.setText(text);
    }

    private updateScoreboard() {
        let scoreText = `Round: ${this.round} / ${this.maxRounds}\n\n-- SCORES --\n`;
        this.players.forEach(p => scoreText += `${p.name}: ${p.score}\n`);
        this.scoreboardText.setText(scoreText);
    }
    
    private onDeckClick() {
        if (this.gameState !== GameState.PlayerTurn || !this.deck.size()) return;
        this.handlePlayerDraw(this.deck.draw()!);
    }

    private onDiscardClick() {
        if (this.gameState !== GameState.PlayerTurn || this.discardPile.length < 1) return;
        this.handlePlayerDraw(this.discardPile.pop()!);
    }

    private onGambioCall() {
        if (this.gameState !== GameState.PlayerTurn) return;
        this.gambioCaller = this.players[this.currentPlayerIndex];
        this.turnsAfterGambio = this.playerCount;
        this.endTurn();
    }
    
    private onHandCardClick(cardSprite: Phaser.GameObjects.Image) {
        if (this.gameState !== GameState.WaitingForDiscard) return;
        const cardIndex = cardSprite.getData('cardIndex');
        const player = this.players[this.currentPlayerIndex];
        const cardToDiscard = player.swapCard(cardIndex, this.drawnCard!);
        this.discardPile.push(cardToDiscard);
        this.drawnCard = null;
        this.endTurn();
    }
    
    private handlePlayerDraw(card: Card) {
        this.drawnCard = card;
        this.gameState = GameState.WaitingForDiscard;
        this.updateUI();
    }

    private endTurn() {
        if (this.gambioCaller !== null) {
            this.turnsAfterGambio--;
            if (this.turnsAfterGambio <= 0) {
                this.endRound();
                return;
            }
        }
        
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerCount;
        this.gameState = GameState.PlayerTurn;
        this.updateUI();
    }
    
    private endRound() {
        this.gameState = GameState.RoundOver;
        this.players.forEach(p => p.score += p.computeRoundScore());
        
        if (this.round >= this.maxRounds) {
            const winner = this.players.reduce((prev, curr) => prev.score < curr.score ? prev : curr);
            this.instructionText.setText(`Game Over! Winner is ${winner.name} with ${winner.score} points!`);
            this.updateScoreboard();
        } else {
            this.round++;
            this.instructionText.setText("Round over! Starting next round...");
            this.time.delayedCall(4000, this.startNewRound, [], this);
        }
    }
    
    private async dealAnimation() {
        return new Promise<void>(resolve => resolve()); // Placeholder
    }
}