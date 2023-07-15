class TilesManager extends CardManager<Tile> {
    constructor (public game: HumanityGame) {
        super(game, {
            getId: (card) => `tile-${card.id}`,
            setupDiv: (card: Tile, div: HTMLElement) => {
                div.classList.add('tile');
                div.dataset.type = ''+card.type;
                div.dataset.r = ''+card.r;
            },
            setupFrontDiv: (card: Tile, div: HTMLElement) => this.setupFrontDiv(card, div),
            isCardVisible: card => Boolean(card.number) || [0, 8, 9].includes(card.type),
            cardWidth: 150,
            cardHeight: 150,
        });
    }
    
    private setupFrontDiv(card: Tile, div: HTMLElement, ignoreTooltip: boolean = false) { 
        div.dataset.number = ''+card.number;
        if (!ignoreTooltip) {
            this.game.setTooltip(div.id, this.getTooltip(card));
        }
    }

    private getTooltip(card: Tile): string {
        let message = `x ${card.x}<br>
        y ${card.y}`;/*
        <strong>${_("Color:")}</strong> ${this.game.getTooltipColor(card.color)}
        <br>
        <strong>${_("Gain:")}</strong> <strong>1</strong> ${this.game.getTooltipGain(card.gain)}
        `;*/
 
        return message;
    }
    
    public setForHelp(tile: Tile, divId: string): void {
        const div = document.getElementById(divId);
        div.classList.add('card', 'tile');
        div.dataset.side = 'front';
        div.innerHTML = `
        <div class="card-sides">
            <div class="card-side front">
            </div>
            <div class="card-side back">
            </div>
        </div>`
        this.setupFrontDiv(tile, div.querySelector('.front'), true);
    }
    
    public getHtml(tile: Tile): string {
        let html = `<div class="card tile" data-side="front" data-type="${tile.type}" data-r="${tile.r}">
            <div class="card-sides">
                <div class="card-side front" data-number="${tile.number}">
                </div>
                <div class="card-side back">
                </div>
            </div>
        </div>`;
        return html;
    }
}