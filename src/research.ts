class DestinationsManager extends CardManager<Research> {
    constructor (public game: HumanityGame) {
        super(game, {
            getId: (card) => `research-${card.id}`,
            setupDiv: (card: Research, div: HTMLElement) => {
                div.classList.add('research');
                div.dataset.cardId = ''+card.id;
                div.dataset.year = ''+card.year;
            },
            setupFrontDiv: (card: Research, div: HTMLElement) => { 
                div.dataset.number = ''+card.number;
                if (card.number) {
                    game.setTooltip(div.id, this.getTooltip(card));
                }
            },
            isCardVisible: card => Boolean(card.number),
            cardWidth: 150,
            cardHeight: 100,
        });
    }

    private getTooltip(research: Research): string {
        let message = `TODO`;/*
        <strong>${_("Exploration cost:")}</strong> ${this.getCost(research.cost)} (recruits can be used as jokers)
        <br>
        <strong>${_("Immediate gains:")}</strong> ${this.getGains(research.immediateGains)}
        <br>
        <strong>${_("Type:")}</strong> ${this.getType(research.type)}
        `;*/
 
        return message;
    }
    
    public getHtml(tile: Research): string {
        let html = `<div class="card research" data-side="front" data-year="${tile.year}">
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