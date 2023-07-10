const isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;;
const log = isDebug ? console.log.bind(window.console) : function () { };

class PlayerTable {
    public playerId: number;
    public voidStock: VoidStock<Tile>;
    public tiles: SlotStock<Tile>;
    public played: LineStock<Tile>[] = [];
    public research: LineStock<Research>;
    public reservedDestinations?: LineStock<Research>;
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
            <div id="player-table-${this.playerId}-tiles" class="tiles"></div>
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

        const slotsIds = [];
        const xs = player.tiles.map(tile => tile.x);
        const ys = player.tiles.map(tile => tile.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                slotsIds.push(`${x}_${y}`);
            }
        }
        const tilesDiv = document.getElementById(`player-table-${this.playerId}-tiles`);
        tilesDiv.style.setProperty('--rows', `${maxX - minX + 1}`);
        tilesDiv.style.setProperty('--columns', `${maxY - minY + 1}`);
        this.tiles = new SlotStock<Tile>(this.game.tilesManager, tilesDiv, {
            slotsIds,
            mapCardToSlot: tile => `${tile.x}_${tile.y}`,
        });
        this.tiles.onCardClick = (card: Tile) => this.game.onPlayerTileClick(card);
        
        this.tiles.addCards(player.tiles);
        player.tiles.filter(tile => tile.type == 9).forEach(tile => this.game.tilesManager.getCardElement(tile).dataset.playerColor = player.color);

        this.voidStock = new VoidStock<Tile>(this.game.tilesManager, document.getElementById(`player-table-${this.playerId}-name`));
        
        const researchDiv = document.getElementById(`player-table-${this.playerId}-research`);
        this.research = new LineStock<Research>(this.game.researchManager, researchDiv, {
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

    public playCard(card: Tile, fromElement?: HTMLElement): Promise<boolean> {
        return this.played[card.color].addCard(card, {
            fromElement
        });
    }

    public setHandSelectable(selectable: boolean) {
        this.tiles.setSelectionMode(selectable ? 'single' : 'none');
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

    public getSelectedCards(): Tile[] {
        const cards = [];

        for (let i = 1; i <= 5; i++) {
            cards.push(...this.played[i].getSelection());
        }

        return cards;
    }
    
    public reserveDestination(research: Research) {
        return this.reservedDestinations.addCard(research);
    }
    
    public setDestinationsSelectable(selectable: boolean, selectableCards: Research[] | null = null) {
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