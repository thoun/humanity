const isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;;
const log = isDebug ? console.log.bind(window.console) : function () { };

class PlayerTable {
    public playerId: number;
    public voidStock: VoidStock<Card>;
    public hand?: LineStock<Card>;
    public played: LineStock<Card>[] = [];
    public research: LineStock<Destination>;
    public reservedDestinations?: LineStock<Destination>;
    public limitSelection: number | null = null;

    private currentPlayer: boolean;

    constructor(private game: HumanityGame, player: HumanityPlayer) {
        this.playerId = Number(player.id);
        this.currentPlayer = this.playerId == this.game.getPlayerId();

        let html = `
        <div id="player-table-${this.playerId}" class="player-table" style="--player-color: #${player.color};">
            <div id="player-table-${this.playerId}-name" class="name-wrapper">${player.name}</div>
            <div class="cols">
            <div class="col col1">
        `;
        if (this.currentPlayer) {
            html += `
            <div class="block-with-text hand-wrapper">
                <div class="block-label">${_('Your hand')}</div>
                <div id="player-table-${this.playerId}-hand" class="hand cards"></div>
            </div>`;
        }
        html += `
            <div id="player-table-${this.playerId}-research" class="research"></div>
            <div id="player-table-${this.playerId}-boat" class="boat" data-color="${player.color}" data-recruits="${player.recruit}" data-bracelets="${player.bracelet}">`;
        for (let i = 1; i <= 3; i++) {
            if (this.currentPlayer) {
                html += `<div id="player-table-${this.playerId}-column${i}" class="column" data-number="${i}"></div>`;
            }
            html += `
            <div class="icon bracelet" data-number="${i}"></div>
            <div class="icon recruit" data-number="${i}"></div>
            `;
        }
        html += `
            </div>
            <div class="visible-cards">`;            
            for (let i = 1; i <= 5; i++) {
                html += `
                <div id="player-table-${this.playerId}-played-${i}" class="cards"></div>
                `;
            }
            html += `
            </div>
            </div>
            
            <div class="col col2"></div>
            </div>
        </div>
        `;

        dojo.place(html, document.getElementById('tables'));

        if (this.currentPlayer) {
            const handDiv = document.getElementById(`player-table-${this.playerId}-hand`);
            this.hand = new LineStock<Card>(this.game.cardsManager, handDiv, {
                sort: (a: Card, b: Card) => a.color == b.color ? a.gain - b.gain : a.color - b.color,
            });
            this.hand.onCardClick = (card: Card) => this.game.onHandCardClick(card);
            
            this.hand.addCards(player.hand);

        }
        this.voidStock = new VoidStock<Card>(this.game.cardsManager, document.getElementById(`player-table-${this.playerId}-name`));
                
        for (let i = 1; i <= 5; i++) {
            const playedDiv = document.getElementById(`player-table-${this.playerId}-played-${i}`);
            this.played[i] = new LineStock<Card>(this.game.cardsManager, playedDiv, {
                direction: 'column',
                center: false,
            });
            this.played[i].onCardClick = card => {
                this.game.onPlayedCardClick(card);
                if (this.limitSelection !== null) {
                    this.updateSelectable();
                }
            }
            this.played[i].addCards(player.playedCards[i]);
            playedDiv.style.setProperty('--card-overlap', '195px');
        }
        
        const researchDiv = document.getElementById(`player-table-${this.playerId}-research`);
        this.research = new LineStock<Destination>(this.game.researchManager, researchDiv, {
            center: false,
        });
        researchDiv.style.setProperty('--card-overlap', '94px');
        
        this.research.addCards(player.research);

        [document.getElementById(`player-table-${this.playerId}-name`), document.getElementById(`player-table-${this.playerId}-boat`)].forEach(elem => {
            elem.addEventListener('mouseenter', () => this.game.highlightPlayerTokens(this.playerId));
            elem.addEventListener('mouseleave', () => this.game.highlightPlayerTokens(null));
        });
    }

    public updateCounter(type: 'recruits' | 'bracelets', count: number) {
        document.getElementById(`player-table-${this.playerId}-boat`).dataset[type] = ''+count;
    }

    public playCard(card: Card, fromElement?: HTMLElement): Promise<boolean> {
        return this.played[card.color].addCard(card, {
            fromElement
        });
    }

    public setHandSelectable(selectable: boolean) {
        this.hand.setSelectionMode(selectable ? 'single' : 'none');
    }

    public setCardsSelectable(selectable: boolean, cost: { [color: number]: number } | null = null) {
        const colors = cost == null ? [] : Object.keys(cost).map(key => Number(key));
        const equalOrDifferent = cost == null ? false : [EQUAL, DIFFERENT].includes(colors[0]);
        this.limitSelection = equalOrDifferent ? colors[0] : null;

        for (let i = 1; i <= 5; i++) {
            this.played[i].setSelectionMode(selectable ? 'multiple' : 'none');
            if (selectable) {
                const selectableCards = this.played[i].getCards().filter(card => {
                    let disabled = !selectable || cost == null;
                    if (!disabled) {
                        if (colors.length != 1 || (colors.length == 1 && !equalOrDifferent)) {
                            disabled = !colors.includes(card.color);
                        }
                    }
                    return !disabled;
                });
                this.played[i].setSelectableCards(selectableCards);
            }
        }
    }

    public getSelectedCards(): Card[] {
        const cards = [];

        for (let i = 1; i <= 5; i++) {
            cards.push(...this.played[i].getSelection());
        }

        return cards;
    }
    
    public reserveDestination(research: Destination) {
        return this.reservedDestinations.addCard(research);
    }
    
    public setDestinationsSelectable(selectable: boolean, selectableCards: Destination[] | null = null) {
        if (!this.reservedDestinations) {
            return;
        }

        this.reservedDestinations.setSelectionMode(selectable ? 'single' : 'none');
        this.reservedDestinations.setSelectableCards(selectableCards);
    }
    
    public showColumns(number: number) {
        if (number > 0) {
            document.getElementById(`player-table-${this.playerId}-boat`).style.setProperty('--column-height', `${35 * (this.research.getCards().length + 1)}px`);
        }

        for (let i = 1; i <= 3; i++) {
            document.getElementById(`player-table-${this.playerId}-column${i}`).classList.toggle('highlight', i <= number);
        }
    }
    
    private updateSelectable() {
        const selectedCards = this.getSelectedCards();
        const selectedColors = selectedCards.map(card => card.color);
        const color = selectedCards.length ? selectedCards[0].color : null;

        for (let i = 1; i <= 5; i++) {
            const selectableCards = this.played[i].getCards().filter(card => {                
                let disabled = false;
                if (this.limitSelection === DIFFERENT) {
                    disabled = selectedColors.includes(card.color) && !selectedCards.includes(card);
                } else if (this.limitSelection === EQUAL) {
                    disabled = color !== null && card.color != color;
                }
                return !disabled;
            });
            this.played[i].setSelectableCards(selectableCards);
        }
    }
    
    public setDoubleColumn(isDoublePlayerColumn: boolean): void {
        const research = document.getElementById(`player-table-${this.playerId}-research`);
        const boat = document.getElementById(`player-table-${this.playerId}-boat`);
        const reservedDestinations = document.getElementById(`player-table-${this.playerId}-reserved-research-wrapper`);
        if (isDoublePlayerColumn) {
            const col2 = document.getElementById(`player-table-${this.playerId}`).querySelector('.col2');
            col2.appendChild(research);
            col2.appendChild(boat);
            if (reservedDestinations) {
                col2.appendChild(reservedDestinations);
            }
        } else {
            const visibleCards = document.getElementById(`player-table-${this.playerId}`).querySelector('.visible-cards');
            visibleCards.insertAdjacentElement('beforebegin', research);
            visibleCards.insertAdjacentElement('beforebegin', boat);
            if (reservedDestinations) {
                visibleCards.insertAdjacentElement('afterend', reservedDestinations);
            }
        }
    }
}