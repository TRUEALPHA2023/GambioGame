import Phaser from 'phaser';
import Deck from './Deck';
import Card from './Card';
import Player from './Player';
import gsap from 'gsap';

enum GameState {
    Setup,
    PlayerTurn,
    WaitingForAction,
    GambioCalled,
    Reveal,
    Scoring,
    GameOver
}

export default class TableScene extends Phaser.Scene {
    _glowGraphics: { [key: string]: Phaser.GameObjects.Graphics } = {};
    cardSprites: Phaser.GameObjects.Image[][] = [];
    public isOnline: boolean = false;
    deck!: Deck;
    discardPile: Card[] = [];
    players: Player[] = [];
    currentPlayer: number = 0;
    gameState: GameState = GameState.Setup;
    round: number = 1;
    maxRounds: number = 5;
    playerCount: number = 2;
    handSize: number = 4;
    revealTimers: Phaser.Time.TimerEvent[] = [];
    revealedCards: { [playerIdx: number]: boolean[] } = {};
    gambioCaller: number | null = null;
    scores: number[] = [];
    gambioPenalty: number = 20;
    lastDrawnCard: Card | null = null;
    lastDrawSource: 'deck' | 'discard' | null = null;
    actionUsed: boolean = false;
    gambioTurnsLeft: number = 0;

    preload() {
        const suits = ['S', 'H', 'D', 'C'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        for (const s of suits) {
            for (const r of ranks) {
                this.load.image(`${r}${s}`, `assets/cards/${r}${s}.png`);
            }
        }
        this.load.image('BACK', 'assets/cards/BACK.png');
    }

    async create() {
        this.cardSprites = [];
        this.deck = new Deck();
        this.deck.shuffle();
        this.players = [];
        this.revealedCards = {};
        for (let i = 0; i < this.playerCount; i++) {
            const player = new Player(`Player ${i + 1}`, false);
            player.hand = [];
            this.players.push(player);
            this.revealedCards[i] = [false, false, false, false];
        }
        this.discardPile = [this.deck.draw()!];
        this.currentPlayer = 0;
        this.gameState = GameState.Setup;

        await this.dealCardsAnimated();
        this.gameState = GameState.PlayerTurn; // Ensure buttons are enabled after dealing
        this.drawTable();
    }

    drawTable() {
        // Modern gradient background
        this.cameras.main.setBackgroundColor(0x1a1a2e);
        const g = this.add.graphics();
        g.clear();
    g.fillGradientStyle(0x23235b, 0x393975, 0x23235b, 0x23235b, 1);
    g.fillRect(0, 0, this.sys.game.config.width as number, this.sys.game.config.height as number);
    g.setDepth(-10);

        this.revealTimers.forEach(t => t.remove(false));
        this.revealTimers = [];
        const width = this.sys.game.config.width as number;
        const height = this.sys.game.config.height as number;
        const tableCenterX = width / 2;
        const tableCenterY = height / 2;
        const cardScale = Math.min(width, height) < 800 ? 0.25 : 0.32;
        const gridWidth = width * 0.28;
        const gridHeight = height * 0.19;
        const cardW = gridWidth / 2.3;
        const cardH = gridHeight / 2.1;
        const handXGap = cardW * 0.22;
        const handYGapGrid = cardH * 0.32;
        const player1Y = tableCenterY + gridHeight * 0.9 + 50;
        const player2Y = tableCenterY - gridHeight * 2.0 - 50;

        // Modern title and round info
        this.add.text(tableCenterX, 32, `GAMBIO`, { fontFamily: 'Segoe UI, Arial', fontSize: '44px', color: '#fff', fontStyle: 'bold', shadow: { color: '#000', blur: 8, fill: true } }).setOrigin(0.5, 0);
        this.add.text(tableCenterX, 80, `Round ${this.round}  |  Player: ${this.players[this.currentPlayer].name}`, { fontFamily: 'Segoe UI, Arial', fontSize: '26px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5, 0);
        if (this.gambioCaller !== null) {
            this.add.text(tableCenterX, 120, `Gambio called by ${this.players[this.gambioCaller].name}!`, { fontSize: '22px', color: '#FFD700', fontStyle: 'bold' }).setOrigin(0.5, 0);
        }

        // Discard pile
        const discard = this.discardPile[this.discardPile.length - 1];
        if (discard) {
            const discardKey = `${discard.rank[0]}${discard.suit[0].toUpperCase()}`;
            const discardImg = this.add.image(tableCenterX + 140, tableCenterY - 30, discardKey).setDisplaySize(cardW, cardH).setDepth(2);
            discardImg.setAlpha(0.95);
            this.add.text(tableCenterX + 140, tableCenterY + cardH / 2 + 18, 'Discard', { fontSize: '18px', color: '#fff', fontFamily: 'Segoe UI' }).setOrigin(0.5, 0);
        }
        // Deck
        const deckImg = this.add.image(tableCenterX - 140, tableCenterY - 30, 'BACK').setDisplaySize(cardW, cardH).setDepth(2);
    deckImg.setAlpha(0.98);
        this.add.text(tableCenterX - 140, tableCenterY + cardH / 2 + 18, `Deck [${this.deck ? this.deck['cards'].length : 0}]`, { fontSize: '18px', color: '#fff', fontFamily: 'Segoe UI' }).setOrigin(0.5, 0);

        // Draw button
        const deckBtnW = cardW * 1.1;
        const deckBtnH = cardH * 0.5;
        const deckBtnX = tableCenterX;
        const deckBtnY = tableCenterY + cardH * 0.7;
        const drawBtn = this.add.rectangle(deckBtnX, deckBtnY, deckBtnW, deckBtnH, 0x23235b, 0.85).setInteractive().setStrokeStyle(3, 0xFFD700, 0.8);
    // No setRadius in Phaser Rectangle
        this.add.text(deckBtnX, deckBtnY, 'Draw', { fontSize: '22px', color: '#FFD700', fontFamily: 'Segoe UI', fontStyle: 'bold' }).setOrigin(0.5);
        drawBtn.on('pointerdown', () => {
            if (this.gameState === GameState.PlayerTurn) {
                gsap.to(drawBtn, { duration: 0.2, scaleX: 1.12, scaleY: 1.12, yoyo: true, repeat: 1, onComplete: () => {
                    this.drawFromDeck();
                }});
            }
        });
        drawBtn.on('pointerover', () => drawBtn.setFillStyle(0x393975, 0.95));
        drawBtn.on('pointerout', () => drawBtn.setFillStyle(0x23235b, 0.85));

        // Gambio button
        const gambioBtnW = cardW * 2.2;
        const gambioBtnH = cardH * 0.5;
        const gambioBtnX = tableCenterX;
        const gambioBtnY = (this.currentPlayer === 0)
            ? (player1Y + gridHeight + 80)
            : (player2Y - 60);
        const gambioBtn = this.add.rectangle(gambioBtnX, gambioBtnY, gambioBtnW, gambioBtnH, 0xFFD700, 0.92).setInteractive().setStrokeStyle(3, 0x23235b, 0.8);
    // No setRadius in Phaser Rectangle
        this.add.text(gambioBtnX, gambioBtnY, 'Call Gambio', { fontSize: '22px', color: '#23235b', fontFamily: 'Segoe UI', fontStyle: 'bold' }).setOrigin(0.5);
        gambioBtn.on('pointerdown', () => {
            if (this.gameState === GameState.PlayerTurn) {
                gsap.to(gambioBtn, { duration: 0.2, scaleX: 1.12, scaleY: 1.12, yoyo: true, repeat: 1, onComplete: () => {
                    this.callGambio();
                }});
            }
        });
        gambioBtn.on('pointerover', () => gambioBtn.setFillStyle(0xFFF200, 1));
        gambioBtn.on('pointerout', () => gambioBtn.setFillStyle(0xFFD700, 0.92));

        // Glowing turn indicator
        const turnGlowY = this.currentPlayer === 0 ? player1Y : player2Y;
        const turnGlow = this.add.rectangle(tableCenterX, turnGlowY + cardH, gridWidth + 40, gridHeight + 40, 0xFFD700, 0.13);
    turnGlow.setStrokeStyle(4, 0xFFD700, 0.5);
    turnGlow.setDepth(-1);
    gsap.to(turnGlow, { duration: 1.2, alpha: 0.25, yoyo: true, repeat: -1 });

        // Player hands (modern look, drop shadow)
        this.cardSprites = [];
        // Player 2 (top)
        this.add.text(60, player2Y + 30 * cardScale, `${this.players[1].name}:`, { fontSize: '22px', color: this.currentPlayer === 1 ? '#FFD700' : '#fff', fontFamily: 'Segoe UI', fontStyle: this.currentPlayer === 1 ? 'bold' : 'normal', shadow: { color: '#000', blur: 6, fill: true } });
        this.cardSprites[1] = [];
        for (let cidx = 0; cidx < 4; cidx++) {
            const row = cidx < 2 ? 0 : 1;
            const col = cidx % 2;
            const x = tableCenterX - (cardW + handXGap) / 2 + col * (cardW + handXGap);
            const yCard = player2Y + row * (cardH + handYGapGrid);
            let showFace = !!(this.players[1].hand[cidx] && this.revealedCards[1]?.[cidx]);
            let sprite: Phaser.GameObjects.Image;
            if (this.players[1].hand[cidx]) {
                if (showFace) {
                    const key = `${this.players[1].hand[cidx].rank[0]}${this.players[1].hand[cidx].suit[0].toUpperCase()}`;
                    sprite = this.add.image(x, yCard, key).setDisplaySize(cardW, cardH).setDepth(1);
                } else {
                    sprite = this.add.image(x, yCard, 'BACK').setDisplaySize(cardW, cardH).setDepth(1);
                }
                sprite.setAlpha(0.98);
                this.cardSprites[1][cidx] = sprite;
            }
        }
        // Player 1 (bottom)
        this.add.text(60, player1Y + 30 * cardScale, `${this.players[0].name}:`, { fontSize: '22px', color: this.currentPlayer === 0 ? '#FFD700' : '#fff', fontFamily: 'Segoe UI', fontStyle: this.currentPlayer === 0 ? 'bold' : 'normal', shadow: { color: '#000', blur: 6, fill: true } });
        this.cardSprites[0] = [];
        for (let cidx = 0; cidx < 4; cidx++) {
            const row = cidx < 2 ? 0 : 1;
            const col = cidx % 2;
            const x = tableCenterX - (cardW + handXGap) / 2 + col * (cardW + handXGap);
            const yCard = player1Y + row * (cardH + handYGapGrid);
            let showFace = !!(this.players[0].hand[cidx] && this.revealedCards[0]?.[cidx]);
            let sprite: Phaser.GameObjects.Image;
            if (this.players[0].hand[cidx]) {
                if (showFace) {
                    const key = `${this.players[0].hand[cidx].rank[0]}${this.players[0].hand[cidx].suit[0].toUpperCase()}`;
                    sprite = this.add.image(x, yCard, key).setDisplaySize(cardW, cardH).setDepth(1);
                } else {
                    sprite = this.add.image(x, yCard, 'BACK').setDisplaySize(cardW, cardH).setDepth(1);
                }
                sprite.setAlpha(0.98);
                this.cardSprites[0][cidx] = sprite;
            }
        }
        // Instructions
        let y = player1Y + gridHeight + 40;
        let instruction = '';
        if (this.gameState === GameState.PlayerTurn) {
            instruction = 'Click Draw to take a card, or Call Gambio to end the round.';
        } else if (this.gameState === GameState.GambioCalled) {
            instruction = 'Gambio called! All others get one more turn.';
        } else if (this.gameState === GameState.Reveal) {
            instruction = 'Reveal! Click to see scores.';
        } else if (this.gameState === GameState.Scoring) {
            instruction = 'Scoring... Click to continue.';
        } else if (this.gameState === GameState.GameOver) {
            instruction = 'Game Over! Click to restart.';
        }
        if (instruction) {
            this.add.text(tableCenterX, y, instruction, { fontSize: '22px', color: '#fff', fontFamily: 'Segoe UI', backgroundColor: '#23235b', padding: { left: 12, right: 12, top: 6, bottom: 6 } }).setOrigin(0.5, 0);
        }
    }

    async dealCardsAnimated() {
        const width = this.sys.game.config.width as number;
        const height = this.sys.game.config.height as number;
        const tableCenterX = width / 2;
        const tableCenterY = height / 2;
        const cardScale = Math.min(width, height) < 800 ? 0.22 : 0.28;

        // Deck image in center
        const deckSprite = this.add.image(tableCenterX, tableCenterY, 'BACK').setScale(cardScale * 1.2).setDepth(10);

        // Shuffle animation (shake)
        await new Promise<void>(resolve => {
            this.tweens.add({
                targets: deckSprite,
                angle: { from: -10, to: 10 },
                duration: 80,
                yoyo: true,
                repeat: 7,
                onComplete: () => {
                    deckSprite.angle = 0;
                    resolve();
                }
            });
        });

        // Animated deal: create a temp card sprite that flies to each hand
        for (let c = 0; c < 4; c++) {
            for (let p = 0; p < this.players.length; p++) {
                const card = this.deck.draw()!;
                this.players[p].hand.push(card);
                this.drawTable();
                const sprite = this.cardSprites[p][c];
                if (sprite) {
                    const temp = this.add.image(deckSprite.x, deckSprite.y, 'BACK').setScale(cardScale).setDepth(20);
                    gsap.to(temp, {
                        duration: 0.45,
                        x: sprite.x,
                        y: sprite.y,
                        scaleX: sprite.scaleX,
                        scaleY: sprite.scaleY,
                        ease: 'power2.out',
                        onComplete: () => {
                            temp.destroy();
                            this.drawTable();
                        }
                    });
                    await new Promise(res => setTimeout(res, 250));
                }
            }
        }

        deckSprite.destroy();

        // Reveal bottom 2 cards for current player for 5 seconds
        const idx = this.currentPlayer;
        this.revealedCards[idx][2] = true;
        this.revealedCards[idx][3] = true;
        this.drawTable();

        // Glow effect for bottom 2 cards
        for (let cidx of [2, 3]) {
            const sprite = this.cardSprites[idx][cidx];
            if (sprite) {
                const glow = this.add.graphics();
                glow.fillStyle(0xFFD700, 0.5);
                glow.fillEllipse(sprite.x, sprite.y, 90 * sprite.scaleY, 130 * sprite.scaleY);
                glow.setDepth(sprite.depth - 1);
                this._glowGraphics[`${idx}_${cidx}`] = glow;
            }
        }

        this.time.delayedCall(5000, () => {
            for (let cidx of [2, 3]) {
                const sprite = this.cardSprites[idx][cidx];
                if (sprite) {
                    const key = `${idx}_${cidx}`;
                    if (this._glowGraphics && this._glowGraphics[key]) {
                        this._glowGraphics[key].destroy();
                        delete this._glowGraphics[key];
                    }
                    this.tweens.add({
                        targets: sprite,
                        scaleX: 0,
                        duration: 200,
                        onComplete: () => {
                            sprite.setTexture('BACK');
                            this.tweens.add({
                                targets: sprite,
                                scaleX: sprite.scaleY,
                                duration: 200
                            });
                        }
                    });
                }
            }
            this.revealedCards[idx][2] = false;
            this.revealedCards[idx][3] = false;
            this.drawTable();
        });
    }

    drawFromDeck() {
        if (this.lastDrawnCard) return; // Only one draw per turn
        const card = this.deck.draw();
        if (!card) return;
        this.lastDrawnCard = card;
        this.lastDrawSource = 'deck';
        if (this.players[this.currentPlayer].hand.length < 4) {
            this.players[this.currentPlayer].hand.push(card);
        } else {
            this.players[this.currentPlayer].hand[0] = card;
        }
        this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
        this.lastDrawnCard = null;
        this.gameState = GameState.PlayerTurn; // Always allow next turn
        this.drawTable();
    }

    callGambio() {
        this.gameState = GameState.GambioCalled;
        this.gambioCaller = this.currentPlayer;
        this.drawTable();
        this.time.delayedCall(2000, () => {
            this.round++;
            this.deck = new Deck();
            this.deck.shuffle();
            for (let i = 0; i < this.players.length; i++) {
                this.players[i].hand = [];
                for (let j = 0; j < this.handSize; j++) {
                    this.players[i].hand.push(this.deck.draw()!);
                }
            }
            this.discardPile = [this.deck.draw()!];
            this.currentPlayer = 0;
            this.gambioCaller = null;
            this.gameState = GameState.PlayerTurn; // Ensure buttons are enabled after round
            this.drawTable();
        });
    }
}
