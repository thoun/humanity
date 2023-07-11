class TableCenter {
    //public researchDecks: Deck<Destination>[] = [];
    public cardDeck: Deck<Tile>;
    public cardDiscard: VoidStock<Tile>;
    public research: SlotStock<Research>;
    public tiles: SlotStock<Tile>;

    private objectives: LineStock<Objective>;
        
    constructor(private game: HumanityGame, gamedatas: HumanityGamedatas) {
        /*this.researchDecks = new Deck<Destination>(game.researchManager, document.getElementById(`table-research-${letter}-deck`), {
            cardNumber: gamedatas.centerDestinationsDeckCount,
            topCard: gamedatas.centerDestinationsDeckTop,
            counter: {
                position: 'right',
            },
        });*/
        this.research = new SlotStock<Research>(game.researchManager, document.getElementById(`table-research`), {
            slotsIds: [1, 2, 3, 4, 5, 6, 7],
            mapCardToSlot: card => card.locationArg,
        });
        this.research.addCards(gamedatas.tableResearch);
        this.research.onCardClick = (card: Research) => this.game.onTableDestinationClick(card);

        const cardDeckDiv = document.getElementById(`card-deck`);
        this.cardDeck = new Deck<Tile>(game.tilesManager, cardDeckDiv, {
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
        this.cardDiscard = new VoidStock<Tile>(game.tilesManager, discardCounterDiv);

        this.tiles = new SlotStock<Tile>(game.tilesManager, document.getElementById(`table-tiles`), {
            slotsIds: [0, 1, 2, 3, 4, 5, 6, 7],
            mapCardToSlot: card => card.locationArg,
            gap: '12px',
        });
        this.tiles.onCardClick = card => this.game.onTableCardClick(card);
        this.tiles.addCards(gamedatas.tableTiles);

        document.getElementById('table-center').insertAdjacentHTML('afterbegin', `<div></div><div id="objectives"></div>`);
        
        this.objectives = new LineStock<Objective>(this.game.objectivesManager, document.getElementById(`objectives`));
        this.objectives.addCards(gamedatas.tableObjectives);
    }
    
    public newTableCard(card: Tile): Promise<boolean> {
        return this.tiles.addCard(card);
    }
    
    public newTableDestination(research: Research, letter: string, researchDeckCount: number, researchDeckTop?: Research): Promise<boolean> {
        const promise = this.research.addCard(research);
        //this.researchDecks.setCardNumber(researchDeckCount, researchDeckTop);
        return promise;
    } 
    
    public setDestinationsSelectable(selectable: boolean, selectableCards: Research[] | null = null) {
        ['A', 'B'].forEach(letter => {
            this.research.setSelectionMode(selectable ? 'single' : 'none');
            this.research.setSelectableCards(selectableCards);
        });
    }

    public setCardsSelectable(selectable: boolean, freeColor: number | null = null, recruits: number | null = null) {
        this.tiles.setSelectionMode(selectable ? 'single' : 'none');
        if (selectable) {
            const selectableCards = this.tiles.getCards().filter(card => freeColor === null || card.locationArg == freeColor || recruits >= 1);
            this.tiles.setSelectableCards(selectableCards);
        }
    }
    
    public getVisibleDestinations(): Research[] {
        return [
            ...this.research['A'].getCards(),
            ...this.research['B'].getCards(),
        ];
    }
    
    public setDiscardCount(cardDiscardCount: number) {
        const discardCounterDiv = document.getElementById('discard-counter');
        discardCounterDiv.innerHTML = ''+cardDiscardCount;
    }
}