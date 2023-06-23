const POINT_CASE_SIZE_LEFT = 38.8;
const POINT_CASE_SIZE_TOP = 37.6;

class TableCenter {
    public researchDecks: Deck<Destination>[] = [];
    public cardDeck: Deck<Card>;
    public cardDiscard: VoidStock<Card>;
    public research: SlotStock<Destination>[] = [];
    public cards: SlotStock<Card>;
    private vp = new Map<number, number>();
    private research = new Map<number, number>(); 

    private artifacts: LineStock<number>;
        
    constructor(private game: HumanityGame, gamedatas: HumanityGamedatas) {
        ['A', 'B'].forEach(letter => {
            this.researchDecks[letter] = new Deck<Destination>(game.researchManager, document.getElementById(`table-research-${letter}-deck`), {
                cardNumber: gamedatas.centerDestinationsDeckCount[letter],
                topCard: gamedatas.centerDestinationsDeckTop[letter],
                counter: {
                    position: 'right',
                },
            });

            this.research[letter] = new SlotStock<Destination>(game.researchManager, document.getElementById(`table-research-${letter}`), {
                slotsIds: [1, 2, 3],
                mapCardToSlot: card => card.locationArg,
            });
            this.research[letter].addCards(gamedatas.centerDestinations[letter]);
            this.research[letter].onCardClick = (card: Destination) => this.game.onTableDestinationClick(card);
        })

        const cardDeckDiv = document.getElementById(`card-deck`);
        this.cardDeck = new Deck<Card>(game.cardsManager, cardDeckDiv, {
            cardNumber: gamedatas.cardDeckCount,
            topCard: gamedatas.cardDeckTop,
            counter: {
                counterId: 'deck-counter',
            },
        });
        cardDeckDiv.insertAdjacentHTML('beforeend', `
            <div id="discard-counter" class="bga-cards_deck-counter round">${gamedatas.cardDiscardCount}</div>
        `);
        const deckCounterDiv = document.getElementById('deck-counter');
        const discardCounterDiv = document.getElementById('discard-counter');
        this.game.setTooltip(deckCounterDiv.id, _('Deck size'));
        this.game.setTooltip(discardCounterDiv.id, _('Discard size'));
        this.cardDiscard = new VoidStock<Card>(game.cardsManager, discardCounterDiv);

        this.cards = new SlotStock<Card>(game.cardsManager, document.getElementById(`table-cards`), {
            slotsIds: [1, 2, 3, 4, 5],
            mapCardToSlot: card => card.locationArg,
            gap: '12px',
        });
        this.cards.onCardClick = card => this.game.onTableCardClick(card);
        this.cards.addCards(gamedatas.centerCards);

        const players = Object.values(gamedatas.players);
        let html = '';
        // points
        players.forEach(player =>
            html += `
            <div id="player-${player.id}-vp-marker" class="marker ${/*this.game.isColorBlindMode() ? 'color-blind' : */''}" data-player-id="${player.id}" data-player-no="${player.playerNo}" data-color="${player.color}"><div class="inner vp"></div></div>
            <div id="player-${player.id}-research-marker" class="marker ${/*this.game.isColorBlindMode() ? 'color-blind' : */''}" data-player-id="${player.id}" data-player-no="${player.playerNo}" data-color="${player.color}"><div class="inner research"></div></div>
            `
        );
        dojo.place(html, 'board');
        players.forEach(player => {
            this.vp.set(Number(player.id), Number(player.score));
            this.research.set(Number(player.id), Math.min(14, Number(player.research)));
        });
        this.moveVP();
        this.moveResearch();
    }
    
    public newTableCard(card: Card): Promise<boolean> {
        return this.cards.addCard(card);
    }
    
    public newTableDestination(research: Destination, letter: string, researchDeckCount: number, researchDeckTop?: Destination): Promise<boolean> {
        const promise = this.research[letter].addCard(research);
        this.researchDecks[letter].setCardNumber(researchDeckCount, researchDeckTop);
        return promise;
    } 
    
    public setDestinationsSelectable(selectable: boolean, selectableCards: Destination[] | null = null) {
        ['A', 'B'].forEach(letter => {
            this.research[letter].setSelectionMode(selectable ? 'single' : 'none');
            this.research[letter].setSelectableCards(selectableCards);
        });
    }

    private getVPCoordinates(points: number) {
        const cases = points % 40;

        const top = cases >= 16 ? (cases > 36 ? (40 - cases) : Math.min(4, cases - 16)) * POINT_CASE_SIZE_TOP : 0;
        const left = cases > 20 ? (36 - Math.min(cases, 36)) * POINT_CASE_SIZE_LEFT : Math.min(16, cases) * POINT_CASE_SIZE_LEFT;

        return [22 + left, 39 + top];
    }

    private moveVP() {
        this.vp.forEach((points, playerId) => {
            const markerDiv = document.getElementById(`player-${playerId}-vp-marker`);

            const coordinates = this.getVPCoordinates(points);
            const left = coordinates[0];
            const top = coordinates[1];
    
            let topShift = 0;
            let leftShift = 0;
            this.vp.forEach((iPoints, iPlayerId) => {
                if (iPoints % 40 === points % 40 && iPlayerId < playerId) {
                    topShift += 5;
                    //leftShift += 5;
                }
            });
    
            markerDiv.style.transform = `translateX(${left + leftShift}px) translateY(${top + topShift}px)`;
        });
    }
    
    setScore(playerId: number, points: number) {
        this.vp.set(playerId, points);
        this.moveVP();
    }

    private getResearchCoordinates(points: number) {
        const cases = points;

        const top = cases % 2 ? -14 : 0;
        const left = cases * 16.9;

        return [368 + left, 123 + top];
    }

    private moveResearch() {
        this.research.forEach((points, playerId) => {
            const markerDiv = document.getElementById(`player-${playerId}-research-marker`);

            const coordinates = this.getResearchCoordinates(points);
            const left = coordinates[0];
            const top = coordinates[1];
    
            let topShift = 0;
            let leftShift = 0;
            this.research.forEach((iPoints, iPlayerId) => {
                if (iPoints === points && iPlayerId < playerId) {
                    topShift += 5;
                    //leftShift += 5;
                }
            });
    
            markerDiv.style.transform = `translateX(${left + leftShift}px) translateY(${top + topShift}px)`;
        });
    }
    
    public setResearch(playerId: number, research: number) {
        this.research.set(playerId, Math.min(14, research));
        this.moveResearch();
    }
    
    public getResearch(playerId: number): number {
        return this.research.get(playerId);
    }

    public setCardsSelectable(selectable: boolean, freeColor: number | null = null, recruits: number | null = null) {
        this.cards.setSelectionMode(selectable ? 'single' : 'none');
        if (selectable) {
            const selectableCards = this.cards.getCards().filter(card => freeColor === null || card.locationArg == freeColor || recruits >= 1);
            this.cards.setSelectableCards(selectableCards);
        }
    }
    
    public getVisibleDestinations(): Destination[] {
        return [
            ...this.research['A'].getCards(),
            ...this.research['B'].getCards(),
        ];
    }

    public highlightPlayerTokens(playerId: number | null) {
        document.querySelectorAll('#board .marker').forEach((elem: HTMLElement) => elem.classList.toggle('highlight', Number(elem.dataset.playerId) === playerId));
    }
    
    public setDiscardCount(cardDiscardCount: number) {
        const discardCounterDiv = document.getElementById('discard-counter');
        discardCounterDiv.innerHTML = ''+cardDiscardCount;
    }
}